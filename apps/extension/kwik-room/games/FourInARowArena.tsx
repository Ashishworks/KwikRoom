import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowLeft, RotateCcw, Circle } from "lucide-react"
import { playSound } from "../components/sound"

interface FourInARowProps {
  isMuted: boolean
  roomCode: string
  username: string
  activeGame: { id: string, opponent: string, isX: boolean, type: string }
  setActiveGame: (game: null) => void
}

const ROWS = 6
const COLS = 7

export function FourInARowArena({ isMuted, roomCode, username, activeGame, setActiveGame }: FourInARowProps) {
  // Board is a 1D array of 42 cells (6 rows * 7 columns)
  const [board, setBoard] = useState<(string | null)[]>(Array(ROWS * COLS).fill(null))
  const [isMyTurn, setIsMyTurn] = useState<boolean>(activeGame.isX) // Creator goes first
  const [winner, setWinner] = useState<string | null>(null)

  useEffect(() => {
    const listener = (msg: any) => {
      if (msg.type === "game-updated" && msg.payload.gameInstanceId === activeGame.id) {
        if (msg.payload.action === "move") {
           setBoard(msg.payload.board)
           setIsMyTurn(msg.payload.nextTurn === username)
           if (msg.payload.winner) setWinner(msg.payload.winner)
           playSound("receive", isMuted)
        }
        if (msg.payload.action === "leave") {
           setActiveGame(null)
        }
        if (msg.payload.action === "restart") {
           setBoard(Array(ROWS * COLS).fill(null))
           setWinner(null)
           setIsMyTurn(activeGame.isX)
           playSound("swoosh", isMuted)
        }
      }
    }
    chrome.runtime.onMessage.addListener(listener)
    return () => chrome.runtime.onMessage.removeListener(listener)
  }, [activeGame.id, activeGame.isX, username, isMuted, setActiveGame])

  const handleColumnClick = (colIndex: number) => {
    if (winner || !isMyTurn) return

    // Find the lowest available row in this column
    let targetRow = -1
    for (let r = ROWS - 1; r >= 0; r--) {
      if (!board[r * COLS + colIndex]) {
        targetRow = r
        break
      }
    }

    // Column is full
    if (targetRow === -1) return

    const newBoard = [...board]
    newBoard[targetRow * COLS + colIndex] = activeGame.isX ? "P1" : "P2"

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
      className="h-screen w-full overflow-hidden bg-zinc-950 text-white flex flex-col items-center justify-center p-4 relative"
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

      <div className="mb-4 text-center flex flex-col items-center">
        <div className="w-10 h-10 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center mb-2 text-indigo-400">
          <Circle size={20} />
        </div>
        <h2 className="text-lg font-bold tracking-tight text-zinc-100 mb-0.5">Four in a Row</h2>
        <p className="text-xs text-zinc-400 flex gap-2 items-center">
          <span className={activeGame.isX ? "text-indigo-400" : "text-emerald-400"}>You</span> 
          vs 
          <span className={!activeGame.isX ? "text-indigo-400" : "text-emerald-400"}>{activeGame.opponent}</span>
        </p>
        
        <div className="mt-3 px-4 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-semibold">
          {winner ? (
            <span className={winner === "Draw" ? "text-yellow-400" : winner === (activeGame.isX ? "P1" : "P2") ? "text-emerald-400" : "text-red-400"}>
              {winner === "Draw" ? "It's a Draw!" : winner === (activeGame.isX ? "P1" : "P2") ? "You Won! 🏆" : "You Lost 💀"}
            </span>
          ) : (
            <span className={isMyTurn ? "text-indigo-400 animate-pulse" : "text-zinc-500"}>
              {isMyTurn ? "Your Turn" : "Waiting for opponent..."}
            </span>
          )}
        </div>
      </div>

      {/* The Board */}
      <div className="bg-zinc-800/80 p-2 rounded-xl border border-zinc-700/50 shadow-2xl">
        <div className="grid grid-cols-7 grid-rows-6 gap-1.5 sm:gap-2">
          {board.map((cell, index) => {
            const col = index % COLS;
            return (
              <motion.button
                key={index}
                onClick={() => handleColumnClick(col)}
                disabled={!!winner || !isMyTurn}
                whileHover={{ scale: !winner && isMyTurn && !board[index] ? 1.05 : 1 }}
                whileTap={{ scale: !winner && isMyTurn && !board[index] ? 0.95 : 1 }}
                className={`w-7 h-7 sm:w-9 sm:h-9 rounded-full flex items-center justify-center shadow-inner transition-colors duration-200 cursor-pointer
                  ${!cell ? "bg-zinc-950 border border-zinc-900" : cell === "P1" ? "bg-indigo-500 shadow-indigo-500/50" : "bg-emerald-500 shadow-emerald-500/50"}
                `}
              />
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {winner && (
          <motion.button
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            onClick={handleRestart}
            className="mt-6 flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full text-sm font-semibold shadow-lg shadow-indigo-600/20 transition-all active:scale-[0.98]"
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
  // Check horizontal
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS - 3; c++) {
      const i = r * COLS + c;
      if (squares[i] && squares[i] === squares[i+1] && squares[i] === squares[i+2] && squares[i] === squares[i+3]) return squares[i];
    }
  }
  // Check vertical
  for (let r = 0; r < ROWS - 3; r++) {
    for (let c = 0; c < COLS; c++) {
      const i = r * COLS + c;
      if (squares[i] && squares[i] === squares[i+COLS] && squares[i] === squares[i+COLS*2] && squares[i] === squares[i+COLS*3]) return squares[i];
    }
  }
  // Check diagonal (down-right)
  for (let r = 0; r < ROWS - 3; r++) {
    for (let c = 0; c < COLS - 3; c++) {
      const i = r * COLS + c;
      if (squares[i] && squares[i] === squares[i+COLS+1] && squares[i] === squares[i+COLS*2+2] && squares[i] === squares[i+COLS*3+3]) return squares[i];
    }
  }
  // Check diagonal (up-right)
  for (let r = 3; r < ROWS; r++) {
    for (let c = 0; c < COLS - 3; c++) {
      const i = r * COLS + c;
      if (squares[i] && squares[i] === squares[i-COLS+1] && squares[i] === squares[i-COLS*2+2] && squares[i] === squares[i-COLS*3+3]) return squares[i];
    }
  }
  if (!squares.includes(null)) return "Draw";
  return null;
}