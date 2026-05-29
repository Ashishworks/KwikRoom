import { LogOut, Users, ChevronDown, Send, Copy, Check, Gamepad2 } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { RefObject, useState } from "react"
import { Message } from "../types"
import { MessageBubble } from "./MessageBubble"
import { playSound } from "./sound"

interface ChatRoomProps {
  isMuted: boolean
  roomCode: string
  username: string
  leaveRoom: () => void
  onlineUsers: string[]
  messages: Message[]
  messagesContainerRef: RefObject<HTMLDivElement>
  messagesEndRef: RefObject<HTMLDivElement>
  showScrollButton: boolean
  scrollToBottom: () => void
  message: string
  setMessage: (val: string) => void
  sendMessage: () => void
}

export function ChatRoom({
  isMuted,
  roomCode, username, leaveRoom, onlineUsers, messages,
  messagesContainerRef, messagesEndRef, showScrollButton,
  scrollToBottom, message, setMessage, sendMessage
}: ChatRoomProps) {
  
  const [copied, setCopied] = useState(false)
  
  // 👉 NEW: State to toggle the Arena games menu
  const [showArenaMenu, setShowArenaMenu] = useState(false)

  const copyRoomCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy room code")
    }
  }

  // 👉 NEW: Function to dispatch the game invite message
  const sendGameInvite = (gameType: "tic_tac_toe") => {
    const gameId = `game_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
    
    chrome.runtime.sendMessage({
      type: "message",
      payload: { 
        room: roomCode, 
        username, 
        message: "Arena Challenge", // Fallback text for the database/logs
        type: "game_invite",
        metadata: {
          gameType,
          gameInstanceId: gameId,
          playersJoined: [username],
          maxPlayers: 2
        }
      }
    })
    
    setShowArenaMenu(false)
    scrollToBottom()
    playSound("send", isMuted)
  }

  return (
    <div className="h-screen bg-zinc-950 text-white flex flex-col selection:bg-indigo-500/30 relative">
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

      <div className="border-b border-zinc-900 bg-zinc-950/40 px-4 py-2 flex items-center gap-3 overflow-hidden select-none">
        <div className="flex items-center gap-1.5 shrink-0 text-zinc-500">
          <Users size={12} />
          <span className="text-[9px] font-bold tracking-wider uppercase text-zinc-500">
            Active ({onlineUsers.length})
          </span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-1 py-0.5 scrollbar-none">
          <style dangerouslySetInnerHTML={{ __html: `.no-scrollbar::-webkit-scrollbar { display: none; } .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }` }} />
          <AnimatePresence>
            {onlineUsers.map((user, i) => {
              const firstLetter = user.trim().charAt(0).toUpperCase() || "?"
              const isCurrentUser = user === username

              return (
                <motion.div
                  key={user + i}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex items-center gap-1.5 shrink-0 px-2 py-0.5 rounded-full border bg-zinc-900/40 border-zinc-800/60 text-[11px]"
                >
                  <div className="relative w-4 h-4 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-900 text-zinc-400 text-[9px] font-bold flex items-center justify-center border border-zinc-700/50">
                    {firstLetter}
                    <span className="absolute bottom-0 right-0 w-1 h-1 rounded-full bg-emerald-500 ring-[0.5px] ring-zinc-950" />
                  </div>
                  <span className="truncate max-w-[70px] text-zinc-400 font-medium tracking-tight">
                    {isCurrentUser ? "You" : user}
                  </span>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      </div>

      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-1 bg-gradient-to-b from-zinc-950 to-zinc-900/20">
        <AnimatePresence>
          {messages.map((msg, i) => {
            const isOwn = msg.username === username
            const isSystem = msg.username === "System"
            const prevMsg = messages[i - 1]
            const isSameUserAsPrev = prevMsg && prevMsg.username === msg.username && !isSystem
            const firstLetter = msg.username.trim().charAt(0).toUpperCase() || "?"

            return (
              <MessageBubble
                key={msg.id || i}
                msg={msg}
                isOwn={isOwn}
                isSystem={isSystem}
                isSameUserAsPrev={!!isSameUserAsPrev}
                firstLetter={firstLetter}
                index={i}
                roomCode={roomCode}
                currentUsername={username} // 👉 FIX: Passed currentUsername down to resolve the missing prop
              />
            )
          })}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      <AnimatePresence>
        {showScrollButton && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            onClick={() => {
              scrollToBottom()
              playSound("swoosh", isMuted) 
            }}
            className="absolute bottom-20 right-4 p-2 bg-zinc-800/30 border border-zinc-700/40 text-zinc-400 backdrop-blur-md shadow-lg hover:bg-zinc-800/95 hover:border-zinc-600 hover:text-white hover:shadow-xl rounded-full transition-all duration-300 ease-out z-20"
          >
            <ChevronDown size={20} />
          </motion.button>
        )}
      </AnimatePresence>

      <div className="border-t border-zinc-900 p-3 bg-zinc-950/80 backdrop-blur-xl sticky bottom-0">
        <div className="flex items-end gap-1.5 bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-1 focus-within:border-indigo-500/50 transition duration-150 relative">
          
          {/* 👉 NEW: ARENA POPOVER MENU */}
          <AnimatePresence>
            {showArenaMenu && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute bottom-[120%] left-0 w-40 bg-zinc-900/95 backdrop-blur-md border border-zinc-700/50 rounded-xl shadow-xl overflow-hidden z-50"
              >
                <div className="px-3 py-2 border-b border-zinc-800/50 bg-zinc-950/50">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Select Game</span>
                </div>
                <button 
                  onClick={() => sendGameInvite("tic_tac_toe")}
                  className="w-full text-left px-3 py-2.5 text-xs font-medium text-zinc-300 hover:bg-indigo-600 hover:text-white transition-colors flex items-center gap-2"
                >
                  <Gamepad2 size={14} />
                  Tic-Tac-Toe
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 👉 NEW: ARENA TRIGGER BUTTON */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowArenaMenu(!showArenaMenu)}
            className={`p-2 mb-0.5 rounded-lg transition-colors shrink-0 ${
              showArenaMenu 
                ? "bg-indigo-500/20 text-indigo-400" 
                : "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
            }`}
            title="Open Arena"
          >
            <Gamepad2 size={16} />
          </motion.button>

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => { 
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (message.trim()) sendMessage();
              }
            }}
            placeholder="Type a message..."
            rows={1}
            className="flex-1 bg-transparent px-2 py-2 text-sm outline-none placeholder:text-zinc-600 text-zinc-200 resize-none min-h-[36px] max-h-32 overflow-y-auto scrollbar-none"
          />

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              if (message.trim()) sendMessage();
            }}
            className="bg-indigo-600 hover:bg-indigo-500 text-white p-2 mb-0.5 rounded-lg transition-colors shrink-0"
          >
            <Send size={14} />
          </motion.button>
        </div>
      </div>
    </div>
  )
}