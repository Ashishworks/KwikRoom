/// <reference types="chrome" />

export { }

import { io } from "socket.io-client"

const socket = io("http://127.0.0.1:4000", {
  transports: ["websocket"]
})

// OPEN SIDE PANEL
chrome.sidePanel
  .setPanelBehavior({
    openPanelOnActionClick: true
  })
  .catch(console.error)

// SOCKET CONNECTED
socket.on("connect", () => {
  console.log("Socket connected:", socket.id)
})

// DEBUG EVENTS
socket.onAny((event, ...args) => {
  console.log("SOCKET EVENT:", event, args)
})

// MESSAGE EVENT
socket.on("message", (msg) => {
  chrome.runtime.sendMessage({
    type: "message",
    payload: msg
  })
})

socket.on("older-messages-loaded", (data) => {
  chrome.runtime.sendMessage({
    type: "older-messages-loaded",
    payload: data
  })
})

// ROOM JOINED
socket.on("room-joined", (data) => {
  chrome.runtime.sendMessage({
    type: "room-joined",
    payload: data
  })
})

socket.on("room-check-result", (data) => {
  chrome.runtime.sendMessage({
    type: "room-check-result",
    payload: data
  })
})

// ONLINE USERS
socket.on("online-users", (users) => {
  chrome.runtime.sendMessage({
    type: "online-users",
    payload: users
  })
})

// ROOM CREATED
socket.on("room-created", (room) => {
  chrome.runtime.sendMessage({
    type: "room-created",
    payload: room
  })
})

// SOCKET ERROR
socket.on("error", (error) => {
  chrome.runtime.sendMessage({
    type: "socket-error",
    payload: error
  })
})

// ==========================================
// 👉 NEW: ARENA SOCKET EVENTS (Server to UI)
// ==========================================
socket.on("game-updated", (data) => {
  chrome.runtime.sendMessage({
    type: "game-updated",
    payload: data
  })
})

// ==========================================
// FIX: DETECT WHEN SIDEBAR CLOSES
// ==========================================
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === "sidepanel-lifecycle") {
    port.onDisconnect.addListener(() => {
      console.log("Sidebar closed! Leaving room...")
      socket.emit("leave-room")
    })
  }
})

// RECEIVE FROM SIDEPANEL
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("BACKGROUND RECEIVED:", message)

  // CREATE ROOM
  if (message.type === "create-room") {
    socket.emit("create-room", message.payload)
  }

  // CHECK ROOM 
  if (message.type === "check-room") {
    socket.emit("check-room", message.payload)
  }

  // JOIN ROOM
  if (message.type === "join-room") {
    socket.emit("join-room", message.payload)
  }

  // SEND MESSAGE
  if (message.type === "message") {
    socket.emit("message", message.payload)
  }

  // LEAVE ROOM
  if (message.type === "leave-room") {
    socket.emit("leave-room")
  }
  
  // LOAD OLDER MESSAGES
  if (message.type === "load-more-messages") {
    socket.emit("load-more-messages", message.payload)
  }

  // ==========================================
  // 👉 NEW: ARENA CHROME EVENTS (UI to Server)
  // ==========================================
  
  // JOIN GAME
  if (message.type === "join-game") {
    socket.emit("join-game", message.payload)
  }

  // GAME ACTION (e.g., making a move in Tic-Tac-Toe)
  if (message.type === "game-action") {
    socket.emit("game-action", message.payload)
  }

  return true
})