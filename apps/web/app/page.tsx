"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function Home() {

  const router = useRouter()

  const [roomCode, setRoomCode] = useState("")

  const createRoom = async () => {

    const res = await fetch("/api/create-room", {
      method: "POST"
    })

    const data = await res.json()

    router.push(`/room/${data.code}`)
  }

  const joinRoom = () => {

    if (!roomCode) return

    router.push(`/room/${roomCode}`)
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4">

      <h1 className="text-4xl font-bold">
        KwikRoom
      </h1>

      <button
        onClick={createRoom}
        className="bg-black text-white px-4 py-2 rounded-lg"
      >
        Create Room
      </button>

      <input
        value={roomCode}
        onChange={(e) =>
          setRoomCode(e.target.value.toUpperCase())
        }
        placeholder="Enter Room Code"
        className="border px-4 py-2 rounded-lg"
      />

      <button
        onClick={joinRoom}
        className="bg-blue-500 text-white px-4 py-2 rounded-lg"
      >
        Join Room
      </button>

    </main>
  )
}