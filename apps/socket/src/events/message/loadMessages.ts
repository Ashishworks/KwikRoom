import { Server, Socket }
  from "socket.io"

import { prisma }
  from "@kwikroom/db"

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

        const messages =
          await prisma.message.findMany({

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

        const orderedMessages =
  messages
    .reverse()
    .map((msg) => ({

      id: Number(msg.id),

      username:
        msg.senderName,

      text:
        msg.content,

      createdAt:
        msg.createdAt

    }))

        socket.emit(
          "older-messages-loaded",
          {
            messages:
              orderedMessages,

            hasMore:
              messages.length === 15
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