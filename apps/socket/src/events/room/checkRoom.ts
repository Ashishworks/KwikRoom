import { Server, Socket }
from "socket.io"

import { prisma }
from "@kwikroom/db"

import { redis }
from "@kwikroom/redis"

export function checkRoomEvent(
  io: Server,
  socket: Socket
) {

  socket.on(
    "check-room",

    async ({
      room,
      username
    }) => {

      try {

        // TEMP ROOM

        const tempRoom =
          await redis.get(
            `room:${room}`
          )

        if (tempRoom) {

          socket.emit(
            "room-check-result",
            {
              exists: true,

              requiresPassword: false,

              isPersistent: false,

              roomCode: room,

              username
            }
          )

          return

        }

        // PERSISTENT ROOM

        const persistentRoom =
          await prisma.room.findUnique({

            where: {
              code: room
            }

          })

        // ROOM NOT FOUND

        if (!persistentRoom) {

          socket.emit(
            "room-check-result",
            {
              exists: false
            }
          )

          return

        }

        socket.emit(
          "room-check-result",
          {
            exists: true,

            requiresPassword:
              !!persistentRoom.password,

            isPersistent: true,

            roomCode: room,

            username
          }
        )

      } catch (error) {

        console.log(error)

        socket.emit(
          "error",
          "Failed to check room"
        )

      }

    }
  )

}