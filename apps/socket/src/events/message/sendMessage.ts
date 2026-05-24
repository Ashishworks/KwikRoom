import { Server, Socket }
from "socket.io"

export function sendMessageEvent(
  io: Server,
  socket: Socket
) {

  socket.on(
    "message",

    ({
      room,
      username,
      message
    }) => {

      io.to(room).emit(
        "message",
        {
          username,
          text: message
        }
      )

      console.log(
        `${username}: ${message}`
      )

    }
  )

}