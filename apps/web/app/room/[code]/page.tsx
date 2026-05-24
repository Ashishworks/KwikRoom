"use client"

import {
    use,
    useEffect,
    useState
} from "react"

import { useRouter }
from "next/navigation"

import { socket } from "@/lib/socket"

export default function RoomPage({
    params
}: {
    params: Promise<{ code: string }>
}) {

    const { code } = use(params)

    const router = useRouter()

    const [message, setMessage] =
        useState("")

    const [messages, setMessages] =
        useState<
            {
                username: string
                text: string
            }[]
        >([])

    const [username, setUsername] =
        useState("")

    const [onlineUsers, setOnlineUsers] =
        useState<string[]>([])

    useEffect(() => {

        const savedUsername =
            localStorage.getItem("username")

        if (
            !savedUsername ||
            savedUsername.trim() === ""
        ) {

            router.push("/")

            return
        }

        setUsername(savedUsername)

        socket.emit("join-room", {
            room: code,
            username: savedUsername
        })

        socket.on("message", (msg) => {

            setMessages((prev) => [
                ...prev,
                msg
            ])

        })

        socket.on(
            "online-users",
            (users) => {

                setOnlineUsers(users)

            }
        )

        return () => {

            socket.off("message")
            socket.off("online-users")

        }

    }, [code, router])

    const sendMessage = () => {

        if (!message.trim()) return

        socket.emit("message", {
            room: code,
            username,
            message
        })

        setMessage("")
    }

    return (
        <main className="p-10">

            <h1 className="text-3xl font-bold mb-6">
                Room {code}
            </h1>

            <div className="mb-6">

                <h2 className="font-bold text-xl mb-3">
                    Online Users
                </h2>

                <div className="flex gap-2 flex-wrap">

                    {onlineUsers.map((user, i) => (

                        <div
                            key={i}
                            className="bg-green-100 px-3 py-1 rounded-full"
                        >
                            {user}
                        </div>

                    ))}

                </div>

            </div>

            <div className="border h-96 p-4 overflow-y-auto mb-4 rounded-lg">

                {messages.map((msg, i) => (

                    <div
                        key={i}
                        className="mb-2"
                    >
                        <b>{msg.username}: </b>
                        {msg.text}
                    </div>

                ))}

            </div>

            <div className="flex gap-2">

                <input
                    value={message}
                    onChange={(e) =>
                        setMessage(e.target.value)
                    }
                    className="border px-4 py-2 flex-1 rounded-lg"
                    placeholder="Type a message..."
                />

                <button
                    onClick={sendMessage}
                    className="bg-black text-white px-4 py-2 rounded-lg"
                >
                    Send
                </button>

            </div>

        </main>
    )
}