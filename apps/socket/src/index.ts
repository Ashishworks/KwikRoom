import express from "express"

import { createServer }
  from "http"

import { Server }
  from "socket.io"

import cors from "cors"

import { registerRoomEvents }
  from "./events/room"

import { registerMessageEvents }
  from "./events/message"

import { checkRoomEvent }
  from "./events/room/checkRoom.js"

const app = express()

app.use(cors())

app.use(express.json())

const httpServer =
  createServer(app)

export const io = new Server(
  httpServer,
  {
    cors: {
      origin: true,
      credentials: true
    }
  }
)

io.on(
  "connection",

  (socket) => {

    console.log(
      "User connected:",
      socket.id
    )

    registerRoomEvents(
      io,
      socket
    )

    registerMessageEvents(
      io,
      socket
    )

    checkRoomEvent(
      io,
      socket
    )

    socket.on(
      "disconnect",

      () => {

        console.log(
          "User disconnected:",
          socket.id
        )

      }
    )

  }
)

httpServer.listen(
  4000,

  () => {

    console.log(
      "Socket server running on port 4000"
    )

  }
)