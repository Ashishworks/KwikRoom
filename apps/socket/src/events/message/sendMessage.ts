import { Server, Socket } from "socket.io"
import { prisma } from "@kwikroom/db"
import { redis } from "@kwikroom/redis"

export function sendMessageEvent(
  io: Server,
  socket: Socket
) {
  socket.on(
    "message",
    async ({
      room,
      username,
      message,
      type,       // 👉 NEW: Extract type
      metadata    // 👉 NEW: Extract metadata
    }) => {
      try {
        // ==========================================
        // 👉 NEW: ARENA GATEKEEPER
        // ==========================================
        // If this is a game-related message, broadcast it instantly and STOP.
        // It bypasses both Redis and Prisma entirely.
        if (type === "game_invite" || type === "game_state") {
          io.to(room).emit("message", {
            id: Date.now(), // Transient ID
            username,
            text: message || "", 
            createdAt: new Date(),
            type,
            metadata
          })
          return
        }

        // ==========================================
        // EXISTING CHAT LOGIC BELOW
        // ==========================================
        
        // CHECK IF ROOM IS TEMP
        const tempRoom = await redis.exists(`room:${room}`)

        // TEMPORARY ROOM
        // NO DB STORAGE
        if (tempRoom) {
          io.to(room).emit(
            "message",
            {
              id: Date.now(),
              username,
              text: message,
              createdAt: new Date(),
              type: "chat" // Default to chat
            }
          )
          return
        }

        // SAVE PERSISTENT MESSAGE
        const savedMessage = await prisma.message.create({
          data: {
            roomCode: room,
            senderId: socket.id,
            senderName: username,
            content: message
          }
        })

        // EMIT SAVED MESSAGE
        io.to(room).emit(
          "message",
          {
            id: Number(savedMessage.id),
            username: savedMessage.senderName,
            text: savedMessage.content,
            createdAt: savedMessage.createdAt,
            type: "chat" // Default to chat
          }
        )

        console.log(`${username}: ${message}`)

      } catch (error) {
        console.log(error)
        socket.emit(
          "error",
          "Failed to send message"
        )
      }
    }
  )
}