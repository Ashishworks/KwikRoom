import express from "express"
import { createServer } from "http"
import { Server } from "socket.io"
import cors from "cors"

const app = express()
const roomUsers = new Map<
  string,
  string[]
>()
app.use(cors())

const httpServer = createServer(app)

const io = new Server(httpServer, {
  cors: {
  origin: true,
  credentials: true
}
})

io.on("connection", (socket) => {

  console.log("User connected:", socket.id)

  socket.on("join-room", ({
    room,
    username
  }) => {

    socket.join(room)

    socket.data.room = room
    socket.data.username = username

    const users =
      roomUsers.get(room) || []

    if (!users.includes(username)) {
      users.push(username)
    }

    roomUsers.set(room, users)

    io.to(room).emit(
      "online-users",
      users
    )

    io.to(room).emit("message", {
      username: "System",
      text: `${username} joined`
    })

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

  const room =
    socket.data.room

  const username =
    socket.data.username

  if (!room || !username) return

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

  io.to(room).emit("message", {
    username: "System",
    text: `${username} left`
  })

  console.log(
    `${username} disconnected`
  )

})
})

httpServer.listen(4000, () => {
  console.log("Socket server running on port 4000")
})