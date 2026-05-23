"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

export default function Home() {

  const router = useRouter()

  const [roomCode, setRoomCode] = useState("")
  const [username, setUsername] = useState("")
  const createRoom = async () => {

    const res = await fetch("/api/create-room", {
      method: "POST"
    })

    const data = await res.json()
    localStorage.setItem("username", username)

    router.push(`/room/${data.code}`)
  }

  const joinRoom = () => {

    if (!roomCode) return
    localStorage.setItem("username", username)
    router.push(`/room/${roomCode}`)
  }

  useEffect(() => {

    const savedUsername =
      localStorage.getItem("username")

    if (savedUsername) {
      setUsername(savedUsername)
    }

  }, [])

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
        value={username}
        onChange={(e) =>
          setUsername(e.target.value)
        }
        placeholder="Enter Username"
        className="border px-4 py-2 rounded-lg"
      />

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