# KwikRoom

## Realtime Room-Based Chat Platform

KwikRoom is a modern realtime room-based chat platform where users can instantly create or join temporary chat rooms using unique 5-letter room codes. The platform is designed to provide frictionless anonymous communication without requiring authentication or signup.

The project is built using a scalable full-stack architecture with Next.js, Socket.IO, Redis, Prisma ORM, and Supabase PostgreSQL.

The main objective of KwikRoom is to simulate modern realtime communication systems like Discord channels, Slack rooms, multiplayer game lobbies, and temporary collaboration spaces while deeply exploring concepts like WebSockets, distributed systems, realtime synchronization, Redis TTL systems, and event-driven architecture.

---

# Features

## Current Features

- Realtime messaging using Socket.IO
- Instant room creation
- Join rooms using unique 5-letter codes
- Multiple users per room
- Username persistence using localStorage
- Dynamic room routing with Next.js App Router
- Collision-safe room generation
- Redis-based temporary room management
- Room expiration using Redis TTL
- Realtime room broadcasting
- Dedicated Socket.IO backend server
- Prisma ORM integration
- Supabase PostgreSQL integration
- Modern monorepo-style architecture

---

# Planned Features

- Persistent rented rooms
- Permanent room subscriptions
- Message persistence
- Online users list
- Typing indicators
- File sharing
- Voice chat
- Room analytics
- Admin controls
- Room moderation tools
- Emoji reactions
- Message reply system
- Read receipts
- Chrome extension integration
- AI-powered room assistants
- Realtime collaborative utilities

---

# Tech Stack

## Frontend

| Technology | Purpose |
|---|---|
| Next.js 16 | Frontend framework |
| React | UI rendering |
| TypeScript | Type safety |
| TailwindCSS | Styling |
| Socket.IO Client | Realtime websocket communication |

---

## Backend

| Technology | Purpose |
|---|---|
| Node.js | Runtime environment |
| Express.js | Socket server |
| Socket.IO | Realtime communication |

---

## Database & Realtime Infrastructure

| Technology | Purpose |
|---|---|
| Supabase PostgreSQL | Persistent database |
| Prisma ORM | Database ORM |
| Upstash Redis | Temporary room storage |
| Redis TTL | Room expiration system |

---

## Deployment

| Service | Purpose |
|---|---|
| Vercel | Next.js frontend deployment |
| Railway | Socket.IO backend deployment |
| Upstash | Managed Redis |
| Supabase | Managed PostgreSQL |

---

# Why This Architecture?

KwikRoom separates frontend rendering from realtime websocket communication.

This architecture is used because:

- Vercel serverless functions are not ideal for persistent websocket connections.
- Socket.IO requires a continuously running Node.js process.
- Redis helps maintain shared realtime room state.
- PostgreSQL provides persistent storage for long-term features.
- Prisma simplifies database interaction and schema management.

The architecture is designed to scale similarly to production-grade realtime systems.

---

# System Architecture

```text
┌──────────────────┐
│     Browser      │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Next.js Frontend │
│   (Vercel)       │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Socket.IO Client │
└────────┬─────────┘
         │ WebSocket
         ▼
┌──────────────────┐
│ Socket.IO Server │
│    (Railway)     │
└────────┬─────────┘
         │
         ├──────────────► Redis
         │                 (Realtime Room State)
         │
         └──────────────► PostgreSQL
                           (Persistent Storage)
```

---

# Project Structure

```text
KwikRoom/
│
├── apps/
│   ├── web/
│   │   ├── app/
│   │   │   ├── api/
│   │   │   ├── room/
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   │
│   │   ├── lib/
│   │   │   ├── prisma.ts
│   │   │   ├── redis.ts
│   │   │   ├── socket.ts
│   │   │   └── generateRoomCode.ts
│   │   │
│   │   ├── public/
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── socket/
│       ├── src/
│       │   └── index.ts
│       │
│       ├── package.json
│       └── tsconfig.json
│
├── prisma/
│   └── schema.prisma
│
├── package.json
├── prisma.config.ts
└── .env
```

---

# Core Realtime Flow

## Room Creation Flow

```text
User clicks Create Room
        ↓
Frontend calls POST /api/create-room
        ↓
Server generates unique room code
        ↓
Redis + PostgreSQL uniqueness check
        ↓
Room stored in Redis with TTL
        ↓
Frontend redirects to /room/[code]
```

---

## Room Join Flow

```text
User enters room code
        ↓
Frontend navigates to /room/[code]
        ↓
Room page loads
        ↓
socket.emit("join-room")
        ↓
Socket server receives event
        ↓
socket.join(roomCode)
        ↓
User joins websocket room
```

---

## Realtime Messaging Flow

```text
User types message
        ↓
socket.emit("message")
        ↓
Socket server receives event
        ↓
io.to(room).emit("message")
        ↓
All users inside room receive message
        ↓
React state updates
        ↓
UI rerenders instantly
```

---

# Socket.IO Concepts Used

## emit()

Used to send events.

```ts
socket.emit("message", data)
```

---

## on()

Used to listen for events.

```ts
socket.on("message", callback)
```

---

## join()

Used to add sockets into websocket rooms.

```ts
socket.join(roomCode)
```

---

## io.to(room).emit()

Broadcasts events only to users inside a specific room.

```ts
io.to(room).emit("message")
```

---

# Redis Usage

Redis is used for fast temporary realtime room management.

## Redis Responsibilities

- Active room storage
- Room expiration
- Presence management
- Temporary state synchronization
- TTL-based cleanup

---

## Example Redis Room

```json
room:ABCDE
{
  "code": "ABCDE",
  "users": 2,
  "isPersistent": false
}
```

---

# Why Redis TTL?

Redis TTL automatically deletes inactive temporary rooms.

Example:

```text
30 minutes inactivity
        ↓
Room automatically deleted
        ↓
Code becomes reusable
```

This avoids:
- manual cleanup
- memory leaks
- stale room accumulation

---

# Database Design

## Prisma ORM

Prisma is used to:

- interact with PostgreSQL
- generate database client
- enforce type safety
- simplify schema management

---

## Example Prisma Model

```prisma
model Room {
  id           String   @id @default(cuid())
  code         String   @unique
  isPersistent Boolean  @default(false)
  createdAt    DateTime @default(now())
}
```

---

# Username System

KwikRoom intentionally avoids authentication initially.

Instead:

- usernames are stored in localStorage
- browser identity persists locally
- users remain anonymous
- onboarding friction remains minimal

---

## Username Flow

```text
User opens app
        ↓
Enter username
        ↓
Saved to localStorage
        ↓
Reused on future visits
        ↓
Username attached to socket messages
```

---

# Environment Variables

Create `.env.local` inside:

```text
apps/web/
```

Add:

```env
DATABASE_URL=""

REDIS_URL=""
REDIS_TOKEN=""

NEXT_PUBLIC_SUPABASE_URL=""
NEXT_PUBLIC_SUPABASE_ANON_KEY=""
```

---

# Installation

## Clone Repository

```bash
git clone https://github.com/Ashishworks/KwikRoom.git
```

---

# Install Dependencies

## Root

```bash
npm install
```

---

## Frontend

```bash
cd apps/web
npm install
```

---

## Socket Server

```bash
cd ../socket
npm install
```

---

# Prisma Setup

From root:

```bash
npx prisma generate
npx prisma migrate dev --name init
```

---

# Running Development Servers

## Frontend

```bash
cd apps/web
npm run dev
```

Runs on:

```text
http://localhost:3000
```

---

## Socket Server

```bash
cd apps/socket
npm run dev
```

Runs on:

```text
http://localhost:4000
```

---

# Current Learning Concepts

This project explores:

- WebSockets
- Socket.IO
- Realtime architecture
- Event-driven systems
- Redis caching systems
- Redis TTL expiration
- Prisma ORM
- PostgreSQL integration
- Distributed systems concepts
- Dynamic routing in Next.js
- Persistent client-side identity
- Monorepo architecture
- State synchronization
- Realtime broadcasting

---

# Future Vision

KwikRoom is planned to evolve into a complete realtime collaboration ecosystem with:

- persistent collaborative rooms
- realtime utilities
- multiplayer collaboration tools
- file sharing
- AI-powered assistants
- realtime productivity systems
- browser extension integration

The long-term goal is to create a scalable realtime platform architecture that can support multiple communication and collaboration workflows.

---

# Author

Ashish

GitHub:
https://github.com/Ashishworks
