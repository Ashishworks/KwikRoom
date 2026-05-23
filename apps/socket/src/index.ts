import express from "express"
import { createServer } from "http"
import { Server } from "socket.io"
import cors from "cors"

const app = express()

app.use(cors())

const httpServer = createServer(app)

const io = new Server(httpServer, {
  cors: {
    origin: "*"
  }
})

io.on("connection", (socket) => {

  console.log("User connected:", socket.id)

  socket.on("join-room", (roomCode) => {

    socket.join(roomCode)

    console.log(`${socket.id} joined ${roomCode}`)
  })

  socket.on("message", ({
    room,
    username,
    message
  }) => {

    io.to(room).emit("message", {
      username,
      text: message
    })

  })

  socket.on("disconnect", () => {
    console.log("Disconnected:", socket.id)
  })
})

httpServer.listen(4000, () => {
  console.log("Socket server running on port 4000")
})