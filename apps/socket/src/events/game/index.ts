import { Server, Socket } from "socket.io"

export function gameEvents(io: Server, socket: Socket) {
  
  // ==========================================
  // 1. HANDLE JOINING THE ARENA
  // ==========================================
  socket.on("join-game", (payload) => {
    console.log(`[ARENA] ${payload.username} accepted challenge ${payload.gameInstanceId}`)
    
    // 👉 FIX: Broadcast explicitly that the game is STARTING to everyone in the room
    io.to(payload.room).emit("game-updated", {
      action: "start", // Explicit action flag added here
      gameInstanceId: payload.gameInstanceId,
      playersJoined: payload.playersJoined,
      gameType: payload.gameType
    })
  })

  // ==========================================
  // 2. HANDLE IN-GAME MOVES (Stateless Relay)
  // ==========================================
  socket.on("game-action", (payload) => {
    io.to(payload.room).emit("game-updated", payload)
  })
}