import { Server, Socket } from "socket.io"

import bcrypt from "bcrypt"

import { prisma } from "@kwikroom/db"

import { redis } from "@kwikroom/redis"

import { roomUsers } from "../../state/roomUsers.js"

export function joinRoomEvent(
  io: Server,
  socket: Socket
) {

  socket.on(
    "join-room",

    async ({
      room,
      username,
      password
    }) => {

      try {

        // CHECK TEMP ROOM

        const tempRoom =
          await redis.get(
            `room:${room}`
          )

        // CHECK PERSISTENT ROOM

        const persistentRoom =
          await prisma.room.findUnique({
            where: {
              code: room
            }
          })

        // ROOM DOES NOT EXIST

        if (
          tempRoom === null &&
          !persistentRoom
        ) {

          socket.emit(
            "error",
            "Room does not exist"
          )

          return

        }

        // PASSWORD CHECK

        if (
          persistentRoom?.password
        ) {

          const validPassword =
            await bcrypt.compare(
              password,
              persistentRoom.password
            )

          if (!validPassword) {

            socket.emit(
              "error",
              "Invalid password"
            )

            return

          }

        }

        // JOIN SOCKET ROOM

        socket.join(room)

        socket.data.room =
          room

        socket.data.username =
          username

        // ONLINE USERS

        const users =
          roomUsers.get(room) || []

        if (
          !users.includes(username)
        ) {

          users.push(username)

        }

        roomUsers.set(
          room,
          users
        )

        // LOAD LATEST 15 MESSAGES

        const messages =
          await prisma.message.findMany({

            where: {
              roomCode: room
            },

            orderBy: {
              id: "desc"
            },

            take: 15

          })

        // REVERSE FOR CHAT ORDER

        const orderedMessages =
          messages.reverse()

        // SEND INITIAL ROOM DATA

        socket.emit(
          "room-joined",
          {
            room,
            messages:
              orderedMessages
          }
        )

        // ONLINE USERS

        io.to(room).emit(
          "online-users",
          users
        )

        // SYSTEM MESSAGE

        io.to(room).emit(
          "message",
          {
            id:
              Date.now(),

            username:
              "System",

            text:
              `${username} joined`,

            createdAt:
              new Date()
          }
        )

        console.log(
          `${username} joined ${room}`
        )

      } catch (error) {

        console.log(error)

        socket.emit(
          "error",
          "Failed to join room"
        )

      }

    }
  )

}