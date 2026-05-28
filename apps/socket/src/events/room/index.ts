import { Server, Socket }
  from "socket.io"

import { createRoomEvent }
  from "./createRoom.js"

import { joinRoomEvent }
  from "./joinRoom.js"

import { leaveRoomEvent }
  from "./leaveRoom.js"

export function registerRoomEvents(
  io: Server,
  socket: Socket
) {

  createRoomEvent(io, socket)

  joinRoomEvent(io, socket)

  leaveRoomEvent(io, socket)

}