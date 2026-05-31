import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Bird, Gamepad2 } from "lucide-react"
import { Message } from "../types"
import { playSound } from "./sound"

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

    // Local 1-minute expiration timer for games
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

    // ==========================================
    // 👉 USER MENTION LOGIC
    // ==========================================
    const isMentioningMe = !isOwn && !isSystem && msg.text?.toLowerCase().includes(`@${currentUsername.toLowerCase()}`);

    useEffect(() => {
        if (isMentioningMe) {
            playSound("success", false)
        }
    }, [isMentioningMe])

    // ==========================================
    // KIWI AI DETECTION LOGIC
    // ==========================================
    const isKiwi = (msg.metadata?.isBot || msg.username === "Kiwi") && !isOwn;

    return (
        <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`w-full flex items-start gap-2 ${isSystem ? "justify-center py-2" : isOwn ? "justify-end" : "justify-start"} ${!isSameUserAsPrev && index !== 0 ? "pt-2.5" : ""}`}
        >
            {/* 👉 AVATAR RENDERING */}
            {!isOwn && !isSystem && (
                <div className="w-7 h-7 shrink-0 flex items-center justify-center mt-0.5">
                    {!isSameUserAsPrev ? (
                        isKiwi ? (
                            <div className="w-7 h-7 rounded-full bg-teal-500/10 text-teal-400/90 flex items-center justify-center border border-teal-500/20">
                                <Bird size={16} strokeWidth={1.5} />
                            </div>
                        ) : (
                            <div className="w-7 h-7 rounded-full bg-indigo-500/10 text-indigo-300 text-[11px] font-medium flex items-center justify-center border border-indigo-500/20">
                                {firstLetter}
                            </div>
                        )
                    ) : (
                        <div className="w-7" />
                    )}
                </div>
            )}

            {/* 👉 SYSTEM MESSAGE RENDERING */}
            {isSystem ? (
                <div className="bg-zinc-900/30 border border-zinc-800/40 rounded-full px-3 py-0.5 text-center">
                    <p className="text-[10px] font-medium text-zinc-500 tracking-tight">{msg.text}</p>
                </div>
            ) : (
                <div className={`flex flex-col max-w-[80%] min-w-0 ${isOwn ? "items-end" : "items-start"}`}>
                    
                    {/* 👉 USERNAME / MENTION BADGE */}
                    {!isSameUserAsPrev && (
                        <div className="flex items-center gap-1.5 h-5 mb-0.5 px-1 mt-0.5">
                            <span className={`text-[12px] font-semibold tracking-tight ${isOwn ? "text-zinc-500" : isKiwi ? "text-teal-400/80" : "text-indigo-400"}`}>
                                {isOwn ? "You" : isKiwi ? "Kiwi" : msg.username}
                            </span>
                            {isMentioningMe && (
                                <span className="text-[8px] font-bold uppercase tracking-wider text-rose-400 border border-rose-500/20 px-1.5 py-0.5 rounded-md leading-none bg-rose-500/10">
                                    Mentioned You
                                </span>
                            )}
                        </div>
                    )}

                    {/* 👉 CONTENT RENDERING (GAME INVITE OR CHAT TEXT) */}
                    {msg.type === "game_invite" ? (
                        // ==========================================
                        // GAME INVITE BLOCK
                        // ==========================================
                        (() => {
                            const players = msg.metadata?.playersJoined || []
                            const maxPlayers = msg.metadata?.maxPlayers || 2
                            const isExpired = msg.metadata?.expired || localExpired
                            const isFull = players.length >= maxPlayers
                            const alreadyJoined = players.includes(currentUsername)

                            return (
                                <div className={`backdrop-blur-sm border rounded-xl p-3 w-[220px] shadow-lg transition-colors mt-1 ${isExpired ? "bg-zinc-900/50 border-zinc-800/50 grayscale opacity-70" : "bg-zinc-900/80 border-indigo-500/30"}`}>
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
                                                    : msg.metadata?.gameType === "scribble_it"
                                                        ? "Scribble"
                                                        : msg.metadata?.gameType === "the_spy"
                                                            ? "The Spy"
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
                            )
                        })()
                    ) : (
                        // ==========================================
                        // STANDARD TEXT MESSAGE BLOCK
                        // ==========================================
                        <div className={`px-3 py-2 rounded-2xl text-[13px] relative w-full transition-all duration-300
                            ${isOwn
                                ? "bg-indigo-600 text-white rounded-br-sm"
                                : isKiwi
                                    ? "bg-zinc-900/50 text-zinc-200 border border-teal-500/10 rounded-bl-sm shadow-none"
                                    : "bg-zinc-900 text-zinc-100 border rounded-bl-sm border-zinc-800/60 "
                            } 
                            ${isSameUserAsPrev ? "!rounded-2xl" : ""}`}
                        >
                            <div className="flex flex-col gap-0.5">
                                <p className="whitespace-pre-wrap break-words leading-relaxed pr-1">
                                    {msg.text}
                                </p>
                                <span className={`text-[8px] font-medium mt-1 block text-right ${isOwn ? "text-indigo-200/60" : isKiwi ? "text-teal-400/40" : "text-zinc-500"}`}>
                                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </motion.div>
    )
}