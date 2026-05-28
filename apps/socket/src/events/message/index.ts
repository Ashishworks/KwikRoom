import { Server, Socket }
from "socket.io"

import { sendMessageEvent }
from "./sendMessage.js"

import { loadMessagesEvent }
from "./loadMessages.js"

export function registerMessageEvents(
  io: Server,
  socket: Socket
) {

  sendMessageEvent(
    io,
    socket
  )

  loadMessagesEvent(
    io,
    socket
  )

}