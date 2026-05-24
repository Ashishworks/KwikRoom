import { useEffect, useState } from "react"

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
      }[]
    >([])

  const [onlineUsers, setOnlineUsers] =
    useState<string[]>([])

  useEffect(() => {

    const savedUsername =
      localStorage.getItem("username")

    if (savedUsername) {
      setUsername(savedUsername)
    }

    chrome.runtime.onMessage.addListener(
      (message) => {
        console.log(
          "SIDEPANEL RECEIVED:",
          message
        )
        if (
          message.type === "new-message"
        ) {

          setMessages((prev) => [
            ...prev,
            message.payload
          ])

        }

        if (
          message.type === "online-users"
        ) {

          setOnlineUsers(
            message.payload
          )

        }

      }
    )

  }, [])

  const joinRoom = () => {

    if (
      !roomCode ||
      !username
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

  if (!currentRoom) {

    return (

      <div
        style={{
          width: 350,
          padding: 20
        }}
      >

        <h1>
          KwikRoom
        </h1>

        <input
          value={username}
          onChange={(e) =>
            setUsername(e.target.value)
          }
          placeholder="Username"
          style={{
            width: "100%",
            marginBottom: 10
          }}
        />

        <input
          value={roomCode}
          onChange={(e) =>
            setRoomCode(
              e.target.value.toUpperCase()
            )
          }
          placeholder="Room Code"
          style={{
            width: "100%",
            marginBottom: 10
          }}
        />

        <button onClick={joinRoom}>
          Join Room
        </button>

      </div>

    )
  }

  return (

    <div
      style={{
        width: 350,
        padding: 20
      }}
    >

      <h2>
        Room {currentRoom}
      </h2>

      <div
        style={{
          marginBottom: 10
        }}
      >

        <h3>
          Online Users
        </h3>

        {onlineUsers.map((user, i) => (

          <div key={i}>
            {user}
          </div>

        ))}

      </div>

      <div
        style={{
          height: 300,
          overflowY: "auto",
          border: "1px solid gray",
          marginBottom: 10,
          padding: 10
        }}
      >

        {messages.map((msg, i) => (

          <div key={i}>

            <b>
              {msg.username}:
            </b>

            {" "}
            {msg.text}

          </div>

        ))}

      </div>

      <input
        value={message}
        onChange={(e) =>
          setMessage(e.target.value)
        }
        placeholder="Message"
        style={{
          width: "100%",
          marginBottom: 10
        }}
      />

      <button onClick={sendMessage}>
        Send
      </button>

    </div>

  )
}

export default Sidepanel