# KwikRoom

KwikRoom is a realtime Chrome Extension-based communication platform built with Plasmo, React, TypeScript, Socket.IO, Redis, Prisma, and Supabase.

The platform supports both temporary Redis-backed rooms and persistent PostgreSQL-backed rooms with password protection, message persistence, realtime presence tracking, and infinite chat history pagination. 

Recently expanded into a fully interactive collaborative space, KwikRoom now features **in-chat multiplayer games**, a **custom Web Audio API sound engine**, and an **ephemeral AI assistant** powered by Google Gemini. Designed with a highly modular event-driven architecture, KwikRoom focuses on fast communication, scalable backend design, and a premium glassmorphic user experience directly inside the Chrome Side Panel.

---

## Features

### Realtime Communication
* Create rooms instantly and join using unique 5-letter room codes.
* Multi-user realtime messaging with live presence tracking.
* Realtime synchronization across connected clients powered by Socket.IO.
* Smart cursor-based pagination for infinite chat history scrolling.

### Temporary & Persistent Rooms
* **Temporary Rooms:** Redis-backed ephemeral rooms designed for short-term collaboration. Fast room creation, lightweight architecture, and automatic TTL expiration.
* **Persistent Rooms:** PostgreSQL-backed rooms designed for long-term communication with password-protected access and permanent message persistence.

### 🤖 Kiwi AI Assistant
* **@kiwi Mentions:** Tag `@kiwi` anywhere in the chat to summon the room's AI assistant.
* **Powered by Gemini:** Uses Google's model for high-speed, intelligent responses.
* **Context-Aware Memory:** Kiwi remembers the immediate conversational context per room.
* **Zero-Database Footprint:** AI prompts and bot replies are strictly ephemeral. A backend socket gatekeeper completely bypasses Prisma and Redis, ensuring AI chats are never saved to the database.
* **Custom UI:** Kiwi messages feature a premium, dark-mode "Soft Sage" (teal) glassmorphic design to stand out visually from normal users.

### 🎮 Multiplayer Arena (Mini-Games)
A suite of real-time multiplayer games playable directly inside the chat interface without leaving the room. State sync is handled via transient socket events (bypassing the database) for high performance.
* **Typing Battle:** Real-time multiplayer typing test with live opponent cursors, WPM/accuracy tracking, custom host-configured timers, and a post-game leaderboard.
* **Social Deduction & Board Games:** Play *Tic-Tac-Toe*, *Four in a Row*, *Word Guess*, *Scribble*, and *The Spy* (supports up to 7 players).
* **Interactive Invites:** Send rich UI game invites into the chat that automatically expire after 60 seconds.

### 🎨 Premium UI & Sound Engine
* **Modern Glassmorphism:** Sleek, responsive interface featuring transparent blurs, smooth Framer Motion animations, and custom minimal scrollbars.
* **Custom Sound Engine:** A zero-asset audio engine built entirely on the native **Web Audio API**. Generates synthetic sounds for room lock/unlocking, success chimes, message sending/receiving, and UI transition swooshes.

---

## Architecture

KwikRoom follows a modular event-driven architecture, cleanly separating concerns between the frontend extension and the backend socket server.

### Client Layer (Chrome Extension)
Built with React, TypeScript, TailwindCSS, Framer Motion, and Plasmo.
* **Components:** Heavily modularized (`Lobby.tsx`, `ChatRoom.tsx`, `MessageBubble.tsx`, `TypingArena.tsx`).
* **Responsibilities:** Room management, messaging interface, presence display, rendering game boards, and synthesizing audio.

### Realtime Layer (Socket Server)
Node.js Socket.IO server handles:
* Room creation, joining, and presence synchronization.
* Message broadcasting and chat history loading.
* **Gatekeeper Logic:** Intelligently routes ephemeral events (like `game_invite`, `game_state`, and `@kiwi` AI interactions) directly to clients without hitting the database, preserving bandwidth and storage.

### Data & AI Layer
* **Redis (Upstash):** Manages temporary rooms, active room states, and high-speed ephemeral storage.
* **PostgreSQL (Supabase):** Handles persistent rooms and long-term message storage.
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
│   └── utils/           # Shared Types & Helpers
│
├── prisma/
│
├── package.json
└── README.md