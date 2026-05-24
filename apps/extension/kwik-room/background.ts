/// <reference types="chrome" />

export { }

import { io }
  from "socket.io-client"

const socket = io(
  "http://127.0.0.1:4000",
  {
    transports: ["websocket"]
  }
)

chrome.sidePanel
  .setPanelBehavior({
    openPanelOnActionClick: true
  })
  .catch(console.error)

// SOCKET CONNECTED
socket.on(
  "connect",

  () => {

    console.log(
      "Background socket connected:",
      socket.id
    )

  }
)

// DEBUG ALL EVENTS
socket.onAny(
  (event, ...args) => {

    console.log(
      "SOCKET EVENT:",
      event,
      args
    )

  }
)

// RECEIVE MESSAGES
socket.on(
  "message",

  (msg) => {

    chrome.runtime.sendMessage({

      type: "new-message",

      payload: msg

    })

  }
)

// RECEIVE ONLINE USERS
socket.on(
  "online-users",

  (users) => {

    chrome.runtime.sendMessage({

      type: "online-users",

      payload: users

    })

  }
)

// ROOM CREATED
socket.on(
  "room-created",

  (room) => {

    console.log(
      "ROOM CREATED:",
      room
    )

    chrome.runtime.sendMessage({

      type: "room-created",

      payload: room

    })

  }
)

// SOCKET ERROR
socket.on(
  "error",

  (error) => {

    console.log(
      "SOCKET ERROR:",
      error
    )

    chrome.runtime.sendMessage({

      type: "socket-error",

      payload: error

    })

  }
)

// LISTEN FROM SIDEPANEL
chrome.runtime.onMessage.addListener(

  (
    message,
    sender,
    sendResponse
  ) => {

    console.log(
      "BACKGROUND RECEIVED:",
      message
    )

    // CREATE ROOM
    if (
      message.type ===
      "create-room"
    ) {

      socket.emit(
        "create-room",
        {
          username:
            message.payload.username
        }
      )

    }

    // JOIN ROOM
    if (
      message.type ===
      "join-room"
    ) {

      socket.emit(
        "join-room",
        message.payload
      )

    }

    // SEND MESSAGE
    if (
      message.type ===
      "send-message"
    ) {

      socket.emit(
        "message",
        message.payload
      )

    }

    return true

  }
)