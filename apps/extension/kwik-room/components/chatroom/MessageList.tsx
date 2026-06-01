import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown } from "lucide-react"
import { RefObject } from "react"
import { Message } from "../../types"
import { MessageBubble } from "../MessageBubble"
import { playSound } from "../sound"

interface MessageListProps {
  messages: Message[]
  username: string
  roomCode: string
  containerRef: RefObject<HTMLDivElement>
  endRef: RefObject<HTMLDivElement>
  showScroll: boolean
  scrollToBottom: () => void
  isMuted: boolean
}

export function MessageList({
  messages,
  username,
  roomCode,
  containerRef,
  endRef,
  showScroll,
  scrollToBottom,
  isMuted
}: MessageListProps) {
  return (
    <>
      <div ref={containerRef} className="flex-1 overflow-y-auto p-4 space-y-1 bg-gradient-to-b from-zinc-950 to-zinc-900/20 relative">
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
                currentUsername={username}
              />
            )
          })}
        </AnimatePresence>
        <div ref={endRef} />
      </div>

      <AnimatePresence>
        {showScroll && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            onClick={() => {
              scrollToBottom()
              playSound("swoosh", isMuted)
            }}
            className="absolute bottom-24 right-4 p-2 bg-zinc-800/30 border border-zinc-700/40 text-zinc-400 backdrop-blur-md shadow-lg hover:bg-zinc-800/95 hover:border-zinc-600 hover:text-white hover:shadow-xl rounded-full transition-all duration-300 ease-out z-20"
          >
            <ChevronDown size={20} />
          </motion.button>
        )}
      </AnimatePresence>
    </>
  )
}