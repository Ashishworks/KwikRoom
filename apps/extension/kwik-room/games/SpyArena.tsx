import { useState, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowLeft, RotateCcw, Shield, HelpCircle, AlertTriangle, CheckCircle2, Timer, Send } from "lucide-react"
import { playSound } from "../components/sound"

interface SpyProps {
  isMuted: boolean
  roomCode: string
  username: string
  activeGame: { id: string, opponent: string, isX: boolean, type: string, creator?: string, players?: string[] }
  setActiveGame: (game: null) => void
}

interface GameState {
  step: "setup" | "playing" | "accuse" | "ended"
  spy: string
  location: string
  activePlayers: string[]
  accusedPlayer: string | null
  votes: { [voter: string]: boolean } 
  winner: "spy" | "crew" | null
  winReason: string
  timeLeft: number
  messages: { user: string, text: string }[]
}

const LOCATIONS = [
  "Submarine", "Space Station", "Movie Studio", "Casino", "Pirate Ship",
  "Polar Station", "Crusader Army", "Corporate Office", "Amusement Park", "Hospital"
]

export function SpyArena({ isMuted, roomCode, username, activeGame, setActiveGame }: SpyProps) {
  const [gameState, setGameState] = useState<GameState>({
    step: "setup", spy: "", location: "", activePlayers: activeGame.players || [],
    accusedPlayer: null, votes: {}, winner: null, winReason: "", timeLeft: 240, messages: []
  })

  // Chat Input State
  const [chatInput, setChatInput] = useState("")
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Resizer & Spy Tab State
  const [actionPanelHeight, setActionPanelHeight] = useState(200)
  const isDragging = useRef(false)
  
  // 👉 NEW: State to track which panel the Spy is currently looking at
  const [spyTab, setSpyTab] = useState<"intercept" | "accuse">("intercept")

  const isCreator = activeGame.isX
  const amISpy = gameState.spy === username

  // 👉 RESIZER HANDLERS
  const startDrag = () => {
    isDragging.current = true
    document.body.style.userSelect = 'none'
  }

  const stopDrag = useCallback(() => {
    isDragging.current = false
    document.body.style.userSelect = 'auto'
  }, [])

  const onDrag = useCallback((e: MouseEvent) => {
    if (!isDragging.current) return
    const newHeight = window.innerHeight - e.clientY - 24
    setActionPanelHeight(Math.min(Math.max(newHeight, 80), 400))
  }, [])

  useEffect(() => {
    window.addEventListener("mousemove", onDrag)
    window.addEventListener("mouseup", stopDrag)
    return () => {
      window.removeEventListener("mousemove", onDrag)
      window.removeEventListener("mouseup", stopDrag)
    }
  }, [onDrag, stopDrag])

  // 👉 REALTIME SOCKET LISTENER
  useEffect(() => {
    const listener = (msg: any) => {
      if (msg.type === "game-updated" && msg.payload.gameInstanceId === activeGame.id) {
        
        if (msg.payload.action === "start") {
           setGameState(prev => ({ ...prev, activePlayers: msg.payload.playersJoined || prev.activePlayers }))
        }

        if (msg.payload.action === "sync") {
          setGameState(msg.payload.gameState)
          if (msg.payload.gameState.step === "playing") playSound("receive", isMuted)
        }

        if (msg.payload.action === "chat") {
          setGameState(prev => ({
            ...prev,
            messages: [...prev.messages, { user: msg.payload.username, text: msg.payload.text }]
          }))
          playSound("receive", isMuted)
        }
        
        if (msg.payload.action === "leave") {
          const leaver = msg.payload.username
          const remaining = gameState.activePlayers.filter(p => p !== leaver)
          if (leaver === activeGame.creator || remaining.length <= 1) setActiveGame(null)
          else setGameState(prev => ({ ...prev, activePlayers: remaining }))
        }

        if (msg.payload.action === "restart") {
          setGameState(prev => ({
            step: "setup", spy: "", location: "", activePlayers: prev.activePlayers,
            accusedPlayer: null, votes: {}, winner: null, winReason: "", timeLeft: 240, messages: []
          }))
          setSpyTab("intercept") // Reset spy tab on restart
          playSound("swoosh", isMuted)
        }
      }
    }
    chrome.runtime.onMessage.addListener(listener)
    return () => chrome.runtime.onMessage.removeListener(listener)
  }, [activeGame.id, activeGame.creator, isMuted, setActiveGame, gameState.activePlayers])

  useEffect(() => {
    if (isCreator && gameState.step !== "setup") {
      chrome.runtime.sendMessage({
        type: "game-action",
        payload: { room: roomCode, gameInstanceId: activeGame.id, action: "sync", gameState }
      })
    }
  }, [activeGame.players?.length]) 

  // 👉 TIMER TICKER (Host only)
  useEffect(() => {
    if (!isCreator || gameState.step !== "playing") return
    const interval = setInterval(() => {
      if (gameState.timeLeft <= 1) {
        clearInterval(interval)
        syncState({
          ...gameState,
          step: "ended",
          winner: "spy",
          winReason: "The interrogation timer ran out before the Crew found the spy!"
        })
      } else {
        setGameState(prev => {
          const nextState = { ...prev, timeLeft: prev.timeLeft - 1 }
          chrome.runtime.sendMessage({
            type: "game-action",
            payload: { room: roomCode, gameInstanceId: activeGame.id, action: "sync", gameState: nextState }
          })
          return nextState
        })
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [isCreator, gameState.step, gameState.timeLeft])

  // 👉 CHAT AUTO-SCROLL
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [gameState.messages])

  const syncState = (newState: GameState) => {
    setGameState(newState)
    chrome.runtime.sendMessage({
      type: "game-action",
      payload: { room: roomCode, gameInstanceId: activeGame.id, action: "sync", gameState: newState }
    })
  }

  // 👉 GAME ACTIONS
  const handleStartGame = () => {
    const players = gameState.activePlayers
    const randomSpy = players[Math.floor(Math.random() * players.length)]
    const randomLocation = LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)]

    syncState({
      ...gameState, step: "playing", spy: randomSpy, location: randomLocation,
      timeLeft: 240, winner: null, accusedPlayer: null, votes: {}, messages: []
    })
    playSound("success", isMuted)
  }

  const sendChatMessage = () => {
    if (!chatInput.trim()) return
    chrome.runtime.sendMessage({
      type: "game-action",
      payload: { room: roomCode, gameInstanceId: activeGame.id, action: "chat", username, text: chatInput.trim() }
    })
    setChatInput("")
    playSound("send", isMuted)
  }

  const handleAccuse = (targetUser: string) => {
    if (gameState.step !== "playing" || targetUser === username) return
    syncState({ ...gameState, step: "accuse", accusedPlayer: targetUser, votes: {} })
  }

  const castVote = (isGuilty: boolean) => {
    const updatedVotes = { ...gameState.votes, [username]: isGuilty }
    const interactiveVoters = gameState.activePlayers.filter(p => p !== gameState.accusedPlayer)

    if (Object.keys(updatedVotes).length === interactiveVoters.length) {
      const allGuilty = Object.values(updatedVotes).every(v => v === true)
      
      if (allGuilty) {
        const caught = gameState.accusedPlayer === gameState.spy
        syncState({
          ...gameState, step: "ended", winner: caught ? "crew" : "spy",
          winReason: caught 
            ? `The room unanimously exiled ${gameState.accusedPlayer} and successfully caught the spy! 🎉`
            : `The room exiled innocent crewmember ${gameState.accusedPlayer}. The real spy was ${gameState.spy}! 💀`
        })
      } else {
        syncState({ ...gameState, step: "playing", accusedPlayer: null, votes: {} })
      }
    } else {
      syncState({ ...gameState, votes: updatedVotes })
    }
  }

  const handleSpyGuess = (guessedLocation: string) => {
    if (!amISpy || gameState.step !== "playing") return
    const isCorrect = guessedLocation === gameState.location
    syncState({
      ...gameState, step: "ended", winner: isCorrect ? "spy" : "crew",
      winReason: isCorrect
        ? `The Spy correctly deduced the secret location was the [${gameState.location}]! 🕵️‍♂️`
        : `The Spy incorrectly guessed the [${guessedLocation}]. The true secret location was the [${gameState.location}]! 🏆`
    })
  }

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${s < 10 ? "0" : ""}${s}`
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
    <motion.div className="h-screen w-full overflow-hidden bg-zinc-950 text-white flex flex-col items-center p-4 relative">
      <div className="absolute top-4 left-4 w-full flex items-center justify-between pr-8 z-10">
        <button onClick={exitGame} className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors bg-zinc-900/50 px-3 py-1.5 rounded-full border border-zinc-800">
          <ArrowLeft size={14} /> <span className="text-xs font-medium">Flee</span>
        </button>
      </div>

      <div className="mt-12 mb-3 text-center shrink-0">
        <h2 className="text-xl font-bold tracking-tight text-zinc-100">The Spy Arena</h2>
        <p className="text-xs text-zinc-500">Players Joined: {gameState.activePlayers.length}/7</p>
      </div>

      <div className="flex-1 w-full max-w-sm flex flex-col gap-2 overflow-hidden">
        
        {/* SETUP SCREEN */}
        {gameState.step === "setup" && (
          <div className="flex-1 flex flex-col justify-center items-center">
            {isCreator ? (
              <div className="w-full bg-zinc-900/50 p-5 rounded-2xl border border-zinc-800 space-y-3 text-center">
                <HelpCircle size={32} className="mx-auto text-indigo-400 animate-pulse" />
                <p className="text-xs text-zinc-400 leading-relaxed">Cross-examine each other in the game chat. Don't let the secret location slip to the Spy!</p>
                <button onClick={handleStartGame} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg py-2 text-sm font-semibold transition-all">
                  Distribute Secret Roles
                </button>
              </div>
            ) : (
              <p className="text-xs text-zinc-500 animate-pulse">Waiting for the host to distribute secret configurations...</p>
            )}
          </div>
        )}

        {/* IN-GAME ACTIVE SCREEN */}
        {gameState.step === "playing" && (
          <>
            {/* Role Header Panel */}
            <div className="shrink-0 bg-zinc-900/80 p-3 rounded-xl border border-zinc-800 text-center shadow-lg relative overflow-hidden mb-1">
              <div className="absolute top-2 right-3 flex items-center gap-1.5 text-xs font-mono font-bold text-indigo-400">
                <Timer size={13} /> {formatTime(gameState.timeLeft)}
              </div>
              {amISpy ? (
                <div>
                  <span className="text-red-400 text-[10px] font-bold tracking-wider uppercase block mb-0.5">🕵️‍♂️ Secret Assignment</span>
                  <h3 className="text-base font-black text-white">YOU ARE THE SPY</h3>
                </div>
              ) : (
                <div>
                  <span className="text-emerald-400 text-[10px] font-bold tracking-wider uppercase block mb-0.5">📍 Secret Assignment</span>
                  <h3 className="text-base font-black text-white">{gameState.location}</h3>
                </div>
              )}
            </div>

            {/* INTERROGATION CHAT LOG */}
            <div className="flex-1 flex flex-col bg-zinc-900/30 rounded-xl border border-zinc-800/50 overflow-hidden min-h-0">
              <div className="bg-zinc-900/50 px-3 py-1.5 border-b border-zinc-800/50 flex gap-1.5 items-center shrink-0">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Interrogation Log</span>
              </div>
              <div className="flex-1 p-2 overflow-y-auto space-y-2 scrollbar-none flex flex-col">
                {gameState.messages.map((m, i) => (
                  <div key={i} className={`flex w-full ${m.user === username ? "justify-end" : "justify-start"}`}>
                    <div className={`px-2.5 py-1.5 rounded-lg max-w-[85%] text-xs ${m.user === username ? "bg-indigo-600 text-white" : "bg-zinc-800 text-zinc-200 border border-zinc-700/50"}`}>
                      {m.user !== username && <span className="text-[9px] font-bold text-indigo-400 block mb-0.5">{m.user}</span>}
                      {m.text}
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <div className="p-1.5 bg-zinc-900/50 border-t border-zinc-800/50 flex gap-1.5 shrink-0">
                <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendChatMessage()} placeholder="Ask a question..." className="flex-1 bg-zinc-950 border border-zinc-800 rounded-md px-2 text-xs outline-none focus:border-indigo-500" />
                <button onClick={sendChatMessage} className="bg-indigo-600 text-white p-1.5 rounded-md"><Send size={12} /></button>
              </div>
            </div>

            {/* DRAGGABLE RESIZER BAR */}
            <div 
              onMouseDown={startDrag}
              className="h-2 w-full flex items-center justify-center cursor-row-resize shrink-0 group py-1"
            >
              <div className="w-12 h-1 bg-zinc-800 group-hover:bg-indigo-500 rounded-full transition-colors" />
            </div>

            {/* ASYMMETRICAL OPERATIONS PANELS */}
            <div 
              style={{ height: `${actionPanelHeight}px` }} 
              className="shrink-0 flex flex-col gap-2 transition-none"
            >
              {amISpy ? (
                <div className="flex-1 bg-zinc-900/30 rounded-xl border border-zinc-800 p-2 flex flex-col overflow-hidden">
                  
                  {/* 👉 NEW: Spy Navigation Tabs */}
                  <div className="flex gap-1 mb-2 shrink-0 bg-zinc-950 p-1 rounded-lg border border-zinc-800/50">
                    <button 
                      onClick={() => setSpyTab("intercept")} 
                      className={`flex-1 text-[10px] font-bold uppercase tracking-wider py-1.5 rounded-md transition-colors ${spyTab === "intercept" ? "bg-indigo-600 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"}`}
                    >
                      Intercept
                    </button>
                    <button 
                      onClick={() => setSpyTab("accuse")} 
                      className={`flex-1 text-[10px] font-bold uppercase tracking-wider py-1.5 rounded-md transition-colors ${spyTab === "accuse" ? "bg-red-600 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"}`}
                    >
                      Accuse
                    </button>
                  </div>

                  {spyTab === "intercept" ? (
                    <div className="flex-1 overflow-y-auto grid grid-cols-2 gap-1.5 pr-1 scrollbar-none">
                      {LOCATIONS.map((loc) => (
                        <button key={loc} onClick={() => handleSpyGuess(loc)} className="text-left px-2.5 py-2 text-xs bg-zinc-900/80 border border-zinc-800 hover:border-indigo-500/50 rounded-md transition-colors text-zinc-300 font-medium truncate">
                          {loc}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex-1 overflow-y-auto grid grid-cols-2 gap-1.5 pr-1 scrollbar-none">
                      {gameState.activePlayers.map((player) => (
                        <button key={player} disabled={player === username} onClick={() => handleAccuse(player)} className={`flex items-center justify-between px-2.5 py-2 text-xs border rounded-md transition-colors font-medium truncate
                          ${player === username ? "bg-zinc-950/40 border-zinc-900 text-zinc-600" : "bg-zinc-900/80 border-zinc-800 hover:border-red-500 text-zinc-300"}`}
                        >
                          <span className="truncate">{player === username ? `${player} (You)` : player}</span>
                          {player !== username && <AlertTriangle size={12} className="text-zinc-500 shrink-0 ml-1" />}
                        </button>
                      ))}
                    </div>
                  )}

                </div>
              ) : (
                <div className="flex-1 bg-zinc-900/30 rounded-xl border border-zinc-800 p-2 flex flex-col overflow-hidden">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2 block shrink-0 pl-1">Accuse Suspect</span>
                  <div className="flex-1 overflow-y-auto grid grid-cols-2 gap-1.5 pr-1 scrollbar-none">
                    {gameState.activePlayers.map((player) => (
                      <button key={player} disabled={player === username} onClick={() => handleAccuse(player)} className={`flex items-center justify-between px-2.5 py-2 text-xs border rounded-md transition-colors font-medium truncate
                        ${player === username ? "bg-zinc-950/40 border-zinc-900 text-zinc-600" : "bg-zinc-900/80 border-zinc-800 hover:border-indigo-500 text-zinc-300"}`}
                      >
                        <span className="truncate">{player === username ? `${player} (You)` : player}</span>
                        {player !== username && <AlertTriangle size={12} className="text-zinc-500 shrink-0 ml-1" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* INTERROGATION ACCUSATION SHOWDOWN */}
        {gameState.step === "accuse" && (
          <div className="flex-1 flex flex-col justify-center items-center gap-4">
            <div className="w-full bg-zinc-900 border border-zinc-800 p-5 rounded-2xl text-center shadow-2xl relative">
              <Shield className="mx-auto text-yellow-500 mb-2 animate-bounce" size={28} />
              <h3 className="text-sm font-bold text-zinc-200">Emergency Interrogation</h3>
              <p className="text-xs text-zinc-400 mt-1">
                Is <span className="text-yellow-400 font-bold">{gameState.accusedPlayer}</span> the secret spy?
              </p>
              <div className="my-4 text-[10px] font-mono text-zinc-500 bg-zinc-950 p-2 rounded-md border border-zinc-800">
                Votes Registered: {Object.keys(gameState.votes).length} / {gameState.activePlayers.length - 1}
              </div>
              {gameState.votes[username] !== undefined || username === gameState.accusedPlayer ? (
                <p className="text-xs text-zinc-500 italic">Awaiting remaining consensus tokens...</p>
              ) : (
                <div className="flex gap-2">
                  <button onClick={() => castVote(false)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold py-2 rounded-lg transition-all">Innocent</button>
                  <button onClick={() => castVote(true)} className="flex-1 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold py-2 rounded-lg transition-all shadow-md shadow-red-600/10">Guilty</button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ENDED RESOLUTION WINDOW */}
        <AnimatePresence>
          {gameState.step === "ended" && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex-1 flex flex-col justify-center items-center">
              <div className="w-full bg-zinc-900 border border-zinc-700 p-5 rounded-2xl text-center shadow-2xl space-y-4">
                <div>
                  {gameState.winner === "crew" ? <CheckCircle2 className="mx-auto text-emerald-400" size={32} /> : <AlertTriangle className="mx-auto text-red-400" size={32} />}
                  <h3 className={`text-lg font-black mt-2 ${gameState.winner === "crew" ? "text-emerald-400" : "text-red-400"}`}>
                    {gameState.winner === "crew" ? "CREW VICTORY" : "SPY VICTORY"}
                  </h3>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed bg-zinc-950 p-3 rounded-xl border border-zinc-800">{gameState.winReason}</p>
                {isCreator && (
                  <button onClick={handleRestart} className="w-full flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow-md shadow-indigo-600/20 transition-all active:scale-[0.98]">
                    <RotateCcw size={14} /> Redeploy Roles
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}