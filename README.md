# WhatsApp Live - End-to-End Encrypted Web App

A production-ready WhatsApp-like live chatting web application built with **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, and **Supabase** backend, featuring real **Client-Side End-to-End Encryption (E2EE)** powered by the browser **Web Crypto API**.

---

## 🔒 Security & Cryptographic Architecture

Messages and media are encrypted **strictly on the user's client device** before transmission. The Supabase database, server infrastructure, and network intermediaries **only store and route ciphertext and initialization vectors**. They cannot read or decipher message contents.

### 1. Key Agreement: ECDH (Curve P-256)
- Each user automatically generates an Elliptic Curve Diffie-Hellman (`ECDH`) key pair on curve `P-256` upon account creation.
- The **Public Key** (in JWK format) is published to the `public.profiles` table in Supabase so other contacts can encrypt messages for them.
- The **Private Key** is kept strictly inside the user's client storage (`IndexedDB`) and **never sent over the wire**.

### 2. Message Encryption: AES-256-GCM
- When Alice messages Bob, Alice's client derives a shared symmetric key from Alice's private key and Bob's public key using `window.crypto.subtle.deriveKey`.
- Each message is encrypted with **AES-256-GCM** using a cryptographically random **12-byte Initialization Vector (IV)**.
- Supabase stores only:
  - `encrypted_content`: Base64 ciphertext
  - `iv`: Base64 12-byte IV
  - `sender_id`, `conversation_id`, and metadata
- Bob receives the ciphertext via Supabase Realtime and decrypts it with the identical derived key.

### 3. WhatsApp 60-Digit Safety Numbers Verification
- Authentic WhatsApp "Verify Security Code" mechanism:
- Generates a SHA-256 digest of both users' lexicographically sorted public keys.
- Formats the digest into **twelve 5-digit blocks (60 digits)** and renders a visual matrix / QR representation.
- Users can compare safety numbers to verify that no man-in-the-middle attack exists.

### 4. Key Backup & Export
- Users can view their public key fingerprint and export their private keys as an encrypted backup string from the **Profile & Security Keys** menu.

---

## 🚀 Features

- **WhatsApp Web Layout & Themes**:
  - Dark mode (`#111b21`, `#202c33`, `#005c4b`, `#00a884`) and light theme support.
  - Authentic doodle chat background pattern.
  - Auto-scrolling, unread counter badges, and responsive mobile sliding views.
- **Authentication**:
  - Supabase Auth (Email & Password, sessions).
  - Client-side key pair creation on sign-up / login.
  - User profiles with status messages and avatars.
- **Messaging Capabilities**:
  - Direct 1-on-1 chats and multi-user group chats.
  - Text messages with links and emoji picker.
  - End-to-end encrypted image attachments.
  - Real-time voice notes recorder (`MediaRecorder` API) with audio waveform visualization.
  - WhatsApp read receipts (single check sent, double grey delivered, double blue read).
  - "typing..." indicator presence broadcast.
  - In-chat message search.
- **Calling Interface**:
  - Encrypted audio and video calling simulation modal with ringing, timers, and mute controls.
- **Dual-Mode Operation**:
  - **Live Supabase Mode**: Connects directly to PostgreSQL, Supabase Auth, and Realtime.
  - **Instant Demo Mode**: Pre-loaded with demo users (Alice, Bob, Charlie) and real Web Crypto E2EE for zero-configuration testing and cross-tab multi-user chatting right out of the box!

---

## 🛠️ Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Locally in Demo Mode (Zero Setup Needed)
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser. You can click between **Alice**, **Bob**, and **Charlie** in the top bar or open two private/incognito tabs to test live encrypted messaging across tabs!

---

## ⚡ Supabase Setup (To Connect Your Own Backend)

### Step 1: Create a Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a free project.

### Step 2: Run the SQL Migration
1. In your Supabase Dashboard, navigate to the **SQL Editor**.
2. Open [`supabase/schema.sql`](./supabase/schema.sql) in this repository and copy its content.
3. Paste and run the script in the Supabase SQL Editor.
   - This creates `profiles`, `conversations`, `conversation_participants`, and `messages` tables.
   - Sets up Row Level Security (RLS) policies.
   - Enables Supabase Realtime publication on `messages`, `conversations`, and `profiles`.

### Step 3: Configure Environment Variables
1. Copy `.env.local.example` to `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```
2. Paste your project URL and Anon key from **Supabase Dashboard -> Project Settings -> API**:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...
   ```

### Step 4: Run the App
```bash
npm run dev
```
The app will automatically detect your Supabase credentials and switch to **Live Supabase Backend Mode**!

---

## 📁 Project Structure

```
├── supabase/
│   └── schema.sql             # Supabase schema, RLS policies, triggers, and Realtime
├── src/
│   ├── app/
│   │   ├── globals.css        # Tailwind 4 styling and WhatsApp scrollbars
│   │   ├── layout.tsx         # Root layout with dark mode metadata
│   │   └── page.tsx           # Main application page
│   ├── components/
│   │   ├── auth/
│   │   │   └── AuthModal.tsx  # WhatsApp login/signup & demo account selector
│   │   └── chat/
│   │       ├── CallModal.tsx      # Encrypted audio/video calling simulation
│   │       ├── ChatArea.tsx       # Message thread, doodle backdrop & header
│   │       ├── MessageBubble.tsx  # Outgoing/incoming bubbles, audio player & ticks
│   │       ├── MessageInput.tsx   # Text input, emoji picker, files & voice notes
│   │       ├── NewChatModal.tsx   # Direct 1-on-1 conversation creator
│   │       ├── NewGroupModal.tsx  # Group conversation creator
│   │       ├── ProfileModal.tsx   # Profile editor & private key backup exporter
│   │       ├── SecurityModal.tsx  # 60-digit safety numbers & QR visualizer
│   │       └── SetupBanner.tsx    # Live Supabase vs Demo mode indicator
│   ├── context/
│   │   ├── AuthContext.tsx    # Auth state & client key pair management
│   │   ├── ChatContext.tsx    # Real-time messages, conversations, and typing
│   │   └── ThemeContext.tsx   # WhatsApp Web dark & light theme switcher
│   ├── lib/
│   │   ├── crypto.ts          # ECDH P-256 + AES-256-GCM Web Crypto engine
│   │   ├── keyStore.ts        # Client-side IndexedDB private key store
│   │   ├── mockBackend.ts     # In-browser multi-tab realtime mock simulator
│   │   ├── supabase.ts        # Supabase client initializer
│   │   └── chatService.ts     # Unified encryption/decryption service layer
│   └── types/
│       └── index.ts           # TypeScript interfaces for models & crypto
```

---

## 📜 License
MIT
