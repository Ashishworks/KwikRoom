import { Server, Socket }
from "socket.io"

import { roomUsers }
from "../../state/roomUsers.js"

export function joinRoomEvent(
  io: Server,
  socket: Socket
) {

  socket.on(
    "join-room",

    ({
      room,
      username
    }) => {

      socket.join(room)

      socket.data.room =
        room

      socket.data.username =
        username

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

      io.to(room).emit(
        "online-users",
        users
      )

      io.to(room).emit(
        "message",
        {
          username: "System",
          text:
            `${username} joined`
        }
      )

      console.log(
        `${username} joined ${room}`
      )

    }
  )

}