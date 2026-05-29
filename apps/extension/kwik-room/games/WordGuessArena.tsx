import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowLeft, RotateCcw, Lightbulb, Send, CheckCircle2, XCircle } from "lucide-react"
import { playSound } from "../components/sound"

interface WordGuessProps {
  isMuted: boolean
  roomCode: string
  username: string
  activeGame: { id: string, opponent: string, isX: boolean, type: string, creator?: string, players?: string[] }
  setActiveGame: (game: null) => void
}

interface GameState {
  step: "setup" | "playing" | "ended"
  word: string
  desc: string
  guesses: { user: string, guess: string }[] // Tracks WHO guessed
  hints: string[]
  revealed: number[]
  winner: string | null
  activePlayers: string[] // Tracks who is still in the room
}

export function WordGuessArena({ isMuted, roomCode, username, activeGame, setActiveGame }: WordGuessProps) {
  const [gameState, setGameState] = useState<GameState>({
    step: "setup", word: "", desc: "", guesses: [], hints: [], revealed: [], winner: null, activePlayers: activeGame.players || []
  })
  
  const [setupWord, setSetupWord] = useState("")
  const [setupDesc, setSetupDesc] = useState("")
  const [currentGuess, setCurrentGuess] = useState("")
  const [currentHint, setCurrentHint] = useState("")

  const isCreator = activeGame.isX

  useEffect(() => {
    const listener = (msg: any) => {
      if (msg.type === "game-updated" && msg.payload.gameInstanceId === activeGame.id) {
        
        if (msg.payload.action === "sync") {
           setGameState(msg.payload.gameState)
           playSound("receive", isMuted)
        }
        
        // 👉 CUSTOM LEAVE LOGIC
        if (msg.payload.action === "leave") {
           const leaver = msg.payload.username;
           const remaining = gameState.activePlayers.filter(p => p !== leaver);

           // Game ends ONLY if the creator leaves, OR if the creator is the only one left
           if (leaver === activeGame.creator || remaining.length <= 1) {
               setActiveGame(null);
           } else {
               // A guesser left. Update the players list but keep the game going!
               setGameState(prev => ({ ...prev, activePlayers: remaining }));
           }
        }

        if (msg.payload.action === "restart") {
           setGameState(prev => ({ step: "setup", word: "", desc: "", guesses: [], hints: [], revealed: [], winner: null, activePlayers: prev.activePlayers }))
           playSound("swoosh", isMuted)
        }
      }
    }
    chrome.runtime.onMessage.addListener(listener)
    return () => chrome.runtime.onMessage.removeListener(listener)
  }, [activeGame.id, activeGame.creator, isMuted, setActiveGame, gameState.activePlayers])

  // Automatically sync state to late joiners (Creator acts as host)
  useEffect(() => {
    if (isCreator && gameState.step !== "setup") {
      chrome.runtime.sendMessage({
        type: "game-action",
        payload: { room: roomCode, gameInstanceId: activeGame.id, action: "sync", gameState }
      })
    }
  }, [activeGame.opponent]) 

  const syncState = (newState: GameState) => {
    setGameState(newState)
    chrome.runtime.sendMessage({
      type: "game-action",
      payload: { room: roomCode, gameInstanceId: activeGame.id, action: "sync", gameState: newState }
    })
    playSound("send", isMuted)
  }

  // 👉 P1 Actions
  const startGame = () => {
    if (!setupWord.trim() || !setupDesc.trim()) return
    syncState({ ...gameState, step: "playing", word: setupWord.trim().toUpperCase(), desc: setupDesc.trim() })
  }

  const sendHint = () => {
    if (!currentHint.trim()) return
    syncState({ ...gameState, hints: [...gameState.hints, currentHint.trim()] })
    setCurrentHint("")
  }

  const revealLetter = (index: number) => {
    if (gameState.revealed.includes(index) || gameState.word[index] === " ") return
    syncState({ ...gameState, revealed: [...gameState.revealed, index] })
  }

  // 👉 P2 Actions
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
  }

  const exitGame = () => {
    // 👉 Send username with the leave action so we know who left!
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
          <span className="text-xs font-medium">Flee Arena</span>
        </button>
      </div>

      <div className="mt-12 mb-4 text-center">
        <h2 className="text-xl font-bold tracking-tight text-zinc-100">Word Guess</h2>
        <p className="text-xs text-zinc-400">Players: {gameState.activePlayers.length}/7</p>
      </div>

      <div className="flex-1 w-full max-w-sm flex flex-col gap-4 overflow-hidden">
        
        {/* SETUP PHASE */}
        {gameState.step === "setup" && (
          <div className="flex-1 flex flex-col justify-center items-center">
            {isCreator ? (
              <div className="w-full space-y-4 bg-zinc-900/50 p-5 rounded-2xl border border-zinc-800">
                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 block">Secret Word</label>
                  <input type="text" value={setupWord} onChange={e => setSetupWord(e.target.value)} placeholder="e.g. ELEPHANT" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500 uppercase" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 block">Short Description</label>
                  <textarea value={setupDesc} onChange={e => setSetupDesc(e.target.value)} placeholder="A large animal with a trunk..." rows={2} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500 resize-none" />
                </div>
                <button onClick={startGame} disabled={!setupWord || !setupDesc} className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg py-2.5 text-sm font-semibold transition-all">
                  Start Game
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 text-zinc-500 animate-pulse">
                <Lightbulb size={32} />
                <p className="text-sm font-medium">Waiting for {activeGame.creator} to pick a word...</p>
              </div>
            )}
          </div>
        )}

        {/* PLAYING & ENDED PHASE */}
        {gameState.step !== "setup" && (
          <>
            <div className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800 text-center">
              <p className="text-xs text-indigo-400 font-medium mb-3">"{gameState.desc}"</p>
              <div className="flex flex-wrap justify-center gap-1.5">
                {gameState.word.split("").map((char, i) => {
                  if (char === " ") return <div key={i} className="w-3" /> 
                  const isRevealed = gameState.revealed.includes(i) || gameState.step === "ended"
                  return (
                    <motion.button
                      key={i}
                      whileHover={{ scale: isCreator && !isRevealed && gameState.step === "playing" ? 1.1 : 1 }}
                      onClick={() => isCreator && gameState.step === "playing" ? revealLetter(i) : null}
                      disabled={!isCreator || isRevealed || gameState.step === "ended"}
                      className={`w-8 h-10 rounded-md flex items-center justify-center text-lg font-bold border transition-colors ${
                        isRevealed 
                          ? "bg-zinc-800 border-zinc-700 text-white" 
                          : "bg-zinc-950 border-zinc-800 text-transparent"
                      } ${isCreator && !isRevealed && gameState.step === "playing" ? "cursor-pointer hover:border-indigo-500" : "cursor-default"}`}
                    >
                      {char}
                    </motion.button>
                  )
                })}
              </div>
              {isCreator && gameState.step === "playing" && (
                <p className="text-[10px] text-zinc-500 mt-3">Click a hidden letter to reveal it.</p>
              )}
            </div>

            <div className="flex-1 flex flex-col gap-3 min-h-0">
              {/* Hints Box */}
              <div className="flex-1 flex flex-col bg-zinc-900/30 rounded-xl border border-zinc-800/50 overflow-hidden">
                <div className="bg-zinc-900/50 px-3 py-1.5 border-b border-zinc-800/50 flex gap-1.5 items-center">
                  <Lightbulb size={12} className="text-yellow-500" />
                  <span className="text-[10px] font-bold text-zinc-400 uppercase">Hints</span>
                </div>
                <div className="flex-1 p-2 overflow-y-auto space-y-1.5 scrollbar-none">
                  {gameState.hints.length === 0 ? (
                    <p className="text-xs text-zinc-600 text-center italic mt-2">No hints yet.</p>
                  ) : (
                    gameState.hints.map((h, i) => <div key={i} className="bg-zinc-800/50 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 border border-zinc-700/30">{h}</div>)
                  )}
                </div>
                {isCreator && gameState.step === "playing" && (
                  <div className="p-1.5 bg-zinc-900/50 border-t border-zinc-800/50 flex gap-1.5">
                    <input type="text" value={currentHint} onChange={e => setCurrentHint(e.target.value)} onKeyDown={e => e.key === "Enter" && sendHint()} placeholder="Send a hint..." className="flex-1 bg-zinc-950 border border-zinc-800 rounded-md px-2 text-xs outline-none focus:border-indigo-500" />
                    <button onClick={sendHint} className="bg-indigo-600 text-white p-1.5 rounded-md"><Send size={12} /></button>
                  </div>
                )}
              </div>

              {/* Guesses Box */}
              <div className="flex-1 flex flex-col bg-zinc-900/30 rounded-xl border border-zinc-800/50 overflow-hidden">
                <div className="bg-zinc-900/50 px-3 py-1.5 border-b border-zinc-800/50 flex gap-1.5 items-center">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase">Opponent Guesses</span>
                </div>
                <div className="flex-1 p-2 overflow-y-auto space-y-1.5 scrollbar-none">
                  {gameState.guesses.map((g, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      {g.guess === gameState.word ? <CheckCircle2 size={12} className="text-emerald-500" /> : <XCircle size={12} className="text-red-500" />}
                      <span className="text-zinc-500 font-medium">[{g.user}]</span>
                      <span className={g.guess === gameState.word ? "text-emerald-400 font-bold" : "text-zinc-400 line-through decoration-red-500/50"}>{g.guess}</span>
                    </div>
                  ))}
                </div>
                {!isCreator && gameState.step === "playing" && (
                  <div className="p-1.5 bg-zinc-900/50 border-t border-zinc-800/50 flex gap-1.5">
                    <input type="text" value={currentGuess} onChange={e => setCurrentGuess(e.target.value)} onKeyDown={e => e.key === "Enter" && makeGuess()} placeholder="Guess the word..." className="flex-1 bg-zinc-950 border border-zinc-800 rounded-md px-2 text-xs outline-none focus:border-indigo-500 uppercase" />
                    <button onClick={makeGuess} className="bg-indigo-600 text-white p-1.5 rounded-md"><Send size={12} /></button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      <AnimatePresence>
        {gameState.step === "ended" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 text-center z-10 bg-zinc-900 border border-zinc-700 p-4 rounded-xl shadow-2xl w-full max-w-sm">
            <h3 className="text-emerald-400 font-bold text-lg mb-1">{gameState.winner === username ? "You guessed it!" : `${gameState.winner} guessed it!`}</h3>
            <p className="text-sm text-zinc-300 mb-4">The word was <span className="font-bold text-white">{gameState.word}</span></p>
            {isCreator && (
              <button onClick={handleRestart} className="mx-auto flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full text-sm font-semibold transition-all">
                <RotateCcw size={16} /> Play Again
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}