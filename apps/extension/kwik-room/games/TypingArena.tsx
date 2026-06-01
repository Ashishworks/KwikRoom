import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowLeft, RotateCcw, Keyboard, Trophy, Timer, Users } from "lucide-react"
import { playSound } from "../components/sound"

interface TypingProps {
    isMuted: boolean
    roomCode: string
    username: string
    activeGame: { id: string, opponent: string, isX: boolean, type: string, creator?: string, players?: string[] }
    setActiveGame: (game: null) => void
}

interface PlayerStats {
    wpm: number;
    accuracy: number;
    index: number;
    color: string;
}

interface GameState {
    step: "setup" | "playing" | "ended";
    textIndex: number;
    timeLeft: number;
    initialTime: number;
    players: { [username: string]: PlayerStats };
    activePlayers: string[]; // Tracks connected players
}

const COLORS = ["#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#14b8a6"]

const PARAGRAPHS = [
    "The quick brown fox jumps over the lazy dog. This is a classic pangram that contains every letter of the English alphabet in a single, concise sentence. Typing it fast is a great way to warm up your fingers, build muscle memory, and improve your overall speed and accuracy before tackling a massive document. Many professional typists use this exact sentence to calibrate their mechanical keyboards before entering a major speed typing competition. Beyond just being a fun linguistic trick, mastering this specific sequence of keystrokes ensures that your hands are perfectly aligned over the home row, allowing you to react instantly and maintain a flawless rhythm without constantly looking down at your hands. Historically, typewriter technicians used this phrase to ensure all the mechanical arms were functioning smoothly without jamming together. Today, it remains the ultimate benchmark for testing switch actuation, tactile feedback, and ergonomic layouts.",
    
    "The history of space exploration is filled with moments of unimaginable triumph and heartbreaking tragedy, serving as a testament to our relentless curiosity. From the early days of the legendary Apollo missions to the modern era of reusable rockets landing gracefully on autonomous drone ships, humanity's burning desire to reach the stars has never wavered. Every successful launch represents millions of hours of meticulous engineering, intense mathematical calculations, and rigorous testing by the most brilliant minds on the planet. As we look toward establishing permanent colonies on Mars and exploring the icy moons of Jupiter, the next generation of brave astronauts will continue pushing the boundaries of what is possible. Telescopes like James Webb are peering back billions of years into the cosmic dawn, capturing the faint infrared glow of the universe's first galaxies, and proving that our quest for knowledge is truly infinite.",
    
    "In the absolute middle of a vast, uncharted ocean, a small, fog-covered island holds the forgotten secrets of a highly advanced ancient civilization. Countless brave explorers have searched for these shores for centuries, relying on faded maps and whispered rumors, but only those with a keen eye and a steady hand can uncover the truth hidden beneath the heavy sand. Legends passed down through generations say that the intricate golden artifacts buried deep within the island's underground temples possess a mysterious, glowing energy that completely defies the laws of modern science. Whoever manages to decipher the cryptic runes guarding the entrance will not only rewrite the history books but also unlock a power that has been dormant for thousands of years. Modern submersibles have recently detected strange geometric anomalies resting near the tectonic fault lines, suggesting the ruins extend far deeper into the abyss than anyone ever originally anticipated."
]

export function TypingArena({ isMuted, roomCode, username, activeGame, setActiveGame }: TypingProps) {
    const [gameState, setGameState] = useState<GameState>({
        step: "setup", textIndex: 0, timeLeft: 30, initialTime: 30, players: {}, activePlayers: activeGame.players || []
    })

    const [userInput, setUserInput] = useState("")
    const inputRef = useRef<HTMLInputElement>(null)
    const activeCharRef = useRef<HTMLSpanElement>(null) // 👉 NEW: Tracks the current typing position

    const [selectedDuration, setSelectedDuration] = useState<number | "custom">(30)
    const [customDuration, setCustomDuration] = useState("")

    const isCreator = activeGame.isX
    const targetText = PARAGRAPHS[gameState.textIndex]

    // Auto-Focus Watcher
    useEffect(() => {
        if (gameState.step === "playing") {
            setTimeout(() => inputRef.current?.focus(), 150)
        }
    }, [gameState.step])

    // 👉 NEW: Auto-Scroll Watcher
    useEffect(() => {
        if (activeCharRef.current && gameState.step === "playing") {
            // Scrolls the container so the active line is always vertically centered
            activeCharRef.current.scrollIntoView({ behavior: "smooth", block: "center" })
        }
    }, [userInput.length, gameState.step])

    // Real-time socket receiver
    useEffect(() => {
        const listener = (msg: any) => {
            if (msg.type === "game-updated" && msg.payload.gameInstanceId === activeGame.id) {
                
                // 👉 FIX: Keep track of players as they join
                if (msg.payload.action === "start") {
                    setGameState(prev => ({ ...prev, activePlayers: msg.payload.playersJoined || prev.activePlayers }))
                }

                if (msg.payload.action === "sync") {
                    setGameState(msg.payload.gameState)
                    if (msg.payload.gameState.step === "playing" && gameState.step === "setup") {
                        setUserInput("")
                        playSound("success", isMuted)
                    }
                }

                if (msg.payload.action === "update_stats") {
                    setGameState(prev => ({
                        ...prev,
                        players: {
                            ...prev.players,
                            [msg.payload.username]: { ...prev.players[msg.payload.username], ...msg.payload.stats }
                        }
                    }))
                }

                if (msg.payload.action === "leave") {
                    const leaver = msg.payload.username
                    const remaining = gameState.activePlayers.filter(p => p !== leaver)
                    if (leaver === activeGame.creator || remaining.length <= 1) setActiveGame(null)
                    else setGameState(prev => ({ ...prev, activePlayers: remaining }))
                }

                if (msg.payload.action === "restart") {
                    setGameState(prev => ({ step: "setup", textIndex: 0, timeLeft: prev.initialTime, initialTime: prev.initialTime, players: prev.players, activePlayers: prev.activePlayers }))
                    setUserInput("")
                }
            }
        }
        chrome.runtime.onMessage.addListener(listener)
        return () => chrome.runtime.onMessage.removeListener(listener)
    }, [activeGame.id, activeGame.creator, isMuted, setActiveGame, gameState.step, gameState.activePlayers])

    // Auto-sync state to late joiners (Creator acts as host)
    useEffect(() => {
        if (isCreator && gameState.step !== "setup") {
            chrome.runtime.sendMessage({
                type: "game-action",
                payload: { room: roomCode, gameInstanceId: activeGame.id, action: "sync", gameState }
            })
        }
    }, [gameState.activePlayers.length]) 

    // Universal Local Timer
    useEffect(() => {
        if (gameState.step !== "playing") return

        const interval = setInterval(() => {
            setGameState(prev => {
                const newTime = prev.timeLeft - 1

                if (newTime <= 0) {
                    clearInterval(interval)
                    if (isCreator) {
                        setTimeout(() => syncState({ ...prev, step: "ended", timeLeft: 0 }), 50)
                    }
                    playSound("receive", isMuted)
                    return { ...prev, step: "ended", timeLeft: 0 }
                }

                return { ...prev, timeLeft: newTime }
            })
        }, 1000)

        return () => clearInterval(interval)
    }, [gameState.step, isCreator, isMuted])

    // Typing Calculations
    const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (gameState.step !== "playing") return
        const val = e.target.value
        if (val.length > targetText.length) return
        setUserInput(val)

        let correctChars = 0
        for (let i = 0; i < val.length; i++) {
            if (val[i] === targetText[i]) correctChars++
        }

        const accuracy = val.length === 0 ? 100 : Math.round((correctChars / val.length) * 100)

        const timeElapsed = gameState.initialTime - gameState.timeLeft
        const minutes = timeElapsed > 0 ? timeElapsed / 60 : 1 / 60
        const wpm = Math.round((correctChars / 5) / minutes)

        chrome.runtime.sendMessage({
            type: "game-action",
            payload: { room: roomCode, gameInstanceId: activeGame.id, action: "update_stats", username, stats: { wpm: wpm || 0, accuracy, index: val.length } }
        })
    }

    const syncState = (newState: GameState) => {
        setGameState(newState)
        chrome.runtime.sendMessage({
            type: "game-action",
            payload: { room: roomCode, gameInstanceId: activeGame.id, action: "sync", gameState: newState }
        })
    }

    const handleStartGame = () => {
        let finalTime = 30;
        if (selectedDuration === "custom") {
            finalTime = parseInt(customDuration) || 30
            if (finalTime < 10) finalTime = 10
        } else {
            finalTime = selectedDuration
        }

        const initialPlayersState: { [key: string]: PlayerStats } = {}
        gameState.activePlayers.forEach((p, idx) => {
            initialPlayersState[p] = { wpm: 0, accuracy: 100, index: 0, color: COLORS[idx % COLORS.length] }
        })

        setUserInput("")

        syncState({
            ...gameState, step: "playing",
            textIndex: Math.floor(Math.random() * PARAGRAPHS.length),
            timeLeft: finalTime, initialTime: finalTime, players: initialPlayersState
        })
    }

    const formatTime = (secs: number) => {
        const m = Math.floor(secs / 60)
        const s = secs % 60
        return `${m < 10 ? `0${m}` : m}:${s < 10 ? `0${s}` : s}`
    }

    const exitGame = () => {
        chrome.runtime.sendMessage({ type: "game-action", payload: { room: roomCode, gameInstanceId: activeGame.id, action: "leave", username } })
        setActiveGame(null)
    }

    const leaderboard = Object.entries(gameState.players).map(([name, stats]) => ({ name, ...stats })).sort((a, b) => b.wpm - a.wpm)

    return (
        <motion.div className="h-screen w-full overflow-hidden bg-zinc-950 text-white flex flex-col items-center p-4 relative" onClick={() => inputRef.current?.focus()}>
            <div className="absolute top-4 left-4 w-full flex items-center justify-between pr-8 z-10">
                <button onClick={exitGame} className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors bg-zinc-900/50 px-3 py-1.5 rounded-full border border-zinc-800">
                    <ArrowLeft size={14} /> <span className="text-xs font-medium">Leave</span>
                </button>
            </div>

            <div className="mt-12 mb-3 text-center shrink-0">
                <h2 className="text-xl font-bold tracking-tight text-zinc-100 flex items-center justify-center gap-2">
                    <Keyboard size={18} className="text-indigo-400" /> Typing Battle
                </h2>
                <p className="text-xs text-zinc-500 mt-1 flex items-center justify-center gap-1">
                    <Users size={12} /> {gameState.activePlayers.length}/7 Players
                </p>
            </div>

            <div className="flex-1 w-full max-w-md flex flex-col gap-4 overflow-hidden">

                {/* SETUP SCREEN */}
                {gameState.step === "setup" && (
                    <div className="flex-1 flex flex-col justify-center items-center">
                        {isCreator ? (
                            <div className="w-full bg-zinc-900/50 p-5 rounded-2xl border border-zinc-800 text-center flex flex-col gap-3 shadow-xl">
                                <Timer size={28} className="mx-auto text-indigo-400 mb-1" />
                                <h3 className="text-sm font-bold text-white tracking-wide">Configure Timer</h3>

                                <div className="grid grid-cols-3 gap-2">
                                    {[30, 45, 60, 90, 120].map((t) => (
                                        <button
                                            key={t}
                                            onClick={() => setSelectedDuration(t)}
                                            className={`py-2 rounded-lg text-xs font-bold transition-all ${selectedDuration === t ? "bg-indigo-600 text-white border border-indigo-500 shadow-md shadow-indigo-500/20" : "bg-zinc-900/80 text-zinc-400 border border-zinc-800 hover:border-zinc-600"}`}
                                        >
                                            {t === 60 ? "1m" : t === 90 ? "1.5m" : t === 120 ? "2m" : `${t}s`}
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => setSelectedDuration("custom")}
                                        className={`py-2 rounded-lg text-xs font-bold transition-all ${selectedDuration === "custom" ? "bg-indigo-600 text-white border border-indigo-500 shadow-md shadow-indigo-500/20" : "bg-zinc-900/80 text-zinc-400 border border-zinc-800 hover:border-zinc-600"}`}
                                    >
                                        Custom
                                    </button>
                                </div>

                                <AnimatePresence>
                                    {selectedDuration === "custom" && (
                                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                pattern="[0-9]*"
                                                value={customDuration}
                                                onChange={e => {
                                                    const numericValue = e.target.value.replace(/[^0-9]/g, '');
                                                    setCustomDuration(numericValue);
                                                }}
                                                placeholder="Enter total seconds (e.g. 150)"
                                                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-indigo-500 transition-colors mt-2 text-center font-mono"
                                            />
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <button onClick={handleStartGame} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg py-2.5 text-sm font-semibold transition-all mt-2 active:scale-[0.98]">
                                    Start Typing Battle
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-3">
                                <Timer size={24} className="text-zinc-500 animate-pulse" />
                                <p className="text-xs text-zinc-500 animate-pulse font-medium">Waiting for host to configure rules...</p>
                            </div>
                        )}
                    </div>
                )}

                {/* PLAYING SCREEN */}
                {gameState.step === "playing" && (
                    <div className="flex flex-col h-full gap-4">
                        <div className="flex items-center justify-between bg-zinc-900/80 p-3 rounded-xl border border-zinc-800 shrink-0">
                            <div className="text-xs text-zinc-400">WPM: <span className="text-indigo-400 font-black text-lg ml-1">{gameState.players[username]?.wpm || 0}</span></div>
                            <div className="text-xl font-black font-mono text-zinc-200">{formatTime(gameState.timeLeft)}</div>
                            <div className="text-xs text-zinc-400">ACC: <span className="text-emerald-400 font-black text-lg ml-1">{gameState.players[username]?.accuracy || 100}%</span></div>
                        </div>

                        <input
                            ref={inputRef} type="text" value={userInput} onChange={handleTyping}
                            className="absolute opacity-0 -z-10 cursor-default"
                            autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck="false"
                        />

                        {/* 👉 FIX: Reduced line spacing (leading-[1.8rem]) + scrollbar-none to make it look clean */}
                        <div className="bg-zinc-900/40 p-5 rounded-xl border border-zinc-800/50 flex-1 overflow-y-auto text-sm leading-[1.8rem] font-mono shadow-inner relative whitespace-pre-wrap scrollbar-none">
                            {targetText.split("").map((char, i) => {

                                let colorClass = "text-zinc-600"
                                if (i < userInput.length) colorClass = userInput[i] === char ? "text-zinc-200" : "text-red-400 bg-red-900/30 underline"

                                const opponentsHere = Object.entries(gameState.players).filter(([name, p]) => p.index === i && name !== username)

                                return (
                                    <span 
                                        key={i} 
                                        // 👉 FIX: Attach the ref to the current typing index
                                        ref={i === userInput.length ? activeCharRef : null} 
                                        className={`relative inline-block whitespace-pre ${colorClass}`}
                                    >
                                        {opponentsHere.map(([name, p], idx) => (
                                            <div key={name}>
                                                <div className="absolute bottom-[85%] left-0 flex flex-col items-start -ml-[1px] transition-all" style={{ zIndex: 10 + idx }}>
                                                    <span className="text-[9px] px-1.5 py-0.5 rounded text-white font-sans font-bold leading-none shadow-md whitespace-nowrap" style={{ backgroundColor: p.color }}>
                                                        {name}
                                                    </span>
                                                </div>
                                                <div className="absolute left-0 top-[10%] h-[80%] w-[2px]" style={{ backgroundColor: p.color, zIndex: 10 + idx }} />
                                            </div>
                                        ))}

                                        {i === userInput.length && (
                                            <span className="absolute left-0 top-[10%] h-[80%] w-[2px] bg-zinc-300 animate-pulse z-20" />
                                        )}
                                        {char}
                                    </span>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* ENDED LEADERBOARD */}
                <AnimatePresence>
                    {gameState.step === "ended" && (
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex-1 flex flex-col justify-center items-center h-full pb-10">
                            <div className="w-full bg-zinc-900 border border-zinc-700 p-5 rounded-2xl flex flex-col">
                                <Trophy className="mx-auto text-yellow-500 mb-3" size={32} />
                                <h3 className="text-lg font-black text-center text-white mb-4 uppercase">Final Results</h3>
                                <div className="space-y-2 mb-4">
                                    {leaderboard.map((p, i) => (
                                        <div key={p.name} className="flex items-center justify-between p-3 rounded-lg border bg-zinc-950/50 border-zinc-800/50">
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm font-black text-zinc-500">#{i + 1}</span>
                                                <span className="text-xs font-semibold text-zinc-300" style={{ color: p.color }}>{p.name}</span>
                                            </div>
                                            <div className="text-right flex gap-3">
                                                <div className="flex flex-col"><span className="text-[9px] text-zinc-500">WPM</span><span className="text-xs font-mono font-bold">{p.wpm}</span></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {isCreator && <button onClick={() => chrome.runtime.sendMessage({ type: "game-action", payload: { room: roomCode, gameInstanceId: activeGame.id, action: "restart" } })} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg py-2.5 text-xs font-bold"><RotateCcw size={14} className="inline mr-2" /> Reconfigure Game</button>}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    )
}