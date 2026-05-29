# KwikRoom

KwikRoom is a realtime Chrome Extension-based communication platform built with Plasmo, React, TypeScript, Socket.IO, Redis, Prisma, and Supabase.

The platform supports both temporary Redis-backed rooms and persistent PostgreSQL-backed rooms with password protection, message persistence, realtime presence tracking, and infinite chat history pagination.

Designed with an event-driven architecture, KwikRoom focuses on fast communication, scalable backend design, and a modern user experience directly inside the Chrome Side Panel.

---

## Features

### Realtime Communication

* Create rooms instantly
* Join rooms using unique room codes
* Multi-user realtime messaging
* Live user presence tracking
* Realtime synchronization across connected clients
* Socket.IO powered communication

### Temporary Rooms

Redis-backed ephemeral rooms designed for short-term collaboration.

* Fast room creation
* Lightweight architecture
* Automatic expiration
* No database persistence

### Persistent Rooms

PostgreSQL-backed rooms designed for long-term communication.

* Persistent room storage
* Password-protected access
* Message persistence
* Scalable database architecture

### Chat History

* Persistent message storage
* Initial chat history loading on room join
* Infinite scroll chat history
* Efficient cursor-based pagination
* Seamless loading of older messages

### Chrome Extension Experience

* Built using Plasmo
* Chrome Side Panel integration
* Persistent websocket connection
* Lightweight and responsive interface

### Modern Interface

* Framer Motion animations
* Responsive chat layout
* Modern dark-themed UI
* Realtime updates

---

## Architecture

KwikRoom follows a modular event-driven architecture.

### Client Layer

Chrome Extension built with:

* React
* TypeScript
* TailwindCSS
* Framer Motion
* Plasmo

Responsibilities:

* Room management
* Messaging interface
* Presence display
* Chat history rendering

### Realtime Layer

Socket.IO server handles:

* Room creation
* Room joining
* Presence synchronization
* Message broadcasting
* Chat history loading

### Data Layer

Redis is used for:

* Temporary rooms
* Active room state
* Presence management
* Fast ephemeral storage

PostgreSQL is used for:

* Persistent rooms
* Message storage
* Long-term data persistence

---

## Tech Stack

### Frontend

* React
* TypeScript
* TailwindCSS
* Framer Motion
* Lucide React
* Plasmo

### Backend

* Node.js
* Express.js
* Socket.IO

### Database

* PostgreSQL
* Prisma ORM
* Supabase

### State & Caching

* Redis
* Upstash Redis

---

## Monorepo Structure

```text
KwikRoom/
│
├── apps/
│   ├── extension/
│   │   └── kwik-room/
│   ├── socket/
│   └── web/
│
├── packages/
│   ├── db/
│   ├── redis/
│   └── utils/
│
├── prisma/
│
├── package.json
└── README.md
```

---

## Socket Events

### Room Events

* createRoom
* checkRoom
* joinRoom
* leaveRoom

### Message Events

* message
* loadMoreMessages

---

## Chat History & Pagination

Persistent rooms support chat history retrieval through cursor-based pagination.

### Flow

```text
User joins room
        ↓
Load latest messages
        ↓
User scrolls upward
        ↓
Request older messages
        ↓
Fetch next batch
        ↓
Append to chat history
        ↓
Continue until history ends
```

This approach minimizes database load while maintaining a smooth user experience.

---

## Shared Packages

### packages/db

Shared Prisma client used across applications.

### packages/redis

Shared Redis client for centralized realtime state management.

### packages/utils

Shared utility functions including:

* Room code generation
* Message serialization
* Common helpers

---

## Database Schema

### Room

```prisma
model Room {
  id           String   @id @default(cuid())
  code         String   @unique
  adminId      String
  isPersistent Boolean  @default(false)
  password     String?
  createdAt    DateTime @default(now())
}
```

### Message

```prisma
model Message {
  id         BigInt   @id @default(autoincrement())
  roomCode   String
  senderId   String
  senderName String
  content    String
  createdAt  DateTime @default(now())
}
```

---

## Current Capabilities

* Realtime room creation
* Room joining through room codes
* Password-protected rooms
* Temporary room support
* Persistent room support
* Realtime messaging
* Online user tracking
* Message persistence
* Infinite chat history pagination
* Chrome Side Panel integration
* Redis-backed state management
* Modular Socket.IO architecture

---

## Installation

### Clone Repository

```bash
git clone <repository-url>
cd KwikRoom
```

### Install Dependencies

```bash
npm install
```

---

## Environment Variables

Create a `.env` file:

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

## Prisma Setup

Generate Prisma Client:

```bash
npx prisma generate
```

Apply Database Schema:

```bash
npx prisma db push
```

---

## Running the Project

### Start Socket Server

```bash
cd apps/socket
npm run dev
```

### Start Extension

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

3. Enable Developer Mode
4. Click **Load Unpacked**
5. Select:

```text
build/chrome-mv3-dev
```

---

## Roadmap

### Room Administration

* Room ownership
* User moderation
* Ownership transfer
* Room management controls

### Messaging Enhancements

* Message editing
* Message deletion
* Message reactions
* Reply support
* Pinned messages

### Collaboration

* File sharing
* Image sharing
* Voice rooms
* Shared notes

### Authentication

* Google OAuth
* User accounts
* User profiles

### Scalability

* Redis Pub/Sub
* Multi-server Socket.IO deployment
* Horizontal scaling
* Analytics dashboard

---

## Learning Outcomes

This project explores:

* Realtime systems
* Event-driven architecture
* Redis-based state management
* Browser extension development
* Socket.IO communication patterns
* PostgreSQL integration
* Prisma ORM
* Monorepo architecture
* Infinite pagination techniques

---

## Author

**Ashish**

KwikRoom is a modern realtime communication platform combining browser extension engineering, distributed systems concepts, and scalable realtime architecture.
