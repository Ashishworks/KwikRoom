# KwikRoom

KwikRoom is a high-performance, real-time communication and gaming platform built primarily as a Chrome Browser Extension. It allows users to instantly create or join chat rooms that are either highly secure and persistent or entirely ephemeral. 

Beyond standard chat, KwikRoom features an integrated AI assistant and a suite of interactive real-time multiplayer mini-games known as "The Arena". Designed with a highly modular event-driven architecture, KwikRoom focuses on fast communication, scalable backend design, low-latency optimistic broadcasting, and a premium glassmorphic user experience directly inside the Chrome Side Panel.

---

## Core Features

### Realtime Communication & Security
* **Instant Matchmaking:** Create rooms instantly and join using unique 5-letter room codes.
* **Optimistic Broadcasting:** Low-latency chat architecture instantly broadcasts messages to connected clients, while gracefully offloading heavy AES encryption and database saves to a background promise queue (Fire-and-Forget).
* **Encryption-at-Rest:** All messages in persistent rooms are secured using AES-256-CBC Server-Side Encryption before being written to PostgreSQL.
* **Pagination:** Smart cursor-based pagination for infinite, seamless chat history scrolling.

### Temporary & Persistent Rooms
* **Temporary Rooms:** Redis-backed ephemeral rooms designed for short-term collaboration. Fast room creation, lightweight architecture, and automatic TTL expiration.
* **Persistent Rooms:** PostgreSQL-backed rooms designed for long-term communication with password-protected access and permanent, encrypted message persistence.

### Kiwi AI Assistant
* **@kiwi Mentions:** Tag `@kiwi` anywhere in the chat to summon the room's AI assistant.
* **Powered by Kiwi AI:** Uses a state-of-the-art generative AI engine for high-speed, intelligent responses.
* **Encrypted Memory Persistence:** In persistent rooms, AI prompts and bot replies are seamlessly encrypted and saved to the database. Because of the optimistic broadcasting architecture, AI interactions feel instantly responsive without blocking the socket event loop. (In temporary rooms, AI chats remain strictly ephemeral).
* **Custom UI:** Kiwi messages feature a premium, dark-mode "Soft Sage" (teal) glassmorphic design to stand out visually from normal users.

### The Arena (Multiplayer Mini-Games)

KwikRoom transforms standard chat environments into fully interactive collaborative spaces through "The Arena"—a suite of real-time multiplayer mini-games playable directly inside the chat interface without requiring users to leave the room.

**Game State Architecture**
The game infrastructure utilizes a highly optimized, event-driven socket layer. State synchronization is handled via lightweight action packets to prevent state collisions in lobbies of up to 7 players. For persistent rooms, the architecture leverages a flexible `metadata` JSON column in the PostgreSQL database. This allows the system to pass and store complex, dynamic game states (like cursor positions, canvas data, or voting records) without requiring constant alterations to the underlying database schema.

**Supported Games:**

* **Typing Battle:** A highly competitive, real-time typing race. Features include live opponent cursors tracking exact positions on the text, dynamic auto-scrolling, live Words Per Minute (WPM) and accuracy calculations, host-configured custom game durations, and a post-game statistics leaderboard.
* **Scribble:** A collaborative drawing and guessing game built on a custom HTML5 Canvas. It features an advanced stack-based Flood Fill algorithm for the paint bucket tool, adjustable brush strokes and colors, and comprehensive undo/redo history stacks. Drawing coordinates are emitted via WebSockets for low-latency visual syncing.
* **The Spy:** A tense, hidden-role social deduction game supporting up to 7 players. The system assigns a secret location to the crew while keeping the Spy in the dark. It features a dedicated interrogation chat log, live emergency voting mechanics, a strict countdown timer, and a dynamic tabbed interface allowing the Spy to secretly intercept the location or frame innocent crewmates.
* **Word Guess:** An interactive word deduction game where the room host sets a secret word and a clue. Features include dynamic, host-controlled letter reveals and a real-time guess feed where incorrect attempts are crossed out for all players to see.
* **Classic Board Games:** Includes synchronized implementations of Tic-Tac-Toe and Four in a Row, demonstrating the platform's capability to handle strict turn-based state management with zero latency.
* **Interactive Invites & Modals:** Games are initiated via rich UI game invites sent directly into the chat stream, which automatically expire after 60 seconds to keep the chat clean. Additionally, every game features a dedicated "How to Play" glassmorphic modal overlay containing precise, game-specific instructions.

### Premium UI & Sound Engine
* **Modern Glassmorphism:** Sleek, responsive interface featuring transparent blurs, smooth Framer Motion animations, interactive autocomplete mentions, and custom minimal scrollbars.
* **Custom Sound Engine:** A zero-asset audio engine built entirely on the native Web Audio API. Generates synthetic sounds for room lock/unlocking, success chimes, message sending/receiving, and UI transition swooshes.

---

## Deep-Dive Architecture & Data Flow

The system relies on a hybrid database approach to balance blazing-fast ephemeral chats with secure, long-term persistence. 

### Stage 1: Room Creation Routing
When a user requests to create a room, the Node.js server evaluates the persistence settings:
* **Temporary Rooms:** The system generates a 5-letter code and stores it in the Redis cache with a Time-To-Live (TTL).
* **Persistent Rooms:** The system takes a user-provided password, hashes it using bcrypt, and performs a Prisma insert to save the room securely into the Supabase PostgreSQL database.

### Stage 2: Access & Authentication Handshake
When a user attempts to join a room:
1. The server queries the Redis cache for temporary rooms.
2. If missing, it queries the Supabase database for persistent rooms.
3. If persistent, it prompts the client for a password, which is then validated against the bcrypt hash.
4. Upon successful validation, the server fetches the encrypted message history from Supabase, runs an AES-256 decryption loop locally on the server, and hydrates the client UI with the decrypted payload.

### Stage 3: Realtime Messaging & "Fire-and-Forget" Encryption
To ensure low-latency communication, KwikRoom uses an Optimistic Broadcasting model:
1. **Low-Latency Emitter:** When a message or game action is sent, the Socket server immediately broadcasts the plain text to all connected clients in the room synchronously.
2. **Async Cryptography:** A background Crypto Worker generates a random Initialization Vector (IV), encrypts the message using an AES-256-CBC cipher, and writes the ciphertext safely to the Supabase database using Prisma.
3. **AI Interception:** If a message contains the @kiwi mention, the Action Router triggers the Kiwi AI Bot, which streams its response back through the low-latency Emitter.

---

## Frontend Component Structure (Chrome Extension)

The chat interface has been heavily refactored into modular, maintainable React components:
* **ChatHeader:** Manages the sticky top bar, displaying the room code, the current user, the "copy room code" functionality, and the exit button.
* **ActiveUsersBar:** Manages the horizontal scrolling list of active users, rendering avatars and correctly labeling the user's own avatar as "You".
* **MessageList:** Handles the core chat area, mapping over the messages array, rendering MessageBubble components, and managing scroll references.
* **TypingIndicator:** Extracts the animated "User is typing..." logic, handling grammar logic and Framer Motion animations.
* **ArenaMenu:** The game selection popover that handles sending game invites and manages its own click-outside listener.
* **ChatInput:** The heavy lifter at the bottom managing the text area, the @ mention autocomplete logic, emitting typing status, and the send button.

---

## Database Schema (Prisma)

The Prisma configuration is optimized for Supabase connection pooling using a directUrl for migrations.

* **Room Model:** Stores persistent rooms with a `cuid()` ID, a unique 5-letter code, and a passwordHash. Indexed by code for fast lookups.
* **Message Model:** Stores chat and game data. Contains the roomCode, senderId, senderName, the AES-256 encrypted content, a type flag (e.g., "chat", "game_invite"), and a flexible metadata JSON field for complex game states. Uses a composite index `@@index([roomCode, id(sort: Desc)])` to optimize infinite scrolling pagination.

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
* Kiwi AI SDK
* Native Node crypto (AES-256-CBC)

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
