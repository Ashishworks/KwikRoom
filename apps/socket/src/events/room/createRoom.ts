import { Server, Socket }
from "socket.io"

import { prisma }
from "@kwikroom/db"

import { generateRoomCode }
from "@kwikroom/utils"

export function createRoomEvent(
  io: Server,
  socket: Socket
) {

  socket.on(
    "create-room",

    async ({
      username
    }) => {

      try {

        const code =
          generateRoomCode()

        const room =
          await prisma.room.create({

            data: {
              code,
              adminId: username
            }

          })

        socket.emit(
          "room-created",
          room
        )

      } catch (error) {

        console.log(error)

        socket.emit(
          "error",
          "Failed to create room"
        )

      }

    }
  )

}