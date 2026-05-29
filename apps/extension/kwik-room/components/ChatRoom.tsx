import { LogOut, Users, ChevronDown, Send } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { RefObject } from "react"
import { Message } from "../types"
import { MessageBubble } from "./MessageBubble"

interface ChatRoomProps {
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
  roomCode, username, leaveRoom, onlineUsers, messages,
  messagesContainerRef, messagesEndRef, showScrollButton,
  scrollToBottom, message, setMessage, sendMessage
}: ChatRoomProps) {
  return (
    <div className="h-screen bg-zinc-950 text-white flex flex-col selection:bg-indigo-500/30 relative">
      <div className="border-b border-zinc-900 p-4 flex items-center justify-between bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-10">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
            <h2 className="text-sm font-semibold tracking-tight text-zinc-200">Room {roomCode}</h2>
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
            onClick={scrollToBottom}
            className="absolute bottom-20 right-4 p-2 bg-zinc-800/30 border border-zinc-700/40 text-zinc-400 backdrop-blur-md shadow-lg hover:bg-zinc-800/95 hover:border-zinc-600 hover:text-white hover:shadow-xl rounded-full transition-all duration-300 ease-out z-20"
          >
            <ChevronDown size={20} />
          </motion.button>
        )}
      </AnimatePresence>

      <div className="border-t border-zinc-900 p-3 bg-zinc-950/80 backdrop-blur-xl sticky bottom-0">
        <div className="flex items-center gap-1.5 bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-1 focus-within:border-indigo-500/50 transition duration-150">
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") sendMessage() }}
            placeholder="Type a message..."
            className="flex-1 bg-transparent px-3 py-1.5 text-sm outline-none placeholder:text-zinc-600 text-zinc-200"
          />
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={sendMessage}
            className="bg-indigo-600 hover:bg-indigo-500 text-white p-2 rounded-lg transition-colors shrink-0"
          >
            <Send size={14} />
          </motion.button>
        </div>
      </div>
    </div>
  )
}