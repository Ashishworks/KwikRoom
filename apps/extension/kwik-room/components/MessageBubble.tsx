import { motion } from "framer-motion"
import { Message } from "../types"

interface MessageBubbleProps {
  msg: Message
  isOwn: boolean
  isSystem: boolean
  isSameUserAsPrev: boolean
  firstLetter: string
  index: number
}

export function MessageBubble({ msg, isOwn, isSystem, isSameUserAsPrev, firstLetter, index }: MessageBubbleProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      // 👉 FIX 1: Added w-full so the main flex container respects screen width
      className={`w-full flex items-end gap-2 ${isSystem ? "justify-center py-2" : isOwn ? "justify-end" : "justify-start"} ${!isSameUserAsPrev && index !== 0 ? "pt-2.5" : ""}`}
    >
      {!isOwn && !isSystem && (
        <div className="w-5 h-5 shrink-0 flex items-center justify-center mb-0.5">
          {!isSameUserAsPrev ? (
            <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white text-[10px] font-bold flex items-center justify-center border border-indigo-500/10">
              {firstLetter}
            </div>
          ) : (
            <div className="w-5" />
          )}
        </div>
      )}

      {isSystem ? (
        <div className="bg-zinc-900/30 border border-zinc-800/40 rounded-full px-3 py-0.5 text-center">
          <p className="text-[10px] font-medium text-zinc-500 tracking-tight">{msg.text}</p>
        </div>
      ) : (
        // 👉 FIX 2: Added min-w-0. This forces the flex child to respect max-w-[80%] and shrink!
        <div className={`flex flex-col max-w-[80%] min-w-0 ${isOwn ? "items-end" : "items-start"}`}>
          {!isSameUserAsPrev && (
            <div className="mb-0.5 px-1">
              <span className={`text-[10px] font-semibold tracking-tight ${isOwn ? "text-zinc-500" : "text-indigo-400"}`}>
                {isOwn ? "You" : msg.username}
              </span>
            </div>
          )}

          {/* 👉 FIX 3: Added w-full here */}
          <div className={`px-3 py-2 rounded-2xl text-[13px] relative w-full ${isOwn ? "bg-indigo-600 text-white rounded-br-sm" : "bg-zinc-900 text-zinc-100 border border-zinc-800/60 rounded-bl-sm"} ${isSameUserAsPrev ? "!rounded-2xl" : ""}`}>
            <div className="flex flex-col gap-0.5">
              {/* 👉 FIX 4: Moved break-words directly onto the paragraph tag */}
              <p className="whitespace-pre-wrap break-words leading-relaxed pr-1 text-zinc-100">{msg.text}</p>
              <span className={`text-[8px] font-medium mt-1 block text-right ${isOwn ? "text-indigo-200/60" : "text-zinc-500"}`}>
                {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}
              </span>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  )
}