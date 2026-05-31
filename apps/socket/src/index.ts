import express from "express"
import { createServer } from "http"
import { Server } from "socket.io"
import cors from "cors"
import "dotenv/config"

import { registerRoomEvents } from "./events/room"
import { registerMessageEvents } from "./events/message"
import { checkRoomEvent } from "./events/room/checkRoom.js"

// 👉 NEW: Import the Arena game events
import { gameEvents } from "./events/game" 

const app = express()

app.use(cors())
app.use(express.json())

// ==========================================
// 👉 NEW: RENDER HEALTH CHECK ENDPOINT
// Ping this every 14 mins to keep the server awake
// ==========================================
app.get("/health", (req, res) => {
  res.status(200).json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    service: "kwikroom-socket"
  });
});

const httpServer = createServer(app)

export const io = new Server(
  httpServer,
  {
    cors: {
      origin: true,
      credentials: true
    }
  }
)

io.on(
  "connection",
  (socket) => {
    console.log("User connected:", socket.id)

    // Existing event registrations
    registerRoomEvents(io, socket)
    registerMessageEvents(io, socket)
    checkRoomEvent(io, socket)

    // 👉 Register the Arena events for Tic-Tac-Toe
    gameEvents(io, socket)

    socket.on(
      "disconnect",
      () => {
        console.log("User disconnected:", socket.id)
      }
    )
  }
)

const PORT = process.env.PORT || 4000

httpServer.listen(
  PORT,
  () => {
    console.log(`Socket server running on port ${PORT}`)
  }
)