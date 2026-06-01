import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Gamepad2, Disc, Type, Pencil, Search, Keyboard } from "lucide-react"
import { InfoTooltip } from "../InfoTooltip"
import { GAME_RULES } from "../../games/gameRules"

interface ArenaMenuProps {
  sendGameInvite: (gameType: "tic_tac_toe" | "four_in_a_row" | "word_guess" | "scribble_it" | "the_spy" | "typing_battle") => void
}

export function ArenaMenu({ sendGameInvite }: ArenaMenuProps) {
  const [showArenaMenu, setShowArenaMenu] = useState(false)
  const arenaMenuRef = useRef<HTMLDivElement>(null)

  // Click outside listener to auto-close the Arena menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showArenaMenu && arenaMenuRef.current && !arenaMenuRef.current.contains(e.target as Node)) {
        setShowArenaMenu(false)
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [showArenaMenu])

  return (
    <div className="relative shrink-0" ref={arenaMenuRef}>
      <AnimatePresence>
        {showArenaMenu && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute bottom-[120%] left-0 w-52 bg-zinc-900/95 backdrop-blur-md border border-zinc-700/50 rounded-xl shadow-xl overflow-hidden z-50"
          >
            <div className="px-3 py-2 border-b border-zinc-800/50 bg-zinc-950/50">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Select Game</span>
            </div>

            {/* Tic-Tac-Toe */}
            <div className="flex items-center w-full group hover:bg-indigo-600 transition-colors border-b border-zinc-800/30">
              <button
                onClick={() => {
                  sendGameInvite("tic_tac_toe")
                  setShowArenaMenu(false)
                }}
                className="flex-1 text-left px-3 py-2.5 text-xs font-medium text-zinc-300 group-hover:text-white flex items-center gap-2"
              >
                <Gamepad2 size={14} className="text-zinc-400 group-hover:text-indigo-200 transition-colors" />
                Tic-Tac-Toe
              </button>
              <div className="pr-3 pl-1 py-2.5">
                <InfoTooltip text={GAME_RULES.tic_tac_toe} position="right" />
              </div>
            </div>

            {/* Four in a Row */}
            <div className="flex items-center w-full group hover:bg-indigo-600 transition-colors border-b border-zinc-800/30">
              <button
                onClick={() => {
                  sendGameInvite("four_in_a_row")
                  setShowArenaMenu(false)
                }}
                className="flex-1 text-left px-3 py-2.5 text-xs font-medium text-zinc-300 group-hover:text-white flex items-center gap-2"
              >
                <Disc size={14} className="text-zinc-400 group-hover:text-indigo-200 transition-colors" />
                Four in a Row
              </button>
              <div className="pr-3 pl-1 py-2.5">
                <InfoTooltip text={GAME_RULES.four_in_a_row} position="right" />
              </div>
            </div>

            {/* Word Guess */}
            <div className="flex items-center w-full group hover:bg-indigo-600 transition-colors border-b border-zinc-800/30">
              <button
                onClick={() => {
                  sendGameInvite("word_guess")
                  setShowArenaMenu(false)
                }}
                className="flex-1 text-left px-3 py-2.5 text-xs font-medium text-zinc-300 group-hover:text-white flex items-center gap-2"
              >
                <Type size={14} className="text-zinc-400 group-hover:text-indigo-200 transition-colors" />
                Word Guess
              </button>
              <div className="pr-3 pl-1 py-2.5">
                <InfoTooltip text={GAME_RULES.word_guess} position="right" />
              </div>
            </div>

            {/* Scribble */}
            <div className="flex items-center w-full group hover:bg-indigo-600 transition-colors border-b border-zinc-800/30">
              <button
                onClick={() => {
                  sendGameInvite("scribble_it")
                  setShowArenaMenu(false)
                }}
                className="flex-1 text-left px-3 py-2.5 text-xs font-medium text-zinc-300 group-hover:text-white flex items-center gap-2"
              >
                <Pencil size={14} className="text-zinc-400 group-hover:text-indigo-200 transition-colors" />
                Scribble
              </button>
              <div className="pr-3 pl-1 py-2.5">
                <InfoTooltip text={GAME_RULES.scribble_it} position="right" />
              </div>
            </div>

            {/* The Spy */}
            <div className="flex items-center w-full group hover:bg-indigo-600 transition-colors border-b border-zinc-800/30">
              <button
                onClick={() => {
                  sendGameInvite("the_spy")
                  setShowArenaMenu(false)
                }}
                className="flex-1 text-left px-3 py-2.5 text-xs font-medium text-zinc-300 group-hover:text-white flex items-center gap-2"
              >
                <Search size={14} className="text-zinc-400 group-hover:text-indigo-200 transition-colors" />
                The Spy
              </button>
              <div className="pr-3 pl-1 py-2.5">
                <InfoTooltip text={GAME_RULES.the_spy} position="right" />
              </div>
            </div>
            
            {/* Typing Battle */}
            <div className="flex items-center w-full group hover:bg-indigo-600 transition-colors">
              <button
                onClick={() => {
                  sendGameInvite("typing_battle")
                  setShowArenaMenu(false)
                }}
                className="flex-1 text-left px-3 py-2.5 text-xs font-medium text-zinc-300 group-hover:text-white flex items-center gap-2"
              >
                <Keyboard size={14} className="text-zinc-400 group-hover:text-indigo-200 transition-colors" />
                Typing Battle
              </button>
              <div className="pr-3 pl-1 py-2.5">
                <InfoTooltip text={GAME_RULES.typing_battle} position="right" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowArenaMenu(!showArenaMenu)}
        className={`p-2 mb-0.5 rounded-lg transition-colors ${showArenaMenu
          ? "bg-indigo-500/20 text-indigo-400"
          : "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
          }`}
        title="Open Arena"
      >
        <Gamepad2 size={16} />
      </motion.button>
    </div>
  )
}