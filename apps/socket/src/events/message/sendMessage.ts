import { Server, Socket } from "socket.io"
import { prisma } from "@kwikroom/db"
import { redis } from "@kwikroom/redis"
import { generateKiwiResponse } from "../../services/ai/kiwiService"
import { encryptMessage, decryptMessage } from "../../utils/crypto"

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

        // 👉 NEW: Check if the room is temporary upfront so we know if we should save AI messages
        const tempRoom = await redis.exists(`room:${room}`)

        // ==========================================
        // KIWI AI GATEKEEPER
        // ==========================================
        const isTextMsg = !type || type === "chat" || type === "text";
        const isAiInteraction = isTextMsg && typeof message === "string" && message.toLowerCase().includes("@kiwi");

        if (isAiInteraction) {
          let promptId: string | number = Date.now();
          let kiwiId: string | number = Date.now() + 1;
          let promptCreatedAt = new Date();

          // 1. SAVE USER PROMPT TO DB (If persistent room)
          if (!tempRoom) {
            const savedPrompt = await prisma.message.create({
              data: {
                roomCode: room,
                senderId: socket.id,
                senderName: username,
                content: encryptMessage(message) // 👉 ENCRYPTED HERE
              }
            })
            promptId = Number(savedPrompt.id)
            promptCreatedAt = savedPrompt.createdAt
          }

          // 2. Broadcast the user's prompt instantly
          io.to(room).emit("message", {
            id: promptId,
            username,
            text: message, // 👉 PLAIN TEXT EMITTED TO LIVE USERS
            createdAt: promptCreatedAt,
            type: "chat",
            metadata: { ...metadata, isAiInteraction: true }
          })

          // 3. Fetch Kiwi's reply asynchronously
          try {
            const kiwiReply = await generateKiwiResponse(message, room);
            let kiwiCreatedAt = new Date();
            
            // 4. SAVE KIWI'S REPLY TO DB (If persistent room)
            if (!tempRoom) {
              const savedKiwi = await prisma.message.create({
                data: {
                  roomCode: room,
                  senderId: "kiwi-ai-bot", // Static ID for the bot
                  senderName: "Kiwi",
                  content: encryptMessage(kiwiReply) // 👉 ENCRYPTED HERE
                }
              })
              kiwiId = Number(savedKiwi.id)
              kiwiCreatedAt = savedKiwi.createdAt
            }

            // 5. Broadcast Kiwi's reply
            io.to(room).emit("message", {
              id: kiwiId,
              username: "Kiwi",
              text: kiwiReply, // 👉 PLAIN TEXT EMITTED TO LIVE USERS
              createdAt: kiwiCreatedAt,
              type: "chat",
              metadata: { isBot: true, isAiInteraction: true }
            })
          } catch (err) {
            console.error("Kiwi generation failed:", err)
          }

          // 6. STOP EXECUTION!
          return
        }


        // ==========================================
        // EXISTING NORMAL CHAT LOGIC BELOW
        // ==========================================
        
        // TEMPORARY ROOM (NO DB STORAGE)
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

        // SAVE PERSISTENT NORMAL MESSAGE
        const savedMessage = await prisma.message.create({
          data: {
            roomCode: room,
            senderId: socket.id,
            senderName: username,
            content: encryptMessage(message) // 👉 ENCRYPTED HERE
          }
        })

        // EMIT SAVED NORMAL MESSAGE
        io.to(room).emit(
          "message",
          {
            id: Number(savedMessage.id),
            username: savedMessage.senderName,
            text: message, // 👉 CHANGED: Emitting plain text 'message' instead of encrypted 'savedMessage.content'
            createdAt: savedMessage.createdAt,
            type: "chat" 
          }
        )

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