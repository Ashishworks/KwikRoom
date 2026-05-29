import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowLeft, Swords, RotateCcw } from "lucide-react" // 👉 NEW: Imported RotateCcw icon
import { playSound } from "../components/sound"

interface TicTacToeProps {
    isMuted: boolean
    roomCode: string
    username: string
    activeGame: { id: string, opponent: string, isX: boolean, type: string }
    setActiveGame: (game: null) => void
}

export function TicTacToeArena({ isMuted, roomCode, username, activeGame, setActiveGame }: TicTacToeProps) {
    const [board, setBoard] = useState<(string | null)[]>(Array(9).fill(null))
    const [isMyTurn, setIsMyTurn] = useState<boolean>(activeGame.isX) // X always goes first
    const [winner, setWinner] = useState<string | null>(null)

    useEffect(() => {
        const listener = (msg: any) => {
            if (msg.type === "game-updated" && msg.payload.gameInstanceId === activeGame.id) {

                // Handle incoming moves
                if (msg.payload.action === "move") {
                    setBoard(msg.payload.board)
                    setIsMyTurn(msg.payload.nextTurn === username)
                    if (msg.payload.winner) setWinner(msg.payload.winner)
                    playSound("receive", isMuted)
                }

                // Handle opponent leaving
                if (msg.payload.action === "leave") {
                    setActiveGame(null)
                }

                // 👉 NEW: Handle game restart
                if (msg.payload.action === "restart") {
                    setBoard(Array(9).fill(null))
                    setWinner(null)
                    setIsMyTurn(activeGame.isX) // Reset turns so the original X goes first
                    playSound("swoosh", isMuted) // Play a sound so both players know it reset
                }
            }
        }
        chrome.runtime.onMessage.addListener(listener)
        return () => chrome.runtime.onMessage.removeListener(listener)
    }, [activeGame.id, activeGame.isX, username, isMuted, setActiveGame])

    const handleMove = (index: number) => {
        if (board[index] || winner || !isMyTurn) return

        const newBoard = [...board]
        newBoard[index] = activeGame.isX ? "X" : "O"

        setBoard(newBoard)
        setIsMyTurn(false)
        playSound("send", isMuted)

        const calculatedWinner = calculateWinner(newBoard)
        if (calculatedWinner) setWinner(calculatedWinner)

        chrome.runtime.sendMessage({
            type: "game-action",
            payload: {
                room: roomCode,
                gameInstanceId: activeGame.id,
                action: "move",
                board: newBoard,
                nextTurn: activeGame.opponent,
                winner: calculatedWinner
            }
        })
    }

    const exitGame = () => {
        chrome.runtime.sendMessage({
            type: "game-action",
            payload: { room: roomCode, gameInstanceId: activeGame.id, action: "leave" }
        })
        setActiveGame(null)
    }

    // 👉 NEW: Send the restart signal to the room
    const handleRestart = () => {
        chrome.runtime.sendMessage({
            type: "game-action",
            payload: {
                room: roomCode,
                gameInstanceId: activeGame.id,
                action: "restart"
            }
        })
    }

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="h-screen w-full overflow-hidden bg-zinc-950 text-white flex flex-col items-center justify-center p-6 relative"
        >
            <div className="absolute top-4 left-4 w-full flex items-center justify-between pr-8">
                <button
                    onClick={exitGame}
                    className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors bg-zinc-900/50 px-3 py-1.5 rounded-full border border-zinc-800"
                >
                    <ArrowLeft size={14} />
                    <span className="text-xs font-medium">Flee Arena</span>
                </button>
            </div>

            <div className="mb-8 text-center flex flex-col items-center">
                <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center mb-4 text-indigo-400">
                    <Swords size={24} />
                </div>
                <h2 className="text-xl font-bold tracking-tight text-zinc-100 mb-1">Tic-Tac-Toe</h2>
                <p className="text-sm text-zinc-400">You vs {activeGame.opponent}</p>

                <div className="mt-4 px-4 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-semibold">
                    {winner ? (
                        <span className={winner === "Draw" ? "text-yellow-400" : winner === (activeGame.isX ? "X" : "O") ? "text-emerald-400" : "text-red-400"}>
                            {winner === "Draw" ? "It's a Draw!" : winner === (activeGame.isX ? "X" : "O") ? "You Won! 🏆" : "You Lost 💀"}
                        </span>
                    ) : (
                        <span className={isMyTurn ? "text-indigo-400 animate-pulse" : "text-zinc-500"}>
                            {isMyTurn ? "Your Turn" : "Waiting for opponent..."}
                        </span>
                    )}
                </div>
            </div>

            {/* 👉 FIX: Added grid-rows-3 to strictly enforce the vertical height of the boxes */}
            <div className="grid grid-cols-3 grid-rows-3 gap-2 w-64 h-64">
                {board.map((cell, index) => (
                    <motion.button
                        key={index}
                        whileHover={{ scale: !cell && isMyTurn && !winner ? 1.05 : 1 }}
                        whileTap={{ scale: !cell && isMyTurn && !winner ? 0.95 : 1 }}
                        onClick={() => handleMove(index)}
                        disabled={!!cell || !isMyTurn || !!winner}
                        // 👉 FIX: Added overflow-hidden to prevent the text from shifting the box dimensions
                        className={`w-full h-full overflow-hidden flex items-center justify-center text-4xl font-bold rounded-xl border ${cell ? "bg-zinc-900/80 border-zinc-700/50 cursor-default" : "bg-zinc-900/40 border-zinc-800 hover:bg-zinc-800/80 cursor-pointer"
                            }`}
                    >
                        {cell === "X" && <span className="text-indigo-400 drop-shadow-md">X</span>}
                        {cell === "O" && <span className="text-emerald-400 drop-shadow-md">O</span>}
                    </motion.button>
                ))}
            </div>

            {/* 👉 NEW: Play Again Button appears only when a winner is declared */}
            <AnimatePresence>
                {winner && (
                    <motion.button
                        initial={{ opacity: 0, y: 10, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.9 }}
                        onClick={handleRestart}
                        className="mt-8 flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full text-sm font-semibold shadow-lg shadow-indigo-600/20 transition-all active:scale-[0.98]"
                    >
                        <RotateCcw size={16} />
                        Play Again
                    </motion.button>
                )}
            </AnimatePresence>
        </motion.div>
    )
}

function calculateWinner(squares: (string | null)[]) {
    const lines = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ]
    for (let i = 0; i < lines.length; i++) {
        const [a, b, c] = lines[i]
        if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
            return squares[a]
        }
    }
    if (!squares.includes(null)) return "Draw"
    return null
}