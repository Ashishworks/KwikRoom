import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowLeft, RotateCcw, Palette, Eraser, Trash, Send, CheckCircle2, XCircle, Minus, Plus, PaintBucket } from "lucide-react"
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
  
  // 👉 BRUSH SETTINGS
  const [color, setColor] = useState("#ffffff")
  const [lineWidth, setLineWidth] = useState(3)
  const [isEraser, setIsEraser] = useState(false)

  const isCreator = activeGame.isX
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawing = useRef(false)
  const lastPos = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const listener = (msg: any) => {
      if (msg.type === "game-updated" && msg.payload.gameInstanceId === activeGame.id) {
        
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

        // 👉 REAL-TIME CLEAR/FILL RECEIVER
        if (msg.payload.action === "clear_canvas" && !isCreator) clearLocalCanvas()
        if (msg.payload.action === "fill_canvas" && !isCreator) fillLocalCanvas(msg.payload.color)
        
        // 👉 CUSTOM LEAVE LOGIC
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
           playSound("swoosh", isMuted)
        }
      }
    }
    chrome.runtime.onMessage.addListener(listener)
    return () => chrome.runtime.onMessage.removeListener(listener)
  }, [activeGame.id, activeGame.creator, isMuted, setActiveGame, gameState.activePlayers, isCreator])

  // Sync state to late joiners (Creator acts as host)
  useEffect(() => {
    if (isCreator && gameState.step !== "setup") {
      const currentCanvas = canvasRef.current?.toDataURL() || null;
      chrome.runtime.sendMessage({
        type: "game-action",
        payload: { room: roomCode, gameInstanceId: activeGame.id, action: "sync", gameState: { ...gameState, canvasData: currentCanvas } }
      })
    }
  }, [activeGame.opponent]) 

  const syncState = (newState: GameState) => {
    setGameState(newState)
    chrome.runtime.sendMessage({
      type: "game-action",
      payload: { room: roomCode, gameInstanceId: activeGame.id, action: "sync", gameState: newState }
    })
  }

  // ==========================================
  // 👉 CANVAS LOGIC
  // ==========================================
  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isCreator || gameState.step !== "playing") return
    isDrawing.current = true
    const pos = getPos(e)
    lastPos.current = pos
  }

  const stopDrawing = () => {
    isDrawing.current = false
  }

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing.current || !isCreator || gameState.step !== "playing") return
    const pos = getPos(e)
    
    drawLine(lastPos.current.x, lastPos.current.y, pos.x, pos.y, color, lineWidth, true, isEraser)
    lastPos.current = pos
  }

  const drawLine = (x0: number, y0: number, x1: number, y1: number, strokeColor: string, strokeWidth: number, emit: boolean, eraserMode: boolean) => {
    const ctx = canvasRef.current?.getContext("2d")
    if (!ctx) return

    ctx.beginPath()
    ctx.moveTo(x0, y0)
    ctx.lineTo(x1, y1)
    
    if (eraserMode) {
      ctx.globalCompositeOperation = 'destination-out' // Erases pixels
      ctx.lineWidth = strokeWidth * 4 // Eraser should be slightly larger
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
    clearLocalCanvas()
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

  const triggerFillCanvas = () => {
    fillLocalCanvas(color)
    chrome.runtime.sendMessage({
      type: "game-action",
      payload: { room: roomCode, gameInstanceId: activeGame.id, action: "fill_canvas", color }
    })
  }

  const fillLocalCanvas = (fillColor: string) => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!ctx || !canvas) return
    ctx.globalCompositeOperation = 'source-over'
    ctx.fillStyle = fillColor
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  const restoreCanvas = (dataUrl: string) => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return
    const img = new Image()
    img.src = dataUrl
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0)
    }
  }

  // ==========================================
  // 👉 GAME ACTIONS
  // ==========================================
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
        <button onClick={exitGame} className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors bg-zinc-900/50 px-3 py-1.5 rounded-full border border-zinc-800">
          <ArrowLeft size={14} />
          <span className="text-xs font-medium">Flee</span>
        </button>
      </div>

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

                 {/* 👉 NEW: TOOLBAR */}
                 {isCreator && gameState.step === "playing" && (
                   <div className="flex gap-2 items-center shrink-0">
                     <div className="flex items-center bg-zinc-900 rounded-md border border-zinc-800">
                       <button onClick={() => setLineWidth(Math.max(1, lineWidth - 2))} className="text-zinc-400 hover:text-white p-1 border-r border-zinc-800"><Minus size={12}/></button>
                       <span className="text-[10px] w-4 text-center text-zinc-300 font-medium">{lineWidth}</span>
                       <button onClick={() => setLineWidth(Math.min(20, lineWidth + 2))} className="text-zinc-400 hover:text-white p-1 border-l border-zinc-800"><Plus size={12}/></button>
                     </div>
                     <input 
                        type="color" 
                        value={color} 
                        onChange={e => { setColor(e.target.value); setIsEraser(false); }} 
                        className="w-5 h-5 rounded cursor-pointer border-none bg-transparent shrink-0" 
                     />
                     <button onClick={triggerFillCanvas} title="Fill Background" className="text-zinc-400 hover:text-indigo-400 shrink-0"><PaintBucket size={14} /></button>
                     <button onClick={() => setIsEraser(!isEraser)} title="Eraser" className={`shrink-0 ${isEraser ? "text-indigo-400" : "text-zinc-400 hover:text-white"}`}><Eraser size={14} /></button>
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
                className={`w-full h-[250px] bg-zinc-900 touch-none ${isCreator && gameState.step === "playing" ? (isEraser ? "cursor-cell" : "cursor-crosshair") : "cursor-default"}`}
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