import { useState, useEffect } from "react" // 👉 NEW: Import hooks
import { motion } from "framer-motion"
import { Gamepad2 } from "lucide-react"
import { Message } from "../types"

interface MessageBubbleProps {
    msg: Message
    isOwn: boolean
    isSystem: boolean
    isSameUserAsPrev: boolean
    firstLetter: string
    index: number
    currentUsername: string
    roomCode: string
}

export function MessageBubble({ msg, isOwn, isSystem, isSameUserAsPrev, firstLetter, index, currentUsername, roomCode }: MessageBubbleProps) {

    // 👉 NEW: Local 1-minute expiration timer
    const [localExpired, setLocalExpired] = useState(false)

    useEffect(() => {
        if (msg.type === "game_invite" && !msg.metadata?.expired && !localExpired) {
            const messageAge = Date.now() - new Date(msg.createdAt).getTime()
            const timeLeft = 60000 - messageAge // 60 seconds

            if (timeLeft <= 0) {
                setLocalExpired(true)
            } else {
                const timer = setTimeout(() => setLocalExpired(true), timeLeft)
                return () => clearTimeout(timer)
            }
        }
    }, [msg, localExpired])

    if (msg.type === "game_invite") {
        const players = msg.metadata?.playersJoined || []
        const maxPlayers = msg.metadata?.maxPlayers || 2

        // 👉 NEW: Global state from sidepanel OR local 1-minute timer
        const isExpired = msg.metadata?.expired || localExpired
        const isFull = players.length >= maxPlayers
        const alreadyJoined = players.includes(currentUsername)

        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className={`w-full flex ${isOwn ? "justify-end" : "justify-start"} my-2 px-1`}
            >
                <div className={`backdrop-blur-sm border rounded-xl p-3 w-[220px] shadow-lg transition-colors ${isExpired ? "bg-zinc-900/50 border-zinc-800/50 grayscale opacity-70" : "bg-zinc-900/80 border-indigo-500/30"}`}>
                    <div className="flex items-center gap-2 mb-2">
                        <div className={`p-1.5 rounded-md ${isExpired ? "bg-zinc-800 text-zinc-500" : "bg-indigo-500/20 text-indigo-400"}`}>
                            <Gamepad2 size={16} />
                        </div>
                        <h4 className="text-xs font-bold text-zinc-200 tracking-tight">Arena Invite</h4>
                    </div>

                    <p className="text-[11px] text-zinc-400 mb-3 leading-relaxed">
                        <span className="font-semibold text-zinc-300">{msg.username}</span> challenged the room to{" "}
                        {msg.metadata?.gameType === "tic_tac_toe"
                            ? "Tic-Tac-Toe"
                            : msg.metadata?.gameType === "four_in_a_row"
                                ? "Four in a Row"
                                : msg.metadata?.gameType === "word_guess"
                                    ? "Word Guess"
                                    : msg.metadata?.gameType === "scribble_it" // 👉 FIX
                                        ? "Scribble"
                                        : "a game"}!
                    </p>

                    <div className="flex justify-between items-center text-[10px] font-medium mb-2">
                        <span className={isExpired ? "text-red-400/70" : isFull ? "text-red-400" : "text-emerald-400"}>
                            {isExpired ? "Challenge Expired" : isFull ? "Match starting..." : "Waiting for opponent..."}
                        </span>
                        <span className="text-zinc-500 bg-zinc-950 px-1.5 py-0.5 rounded-md border border-zinc-800">
                            {players.length}/{maxPlayers}
                        </span>
                    </div>

                    <button
                        disabled={isExpired || isFull || alreadyJoined}
                        onClick={() => {
                            chrome.runtime.sendMessage({
                                type: "join-game",
                                payload: {
                                    gameInstanceId: msg.metadata?.gameInstanceId,
                                    username: currentUsername,
                                    room: roomCode,
                                    playersJoined: [...players, currentUsername],
                                    gameType: msg.metadata?.gameType
                                }
                            })
                        }}
                        className={`w-full py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${isExpired
                            ? "bg-zinc-900 text-red-500/50 border border-zinc-800 cursor-not-allowed"
                            : alreadyJoined
                                ? "bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700/50"
                                : isFull
                                    ? "bg-zinc-900 text-zinc-600 cursor-not-allowed border border-zinc-800"
                                    : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 active:scale-[0.98]"
                            }`}
                    >
                        {isExpired ? "Expired" : alreadyJoined ? "Ready" : isFull ? "Game Full" : "Accept Challenge"}
                    </button>
                </div>
            </motion.div>
        )
    }

    // ==========================================
    // EXISTING STANDARD CHAT BUBBLE LOGIC BELOW
    // ==========================================
    return (
        <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`w-full flex items-end gap-2 ${isSystem ? "justify-center py-2" : isOwn ? "justify-end" : "justify-start"} ${!isSameUserAsPrev && index !== 0 ? "pt-2.5" : ""}`}
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
                <div className={`flex flex-col max-w-[80%] min-w-0 ${isOwn ? "items-end" : "items-start"}`}>
                    {!isSameUserAsPrev && (
                        <div className="mb-0.5 px-1">
                            <span className={`text-[10px] font-semibold tracking-tight ${isOwn ? "text-zinc-500" : "text-indigo-400"}`}>
                                {isOwn ? "You" : msg.username}
                            </span>
                        </div>
                    )}

                    <div className={`px-3 py-2 rounded-2xl text-[13px] relative w-full ${isOwn ? "bg-indigo-600 text-white rounded-br-sm" : "bg-zinc-900 text-zinc-100 border border-zinc-800/60 rounded-bl-sm"} ${isSameUserAsPrev ? "!rounded-2xl" : ""}`}>
                        <div className="flex flex-col gap-0.5">
                            <p className="whitespace-pre-wrap break-words leading-relaxed pr-1 text-zinc-100">{msg.text}</p>
                            <span className={`text-[8px] font-medium mt-1 block text-right ${isOwn ? "text-indigo-200/60" : "text-zinc-500"}`}>
                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </motion.div>
    )
}