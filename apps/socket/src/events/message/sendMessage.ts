import { Server, Socket } from "socket.io"
import { prisma } from "@kwikroom/db"
import { redis } from "@kwikroom/redis"
import { generateKiwiResponse } from "../../services/ai/kiwiService" // 👉 NEW: Import the function to generate Kiwi's response

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
      type,       
      metadata    
    }) => {
      try {
        // ==========================================
        // ARENA GATEKEEPER
        // ==========================================
        if (type === "game_invite" || type === "game_state") {
          io.to(room).emit("message", {
            id: Date.now(), 
            username,
            text: message || "", 
            createdAt: new Date(),
            type,
            metadata
          })
          return
        }

        // ==========================================
        // 👉 NEW: KIWI AI GATEKEEPER
        // ==========================================
        // Check if it's a normal chat message and contains "@kiwi"
        const isTextMsg = !type || type === "chat" || type === "text";
        const isAiInteraction = isTextMsg && typeof message === "string" && message.toLowerCase().includes("@kiwi");

        if (isAiInteraction) {
          // 1. Broadcast the user's prompt instantly (Ephemeral - no DB save)
          io.to(room).emit("message", {
            id: Date.now(),
            username,
            text: message,
            createdAt: new Date(),
            type: "chat",
            metadata: { ...metadata, isAiInteraction: true }
          })

          // 2. Fetch Kiwi's reply asynchronously
          try {
            const kiwiReply = await generateKiwiResponse(message);
            
            // 3. Broadcast Kiwi's reply (Ephemeral - no DB save)
            io.to(room).emit("message", {
              id: Date.now() + 1, // Ensure distinct ID
              username: "Kiwi", // AI Bot Name
              text: kiwiReply,
              createdAt: new Date(),
              type: "chat",
              metadata: { isBot: true, isAiInteraction: true } // Flags for frontend styling
            })
          } catch (err) {
            console.error("Kiwi generation failed:", err)
          }

          // 4. STOP EXECUTION! This prevents the message from hitting Prisma or Redis.
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
              type: "chat" 
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
            type: "chat" 
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