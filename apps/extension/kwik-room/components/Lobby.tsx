import { Sparkles, LogIn, PlusCircle, Shield, Key, EyeOff, Eye, Lock, Unlock, History, MessageSquareDot, Bird, Loader2 } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { playSound } from "./sound" 

interface LobbyProps {
    isMuted: boolean 
    lastRoomCode: string
    activeTab: "join" | "create"
    setActiveTab: (tab: "join" | "create") => void
    isPersistent: boolean
    setIsPersistent: (val: boolean) => void
    roomPassword: string
    setRoomPassword: (val: string) => void
    username: string
    setUsername: (val: string) => void
    roomCode: string
    setRoomCode: (val: string) => void
    showPassword: boolean
    setShowPassword: (val: boolean) => void
    checkingRoom: boolean
    roomExists: boolean
    requiresPassword: boolean
    incorrectPassword: boolean
    joinRoom: () => void
    createRoom: () => void
    isProcessing?: boolean // 👉 NEW: Added to handle active network request state
}

export function Lobby({
    isMuted, 
    lastRoomCode,
    activeTab, setActiveTab, isPersistent, setIsPersistent, roomPassword, setRoomPassword,
    username, setUsername, roomCode, setRoomCode, showPassword, setShowPassword,
    checkingRoom, roomExists, requiresPassword, incorrectPassword, joinRoom, createRoom,
    isProcessing = false // 👉 NEW: Defaults to false if not provided by parent
}: LobbyProps) {

    const canCreateRoom = username.trim().length > 0 && (!isPersistent || roomPassword.trim().length > 0)
    const canJoinRoom = username.trim().length > 0 && roomCode.trim().length > 0

    // 👉 NEW: Unified form submit handler to support the "Enter" key
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (isProcessing) return

        if (activeTab === "join") {
            if (requiresPassword && !roomPassword.trim()) return
            if (canJoinRoom && !checkingRoom) joinRoom()
        } else {
            if (canCreateRoom) createRoom()
        }
    }

    return (
        <div className="h-screen bg-zinc-950 text-white flex items-center justify-center p-4 selection:bg-indigo-500/30">
            <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="w-full max-w-sm bg-gradient-to-b from-zinc-900/80 to-zinc-900/40 backdrop-blur-2xl border border-zinc-800/80 rounded-3xl p-6 shadow-2xl relative overflow-hidden"
            >
                <div className="absolute top-0 left-1/4 -translate-y-1/2 w-1/2 h-20 bg-indigo-500/10 blur-3xl pointer-events-none" />

                <div className="mb-5 text-center">
                    <div className="mx-auto w-10 h-10 rounded-full bg-teal-500/10 text-teal-400/90 flex items-center justify-center border border-teal-500/20 mb-3">
                        <Bird size={30} strokeWidth={1.0} />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-transparent">KwikRoom</h1>
                </div>

                <div className="relative flex p-1 bg-zinc-950 border border-zinc-900 rounded-xl mb-4">
                    <motion.div
                        className="absolute top-1 bottom-1 left-1 bg-zinc-900 border border-zinc-800 rounded-lg shadow-md"
                        layoutId="activeTabIndicator"
                        animate={{
                            left: activeTab === "join" ? "4px" : "calc(50% + 2px)",
                            width: "calc(50% - 6px)"
                        }}
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                    <button
                        onClick={() => { setActiveTab("join"); setRoomPassword(""); setShowPassword(false); }}
                        className={`flex-1 relative z-10 py-2 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${activeTab === "join" ? "text-white" : "text-zinc-500"}`}
                    >
                        <LogIn size={13} />
                        Join Room
                    </button>
                    <button
                        onClick={() => { setActiveTab("create"); setRoomPassword(""); setShowPassword(false); }}
                        className={`flex-1 relative z-10 py-2 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${activeTab === "create" ? "text-white" : "text-zinc-500"}`}
                    >
                        <PlusCircle size={13} />
                        Create Room
                    </button>
                </div>

                {/* 👉 NEW: Wrapped in a <form> tag to catch Enter key presses */}
                <form onSubmit={handleSubmit} className="space-y-3.5">
                    <input
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Username"
                        className="w-full bg-zinc-950/80 border border-zinc-800 focus:border-indigo-500/80 rounded-xl px-4 py-3 text-sm outline-none transition placeholder:text-zinc-600 focus:ring-1 focus:ring-indigo-500/30"
                    />

                    <AnimatePresence mode="wait">
                        {activeTab === "join" ? (
                            <motion.div
                                key="join-panel"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                transition={{ duration: 0.15 }}
                                className="space-y-3.5"
                            >
                                <div className="relative">
                                    <input
                                        value={roomCode}
                                        onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                                        placeholder="Enter Room Code"
                                        className="w-full bg-zinc-950/80 border border-zinc-800 focus:border-indigo-500/80 rounded-xl px-4 py-3 text-sm outline-none transition placeholder:text-zinc-600 tracking-wider font-mono"
                                    />
                                    {checkingRoom && (
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                            <Loader2 size={16} className="text-zinc-500 animate-spin" />
                                        </div>
                                    )}
                                </div>

                                <AnimatePresence>
                                    {lastRoomCode && roomCode !== lastRoomCode && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0, y: -10 }}
                                            animate={{ opacity: 1, height: "auto", y: 0 }}
                                            exit={{ opacity: 0, height: 0, y: -10 }}
                                            transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                            className="flex items-center justify-center w-full mt-3 mb-1 overflow-hidden"
                                        >
                                            <button
                                                type="button"
                                                onClick={() => setRoomCode(lastRoomCode)}
                                                className="text-[10px] text-zinc-400 hover:text-white hover:border-indigo-500/50 transition-all flex items-center gap-1.5 bg-zinc-900/80 px-3.5 py-1.5 rounded-full border border-zinc-800 shadow-sm"
                                            >
                                                <History size={11} />
                                                Use recent: <span className="font-mono text-indigo-300 font-semibold tracking-wider">{lastRoomCode}</span>
                                            </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {!roomExists && roomCode.length > 0 && !checkingRoom && (
                                    <p className="text-xs text-red-400 px-1">Room does not exist</p>
                                )}
                                {incorrectPassword && (
                                    <p className="text-xs text-red-400 px-1 text-center">Incorrect room password</p>
                                )}
                                {requiresPassword && (
                                    <div className="relative flex items-center">
                                        <Key className="absolute left-3.5 w-3.5 h-3.5 text-zinc-600" />
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={roomPassword}
                                            onChange={(e) => setRoomPassword(e.target.value)}
                                            placeholder="Enter Room Password"
                                            className="w-full bg-zinc-950/80 border border-zinc-800 focus:border-indigo-500 rounded-xl pl-9 pr-10 py-3 text-sm outline-none transition placeholder:text-zinc-600"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3.5 text-zinc-500 hover:text-zinc-300 transition-colors focus:outline-none"
                                        >
                                            {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                                        </button>
                                    </div>
                                )}

                                <motion.button
                                    type="submit" // 👉 NEW: Changed to submit
                                    whileHover={canJoinRoom && !checkingRoom && !isProcessing ? { scale: 1.01 } : {}}
                                    whileTap={canJoinRoom && !checkingRoom && !isProcessing ? { scale: 0.99 } : {}}
                                    disabled={!canJoinRoom || checkingRoom || isProcessing} // 👉 NEW: Disabled during processing
                                    className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-3 text-sm font-semibold tracking-wide transition shadow-lg shadow-indigo-600/15 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isProcessing ? <><Loader2 size={16} className="animate-spin" /> Joining...</> : "Join Room"}
                                </motion.button>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="create-panel"
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                transition={{ duration: 0.15 }}
                                className="space-y-3.5"
                            >
                                <div className="space-y-2.5 rounded-2xl border border-zinc-800/80 bg-zinc-950/40 p-3.5">
                                    <div className="flex items-center justify-between">
                                        <div className="flex gap-2 items-center">
                                            <Shield className="w-4 h-4 text-zinc-500" />
                                            <div>
                                                <p className="text-xs font-medium text-zinc-300">Persistent Room</p>
                                                <p className="text-[10px] text-zinc-500">Save messages permanently</p>
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                const newState = !isPersistent;
                                                setIsPersistent(newState);
                                                playSound(newState ? "lock" : "unlock", isMuted);
                                            }}
                                            className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all duration-200 active:scale-95 ${isPersistent ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400" : "bg-red-500/15 border-red-500/40 text-red-400"}`}
                                        >
                                            <motion.div animate={{ rotate: isPersistent ? 0 : -15, scale: isPersistent ? 1 : 0.92 }} transition={{ type: "spring", stiffness: 300, damping: 18 }}>
                                                {isPersistent ? <Lock size={15} /> : <Unlock size={15} />}
                                            </motion.div>
                                        </button>
                                    </div>

                                    <AnimatePresence initial={false}>
                                        {isPersistent && (
                                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden pt-1">
                                                <div className="relative flex items-center">
                                                    <Key className="absolute left-3.5 w-3.5 h-3.5 text-zinc-600" />
                                                    <input
                                                        type={showPassword ? "text" : "password"}
                                                        value={roomPassword}
                                                        onChange={(e) => setRoomPassword(e.target.value)}
                                                        placeholder="Set Room Password"
                                                        className="w-full bg-zinc-950 border border-zinc-800/80 focus:border-indigo-500 rounded-xl pl-9 pr-10 py-2.5 text-xs outline-none transition placeholder:text-zinc-600"
                                                    />
                                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 text-zinc-500 hover:text-zinc-300 transition-colors focus:outline-none">
                                                        {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                                                    </button>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                <motion.button
                                    type="submit" // 👉 NEW: Changed to submit
                                    whileHover={canCreateRoom && !isProcessing ? { scale: 1.01 } : {}}
                                    whileTap={canCreateRoom && !isProcessing ? { scale: 0.99 } : {}}
                                    disabled={!canCreateRoom || isProcessing} // 👉 NEW: Disabled during processing
                                    className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-3 text-sm font-semibold tracking-wide transition shadow-lg shadow-indigo-600/15 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isProcessing ? <><Loader2 size={16} className="animate-spin" /> Creating...</> : "Create Room"}
                                </motion.button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </form>
            </motion.div>
        </div>
    )
}