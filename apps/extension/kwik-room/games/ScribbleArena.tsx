import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowLeft, RotateCcw, Palette, Eraser, Trash, Send, CheckCircle2, XCircle, Minus, Plus, PaintBucket, Undo, Redo, Pencil, Info, X } from "lucide-react"
import { playSound } from "../components/sound"

interface ScribbleProps {
  isMuted: boolean
  roomCode: string
  username: string
  activeGame: { id: string, opponent: string, isX: boolean, type: string, creator?: string, players?: string[] }
  setActiveGame: (game: null) => void
}

interface GameState {
  step: "setup" | "playing" | "ended"
  word: string
  guesses: { user: string, guess: string }[]
  winner: string | null
  activePlayers: string[]
  canvasData: string | null // For syncing late joiners
}

export function ScribbleArena({ isMuted, roomCode, username, activeGame, setActiveGame }: ScribbleProps) {
  const [gameState, setGameState] = useState<GameState>({
    step: "setup", word: "", guesses: [], winner: null, activePlayers: activeGame.players || [], canvasData: null
  })
  
  const [setupWord, setSetupWord] = useState("")
  const [currentGuess, setCurrentGuess] = useState("")
  
  // 👉 NEW: State to toggle the game rules modal
  const [showRules, setShowRules] = useState(false)
  
  // 👉 BRUSH SETTINGS
  const [color, setColor] = useState("#ffffff")
  const [lineWidth, setLineWidth] = useState(3)
  const [activeTool, setActiveTool] = useState<"pen" | "eraser" | "fill">("pen")

  // 👉 UNDO / REDO HISTORY STACKS
  const [history, setHistory] = useState<string[]>([])
  const [redoStack, setRedoStack] = useState<string[]>([])

  const isCreator = activeGame.isX
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawing = useRef(false)
  const lastPos = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const listener = (msg: any) => {
      if (msg.type === "game-updated" && msg.payload.gameInstanceId === activeGame.id) {
        
        if (msg.payload.action === "start") {
           setGameState(prev => ({ ...prev, activePlayers: msg.payload.playersJoined || prev.activePlayers }))
        }

        if (msg.payload.action === "sync") {
           setGameState(msg.payload.gameState)
           if (msg.payload.gameState.canvasData && !isCreator) {
               restoreCanvas(msg.payload.gameState.canvasData)
           }
        }
        
        // 👉 REAL-TIME DRAWING RECEIVER
        if (msg.payload.action === "draw" && !isCreator) {
           const { x0, y0, x1, y1, color, width, isEraser } = msg.payload.line
           drawLine(x0, y0, x1, y1, color, width, false, isEraser)
        }

        // 👉 REAL-TIME FLOOD FILL / CLEAR / UNDO / REDO RECEIVERS
        if (msg.payload.action === "clear_canvas" && !isCreator) clearLocalCanvas()
        if (msg.payload.action === "fill_canvas" && !isCreator) {
           performFloodFill(msg.payload.x, msg.payload.y, msg.payload.color)
        }
        if ((msg.payload.action === "undo_canvas" || msg.payload.action === "redo_canvas") && !isCreator) {
           restoreCanvas(msg.payload.canvasData)
        }
        
        if (msg.payload.action === "leave") {
           const leaver = msg.payload.username;
           const remaining = gameState.activePlayers.filter(p => p !== leaver);

           if (leaver === activeGame.creator || remaining.length <= 1) {
               setActiveGame(null);
           } else {
               setGameState(prev => ({ ...prev, activePlayers: remaining }));
           }
        }

        if (msg.payload.action === "restart") {
           setGameState(prev => ({ step: "setup", word: "", guesses: [], winner: null, activePlayers: prev.activePlayers, canvasData: null }))
           clearLocalCanvas()
           setHistory([])
           setRedoStack([])
           playSound("swoosh", isMuted)
        }
      }
    }
    chrome.runtime.onMessage.addListener(listener)
    return () => chrome.runtime.onMessage.removeListener(listener)
  }, [activeGame.id, activeGame.creator, isMuted, setActiveGame, gameState.activePlayers, isCreator])

  useEffect(() => {
    if (isCreator && gameState.step !== "setup") {
      const currentCanvas = canvasRef.current?.toDataURL() || null;
      chrome.runtime.sendMessage({
        type: "game-action",
        payload: { room: roomCode, gameInstanceId: activeGame.id, action: "sync", gameState: { ...gameState, canvasData: currentCanvas } }
      })
    }
  }, [activeGame.players?.length]) 

  const syncState = (newState: GameState) => {
    setGameState(newState)
    chrome.runtime.sendMessage({
      type: "game-action",
      payload: { room: roomCode, gameInstanceId: activeGame.id, action: "sync", gameState: newState }
    })
  }

  // ==========================================
  // 👉 FLOOD FILL ALGORITHM
  // ==========================================
  const hexToRgb = (hex: string) => {
    const bigint = parseInt(hex.replace('#', ''), 16)
    return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255, a: 255 }
  }

  const performFloodFill = (startX: number, startY: number, fillColorHex: string) => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d", { willReadFrequently: true })
    if (!ctx || !canvas) return

    const fillRgb = hexToRgb(fillColorHex)
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data = imgData.data

    const startPos = (startY * canvas.width + startX) * 4
    const startR = data[startPos]
    const startG = data[startPos + 1]
    const startB = data[startPos + 2]
    const startA = data[startPos + 3]

    if (startR === fillRgb.r && startG === fillRgb.g && startB === fillRgb.b && startA === fillRgb.a) return

    const matchStartColor = (pos: number) => {
      return data[pos] === startR && data[pos + 1] === startG && data[pos + 2] === startB && data[pos + 3] === startA
    }

    const colorPixel = (pos: number) => {
      data[pos] = fillRgb.r
      data[pos + 1] = fillRgb.g
      data[pos + 2] = fillRgb.b
      data[pos + 3] = fillRgb.a
    }

    const pixelStack = [[startX, startY]]

    while (pixelStack.length) {
      const newPos = pixelStack.pop() as number[]
      let x = newPos[0]
      let y = newPos[1]
      let pixelPos = (y * canvas.width + x) * 4

      while (y-- >= 0 && matchStartColor(pixelPos)) {
        pixelPos -= canvas.width * 4
      }
      pixelPos += canvas.width * 4
      ++y

      let reachLeft = false
      let reachRight = false

      while (y++ < canvas.height - 1 && matchStartColor(pixelPos)) {
        colorPixel(pixelPos)

        if (x > 0) {
          if (matchStartColor(pixelPos - 4)) {
            if (!reachLeft) {
              pixelStack.push([x - 1, y])
              reachLeft = true
            }
          } else if (reachLeft) {
            reachLeft = false
          }
        }

        if (x < canvas.width - 1) {
          if (matchStartColor(pixelPos + 4)) {
            if (!reachRight) {
              pixelStack.push([x + 1, y])
              reachRight = true
            }
          } else if (reachRight) {
            reachRight = false
          }
        }
        pixelPos += canvas.width * 4
      }
    }
    ctx.putImageData(imgData, 0, 0)
  }

  // ==========================================
  // 👉 CANVAS LOGIC
  // ==========================================
  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isCreator || gameState.step !== "playing") return
    
    if (history.length === 0) {
      const blankData = canvasRef.current?.toDataURL()
      if (blankData) setHistory([blankData])
    }

    const pos = getPos(e)
    const x = Math.floor(pos.x)
    const y = Math.floor(pos.y)

    if (activeTool === "fill") {
      performFloodFill(x, y, color)
      const dataUrl = canvasRef.current?.toDataURL() || null
      if (dataUrl) {
        setHistory(prev => [...prev, dataUrl])
        setRedoStack([])
      }
      chrome.runtime.sendMessage({
        type: "game-action",
        payload: { room: roomCode, gameInstanceId: activeGame.id, action: "fill_canvas", x, y, color }
      })
      return
    }
    
    isDrawing.current = true
    lastPos.current = pos
  }

  const stopDrawing = () => {
    if (isDrawing.current) {
      isDrawing.current = false
      const dataUrl = canvasRef.current?.toDataURL() || null
      if (dataUrl) {
        setHistory(prev => [...prev, dataUrl])
        setRedoStack([])
      }
    }
  }

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing.current || !isCreator || gameState.step !== "playing" || activeTool === "fill") return
    const pos = getPos(e)
    
    drawLine(lastPos.current.x, lastPos.current.y, pos.x, pos.y, color, lineWidth, true, activeTool === "eraser")
    lastPos.current = pos
  }

  const drawLine = (x0: number, y0: number, x1: number, y1: number, strokeColor: string, strokeWidth: number, emit: boolean, eraserMode: boolean) => {
    const ctx = canvasRef.current?.getContext("2d")
    if (!ctx) return

    ctx.beginPath()
    ctx.moveTo(x0, y0)
    ctx.lineTo(x1, y1)
    
    if (eraserMode) {
      ctx.globalCompositeOperation = 'destination-out'
      ctx.lineWidth = strokeWidth * 4 
    } else {
      ctx.globalCompositeOperation = 'source-over'
      ctx.strokeStyle = strokeColor
      ctx.lineWidth = strokeWidth
    }
    
    ctx.lineCap = "round"
    ctx.stroke()
    ctx.closePath()

    if (!emit) return

    chrome.runtime.sendMessage({
      type: "game-action",
      payload: { 
        room: roomCode, gameInstanceId: activeGame.id, action: "draw", 
        line: { x0, y0, x1, y1, color: strokeColor, width: strokeWidth, isEraser: eraserMode } 
      }
    })
  }

  const getPos = (e: any) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    }
  }

  const triggerClearCanvas = () => {
    if (history.length === 0) {
      const blankData = canvasRef.current?.toDataURL()
      if (blankData) setHistory([blankData])
    }
    clearLocalCanvas()
    const dataUrl = canvasRef.current?.toDataURL() || null
    if (dataUrl) {
      setHistory(prev => [...prev, dataUrl])
      setRedoStack([])
    }
    chrome.runtime.sendMessage({
      type: "game-action",
      payload: { room: roomCode, gameInstanceId: activeGame.id, action: "clear_canvas" }
    })
  }

  const clearLocalCanvas = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!ctx || !canvas) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  const restoreCanvas = (dataUrl: string) => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return
    const img = new Image()
    img.src = dataUrl
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.globalCompositeOperation = 'source-over'
      ctx.drawImage(img, 0, 0)
    }
  }

  const handleUndo = () => {
    if (history.length <= 1) return 
    const newHistory = [...history]
    const current = newHistory.pop()
    if (current) setRedoStack(prev => [...prev, current])
    
    const previousState = newHistory[newHistory.length - 1]
    setHistory(newHistory)
    restoreCanvas(previousState)

    chrome.runtime.sendMessage({
      type: "game-action",
      payload: { room: roomCode, gameInstanceId: activeGame.id, action: "undo_canvas", canvasData: previousState }
    })
  }

  const handleRedo = () => {
    if (redoStack.length === 0) return
    const newRedo = [...redoStack]
    const nextState = newRedo.pop()
    if (nextState) {
      setHistory(prev => [...prev, nextState])
      setRedoStack(newRedo)
      restoreCanvas(nextState)

      chrome.runtime.sendMessage({
        type: "game-action",
        payload: { room: roomCode, gameInstanceId: activeGame.id, action: "redo_canvas", canvasData: nextState }
      })
    }
  }

  const startGame = () => {
    if (!setupWord.trim()) return
    syncState({ ...gameState, step: "playing", word: setupWord.trim().toUpperCase() })
    playSound("success", isMuted)
  }

  const makeGuess = () => {
    if (!currentGuess.trim()) return
    const guess = currentGuess.trim().toUpperCase()
    const isWin = guess === gameState.word
    
    syncState({ 
      ...gameState, 
      guesses: [{ user: username, guess }, ...gameState.guesses],
      step: isWin ? "ended" : gameState.step,
      winner: isWin ? username : gameState.winner
    })
    setCurrentGuess("")
    playSound("send", isMuted)
  }

  const exitGame = () => {
    chrome.runtime.sendMessage({
      type: "game-action",
      payload: { room: roomCode, gameInstanceId: activeGame.id, action: "leave", username }
    })
    setActiveGame(null)
  }

  const handleRestart = () => {
    chrome.runtime.sendMessage({
      type: "game-action",
      payload: { room: roomCode, gameInstanceId: activeGame.id, action: "restart" }
    })
  }

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="h-screen w-full overflow-hidden bg-zinc-950 text-white flex flex-col items-center p-4 relative"
    >
      <div className="absolute top-4 left-4 w-full flex items-center justify-between pr-8 z-10">
        <button onClick={exitGame} className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors bg-zinc-900/50 px-3 py-1.5 rounded-full border border-zinc-800 shadow-md">
          <ArrowLeft size={14} />
          <span className="text-xs font-medium">Flee Arena</span>
        </button>
        <button onClick={() => setShowRules(true)} className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors bg-zinc-900/50 rounded-full border border-zinc-800 shadow-md" title="How to Play">
          <Info size={16} />
        </button>
      </div>

      {/* 👉 NEW: How to Play Rules Modal */}
      <AnimatePresence>
        {showRules && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="flex justify-between items-center mb-4 shrink-0 border-b border-zinc-800/50 pb-3">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Palette size={18} className="text-indigo-400" /> How to Play
                </h3>
                <button onClick={() => setShowRules(false)} className="text-zinc-500 hover:text-zinc-300 transition-colors p-1 rounded-md hover:bg-zinc-800">
                  <X size={18} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto pr-1 space-y-4 text-xs text-zinc-300 style-scrollbar-hidden scrollbar-none">
                <div>
                  <h4 className="font-bold text-indigo-400 mb-1">🎨 The Artist</h4>
                  <p className="leading-relaxed text-zinc-400">If you started the game, choose a secret word and draw it on the canvas using the brush, eraser, and paint bucket. Try to make it recognizable but don't spell the word out!</p>
                </div>
                <div>
                  <h4 className="font-bold text-emerald-400 mb-1">🤔 The Guessers</h4>
                  <p className="leading-relaxed text-zinc-400">Watch the drawing unfold in real-time and type your guesses into the chat box below the canvas.</p>
                </div>
                <div className="bg-zinc-950/50 p-3 rounded-xl border border-zinc-800/50">
                  <h4 className="font-bold text-yellow-500 mb-2">Winning the Game</h4>
                  <p className="leading-relaxed text-zinc-400">The first player to successfully guess the exact secret word wins the round.</p>
                </div>
              </div>
              
              <div className="mt-4 pt-4 shrink-0">
                <button onClick={() => setShowRules(false)} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg py-2.5 font-semibold transition-all text-sm shadow-md">
                  Understood
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-10 mb-2 text-center">
        <h2 className="text-xl font-bold tracking-tight text-zinc-100 flex items-center justify-center gap-2">
          <Palette size={18} className="text-indigo-400" /> Scribble
        </h2>
        <p className="text-xs text-zinc-400">Players: {gameState.activePlayers.length}/7</p>
      </div>

      <div className="flex-1 w-full max-w-sm flex flex-col gap-3 overflow-hidden">
        
        {/* SETUP PHASE */}
        {gameState.step === "setup" && (
          <div className="flex-1 flex flex-col justify-center items-center">
            {isCreator ? (
              <div className="w-full space-y-4 bg-zinc-900/50 p-5 rounded-2xl border border-zinc-800">
                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 block">Word to Draw</label>
                  <input type="text" value={setupWord} onChange={e => setSetupWord(e.target.value)} placeholder="e.g. MOUNTAIN" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500 uppercase" />
                </div>
                <button onClick={startGame} disabled={!setupWord} className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg py-2.5 text-sm font-semibold transition-all">
                  Start Drawing
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 text-zinc-500 animate-pulse">
                <Palette size={32} />
                <p className="text-sm font-medium">Waiting for {activeGame.creator} to pick a word...</p>
              </div>
            )}
          </div>
        )}

        {/* PLAYING & ENDED PHASE */}
        {gameState.step !== "setup" && (
          <>
            {/* The Drawing Canvas */}
            <div className="bg-zinc-900/80 rounded-xl border border-zinc-700/50 flex flex-col overflow-hidden shadow-xl">
              <div className="bg-zinc-950 p-2 flex justify-between items-center border-b border-zinc-800">
                 {isCreator ? (
                   <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider truncate mr-2">
                     Draw: {gameState.word}
                   </span>
                 ) : (
                   <span className="text-[11px] text-zinc-400 font-medium tracking-[0.3em]">
                     {gameState.step === "ended" ? gameState.word : gameState.word.replace(/[A-Z]/g, "_ ")}
                   </span>
                 )}

                 {/* TOOLBAR */}
                 {isCreator && gameState.step === "playing" && (
                   <div className="flex gap-2 items-center shrink-0">
                     {/* Undo / Redo */}
                     <button onClick={handleUndo} disabled={history.length <= 1} title="Undo" className="text-zinc-400 hover:text-white disabled:opacity-20 shrink-0 transition-opacity"><Undo size={14} /></button>
                     <button onClick={handleRedo} disabled={redoStack.length === 0} title="Redo" className="text-zinc-400 hover:text-white disabled:opacity-20 shrink-0 transition-opacity" style={{marginRight: '4px'}}><Redo size={14} /></button>
                     
                     <div className="flex items-center bg-zinc-900 rounded-md border border-zinc-800">
                       <button onClick={() => setLineWidth(Math.max(1, lineWidth - 2))} className="text-zinc-400 hover:text-white p-1 border-r border-zinc-800"><Minus size={12}/></button>
                       <span className="text-[10px] w-4 text-center text-zinc-300 font-medium">{lineWidth}</span>
                       <button onClick={() => setLineWidth(Math.min(20, lineWidth + 2))} className="text-zinc-400 hover:text-white p-1 border-l border-zinc-800"><Plus size={12}/></button>
                     </div>
                     <input 
                        type="color" 
                        value={color} 
                        onChange={e => { setColor(e.target.value); if (activeTool !== "pen") setActiveTool("pen"); }} 
                        className="w-5 h-5 rounded cursor-pointer border-none bg-transparent shrink-0" 
                     />
                     
                     {/* 👉 Dedicated Pencil/Pen Selection Button */}
                     <button onClick={() => setActiveTool("pen")} title="Pencil (Draw)" className={`shrink-0 ${activeTool === "pen" ? "text-indigo-400" : "text-zinc-400 hover:text-white"}`}><Pencil size={14} /></button>
                     
                     <button onClick={() => setActiveTool(activeTool === "fill" ? "pen" : "fill")} title="Fill Area (Flood Fill)" className={`shrink-0 ${activeTool === "fill" ? "text-indigo-400" : "text-zinc-400 hover:text-white"}`}><PaintBucket size={14} /></button>
                     <button onClick={() => setActiveTool(activeTool === "eraser" ? "pen" : "eraser")} title="Eraser" className={`shrink-0 ${activeTool === "eraser" ? "text-indigo-400" : "text-zinc-400 hover:text-white"}`}><Eraser size={14} /></button>
                     <button onClick={triggerClearCanvas} title="Clear All" className="text-red-500/80 hover:text-red-400 shrink-0"><Trash size={14} /></button>
                   </div>
                 )}
              </div>
              
              <canvas
                ref={canvasRef}
                width={350}
                height={250}
                onMouseDown={startDrawing}
                onMouseUp={stopDrawing}
                onMouseOut={stopDrawing}
                onMouseMove={draw}
                onTouchStart={startDrawing}
                onTouchEnd={stopDrawing}
                onTouchMove={draw}
                className={`w-full h-[250px] bg-zinc-900 touch-none ${isCreator && gameState.step === "playing" ? (activeTool === "fill" ? "cursor-alias" : activeTool === "eraser" ? "cursor-cell" : "cursor-crosshair") : "cursor-default"}`}
              />
            </div>

            {/* Guesses Box */}
            <div className="flex-1 flex flex-col bg-zinc-900/30 rounded-xl border border-zinc-800/50 overflow-hidden min-h-0">
              <div className="bg-zinc-900/50 px-3 py-1.5 border-b border-zinc-800/50 flex gap-1.5 items-center">
                <span className="text-[10px] font-bold text-zinc-400 uppercase">Guesses</span>
              </div>
              <div className="flex-1 p-2 overflow-y-auto space-y-1.5 scrollbar-none">
                {gameState.guesses.map((g, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    {g.guess === gameState.word ? <CheckCircle2 size={12} className="text-emerald-500" /> : <XCircle size={12} className="text-red-500" />}
                    <span className="text-zinc-500 font-medium shrink-0">[{g.user}]</span>
                    <span className={`truncate ${g.guess === gameState.word ? "text-emerald-400 font-bold" : "text-zinc-400 line-through decoration-red-500/50"}`}>{g.guess}</span>
                  </div>
                ))}
              </div>
              {!isCreator && gameState.step === "playing" && (
                <div className="p-1.5 bg-zinc-900/50 border-t border-zinc-800/50 flex gap-1.5">
                  <input type="text" value={currentGuess} onChange={e => setCurrentGuess(e.target.value)} onKeyDown={e => e.key === "Enter" && makeGuess()} placeholder="Guess what they are drawing..." className="flex-1 bg-zinc-950 border border-zinc-800 rounded-md px-2 text-xs outline-none focus:border-indigo-500 uppercase" />
                  <button onClick={makeGuess} className="bg-indigo-600 text-white p-1.5 rounded-md"><Send size={12} /></button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <AnimatePresence>
        {gameState.step === "ended" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="absolute bottom-6 text-center z-10 bg-zinc-900 border border-zinc-700 p-4 rounded-xl shadow-2xl w-[90%] max-w-sm">
            <h3 className="text-emerald-400 font-bold text-lg mb-1">{gameState.winner === username ? "You guessed it!" : `${gameState.winner} guessed it!`}</h3>
            <p className="text-sm text-zinc-300 mb-4">The drawing was: <span className="font-bold text-white">{gameState.word}</span></p>
            {isCreator && (
              <button onClick={handleRestart} className="mx-auto flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full text-sm font-semibold transition-all">
                <RotateCcw size={16} /> Draw Again
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}