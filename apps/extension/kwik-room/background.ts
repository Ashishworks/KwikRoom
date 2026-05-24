/// <reference types="chrome" />

export {}

import { io } from "socket.io-client"

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

socket.on("connect", () => {

  console.log(
    "Background socket connected:",
    socket.id
  )

})

socket.onAny((event, ...args) => {

  console.log(
    "SOCKET EVENT:",
    event,
    args
  )

})

chrome.runtime.onMessage.addListener(
  (
    message,
    sender,
    sendResponse
  ) => {

    console.log(
      "Received:",
      message
    )

    if (
      message.type === "join-room"
    ) {

      console.log(
        "EMITTING JOIN ROOM"
      )

      socket.emit(
        "join-room",
        message.payload
      )

    }

    if (
      message.type === "send-message"
    ) {

      console.log(
        "EMITTING MESSAGE"
      )

      socket.emit(
        "message",
        message.payload
      )

    }

    return true
  }
)

socket.on("message", (msg) => {

  console.log(
    "SOCKET MESSAGE:",
    msg
  )

  chrome.runtime.sendMessage({
    type: "new-message",
    payload: msg
  })

})

socket.on(
  "online-users",
  (users) => {

    console.log(
      "ONLINE USERS:",
      users
    )

    chrome.runtime.sendMessage({
      type: "online-users",
      payload: users
    })

  }
)