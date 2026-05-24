import express from "express"

import { createServer }
from "http"

import { Server }
from "socket.io"

import cors from "cors"

import { createRoomEvent }
from "./events/room/createRoom.js"

import { joinRoomEvent }
from "./events/room/joinRoom.js"

import { leaveRoomEvent }
from "./events/room/leaveRoom.js"

import { sendMessageEvent }
from "./events/message/sendMessage.js"

const app = express()

app.use(cors())

app.use(express.json())

const httpServer =
  createServer(app)

const io = new Server(
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

    // CREATE ROOM
    createRoomEvent(
      io,
      socket
    )

    // JOIN ROOM
    joinRoomEvent(
      io,
      socket
    )

    // SEND MESSAGE
    sendMessageEvent(
      io,
      socket
    )

    // LEAVE ROOM
    leaveRoomEvent(
      io,
      socket
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