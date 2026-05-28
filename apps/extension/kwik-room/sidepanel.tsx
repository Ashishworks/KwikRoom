import "./style.css"
"use client"

import { Send, Users, LogOut, Shield, Key, Sparkles, PlusCircle, LogIn } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useEffect, useRef, useState } from "react"

type Message = {
  id: number
  username: string
  text: string
  createdAt: string
}

export default function SidePanel() {
  const [activeTab, setActiveTab] = useState<"join" | "create">("join")
  const [isPersistent, setIsPersistent] = useState(false)
  const [roomPassword, setRoomPassword] = useState("")
  const [username, setUsername] = useState("")
  const [roomCode, setRoomCode] = useState("")
  const [message, setMessage] = useState("")
  const [joined, setJoined] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [onlineUsers, setOnlineUsers] = useState<string[]>([])
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [requiresPassword, setRequiresPassword] =
    useState(false)

  const [roomExists, setRoomExists] =
    useState(true)

  const [checkingRoom, setCheckingRoom] =
    useState(false)
  const messagesContainerRef = useRef<HTMLDivElement | null>(null)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const shouldAutoScrollRef =
    useRef<boolean>(true)
  useEffect(() => {

    const container =
      messagesContainerRef.current

    if (!container) return

    // RESTORE POSITION AFTER PAGINATION

    if (!shouldAutoScrollRef.current) {

      const newHeight =
        container.scrollHeight

      container.scrollTop +=
        newHeight -
        previousScrollHeightRef.current

      shouldAutoScrollRef.current =
        true

      return

    }

    // NORMAL AUTO SCROLL

    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth"
    })

  }, [messages])
  const previousScrollHeightRef =
    useRef<number>(0)
  useEffect(() => {

    const container =
      messagesContainerRef.current

    if (!container) return

    const handleScroll = () => {
      console.log(
        "SCROLL:",
        container.scrollTop
      )
      console.log({
        scrollTop: container.scrollTop,
        hasMore,
        loadingMore,
        messagesLength: messages.length
      })
      if (
        container.scrollTop < 100 &&
        hasMore &&
        !loadingMore &&
        messages.length > 0
      ) {
        console.log(
          "TOP REACHED -> LOADING MORE"
        )
        previousScrollHeightRef.current =
          container.scrollHeight

        shouldAutoScrollRef.current =
          false

        setLoadingMore(true)

        chrome.runtime.sendMessage({

          type: "load-more-messages",

          payload: {

            room: roomCode,

            cursor:
              messages[0].id

          }

        })

      }

    }

    container.addEventListener(
      "scroll",
      handleScroll
    )

    return () => {

      container.removeEventListener(
        "scroll",
        handleScroll
      )

    }

  }, [
    messages,
    hasMore,
    loadingMore,
    roomCode
  ])


  // APPEND MESSAGE SAFELY
  const appendMessage = (incomingMessage: Message) => {
    setMessages((prev) => {
      const exists = prev.some((msg) => msg.id === incomingMessage.id)
      if (exists) return prev
      return [...prev, incomingMessage]
    })
  }

  // EXTENSION MESSAGE LISTENER
  const roomCodeRef =
    useRef(roomCode)
  const usernameRef =
    useRef(username)

  const roomPasswordRef =
    useRef(roomPassword)
  useEffect(() => {

    usernameRef.current =
      username

  }, [username])
  useEffect(() => {

    roomCodeRef.current =
      roomCode

  }, [roomCode])

  useEffect(() => {

    roomPasswordRef.current =
      roomPassword

  }, [roomPassword])
  useEffect(() => {
    const listener = (message: any) => {
      if (
        message.type ===
        "room-check-result"
      ) {
        console.log(
          "ROOM CHECK RESULT:",
          message.payload
        )
        setCheckingRoom(false)

        // ROOM DOESN'T EXIST

        if (!message.payload.exists) {

          setRoomExists(false)

          return

        }

        setRoomExists(true)

        // PASSWORD REQUIRED

        if (
          message.payload.requiresPassword
        ) {

          // AUTO JOIN CREATED ROOM

          if (
            roomPasswordRef.current
          ) {

            chrome.runtime.sendMessage({

              type: "join-room",

              payload: {

                room:
                  message.payload.roomCode,

                username:
                  message.payload.username,

                password:
                  roomPasswordRef.current

              }

            })

            return

          }

          // NORMAL JOIN FLOW

          setRequiresPassword(true)

          return

        }

        // DIRECT JOIN
        console.log(
          "AUTO JOINING TEMP ROOM:",
          {
            room:
              roomCodeRef.current,
            username:
              usernameRef.current
          }
        )
        chrome.runtime.sendMessage({

          type: "join-room",

          payload: {

            room:
              message.payload.roomCode,

            username:
              message.payload.username,

            password: undefined

          }

        })

      }
      if (
        message.type ===
        "room-created"
      ) {

        const code =
          message.payload.code

        setRoomCode(code)

        setTimeout(() => {

          chrome.runtime.sendMessage({

            type: "check-room",

            payload: {

              room: code,

              username:
                usernameRef.current

            }

          })

        }, 300)

      }
      if (
        message.type ===
        "room-joined"
      ) {

        setCheckingRoom(false)

        setRequiresPassword(false)

        setRoomExists(true)

        setJoined(true)

        setMessages(
          message.payload.messages
        )

      }
      if (
        message.type ===
        "socket-error"
      ) {

        setCheckingRoom(false)

        console.log(
          message.payload
        )

      }
      if (message.type === "message") {
        appendMessage(message.payload)
      }
      if (message.type === "online-users") {
        setOnlineUsers(message.payload)
      }
      if (message.type === "older-messages-loaded") {

        setMessages(prev => [
          ...message.payload.messages,
          ...prev
        ])

        setHasMore(
          message.payload.hasMore
        )

        setLoadingMore(false)

      }
    }

    chrome.runtime.onMessage.addListener(listener)
    return () => {
      chrome.runtime.onMessage.removeListener(listener)
    }
  }, [])

  // CREATE ROOM
  const createRoom = async () => {
    if (!username) return

    chrome.runtime.sendMessage({
      type: "create-room",
      payload: {
        username,
        isPersistent,
        password: isPersistent ? roomPassword : undefined
      }
    })
  }

  // JOIN ROOM
  const joinRoom = async () => {

    if (!roomCode || !username)
      return

    setCheckingRoom(true)

    chrome.runtime.sendMessage({

      type: "check-room",

      payload: {
        room: roomCode,
        username
      }

    })

  }

  // SEND MESSAGE
  const sendMessage = async () => {
    if (!message.trim()) return

    chrome.runtime.sendMessage({
      type: "message",
      payload: {
        room: roomCode,
        username,
        message
      }
    })
    setMessage("")
  }

  const leaveRoom = () => {

    chrome.runtime.sendMessage({
      type: "leave-room"
    })

    setJoined(false)

    setMessages([])

    setOnlineUsers([])

    setRoomPassword("")
    setRequiresPassword(false)
    setRoomExists(true)

  }
  const canCreateRoom =
    username.trim().length > 0 &&
    (
      !isPersistent ||
      roomPassword.trim().length > 0
    )

  const canJoinRoom =
    username.trim().length > 0 &&
    roomCode.trim().length > 0
  // JOIN SCREEN UI
  if (!joined) {
    return (
      <div className="h-screen bg-zinc-950 text-white flex items-center justify-center p-4 selection:bg-indigo-500/30">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="w-full max-w-sm bg-gradient-to-b from-zinc-900/80 to-zinc-900/40 backdrop-blur-2xl border border-zinc-800/80 rounded-3xl p-6 shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 left-1/4 -translate-y-1/2 w-1/2 h-20 bg-indigo-500/10 blur-3xl pointer-events-none" />

          <div className="mb-5 text-center">
            <div className="mx-auto w-10 h-10 bg-indigo-600/10 border border-indigo-500/20 rounded-xl flex items-center justify-center mb-3">
              <Sparkles className="w-5 h-5 text-indigo-400" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-transparent">KwikRoom</h1>
          </div>

          {/* SMOOTH TAB SLIDER */}
          <div className="relative flex p-1 bg-zinc-950 border border-zinc-900 rounded-xl mb-4">
            <motion.div
              className="absolute top-1 bottom-1 left-1 bg-zinc-900 border border-zinc-800 rounded-lg shadow-md"
              layoutId="activeTabIndicator"
              animate={{
                left: activeTab === "join" ? "4px" : "calc(50% + 2px)",
                width: "calc(50% - 6px)"
              }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            />
            <button
              onClick={() => { setActiveTab("join"); setRoomPassword(""); }}
              className={`flex-1 relative z-10 py-2 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${activeTab === "join" ? "text-white" : "text-zinc-500"}`}
            >
              <LogIn size={13} />
              {checkingRoom
                ? "Checking..."
                : "Join Room"
              }
            </button>
            <button
              onClick={() => { setActiveTab("create"); setRoomPassword(""); }}
              className={`flex-1 relative z-10 py-2 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${activeTab === "create" ? "text-white" : "text-zinc-500"}`}
            >
              <PlusCircle size={13} />
              Create Room
            </button>
          </div>

          <div className="space-y-3.5">
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              className="w-full bg-zinc-950/80 border border-zinc-800 focus:border-indigo-500/80 rounded-xl px-4 py-3 text-sm outline-none transition placeholder:text-zinc-600 focus:ring-1 focus:ring-indigo-500/30"
            />

            {/* EXPANDABLE TAB VIEWS */}
            <AnimatePresence mode="wait">
              {activeTab === "join" ? (
                <motion.div
                  key="join-panel"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-3.5"
                >
                  <input
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    placeholder="Enter Room Code"
                    className="w-full bg-zinc-950/80 border border-zinc-800 focus:border-indigo-500/80 rounded-xl px-4 py-3 text-sm outline-none transition placeholder:text-zinc-600 tracking-wider font-mono"
                  />
                  {!roomExists && (

                    <p className="text-xs text-red-400 px-1">
                      Room does not exist

                    </p>

                  )}
                  {requiresPassword && (
                    <div className="relative flex items-center">
                      <Key className="absolute left-3.5 w-3.5 h-3.5 text-zinc-600" />
                      <input
                        type="password"
                        value={roomPassword}
                        onChange={(e) => setRoomPassword(e.target.value)}
                        placeholder="Enter Room Password"
                        className="w-full bg-zinc-950/80 border border-zinc-800 focus:border-indigo-500 rounded-xl pl-9 pr-4 py-3 text-sm outline-none transition placeholder:text-zinc-600"
                      />
                    </div>
                  )}

                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => {

                      // PASSWORD FLOW

                      if (requiresPassword) {

                        if (!roomPassword.trim())
                          return

                        setCheckingRoom(true)

                        chrome.runtime.sendMessage({

                          type: "join-room",

                          payload: {

                            room: roomCode,

                            username,

                            password: roomPassword

                          }

                        })

                        return

                      }

                      // NORMAL FLOW

                      joinRoom()

                    }}
                    disabled={!canJoinRoom}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-3 text-sm font-semibold tracking-wide transition shadow-lg shadow-indigo-600/15 disabled:opacity-50
disabled:cursor-not-allowed"
                  >
                    Join Room
                  </motion.button>
                </motion.div>
              ) : (
                <motion.div
                  key="create-panel"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-3.5"
                >
                  <div className="space-y-2.5 rounded-2xl border border-zinc-800/80 bg-zinc-950/40 p-3.5">
                    <div className="flex items-center justify-between">
                      <div className="flex gap-2 items-center">
                        <Shield className="w-4 h-4 text-zinc-500" />
                        <div>
                          <p className="text-xs font-medium text-zinc-300">Persistent Room</p>
                          <p className="text-[10px] text-zinc-500">Save messages permanently</p>
                        </div>
                      </div>

                      <button
                        onClick={() => setIsPersistent(!isPersistent)}
                        className={`relative h-5 w-9 rounded-full transition-colors duration-200 ${isPersistent ? "bg-indigo-600" : "bg-zinc-800"}`}
                      >
                        <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all duration-200 shadow-sm ${isPersistent ? "left-4.5" : "left-0.5"}`} />
                      </button>
                    </div>

                    <AnimatePresence initial={false}>
                      {isPersistent && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden pt-1"
                        >
                          <div className="relative flex items-center">
                            <Key className="absolute left-3.5 w-3.5 h-3.5 text-zinc-600" />
                            <input
                              type="password"
                              value={roomPassword}
                              onChange={(e) => setRoomPassword(e.target.value)}
                              placeholder="Set Room Password"
                              className="w-full bg-zinc-950 border border-zinc-800/80 focus:border-indigo-500 rounded-xl pl-9 pr-4 py-2.5 text-xs outline-none transition placeholder:text-zinc-600"
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={createRoom}
                    disabled={!canCreateRoom}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-3 text-sm font-semibold tracking-wide transition shadow-lg shadow-indigo-600/15 disabled:opacity-50
  disabled:cursor-not-allowed"
                  >
                    Create Room
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    )
  }

  // CHAT SCREEN UI
  return (
    <div className="h-screen bg-zinc-950 text-white flex flex-col selection:bg-indigo-500/30">
      {/* HEADER */}
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

      {/* MODERN ONLINE USERS ROW */}
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

      {/* MESSAGES TRACK */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-1 bg-gradient-to-b from-zinc-950 to-zinc-900/20"
      >
        <AnimatePresence>
          {messages.map((msg, i) => {
            const isOwn = msg.username === username
            const isSystem = msg.username === "System"
            const prevMsg = messages[i - 1]
            const isSameUserAsPrev = prevMsg && prevMsg.username === msg.username && !isSystem
            const firstLetter = msg.username.trim().charAt(0).toUpperCase() || "?"

            return (
              <motion.div
                key={msg.id || i}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`flex items-end gap-2 ${isSystem ? "justify-center py-2" : isOwn ? "justify-end" : "justify-start"
                  } ${!isSameUserAsPrev && i !== 0 ? "pt-2.5" : ""}`}
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
                  <div className={`flex flex-col max-w-[80%] ${isOwn ? "items-end" : "items-start"}`}>
                    {!isSameUserAsPrev && (
                      <div className="mb-0.5 px-1">
                        <span className={`text-[10px] font-semibold tracking-tight ${isOwn ? "text-zinc-500" : "text-indigo-400"}`}>
                          {isOwn ? "You" : msg.username}
                        </span>
                      </div>
                    )}

                    <div
                      className={`px-3 py-2 rounded-2xl text-[13px] break-words relative ${isOwn
                        ? "bg-indigo-600 text-white rounded-br-sm"
                        : "bg-zinc-900 text-zinc-100 border border-zinc-800/60 rounded-bl-sm"
                        } ${isSameUserAsPrev ? "!rounded-2xl" : ""}`}
                    >
                      <div className="flex flex-col gap-0.5">
                        <p className="whitespace-pre-wrap leading-relaxed pr-1 text-zinc-100">{msg.text}</p>
                        <span className={`text-[8px] font-medium mt-1 block text-right ${isOwn ? "text-indigo-200/60" : "text-zinc-500"}`}>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}
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