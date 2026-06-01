import { useState } from "react"
import { motion } from "framer-motion"
import { LogOut, Copy, Check } from "lucide-react"

interface ChatHeaderProps {
  roomCode: string
  username: string
  leaveRoom: () => void
}

export function ChatHeader({ roomCode, username, leaveRoom }: ChatHeaderProps) {
  const [copied, setCopied] = useState(false)

  const copyRoomCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy room code")
    }
  }

  return (
    <div className="border-b border-zinc-900 p-4 flex items-center justify-between bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-10">
      <div>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold tracking-tight text-zinc-200">Room {roomCode}</h2>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={copyRoomCode}
              className="text-zinc-500 hover:text-indigo-400 transition-colors p-1 rounded-md hover:bg-zinc-900"
              title="Copy Room Code"
            >
              {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
            </motion.button>
          </div>
        </div>
        <p className="text-[11px] text-zinc-500 mt-0.5">Signed in as <span className="text-zinc-400 font-medium">{username}</span></p>
      </div>

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={leaveRoom}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-red-500/10 border border-zinc-800 hover:border-red-500/30 text-zinc-400 hover:text-red-400 rounded-full text-xs font-medium transition-all"
      >
        <LogOut size={12} />
        <span>Exit</span>
      </motion.button>
    </div>
  )
}