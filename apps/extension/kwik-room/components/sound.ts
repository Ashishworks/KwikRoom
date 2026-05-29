// components/sound.ts

export type SoundType = "lock" | "unlock" | "success" | "send" | "receive" | "swoosh"

// Create a single, shared AudioContext outside the function so the browser doesn't block us
// for creating too many contexts, but we create fresh oscillators every time.
let audioCtx: AudioContext | null = null

export const playSound = (type: SoundType, isMuted: boolean) => {
  if (isMuted) return

  try {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioContextClass) return
      audioCtx = new AudioContextClass()
    }

    // Resume context if browser suspended it
    if (audioCtx.state === 'suspended') {
      audioCtx.resume()
    }

    // CREATE FRESH NODES FOR EVERY SOUND
    const oscillator = audioCtx.createOscillator()
    const gainNode = audioCtx.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioCtx.destination)
    
    // Default wave shape
    oscillator.type = "sine"
    
    const now = audioCtx.currentTime

    // Ensure gain starts exactly at 0 to prevent any weird clicking/bleeding
    gainNode.gain.setValueAtTime(0, now)

    switch (type) {
      case "lock":
        oscillator.frequency.setValueAtTime(400, now)
        oscillator.frequency.exponentialRampToValueAtTime(150, now + 0.08)
        gainNode.gain.setValueAtTime(0.3, now)
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.08)
        oscillator.start(now)
        oscillator.stop(now + 0.08)
        break
        
      case "unlock":
        oscillator.frequency.setValueAtTime(250, now)
        oscillator.frequency.exponentialRampToValueAtTime(500, now + 0.08)
        gainNode.gain.setValueAtTime(0.3, now)
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.08)
        oscillator.start(now)
        oscillator.stop(now + 0.08)
        break
        
      case "send": 
        oscillator.frequency.setValueAtTime(300, now)
        oscillator.frequency.exponentialRampToValueAtTime(200, now + 0.05)
        gainNode.gain.setValueAtTime(0.2, now)
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.05)
        oscillator.start(now)
        oscillator.stop(now + 0.05)
        break
        
      case "receive": 
        oscillator.frequency.setValueAtTime(500, now)
        oscillator.frequency.exponentialRampToValueAtTime(700, now + 0.08)
        gainNode.gain.setValueAtTime(0.2, now)
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.08)
        oscillator.start(now)
        oscillator.stop(now + 0.08)
        break
        
      case "success": 
        oscillator.frequency.setValueAtTime(400, now)
        oscillator.frequency.exponentialRampToValueAtTime(800, now + 0.15)
        gainNode.gain.setValueAtTime(0.2, now)
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15)
        oscillator.start(now)
        oscillator.stop(now + 0.15)
        break
        
      case "swoosh": 
        oscillator.frequency.setValueAtTime(800, now)
        oscillator.frequency.exponentialRampToValueAtTime(100, now + 0.1)
        gainNode.gain.setValueAtTime(0.2, now)
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1)
        oscillator.start(now)
        oscillator.stop(now + 0.1)
        break
    }
  } catch (e) {
    console.error("Audio generation failed:", e)
  }
}