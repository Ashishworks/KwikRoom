# KwikRoom

KwikRoom is a realtime room-based communication platform built as a Chrome Extension using Plasmo, React, TypeScript, Socket.IO, Redis, Prisma, and Supabase.

The project focuses on ultra-fast temporary and persistent room communication with modern realtime architecture, scalable backend design, and clean UI/UX.

---

# Features

## Realtime Communication

- Create realtime rooms instantly
- Join rooms using unique 5-letter room codes
- Live messaging using Socket.IO
- Online user presence tracking
- Join/leave system messages
- Multi-user support in a single room
- Realtime room synchronization

---

## Chrome Extension Support

Built using:

- Plasmo Framework
- Chrome Sidepanel API
- React + TypeScript
- TailwindCSS

Features:

- Opens directly inside Chrome Sidepanel
- Persistent websocket connection
- Lightweight architecture
- Native extension experience

---

## Modern UI/UX

- Animated chat interface
- Framer Motion transitions
- Lucide icons
- Glassmorphism-inspired UI
- Minimal custom scrollbar
- Auto-hidden scrollbar
- Responsive layout
- Smooth interactions

---

## Backend Architecture

Dedicated Socket.IO server separated from frontend.

### Technologies

- Express.js
- Socket.IO
- Redis (Upstash)
- Prisma ORM
- Supabase PostgreSQL

---

## Redis-Based Realtime State

Redis is used for:

- Active room storage
- Online presence tracking
- Temporary room management
- Room expiration handling
- Fast ephemeral state management

---

## Persistent Database Support

Supabase PostgreSQL + Prisma are used for:

- Persistent rooms
- User ownership
- Future message persistence
- Future analytics/features

---

# Monorepo Structure

```bash
kwikroom/
│
├── apps/
│   ├── web/                     # Next.js frontend
│   ├── socket/                  # Socket.IO backend server
│   └── extension/
│       └── kwik-room/           # Plasmo Chrome extension
│
├── packages/
│   ├── db/                      # Shared Prisma client
│   ├── redis/                   # Shared Redis client
│   └── utils/                   # Shared utility functions
│
├── prisma/
│
├── package.json
└── turbo.json
```

---

# Tech Stack

## Frontend

- React
- TypeScript
- TailwindCSS
- Framer Motion
- Lucide React
- Plasmo

---

## Backend

- Node.js
- Express.js
- Socket.IO

---

## Database & State Management

- Redis (Upstash)
- Supabase PostgreSQL
- Prisma ORM

---

# Socket Architecture

Socket logic is modularized into separate event handlers.

## Current Events

### createRoomEvent

Handles:

- Room creation
- Redis room initialization
- User joining after creation

---

### joinRoomEvent

Handles:

- Joining existing rooms
- Presence updates
- Broadcasting user join events

---

### leaveRoomEvent

Handles:

- User disconnects
- User leaves
- Cleanup logic
- Presence updates

---

### sendMessageEvent

Handles:

- Realtime message broadcasting
- User message delivery
- Room-specific communication

---

# Shared Packages

## `packages/db`

Exports:

- Prisma singleton client

Purpose:

- Prevent multiple Prisma client instances
- Shared database access across applications

---

## `packages/redis`

Exports:

- Redis client singleton

Purpose:

- Shared Redis connection
- Centralized caching and state management

---

## `packages/utils`

Contains:

- `generateRoomCode()`

Purpose:

- Generates unique 5-letter room codes

---

# Database Schema

## Room Model

```prisma
model Room {
  id           String   @id @default(cuid())
  code         String   @unique
  adminId      String
  isPersistent Boolean  @default(false)
  createdAt    DateTime @default(now())
}
```

---

# Current Working Features

## Implemented

- Realtime room creation
- Join via room code
- Realtime messaging
- Online users list
- System messages
- Socket connection management
- Extension sidepanel support
- Animated UI
- Shared monorepo architecture

---

# Application Flow

## Room Creation

```text
User creates room
    ↓
Socket event emitted
    ↓
Redis stores room state
    ↓
User automatically joins room
    ↓
Room code shared
```

---

## Joining Room

```text
User enters room code
    ↓
Socket validates room
    ↓
User joins socket room
    ↓
Presence updated
    ↓
All users notified
```

---

## Messaging

```text
User sends message
    ↓
Socket event triggered
    ↓
Message broadcasted to room
    ↓
Realtime UI update
```

---

# Chrome Extension Architecture

## Background Script

The extension uses:

```ts
background.ts
```

Responsibilities:

- Maintains websocket connection
- Handles sidepanel behavior
- Opens panel on extension click
- Communicates with Socket.IO backend

---

## Sidepanel

The sidepanel acts as:

- Main chat UI
- Room management interface
- Presence display
- Messaging system

---

# UI Design Philosophy

KwikRoom focuses on:

- Minimalism
- Fast interaction
- Realtime responsiveness
- Smooth animations
- Modern developer-tool aesthetics

Inspired by:

- Discord
- Slack
- Linear
- Vercel dashboards

---

# Installation

## Clone Repository

```bash
git clone <repo-url>
cd kwikroom
```

---

## Install Dependencies

```bash
npm install
```

---

# Environment Variables

Create:

```bash
.env
```

Example:

```env
DATABASE_URL=
DIRECT_URL=

UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

NEXT_PUBLIC_SOCKET_URL=

SUPABASE_URL=
SUPABASE_ANON_KEY=
```

---

# Prisma Setup

Generate Prisma client:

```bash
npx prisma generate
```

Push schema:

```bash
npx prisma db push
```

---

# Run Development Servers

## Run Socket Server

```bash
cd apps/socket
npm run dev
```

---

## Run Extension

```bash
cd apps/extension/kwik-room
npm run dev
```

---

## Load Extension in Chrome

1. Open Chrome
2. Navigate to:

```text
chrome://extensions
```

3. Enable:

```text
Developer Mode
```

4. Click:

```text
Load unpacked
```

5. Select:

```text
build/chrome-mv3-dev
```

---

# Future Roadmap

## Planned Features

### Persistent Message Storage

- Save messages to PostgreSQL
- Chat history support

---

### Load Last 15 Messages

- Fetch recent messages on room join
- Better user continuity

---

### Infinite Scroll Pagination

- Older message loading
- Optimized performance

---

### Room Admin Controls

- Kick users
- Delete room
- Transfer ownership

---

### Authentication

- User accounts
- Google login
- Identity support

---

### Typing Indicators

Realtime typing status.

---

### Read Receipts

Track seen messages.

---

### File Sharing

Upload and share files.

---

### Voice Rooms

Realtime audio communication.

---

# Development Goals

The project aims to explore:

- Distributed realtime systems
- WebSocket scalability
- Redis ephemeral architecture
- Browser extension engineering
- Realtime UX design
- Event-driven backend systems

---

# Learning Outcomes

This project demonstrates understanding of:

- Socket.IO architecture
- Monorepo management
- Redis state management
- Prisma ORM
- Realtime systems
- Chrome extension APIs
- Scalable backend patterns
- Shared package architecture

---

# Contributing

Contributions are welcome in areas such as:

- UI improvements
- Performance optimization
- Backend scaling
- Security enhancements
- Additional realtime features

---

# License

MIT License

---

# Author

Built by Ashish.

KwikRoom is designed as a modern realtime communication platform combining extension engineering, distributed systems concepts, and scalable realtime architecture.
