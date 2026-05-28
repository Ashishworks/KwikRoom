import { Server, Socket }
from "socket.io"

import bcrypt
from "bcrypt"

import { prisma }
from "@kwikroom/db"

import { redis }
from "@kwikroom/redis"

import { generateRoomCode }
from "@kwikroom/utils"

export function createRoomEvent(
  io: Server,
  socket: Socket
) {

  socket.on(
    "create-room",

    async ({
      username,
      isPersistent,
      password
    }) => {

      try {

        let code =
          generateRoomCode()

        let existingRoom =
          await prisma.room.findUnique({
            where: { code }
          })

        while (existingRoom) {

          code =
            generateRoomCode()

          existingRoom =
            await prisma.room.findUnique({
              where: { code }
            })

        }

        // TEMPORARY ROOM
        if (!isPersistent) {

          await redis.set(
            `room:${code}`,

            JSON.stringify({
              code,
              adminId: username
            }),

            {
              ex: 60 * 60 * 24
            }
          )

          socket.emit(
            "room-created",
            {
              code,
              isPersistent: false
            }
          )

          return

        }

        // PERSISTENT ROOM

        const hashedPassword =
          await bcrypt.hash(
            password,
            10
          )

        const room =
          await prisma.room.create({

            data: {
              code,
              adminId: username,
              isPersistent: true,
              password: hashedPassword
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