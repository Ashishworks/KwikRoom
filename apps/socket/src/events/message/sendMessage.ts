import { Server, Socket } from "socket.io"
import { prisma } from "@kwikroom/db"
import { redis } from "@kwikroom/redis"
import { generateKiwiResponse } from "../../services/ai/kiwiService"
import { encryptMessage } from "../../utils/crypto" // Only need encryptMessage here

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

        const tempRoom = await redis.exists(`room:${room}`)

        // ==========================================
        // KIWI AI GATEKEEPER
        // ==========================================
        const isTextMsg = !type || type === "chat" || type === "text";
        const isAiInteraction = isTextMsg && typeof message === "string" && message.toLowerCase().includes("@kiwi");

        if (isAiInteraction) {
          const promptId = Date.now();
          const promptCreatedAt = new Date();

          // 👉 1. BROADCAST USER PROMPT INSTANTLY (Zero Latency)
          io.to(room).emit("message", {
            id: promptId,
            username,
            text: message,
            createdAt: promptCreatedAt,
            type: "chat",
            metadata: { ...metadata, isAiInteraction: true }
          })

          // 👉 2. SAVE USER PROMPT IN BACKGROUND
          if (!tempRoom) {
            // Notice there is NO "await". We catch errors so the server doesn't crash if DB fails.
            prisma.message.create({
              data: {
                roomCode: room,
                senderId: socket.id,
                senderName: username,
                content: encryptMessage(message)
              }
            }).catch(err => console.error("Background AI Prompt Save Error:", err))
          }

          // 3. Fetch Kiwi's reply asynchronously (We MUST wait for the AI to generate the text)
          try {
            const kiwiReply = await generateKiwiResponse(message, room);
            const kiwiId = Date.now() + 1;
            const kiwiCreatedAt = new Date();
            
            // 👉 4. BROADCAST KIWI REPLY INSTANTLY (Don't wait for DB!)
            io.to(room).emit("message", {
              id: kiwiId,
              username: "Kiwi",
              text: kiwiReply, 
              createdAt: kiwiCreatedAt,
              type: "chat",
              metadata: { isBot: true, isAiInteraction: true }
            })

            // 👉 5. SAVE KIWI REPLY IN BACKGROUND
            if (!tempRoom) {
              prisma.message.create({
                data: {
                  roomCode: room,
                  senderId: "kiwi-ai-bot",
                  senderName: "Kiwi",
                  content: encryptMessage(kiwiReply)
                }
              }).catch(err => console.error("Background AI Reply Save Error:", err))
            }

          } catch (err) {
            console.error("Kiwi generation failed:", err)
          }

          // STOP EXECUTION!
          return
        }

        // ==========================================
        // NORMAL CHAT LOGIC
        // ==========================================
        
        // 👉 1. ALWAYS BROADCAST INSTANTLY (Whether temp or persistent)
        const messageId = Date.now();
        const messageCreatedAt = new Date();

        io.to(room).emit(
          "message",
          {
            id: messageId,
            username,
            text: message,
            createdAt: messageCreatedAt,
            type: "chat" 
          }
        )

        // 👉 2. IF PERSISTENT, SAVE AND ENCRYPT IN BACKGROUND
        if (!tempRoom) {
          // Fire and forget! The socket connection is freed up immediately.
          prisma.message.create({
            data: {
              roomCode: room,
              senderId: socket.id,
              senderName: username,
              content: encryptMessage(message)
            }
          }).catch(err => console.error("Background Chat Save Error:", err))
        }

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