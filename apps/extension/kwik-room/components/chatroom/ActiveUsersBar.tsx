import { motion, AnimatePresence } from "framer-motion"
import { Users } from "lucide-react"

interface ActiveUsersBarProps {
  onlineUsers: string[]
  username: string
}

export function ActiveUsersBar({ onlineUsers, username }: ActiveUsersBarProps) {
  return (
    <div className="border-b border-zinc-900 bg-zinc-950/40 px-4 py-2 flex items-center gap-3 overflow-hidden select-none">
      <div className="flex items-center gap-1.5 shrink-0 text-zinc-500">
        <Users size={12} />
        <span className="text-[9px] font-bold tracking-wider uppercase text-zinc-500">
          Active ({onlineUsers.length})
        </span>
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-1 py-0.5 scrollbar-none">
        <style dangerouslySetInnerHTML={{ __html: `.no-scrollbar::-webkit-scrollbar { display: none; } .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }` }} />
        <AnimatePresence>
          {onlineUsers.map((user, i) => {
            const firstLetter = user.trim().charAt(0).toUpperCase() || "?"
            const isCurrentUser = user === username

            return (
              <motion.div
                key={user + i}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center gap-1.5 shrink-0 px-2 py-0.5 rounded-full border bg-zinc-900/40 border-zinc-800/60 text-[11px]"
              >
                <div className="relative w-4 h-4 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-900 text-zinc-400 text-[9px] font-bold flex items-center justify-center border border-zinc-700/50">
                  {firstLetter}
                  <span className="absolute bottom-0 right-0 w-1 h-1 rounded-full bg-emerald-500 ring-[0.5px] ring-zinc-950" />
                </div>
                <span className="truncate max-w-[70px] text-zinc-400 font-medium tracking-tight">
                  {isCurrentUser ? "You" : user}
                </span>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </div>
  )
}