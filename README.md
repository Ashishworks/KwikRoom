# KwikRoom

KwikRoom is a realtime Chrome Extension-based communication platform built with Plasmo, React, TypeScript, Socket.IO, Redis, Prisma, and Supabase.

The platform supports both temporary Redis-backed rooms and persistent PostgreSQL-backed rooms with password protection, **AES-256 encrypted message persistence**, realtime presence tracking, and infinite chat history pagination. 

Recently expanded into a fully interactive collaborative space, KwikRoom now features **in-chat multiplayer games**, a **custom Web Audio API sound engine**, and an **intelligent AI assistant** powered by Google Gemini. Designed with a highly modular event-driven architecture, KwikRoom focuses on fast communication, scalable backend design, zero-latency optimistic broadcasting, and a premium glassmorphic user experience directly inside the Chrome Side Panel.

---

## Features

### Realtime Communication & Security
* **Instant Matchmaking:** Create rooms instantly and join using unique 5-letter room codes.
* **Optimistic Broadcasting:** Zero-latency chat architecture instantly broadcasts messages to connected clients, while gracefully offloading heavy AES encryption and database saves to a background promise queue (Fire-and-Forget).
* **Encryption-at-Rest:** All messages in persistent rooms are secured using AES-256 Server-Side Encryption before being written to PostgreSQL.
* **Pagination:** Smart cursor-based pagination for infinite, seamless chat history scrolling.

### Temporary & Persistent Rooms
* **Temporary Rooms:** Redis-backed ephemeral rooms designed for short-term collaboration. Fast room creation, lightweight architecture, and automatic TTL expiration.
* **Persistent Rooms:** PostgreSQL-backed rooms designed for long-term communication with password-protected access and permanent, encrypted message persistence.

### 🤖 Kiwi AI Assistant
* **@kiwi Mentions:** Tag `@kiwi` anywhere in the chat to summon the room's AI assistant.
* **Powered by Gemini:** Uses Google's generative AI model for high-speed, intelligent responses.
* **Encrypted Memory Persistence:** In persistent rooms, AI prompts and bot replies are seamlessly encrypted and saved to the database. Because of the optimistic broadcasting architecture, AI interactions feel instantly responsive without blocking the socket event loop. (In temporary rooms, AI chats remain strictly ephemeral).
* **Custom UI:** Kiwi messages feature a premium, dark-mode "Soft Sage" (teal) glassmorphic design to stand out visually from normal users.

### 🎮 Multiplayer Arena (Mini-Games)
A suite of real-time multiplayer games playable directly inside the chat interface without leaving the room. State sync is handled via highly optimized, lightweight socket action packets to prevent state collisions in lobbies of up to 7 players.
* **Typing Battle:** Real-time multiplayer typing test with live opponent cursors, dynamic auto-scrolling, WPM/accuracy tracking, custom host-configured timers, and a post-game leaderboard.
* **Scribble:** Multiplayer drawing game featuring a custom HTML5 Canvas toolbar, adjustable brush strokes, and an advanced stack-based Flood Fill algorithm for the paint bucket tool.
* **The Spy:** Social deduction game for up to 7 players, featuring a dedicated interrogation chat, live voting, and a dynamic tabbed UI allowing the Spy to intercept the location or frame innocent crewmates.
* **Board & Word Games:** Play *Tic-Tac-Toe*, *Four in a Row*, and *Word Guess*.
* **Interactive Invites:** Send rich UI game invites into the chat that automatically expire after 60 seconds.

### 🎨 Premium UI & Sound Engine
* **Modern Glassmorphism:** Sleek, responsive interface featuring transparent blurs, smooth Framer Motion animations, interactive autocomplete mentions, and custom minimal scrollbars.
* **Custom Sound Engine:** A zero-asset audio engine built entirely on the native **Web Audio API**. Generates synthetic sounds for room lock/unlocking, success chimes, message sending/receiving, and UI transition swooshes.

---

## Architecture

KwikRoom follows a modular event-driven architecture, cleanly separating concerns between the frontend extension and the backend socket server.

### Client Layer (Chrome Extension)
Built with React, TypeScript, TailwindCSS, Framer Motion, and Plasmo.
* **Components:** Heavily modularized (`Lobby.tsx`, `ChatRoom.tsx`, `ChatInput.tsx`, `ScribbleArena.tsx`, etc.).
* **Responsibilities:** Room management, messaging interface, presence display, layout recalculations, rendering game boards, and synthesizing audio.

### Realtime Layer (Socket Server)
Node.js Socket.IO server handles:
* Room creation, joining, and presence synchronization.
* Message broadcasting and chat history decryption/loading.
* **Gatekeeper Logic & Fire-and-Forget:** Intelligently routes ephemeral game state events directly to clients. For chat and AI messages, it utilizes a Fire-and-Forget strategy: instantly emitting plain text to active sockets while pushing the AES-256 encryption and Prisma insertions to the background for maximum performance.

### Data & AI Layer
* **Redis (Upstash):** Manages temporary rooms, active room states, and high-speed ephemeral storage.
* **PostgreSQL (Supabase):** Handles persistent rooms and encrypted long-term message storage.
* **Google Generative AI SDK:** Operates securely on the backend (`kiwiService.ts`), protecting API keys while providing conversational context.

---

## Tech Stack

### Frontend
* React & TypeScript
* TailwindCSS
* Framer Motion & Lucide React
* Web Audio API
* Plasmo (Chrome Extension Framework)

### Backend
* Node.js & Express.js
* Socket.IO
* Google Generative AI SDK (Gemini)
* Native Node `crypto` (AES-256-CBC)

### Database & State
* PostgreSQL & Supabase
* Prisma ORM
* Redis (Upstash)

---

## Monorepo Structure

```text
KwikRoom/
│
├── apps/
│   ├── extension/       # Frontend Chrome Extension
│   │   └── kwik-room/
│   ├── socket/          # Realtime Backend & AI Services
│   └── web/             # Landing Page / Web App
│
├── packages/
│   ├── db/              # Shared Prisma Client
│   ├── redis/           # Shared Redis Configuration
│   └── utils/           # Shared Types, Crypto & Helpers
│
├── prisma/
│
├── package.json
└── README.md