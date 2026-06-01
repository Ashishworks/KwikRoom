import { motion, AnimatePresence } from "framer-motion"

interface TypingIndicatorProps {
  typingUsers: string[]
}

export function TypingIndicator({ typingUsers }: TypingIndicatorProps) {
  
  const renderTypingState = () => {
    if (typingUsers.length === 0) return null

    let text
    if (typingUsers.length === 1) {
      text = <><span className="font-semibold text-zinc-300 pr-1">{typingUsers[0]}</span>{"is typing"}</>
    } else if (typingUsers.length === 2) {
      text = <><span className="font-semibold text-zinc-300 pr-1">{typingUsers[0]}</span>{" and "}<span className="font-semibold text-zinc-300 pl-1 pr-1">{typingUsers[1]}</span>{" are typing"}</>
    } else {
      text = <><span className="font-semibold text-zinc-300 pr-1">{typingUsers[0]}</span>{" and "}<span className="font-semibold text-zinc-300 pl-1">{typingUsers.length - 1} others</span>{" are typing"}</>
    }

    return (
      <div className="flex items-center">
        {text}
        <span className="inline-flex tracking-widest ml-0.5 w-3">
          <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1.5, times: [0, 0.5, 1], delay: 0 }}>.</motion.span>
          <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1.5, times: [0, 0.5, 1], delay: 0.3 }}>.</motion.span>
          <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1.5, times: [0, 0.5, 1], delay: 0.6 }}>.</motion.span>
        </span>
      </div>
    )
  }

  return (
    <AnimatePresence>
      {typingUsers.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          className="absolute bottom-full left-4 mb-2 pointer-events-none shadow-xl"
        >
          <div className="flex items-center text-[11px] text-zinc-400 bg-zinc-900/95 border border-zinc-800/80 px-3 py-1.5 rounded-full shadow-lg backdrop-blur-md">
            {renderTypingState()}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}