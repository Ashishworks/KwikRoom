import { Server, Socket }
from "socket.io"

import { redis }
from "@kwikroom/redis"

import { roomUsers }
from "../../state/roomUsers.js"

export function leaveRoomEvent(
  io: Server,
  socket: Socket
) {

  const handleLeave =
    async () => {

      try {

        const room =
          socket.data.room

        const username =
          socket.data.username

        if (
          !room ||
          !username
        ) return

        // LEAVE SOCKET ROOM

        socket.leave(room)

        const users =
          roomUsers.get(room) || []

        // REMOVE USER

        const updatedUsers =
          users.filter(
            (u) => u !== username
          )

        // CLEANUP EMPTY ROOM

        if (
          updatedUsers.length === 0
        ) {

          roomUsers.delete(room)

        } else {

          roomUsers.set(
            room,
            updatedUsers
          )

        }

        // BROADCAST ONLINE USERS

        io.to(room).emit(
          "online-users",
          updatedUsers
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
              `${username} left`,

            createdAt:
              new Date()
          }
        )

        // CHECK TEMP ROOM

        const tempRoom =
          await redis.get(
            `room:${room}`
          )

        // REFRESH TEMP ROOM TTL

        if (tempRoom) {

          await redis.expire(
            `room:${room}`,
            60 * 60 * 24
          )

        }

        // CLEAN SOCKET DATA

        socket.data.room =
          undefined

        socket.data.username =
          undefined

        socket.data.isPersistent =
          undefined

        console.log(
          `${username} left ${room}`
        )

      } catch (error) {

        console.log(error)

      }

    }

  // MANUAL LEAVE EVENT

  socket.on(
    "leave-room",
    handleLeave
  )

  // SOCKET DISCONNECT

  socket.on(
    "disconnect",
    handleLeave
  )

}