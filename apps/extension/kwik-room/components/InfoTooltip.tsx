import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Info } from "lucide-react"
import { createPortal } from "react-dom"

export function InfoTooltip({ text }: { text: string, position?: string }) {
  const [isHovered, setIsHovered] = useState(false)
  const [coords, setCoords] = useState({ x: 0, y: 0 })
  const iconRef = useRef<HTMLDivElement>(null)

  // Calculate the exact screen coordinates of the info icon
  useEffect(() => {
    if (isHovered && iconRef.current) {
      const rect = iconRef.current.getBoundingClientRect()
      setCoords({
        x: rect.left + rect.width / 2, // Find the absolute horizontal center of the icon
        y: rect.top
      })
    }
  }, [isHovered])

  return (
    <>
      {/* Trigger icon */}
      <div 
        ref={iconRef}
        className="relative flex items-center justify-center cursor-help"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={(e) => e.stopPropagation()}
      >
        <Info size={14} className="text-zinc-500 hover:text-indigo-400 transition-colors" />
      </div>

      {/* Portaled Tooltip overlaying all layouts */}
      {isHovered && typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            transition={{ duration: 0.12 }}
            className="fixed z-[9999] w-48 p-2.5 bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl text-[10px] text-zinc-300 leading-relaxed font-medium pointer-events-none text-center"
            style={{
              // 👉 FIX: Teleports directly above the icon element
              // y coordinate: sits above the icon (approx tooltip height + small margin)
              // x coordinate: perfectly centered horizontally relative to the icon element
              top: `${coords.y - 100}px`, 
              left: `${coords.x - 96}px`, 
            }}
          >
            {text}
            {/* Optional visual anchor caret arrow pointing downward */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-zinc-700" />
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </>
  )
}