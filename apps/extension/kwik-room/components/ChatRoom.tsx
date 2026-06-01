import { useState, useEffect, RefObject } from "react"
import { Message } from "../types"
import { ChatHeader } from "./chatroom/ChatHeader"
import { ActiveUsersBar } from "./chatroom/ActiveUsersBar"
import { MessageList } from "./chatroom/MessageList"
import { TypingIndicator } from "./chatroom/TypingIndicator"
import { ArenaMenu } from "./chatroom/ArenaMenu"
import { ChatInput } from "./chatroom/ChatInput"
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

  const [typingUsers, setTypingUsers] = useState<string[]>([])

  // Listen for typing events from background.ts/sockets
  useEffect(() => {
    const handleRuntimeMessage = (msg: any) => {
      if (msg.type === "user_typing") {
        const { username: typingUser, isTyping } = msg.payload
        
        // Don't show our own typing indicator
        if (typingUser === username) return

        setTypingUsers((prev) => {
          if (isTyping) {
            return prev.includes(typingUser) ? prev : [...prev, typingUser]
          } else {
            return prev.filter((user) => user !== typingUser)
          }
        })
      }
    }

    chrome.runtime.onMessage.addListener(handleRuntimeMessage)
    return () => chrome.runtime.onMessage.removeListener(handleRuntimeMessage)
  }, [username])

  const sendGameInvite = (gameType: "tic_tac_toe" | "four_in_a_row" | "word_guess" | "scribble_it" | "the_spy" | "typing_battle") => {
    const gameId = `game_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`

    chrome.runtime.sendMessage({
      type: "message",
      payload: {
        room: roomCode,
        username,
        message: "Arena Challenge",
        type: "game_invite",
        metadata: {
          gameType,
          gameInstanceId: gameId,
          playersJoined: [username],
          maxPlayers: ["word_guess", "scribble_it", "the_spy", "typing_battle"].includes(gameType) ? 7 : 2
        }
      }
    })

    scrollToBottom()
    playSound("send", isMuted)
  }

  return (
    <div className="h-screen bg-zinc-950 text-white flex flex-col selection:bg-indigo-500/30 relative">
      <ChatHeader roomCode={roomCode} username={username} leaveRoom={leaveRoom} />
      
      <ActiveUsersBar onlineUsers={onlineUsers} username={username} />
      
      <MessageList 
        messages={messages} 
        username={username}
        roomCode={roomCode}
        containerRef={messagesContainerRef}
        endRef={messagesEndRef}
        showScroll={showScrollButton}
        scrollToBottom={scrollToBottom}
        isMuted={isMuted}
      />

      <div className="border-t border-zinc-900 p-3 bg-zinc-950/80 backdrop-blur-xl sticky bottom-0 relative z-20">
        <TypingIndicator typingUsers={typingUsers} />

        <div className="flex items-end gap-1.5 bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-1 focus-within:border-indigo-500/50 transition duration-150 relative">
          <ArenaMenu sendGameInvite={sendGameInvite} />
          
          <ChatInput 
            message={message} 
            setMessage={setMessage} 
            sendMessage={sendMessage}
            roomCode={roomCode}
            username={username}
            onlineUsers={onlineUsers}
          />
        </div>
      </div>
    </div>
  )
}