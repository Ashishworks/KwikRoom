import { Server, Socket }
from "socket.io"

import { roomUsers }
from "../../state/roomUsers.js"

export function leaveRoomEvent(
  io: Server,
  socket: Socket
) {

  socket.on(
    "disconnect",

    () => {

      const room =
        socket.data.room

      const username =
        socket.data.username

      if (
        !room ||
        !username
      ) return

      const users =
        roomUsers.get(room) || []

      const updatedUsers =
        users.filter(
          (u) => u !== username
        )

      roomUsers.set(
        room,
        updatedUsers
      )

      io.to(room).emit(
        "online-users",
        updatedUsers
      )

      io.to(room).emit(
        "message",
        {
          username: "System",
          text:
            `${username} left`
        }
      )

      console.log(
        `${username} disconnected`
      )

    }
  )

}