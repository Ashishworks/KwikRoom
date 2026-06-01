import { useState, useRef, useMemo, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Send, AtSign, Smile } from "lucide-react"
import EmojiPicker, { Theme } from "emoji-picker-react"

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

  // Emoji Picker State
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const emojiPickerRef = useRef<HTMLDivElement>(null)
  // 👉 NEW: Ref for toggle button to prevent click-outside event collision
  const emojiButtonRef = useRef<HTMLButtonElement>(null)

  // Ref to handle height expansion/shrinkage
  const textareaRef = useRef<HTMLTextAreaElement>(null)

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

  // Auto-growing & auto-shrinking text layout monitor
  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    // Force back to the exact 1-line baseline first
    textarea.style.height = "36px"

    // Measure if the content is fighting to overflow that 36px boundary
    const scrollHeight = textarea.scrollHeight

    // Only grow if the text actually wraps or hits a newline pushing past 36px
    if (scrollHeight > 36) {
      textarea.style.height = `${Math.min(scrollHeight, 128)}px`
    }
  }, [message])

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
      setShowEmojiPicker(false) 
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

  const onEmojiClick = (emojiObject: any) => {
    setMessage(message + emojiObject.emoji)
  }

  // 👉 FIXED: Close emoji picker when clicking outside, excluding the toggle button itself
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        showEmojiPicker &&
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(e.target as Node) &&
        emojiButtonRef.current &&
        !emojiButtonRef.current.contains(e.target as Node)
      ) {
        setShowEmojiPicker(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [showEmojiPicker])

  return (
    <div className="flex items-end gap-1.5 flex-1 relative">
      
      {/* Floating Emoji Picker */}
      <AnimatePresence>
        {showEmojiPicker && (
          <motion.div
            ref={emojiPickerRef}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute bottom-[115%] left-0 z-50 shadow-2xl origin-bottom-left"
          >
            {/* 👉 FIXED: Added explicit height and width props to make the picker smaller */}
            <EmojiPicker 
              onEmojiClick={onEmojiClick} 
              theme={Theme.DARK} 
              width="290px"
              height="340px"
              autoFocusSearch={false}
              lazyLoadEmojis={true}
              searchPlaceHolder="Search..."
            />
          </motion.div>
        )}
      </AnimatePresence>

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

      {/* 👉 FIXED: Added emojiButtonRef to toggle reliably */}
      <motion.button
        ref={emojiButtonRef}
        type="button"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
        className={`p-2 mb-0.5 rounded-lg transition-colors shrink-0 ${
          showEmojiPicker 
            ? "bg-indigo-500/20 text-indigo-400" 
            : "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
        }`}
        title="Toggle Emojis"
      >
        <Smile size={18} strokeWidth={2} />
      </motion.button>

      {/* TEXTAREA WITH BALANCED BOUNDS AND SCROLLBAR HIDING */}
      <textarea
        ref={textareaRef}
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
        placeholder="Say hi, or chat with @kiwi AI"
        className="flex-1 bg-transparent px-2 py-2 text-sm outline-none placeholder:text-zinc-600 text-zinc-200 resize-none min-h-[36px] max-h-32 overflow-y-auto scrollbar-none style-scrollbar-hidden"
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none"
        }}
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