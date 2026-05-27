import "./style.css"
import { Send, Users, LogOut } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useEffect, useRef, useState } from "react"

function Sidepanel() {
  const [username, setUsername] = useState("")
  const [roomCode, setRoomCode] = useState("")
  const [currentRoom, setCurrentRoom] = useState("")
  const [message, setMessage] = useState("")
  const [messages, setMessages] = useState<
    {
      username: string
      text: string
      timestamp: number
    }[]
  >([])
  const [onlineUsers, setOnlineUsers] = useState<string[]>([])

  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const savedUsername = localStorage.getItem("username")
    if (savedUsername) {
      setUsername(savedUsername)
    }

    const listener = (message: any) => {
      console.log("SIDEPANEL RECEIVED:", message)

      // NEW MESSAGE
      if (message.type === "new-message") {
        setMessages((prev) => [...prev, message.payload])
      }

      // ONLINE USERS
      if (message.type === "online-users") {
        setOnlineUsers(message.payload)
      }

      // ROOM CREATED
      if (message.type === "room-created") {
        const createdRoomCode = message.payload.code
        setCurrentRoom(createdRoomCode)
        setRoomCode(createdRoomCode)

        chrome.runtime.sendMessage({
          type: "join-room",
          payload: {
            room: createdRoomCode,
            username: localStorage.getItem("username"),
          },
        })
      }
    }

    chrome.runtime.onMessage.addListener(listener)

    return () => {
      chrome.runtime.onMessage.removeListener(listener)
    }
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // CREATE ROOM
  const createRoom = () => {
    if (!username.trim()) return

    localStorage.setItem("username", username)

    chrome.runtime.sendMessage({
      type: "create-room",
      payload: { username },
    })
  }

  // JOIN ROOM
  const joinRoom = () => {
    if (!roomCode.trim() || !username.trim()) return

    localStorage.setItem("username", username)

    chrome.runtime.sendMessage({
      type: "join-room",
      payload: {
        room: roomCode,
        username,
      },
    })

    setCurrentRoom(roomCode)
  }

  // LEAVE ROOM
  const leaveRoom = () => {
    chrome.runtime.sendMessage({
      type: "leave-room",
      payload: {
        room: currentRoom,
        username,
      },
    })
    
    setCurrentRoom("")
    setMessages([])
    setOnlineUsers([])
  }

  // SEND MESSAGE
  const sendMessage = () => {
    if (!message.trim()) return

    chrome.runtime.sendMessage({
      type: "send-message",
      payload: {
        room: currentRoom,
        username,
        message,
      },
    })

    setMessage("")
  }

  // JOIN SCREEN
  if (!currentRoom) {
    return (
      <div className="h-screen bg-zinc-950 text-white flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full bg-zinc-900/70 backdrop-blur-xl border border-zinc-800 rounded-3xl p-6 shadow-2xl"
        >
          <div className="mb-6">
            <h1 className="text-3xl font-bold tracking-tight">KwikRoom</h1>
            <p className="text-zinc-400 text-sm mt-1">Realtime rooms for collaboration</p>
          </div>

          <div className="space-y-4">
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 transition"
            />

            <input
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="Room Code"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 transition"
            />

            <button
              onClick={joinRoom}
              className="w-full bg-indigo-600 hover:bg-indigo-500 rounded-xl py-3 font-medium transition-all"
            >
              Join Room
            </button>

            <button
              onClick={createRoom}
              className="w-full bg-zinc-800 hover:bg-zinc-700 rounded-xl py-3 font-medium transition-all"
            >
              Create Room
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  // CHAT SCREEN
  return (
    <div className="h-screen bg-zinc-950 text-white flex flex-col">
      {/* HEADER */}
      <div className="border-b border-zinc-800/80 p-4 flex items-center justify-between bg-zinc-900/40 backdrop-blur-lg">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Room {currentRoom}</h2>
          <p className="text-xs text-zinc-400">Connected as {username}</p>
        </div>

        {/* PILL EXIT BUTTON */}
        <button
          onClick={leaveRoom}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-black border border-red-500/30 text-red-400 rounded-full text-xs font-medium transition-all duration-200 hover:bg-red-500 hover:text-white hover:border-red-500 shadow-lg shadow-red-950/20"
        >
          <LogOut size={13} />
          Exit Room
        </button>
      </div>

      {/* MODERN ONLINE USERS ROW */}
      <div className="border-b border-zinc-800/60 bg-zinc-900/20 px-4 py-2.5 flex items-center gap-4 overflow-hidden select-none">
        <div className="flex items-center gap-1.5 shrink-0 text-zinc-400">
          <Users size={14} className="text-zinc-500" />
          <span className="text-xs font-semibold tracking-wide uppercase text-[10px]">
            Active ({onlineUsers.length})
          </span>
        </div>

        {/* Horizontal Scrolling Track */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar flex-1 py-0.5">
          <AnimatePresence>
            {onlineUsers.map((user, i) => {
              const firstLetter = user.trim().charAt(0).toUpperCase() || "?"
              const isCurrentUser = user === username

              return (
                <motion.div
                  key={user + i}
                  initial={{ opacity: 0, x: -10, scale: 0.9 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex items-center gap-1.5 shrink-0 px-2.5 py-1 rounded-full border text-xs font-medium transition-all bg-zinc-900/80 border-zinc-800/80 group hover:border-zinc-700"
                >
                  <div className="relative w-5 h-5 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-800 text-zinc-200 text-[10px] font-bold flex items-center justify-center border border-zinc-800 shadow-inner">
                    {firstLetter}
                    <span className="absolute bottom-0 right-0 w-1.5 h-1.5 rounded-full bg-emerald-500 ring-1 ring-zinc-950 animate-pulse" />
                  </div>
                  <span className="truncate max-w-[80px] tracking-tight text-zinc-300">
                    {isCurrentUser ? "You" : user}
                  </span>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* SMART MESSAGES TRACK WITH AVATARS */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        <AnimatePresence>
          {messages.map((msg, i) => {
            const isOwn = msg.username === username
            const isSystem = msg.username === "System"

            // Continuity checks for grouping
            const prevMsg = messages[i - 1]
            const nextMsg = messages[i + 1]
            const isSameUserAsPrev = prevMsg && prevMsg.username === msg.username && !isSystem
            const isSameUserAsNext = nextMsg && nextMsg.username === msg.username && !isSystem

            const firstLetter = msg.username.trim().charAt(0).toUpperCase() || "?"

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`flex items-end gap-2 ${
                  isSystem ? "justify-center py-2" : isOwn ? "justify-end" : "justify-start"
                } ${!isSameUserAsPrev && i !== 0 ? "pt-3" : ""}`}
              >
                {/* AVATAR FOR OTHERS: Only renders on the last message of their chain */}
                {!isOwn && !isSystem && (
                  <div className="w-6 h-6 shrink-0 flex items-center justify-center">
                    {!isSameUserAsNext ? (
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-[11px] font-bold flex items-center justify-center shadow-md border border-zinc-800">
                        {firstLetter}
                      </div>
                    ) : (
                      // Empty placeholder spacer so bubbles stay perfectly aligned in a row
                      <div className="w-6" />
                    )}
                  </div>
                )}

                {isSystem ? (
                  /* System Notification Banner */
                  <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-full px-4 py-1 text-center shadow-sm">
                    <p className="text-[11px] font-medium tracking-tight text-zinc-500">
                      {msg.text}
                    </p>
                  </div>
                ) : (
                  /* User Message Bubble Container */
                  <div className="flex flex-col max-w-[80%] min-w-[75px]">
                    
                    {/* Username Header: Only shows on the very first message of a chain */}
                    {!isSameUserAsPrev && (
                      <div className={`flex items-center mb-1 px-1.5 ${isOwn ? "justify-end" : "justify-start"}`}>
                        <span className={`text-[11px] font-bold tracking-tight ${isOwn ? "text-zinc-400" : "text-indigo-400"}`}>
                          {isOwn ? "You" : msg.username}
                        </span>
                      </div>
                    )}

                    {/* Styled Bubble Core */}
                    <div
                      className={`px-3 pt-2 pb-1.5 rounded-2xl text-[14px] shadow-sm transition-all break-words ${
                        isOwn
                          ? "bg-gradient-to-br from-indigo-600 to-indigo-700 text-white border border-indigo-500/20"
                          : "bg-zinc-900 text-zinc-100 border border-zinc-800/80"
                      } ${
                        isSameUserAsPrev 
                          ? "rounded-2xl" 
                          : isOwn 
                            ? "rounded-tr-sm" 
                            : "rounded-tl-sm"
                      }`}
                    >
                      <div className="flex flex-col gap-0.5">
                        <p className="whitespace-pre-wrap leading-relaxed selection:bg-indigo-500/30 pr-2">
                          {msg.text}
                        </p>

                        {/* Inline Time Indicator */}
                        <span
                          className={`text-[9px] font-medium tracking-tight select-none pointer-events-none self-end mt-0.5 ${
                            isOwn ? "text-indigo-200/60" : "text-zinc-500"
                          }`}
                        >
                          {new Date(msg.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: false,
                          })}
                        </span>
                      </div>
                    </div>

                  </div>
                )}
              </motion.div>
            )
          })}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {/* INPUT */}
      <div className="border-t border-zinc-800 p-4 bg-zinc-900/70 backdrop-blur-lg">
        <div className="flex items-center gap-2">
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                sendMessage()
              }
            }}
            placeholder="Type a message..."
            className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 transition"
          />

          <button
            onClick={sendMessage}
            className="bg-indigo-600 hover:bg-indigo-500 p-3 rounded-xl transition-all"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default Sidepanel