"use client"

import { use, useEffect, useState } from "react"
import { socket } from "@/lib/socket"

export default function RoomPage({
  params
}: {
  params: Promise<{ code: string }>
}) {

  const { code } = use(params)

  const [message, setMessage] = useState("")
  const [messages, setMessages] = useState<string[]>([])

  useEffect(() => {

    socket.emit("join-room", code)

    socket.on("message", (msg) => {
      setMessages((prev) => [...prev, msg.text])
    })

    return () => {
      socket.off("message")
    }

  }, [code])

  const sendMessage = () => {

    socket.emit("message", {
      room: code,
      message
    })

    setMessage("")
  }

  return (
    <main className="p-10">

      <h1 className="text-3xl font-bold mb-6">
        Room {code}
      </h1>

      <div className="border h-96 p-4 overflow-y-auto mb-4">

        {messages.map((msg, i) => (
          <div key={i}>
            {msg}
          </div>
        ))}

      </div>

      <div className="flex gap-2">

        <input
          value={message}
          onChange={(e) =>
            setMessage(e.target.value)
          }
          className="border px-4 py-2 flex-1"
        />

        <button
          onClick={sendMessage}
          className="bg-black text-white px-4 py-2"
        >
          Send
        </button>

      </div>

    </main>
  )
}