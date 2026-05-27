import "./style.css"

import {
  Send,
  Users,
  Wifi
} from "lucide-react"

import {
  motion,
  AnimatePresence
} from "framer-motion"

import {
  useEffect,
  useRef,
  useState
} from "react"

function Sidepanel() {

  const [username, setUsername] =
    useState("")

  const [roomCode, setRoomCode] =
    useState("")

  const [currentRoom, setCurrentRoom] =
    useState("")

  const [message, setMessage] =
    useState("")

  const [messages, setMessages] =
    useState<
      {
        username: string
        text: string
        timestamp: number
      }[]
    >([])

  const [onlineUsers, setOnlineUsers] =
    useState<string[]>([])

  const messagesEndRef =
    useRef<HTMLDivElement | null>(null)

  useEffect(() => {

    const savedUsername =
      localStorage.getItem("username")

    if (savedUsername) {
      setUsername(savedUsername)
    }

    const listener = (
      message: any
    ) => {

      console.log(
        "SIDEPANEL RECEIVED:",
        message
      )

      // NEW MESSAGE
      if (
        message.type ===
        "new-message"
      ) {

        setMessages((prev) => [
          ...prev,
          message.payload
        ])

      }

      // ONLINE USERS
      if (
        message.type ===
        "online-users"
      ) {

        setOnlineUsers(
          message.payload
        )

      }

      // ROOM CREATED
      if (
        message.type ===
        "room-created"
      ) {

        const createdRoomCode =
          message.payload.code

        setCurrentRoom(
          createdRoomCode
        )

        setRoomCode(
          createdRoomCode
        )

        chrome.runtime.sendMessage({

          type: "join-room",

          payload: {
            room:
              createdRoomCode,

            username:
              localStorage.getItem(
                "username"
              )
          }

        })

      }

    }

    chrome.runtime.onMessage.addListener(
      listener
    )

    return () => {

      chrome.runtime.onMessage.removeListener(
        listener
      )

    }

  }, [])

  useEffect(() => {

    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth"
    })

  }, [messages])

  // CREATE ROOM
  const createRoom = () => {

    if (!username.trim()) return

    localStorage.setItem(
      "username",
      username
    )

    chrome.runtime.sendMessage({

      type: "create-room",

      payload: {
        username
      }

    })

  }

  // JOIN ROOM
  const joinRoom = () => {

    if (
      !roomCode.trim() ||
      !username.trim()
    ) return

    localStorage.setItem(
      "username",
      username
    )

    chrome.runtime.sendMessage({

      type: "join-room",

      payload: {
        room: roomCode,
        username
      }

    })

    setCurrentRoom(roomCode)

  }

  // SEND MESSAGE
  const sendMessage = () => {

    if (!message.trim()) return

    chrome.runtime.sendMessage({

      type: "send-message",

      payload: {
        room: currentRoom,
        username,
        message
      }

    })

    setMessage("")

  }

  // JOIN SCREEN
  if (!currentRoom) {

    return (

      <div
        className="
          h-screen
          bg-zinc-950
          text-white
          flex
          items-center
          justify-center
          p-6
        "
      >

        <motion.div

          initial={{
            opacity: 0,
            y: 20
          }}

          animate={{
            opacity: 1,
            y: 0
          }}

          className="
            w-full
            bg-zinc-900/70
            backdrop-blur-xl
            border
            border-zinc-800
            rounded-3xl
            p-6
            shadow-2xl
          "
        >

          <div className="mb-6">

            <h1
              className="
                text-3xl
                font-bold
                tracking-tight
              "
            >
              KwikRoom
            </h1>

            <p
              className="
                text-zinc-400
                text-sm
                mt-1
              "
            >
              Realtime rooms
              for collaboration
            </p>

          </div>

          <div className="space-y-4">

            <input
              value={username}
              onChange={(e) =>
                setUsername(
                  e.target.value
                )
              }
              placeholder="Username"
              className="
                w-full
                bg-zinc-950
                border
                border-zinc-800
                rounded-xl
                px-4
                py-3
                outline-none
                focus:border-indigo-500
                transition
              "
            />

            <input
              value={roomCode}
              onChange={(e) =>
                setRoomCode(
                  e.target.value.toUpperCase()
                )
              }
              placeholder="Room Code"
              className="
                w-full
                bg-zinc-950
                border
                border-zinc-800
                rounded-xl
                px-4
                py-3
                outline-none
                focus:border-indigo-500
                transition
              "
            />

            <button
              onClick={joinRoom}
              className="
                w-full
                bg-indigo-600
                hover:bg-indigo-500
                rounded-xl
                py-3
                font-medium
                transition-all
              "
            >
              Join Room
            </button>

            <button
              onClick={createRoom}
              className="
                w-full
                bg-zinc-800
                hover:bg-zinc-700
                rounded-xl
                py-3
                font-medium
                transition-all
              "
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

    <div
      className="
        h-screen
        bg-zinc-950
        text-white
        flex
        flex-col
      "
    >

      {/* HEADER */}
      <div
        className="
          border-b
          border-zinc-800
          p-4
          flex
          items-center
          justify-between
          bg-zinc-900/70
          backdrop-blur-lg
        "
      >

        <div>

          <h2
            className="
              text-lg
              font-semibold
            "
          >
            Room {currentRoom}
          </h2>

          <p
            className="
              text-xs
              text-zinc-400
            "
          >
            Connected as {username}
          </p>

        </div>

        <div
          className="
            flex
            items-center
            gap-2
            text-green-400
          "
        >

          <Wifi size={16} />

          <span className="text-xs">
            Live
          </span>

        </div>

      </div>

      {/* ONLINE USERS */}
      <div
        className="
          border-b
          border-zinc-800
          px-4
          py-3
        "
      >

        <div
          className="
            flex
            items-center
            gap-2
            mb-3
          "
        >

          <Users size={16} />

          <h3
            className="
              text-sm
              font-medium
            "
          >
            Online Users
          </h3>

        </div>

        <div
          className="
            flex
            flex-wrap
            gap-2
          "
        >

          {onlineUsers.map(
            (user, i) => (

              <motion.div

                key={i}

                initial={{
                  opacity: 0,
                  scale: 0.8
                }}

                animate={{
                  opacity: 1,
                  scale: 1
                }}

                className="
                  flex
                  items-center
                  gap-2
                  bg-zinc-900
                  border
                  border-zinc-800
                  rounded-full
                  px-3
                  py-1
                  text-sm
                "
              >

                <div
                  className="
                    w-2
                    h-2
                    rounded-full
                    bg-green-500
                  "
                />

                {user}

              </motion.div>

            )
          )}

        </div>

      </div>

      {/* MESSAGES */}
      <div
        className="
          flex-1
          overflow-y-auto
          p-4
          space-y-3
        "
      >

        <AnimatePresence>

          {messages.map(
            (msg, i) => {

              const isOwn =
                msg.username ===
                username

              return (

                <motion.div

                  key={i}

                  initial={{
                    opacity: 0,
                    y: 10
                  }}

                  animate={{
                    opacity: 1,
                    y: 0
                  }}

                  exit={{
                    opacity: 0
                  }}

                  className={`
                    flex
                    ${msg.username === "System"
                      ? "justify-center"
                      : isOwn
                        ? "justify-end"
                        : "justify-start"
                    }
                  `}
                >

                  <div
                    className={`
    max-w-[75%]
    rounded-2xl
    px-3
    py-2
    shadow-sm
    ${msg.username === "System"
                        ? "bg-zinc-900/60 border border-zinc-800 text-center"
                        : isOwn
                          ? "bg-indigo-500 rounded-br-md"
                          : "bg-zinc-900 border border-zinc-800 rounded-bl-md"
                      }
  `}
                  >

                    {
                      msg.username === "System" ? (

                        <p
                          className="
          text-xs
          text-zinc-400
          flex
          items-center
          gap-1.5
        "
                        >



                          <span>
                            {msg.text}
                          </span>

                        </p>

                      ) : (

                        <>

                          <p
                            className={`
            text-[11px]
            font-semibold
            mb-0.5
            ${isOwn
                                ? "text-indigo-100"
                                : "text-orange-400"
                              }
          `}
                          >
                            {msg.username}
                          </p>

                          <div className="flex flex-col">

                            <p
                              className="
      text-[15px]
      text-white
      break-words
      break-all
      leading-snug
    "
                            >
                              {msg.text}
                            </p>

                            <span
                              className={`
      text-[10px]
      mt-1
      self-end
      ${isOwn
                                  ? "text-indigo-100/70"
                                  : "text-zinc-500"
                                }
    `}
                            >
                              {new Date(
                                msg.timestamp
                              ).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                                hour12: false
                              })}
                            </span>

                          </div>

                        </>

                      )
                    }

                  </div>

                </motion.div>

              )

            }
          )}

        </AnimatePresence>

        <div ref={messagesEndRef} />

      </div>

      {/* INPUT */}
      <div
        className="
          border-t
          border-zinc-800
          p-4
          bg-zinc-900/70
          backdrop-blur-lg
        "
      >

        <div
          className="
            flex
            items-center
            gap-2
          "
        >

          <input
            value={message}
            onChange={(e) =>
              setMessage(
                e.target.value
              )
            }
            onKeyDown={(e) => {

              if (
                e.key === "Enter"
              ) {

                sendMessage()

              }

            }}
            placeholder="Type a message..."
            className="
              flex-1
              bg-zinc-950
              border
              border-zinc-800
              rounded-xl
              px-4
              py-3
              outline-none
              focus:border-indigo-500
              transition
            "
          />

          <button
            onClick={sendMessage}
            className="
              bg-indigo-600
              hover:bg-indigo-500
              p-3
              rounded-xl
              transition-all
            "
          >

            <Send size={18} />

          </button>

        </div>

      </div>

    </div>

  )

}

export default Sidepanel