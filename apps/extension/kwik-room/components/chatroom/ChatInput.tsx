import { useState, useRef, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Send, AtSign } from "lucide-react"

interface ChatInputProps {
  message: string
  setMessage: (val: string) => void
  sendMessage: () => void
  roomCode: string
  username: string
  onlineUsers: string[]
}

export function ChatInput({
  message,
  setMessage,
  sendMessage,
  roomCode,
  username,
  onlineUsers
}: ChatInputProps) {
  // Autocomplete State
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestionSearch, setSuggestionSearch] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(0)

  // Typing Refs
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Mentions Logic
  const allMentionables = useMemo(() => {
    const list = ["kiwi", ...onlineUsers.filter(user => user !== username)]
    return Array.from(new Set(list))
  }, [onlineUsers, username])

  const filteredSuggestions = useMemo(() => {
    if (!suggestionSearch) return allMentionables
    return allMentionables.filter(item => item.toLowerCase().includes(suggestionSearch))
  }, [allMentionables, suggestionSearch])

  const emitTyping = (isTyping: boolean) => {
    chrome.runtime.sendMessage({
      type: "typing",
      payload: { room: roomCode, username, isTyping }
    })
  }

  const handleInputChange = (text: string) => {
    setMessage(text)

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)

    if (text.trim() === "") {
      emitTyping(false)
    } else {
      emitTyping(true)
      typingTimeoutRef.current = setTimeout(() => {
        emitTyping(false)
      }, 1500)
    }

    const lastAtIdx = text.lastIndexOf("@")
    if (lastAtIdx !== -1) {
      const textAfterAt = text.substring(lastAtIdx + 1)
      if (!textAfterAt.includes(" ")) {
        setShowSuggestions(true)
        setSuggestionSearch(textAfterAt.toLowerCase())
        setSelectedIndex(0)
        return
      }
    }
    setShowSuggestions(false)
  }

  const handleSend = () => {
    if (message.trim()) {
      sendMessage()
      setShowSuggestions(false)
      emitTyping(false)
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    }
  }

  const completeMention = (chosenName: string) => {
    const lastAtIdx = message.lastIndexOf("@")
    if (lastAtIdx !== -1) {
      const prefix = message.substring(0, lastAtIdx)
      setMessage(`${prefix}@${chosenName} `)
    }
    setShowSuggestions(false)
  }

  return (
    <div className="flex items-end gap-1.5 flex-1 relative">
      {/* Autocomplete Floating Panel */}
      <AnimatePresence>
        {showSuggestions && filteredSuggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            className="absolute bottom-[115%] left-0 w-48 bg-zinc-900/95 backdrop-blur-md border border-zinc-800 rounded-xl shadow-2xl overflow-hidden max-h-48 overflow-y-auto z-50 flex flex-col p-1 scrollbar-none"
          >
            <div className="px-2 py-1 flex items-center gap-1 border-b border-zinc-800/50 mb-1 text-zinc-500 bg-zinc-950/30">
              <AtSign size={10} className="text-zinc-600" />
              <span className="text-[9px] font-bold uppercase tracking-wider">Mention</span>
            </div>
            {filteredSuggestions.map((item, idx) => (
              <button
                key={item}
                onClick={() => completeMention(item)}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`w-full text-left px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center justify-between group ${
                  idx === selectedIndex
                    ? "bg-indigo-600 text-white"
                    : "text-zinc-400 hover:bg-zinc-800/60"
                }`}
              >
                <span className="truncate">@{item}</span>
                {item === "kiwi" && (
                  <span className={`text-[9px] px-1 py-0.5 rounded font-bold ${idx === selectedIndex ? "bg-indigo-500 text-indigo-100" : "bg-teal-500/10 text-teal-400 border border-teal-500/20"}`}>
                    AI
                  </span>
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <textarea
        value={message}
        onChange={(e) => handleInputChange(e.target.value)}
        onKeyDown={(e) => {
          if (showSuggestions && filteredSuggestions.length > 0) {
            if (e.key === "ArrowDown") {
              e.preventDefault()
              setSelectedIndex((prev) => (prev + 1) % filteredSuggestions.length)
              return
            }
            if (e.key === "ArrowUp") {
              e.preventDefault()
              setSelectedIndex((prev) => (prev - 1 + filteredSuggestions.length) % filteredSuggestions.length)
              return
            }
            if (e.key === "Enter" || e.key === "Tab") {
              e.preventDefault()
              completeMention(filteredSuggestions[selectedIndex])
              return
            }
            if (e.key === "Escape") {
              e.preventDefault()
              setShowSuggestions(false)
              return
            }
          }

          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            handleSend()
          }
        }}
        placeholder="Say hello, or chat with @kiwi AI..."
        rows={1}
        className="flex-1 bg-transparent px-2 py-2 text-sm outline-none placeholder:text-zinc-600 text-zinc-200 resize-none min-h-[36px] max-h-32 overflow-y-auto scrollbar-none"
      />

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleSend}
        className="bg-indigo-600 hover:bg-indigo-500 text-white p-2 mb-0.5 rounded-lg transition-colors shrink-0"
      >
        <Send size={14} />
      </motion.button>
    </div>
  )
}