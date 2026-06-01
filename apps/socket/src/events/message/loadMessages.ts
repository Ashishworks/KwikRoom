import { Server, Socket } from "socket.io"
import { prisma } from "@kwikroom/db"
import { serializeMessage } from "@kwikroom/utils"
import { decryptMessage } from "../../utils/crypto" // 👉 NEW: Import decryption utility

export function loadMessagesEvent(
  io: Server,
  socket: Socket
) {
  socket.on(
    "load-more-messages",
    async ({
      room,
      cursor
    }) => {
      try {
        const messages = await prisma.message.findMany({
          where: {
            roomCode: room,
            id: {
              lt: BigInt(cursor)
            }
          },
          orderBy: {
            id: "desc"
          },
          take: 15
        })

        // 👉 NEW: Decrypt the history before reversing and serializing
        const orderedMessages = messages
          .map(msg => ({ ...msg, content: decryptMessage(msg.content) }))
          .reverse()
          .map(serializeMessage)

        socket.emit(
          "older-messages-loaded",
          {
            messages: orderedMessages,
            hasMore: messages.length === 15
          }
        )

      } catch (error) {
        console.log(error)
        socket.emit(
          "error",
          "Failed to load messages"
        )
      }
    }
  )
}