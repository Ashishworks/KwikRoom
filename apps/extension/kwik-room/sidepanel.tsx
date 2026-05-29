import "./style.css"
"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { Volume2, VolumeX } from "lucide-react" // 👉 NEW: Icons
import { playSound } from "./components/sound" // 👉 NEW: Sound utility
import { Message } from "./types"
import { Lobby } from "./components/Lobby"
import { ChatRoom } from "./components/ChatRoom"

export default function SidePanel() {
  const [activeTab, setActiveTab] = useState<"join" | "create">("join")
  const [isPersistent, setIsPersistent] = useState(false)
  const [roomPassword, setRoomPassword] = useState("")
  const [username, setUsername] = useState("")
  const [roomCode, setRoomCode] = useState("")
  const [message, setMessage] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [joined, setJoined] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [onlineUsers, setOnlineUsers] = useState<string[]>([])
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [requiresPassword, setRequiresPassword] = useState(false)
  const [roomExists, setRoomExists] = useState(true)
  const [incorrectPassword, setIncorrectPassword] = useState(false)
  const [checkingRoom, setCheckingRoom] = useState(false)
  const [showScrollButton, setShowScrollButton] = useState(false)

  const [lastRoomCode, setLastRoomCode] = useState("")
  
  // 👉 NEW STATE: Global Mute Status
  const [isMuted, setIsMuted] = useState(false)

  const messagesContainerRef = useRef<HTMLDivElement | null>(null)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const shouldAutoScrollRef = useRef<boolean>(true)

  const previousScrollHeightRef = useRef<number>(0)
  const previousScrollTopRef = useRef<number>(0)
  const canPaginateRef = useRef<boolean>(false)

  // 👉 UPDATED EFFECT: Check for saved code AND mute status on mount
  useEffect(() => {
    const savedRoom = localStorage.getItem("kwik_last_room")
    if (savedRoom) setLastRoomCode(savedRoom)

    const savedMute = localStorage.getItem("kwik_muted")
    if (savedMute === "true") setIsMuted(true)
  }, [])

  useEffect(() => {
    const port = chrome.runtime.connect({ name: "sidepanel-lifecycle" })
    return () => { port.disconnect() }
  }, [])

  useLayoutEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return

    if (!shouldAutoScrollRef.current) {
      const heightDifference = container.scrollHeight - previousScrollHeightRef.current
      container.scrollTop = previousScrollTopRef.current + heightDifference
      shouldAutoScrollRef.current = true
      return
    }

    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return

    const handleScroll = () => {
      const distanceToBottom = container.scrollHeight - container.scrollTop - container.clientHeight
      setShowScrollButton(distanceToBottom > 150)

      if (container.scrollTop < 100 && hasMore && !loadingMore && messages.length > 0 && canPaginateRef.current) {
        previousScrollHeightRef.current = container.scrollHeight
        previousScrollTopRef.current = container.scrollTop
        shouldAutoScrollRef.current = false
        setLoadingMore(true)

        chrome.runtime.sendMessage({
          type: "load-more-messages",
          payload: { room: roomCode, cursor: messages[0].id }
        })
      }
    }

    container.addEventListener("scroll", handleScroll)
    return () => { container.removeEventListener("scroll", handleScroll) }
  }, [messages, hasMore, loadingMore, roomCode])

  const appendMessage = (incomingMessage: Message) => {
    setMessages((prev) => {
      const exists = prev.some((msg) => msg.id === incomingMessage.id)
      if (exists) return prev
      return [...prev, incomingMessage]
    })
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
   
  }

  const roomCodeRef = useRef(roomCode)
  const usernameRef = useRef(username)
  const roomPasswordRef = useRef(roomPassword)
  
  // 👉 NEW REF: We need this so the socket listener always knows the current mute status!
  const isMutedRef = useRef(isMuted)

  useEffect(() => { usernameRef.current = username }, [username])
  useEffect(() => { roomCodeRef.current = roomCode }, [roomCode])
  useEffect(() => { roomPasswordRef.current = roomPassword }, [roomPassword])
  useEffect(() => { isMutedRef.current = isMuted }, [isMuted]) // Sync mute status

  useEffect(() => {
    const listener = (message: any) => {
      if (message.type === "room-check-result") {
        setCheckingRoom(false)
        if (!message.payload.exists) { setRoomExists(false); return; }

        setRoomExists(true)
        if (message.payload.requiresPassword) {
          if (roomPasswordRef.current) {
            chrome.runtime.sendMessage({
              type: "join-room",
              payload: { room: message.payload.roomCode, username: message.payload.username, password: roomPasswordRef.current }
            })
            return
          }
          setRequiresPassword(true)
          return
        }

        chrome.runtime.sendMessage({
          type: "join-room",
          payload: { room: message.payload.roomCode, username: message.payload.username, password: undefined }
        })
      }

      if (message.type === "room-created") {
        const code = message.payload.code
        setRoomCode(code)
        setTimeout(() => {
          chrome.runtime.sendMessage({
            type: "check-room",
            payload: { room: code, username: usernameRef.current }
          })
        }, 300)
      }

      if (message.type === "room-joined") {
        setCheckingRoom(false)
        setRequiresPassword(false)
        setRoomExists(true)
        setJoined(true)
        setMessages(message.payload.messages)
        setHasMore(message.payload.messages.length === 15)
        canPaginateRef.current = false
        setTimeout(() => { canPaginateRef.current = true }, 2000)

        localStorage.setItem("kwik_last_room", roomCodeRef.current)
        setLastRoomCode(roomCodeRef.current)
        
        // 👉 PLAY SUCCESS SOUND
        playSound("success", isMutedRef.current)
      }

      if (message.type === "socket-error") {
        setCheckingRoom(false)
        if (message.payload === "Invalid password") setIncorrectPassword(true)
      }

      if (message.type === "message") {
        appendMessage(message.payload)
        
        // 👉 PLAY RECEIVE SOUND (Only if it's not our own message and not a system message)
        if (message.payload.username !== usernameRef.current && message.payload.username !== "System") {
          playSound("receive", isMutedRef.current)
        }
      }

      if (message.type === "online-users") setOnlineUsers(message.payload)
      
      if (message.type === "older-messages-loaded") {
        setMessages(prev => [...message.payload.messages, ...prev])
        setHasMore(message.payload.hasMore)
        setLoadingMore(false)
      }
    }

    chrome.runtime.onMessage.addListener(listener)
    return () => { chrome.runtime.onMessage.removeListener(listener) }
  }, [])

  const createRoom = async () => {
    if (!username) return
    chrome.runtime.sendMessage({
      type: "create-room",
      payload: { username, isPersistent, password: isPersistent ? roomPassword : undefined }
    })
  }

  const joinRoom = async () => {
    if (!roomCode || !username) return
    setCheckingRoom(true)
    let payload = { room: roomCode, username } as any
    if (requiresPassword) {
      setIncorrectPassword(false)
      payload.password = roomPassword
      chrome.runtime.sendMessage({ type: "join-room", payload })
      return
    }
    chrome.runtime.sendMessage({ type: "check-room", payload })
  }

  const sendMessage = async () => {
    if (!message.trim()) return
    chrome.runtime.sendMessage({
      type: "message",
      payload: { room: roomCode, username, message }
    })
    setMessage("")
    scrollToBottom()
    
    // 👉 PLAY SEND SOUND
    playSound("send", isMuted)
  }

  const leaveRoom = () => {
    chrome.runtime.sendMessage({ type: "leave-room" })
    setJoined(false)
    setMessages([])
    setOnlineUsers([])
    setRoomPassword("")
    setRequiresPassword(false)
    setRoomExists(true)
    setHasMore(true)
    setLoadingMore(false)
    canPaginateRef.current = false
    setShowScrollButton(false)
  }

  return (
    <>
      {/* 👉 NEW: Floating Global Mute Button */}
      <div className="fixed top-20 right-4 -translate-x-1/2 z-50">
        <button
          onClick={() => {
            const newMuted = !isMuted
            setIsMuted(newMuted)
            localStorage.setItem("kwik_muted", String(newMuted))
          }}
          className="p-1.5 text-zinc-400 opacity-40 hover:opacity-100 hover:text-white transition-all bg-zinc-900/40 hover:bg-zinc-800 border border-zinc-800/50 rounded-full backdrop-blur-md cursor-pointer"
          title={isMuted ? "Unmute sounds" : "Mute sounds"}
        >
          {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
        </button>
      </div>

      {!joined ? (
        <Lobby
          isMuted={isMuted} // 👉 PASSING MUTE STATE TO LOBBY
          lastRoomCode={lastRoomCode}
          activeTab={activeTab} setActiveTab={setActiveTab}
          isPersistent={isPersistent} setIsPersistent={setIsPersistent}
          roomPassword={roomPassword} setRoomPassword={setRoomPassword}
          username={username} setUsername={setUsername}
          roomCode={roomCode} setRoomCode={setRoomCode}
          showPassword={showPassword} setShowPassword={setShowPassword}
          checkingRoom={checkingRoom} roomExists={roomExists}
          requiresPassword={requiresPassword} incorrectPassword={incorrectPassword}
          joinRoom={joinRoom} createRoom={createRoom}
        />
      ) : (
        <ChatRoom
          isMuted={isMuted} 
          roomCode={roomCode} username={username} leaveRoom={leaveRoom}
          onlineUsers={onlineUsers} messages={messages}
          messagesContainerRef={messagesContainerRef} messagesEndRef={messagesEndRef}
          showScrollButton={showScrollButton} scrollToBottom={scrollToBottom}
          message={message} setMessage={setMessage} sendMessage={sendMessage}
        />
      )}
    </>
  )
}