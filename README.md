# 📷 Photobooth

A real-time online photobooth app. Invite a friend, pick a frame, and snap photos together — or use it solo.

Built with React + Vite, WebRTC (peer-to-peer video), WebSocket (signaling), and Firebase Auth.

---

## Features

- Google sign-in via Firebase
- Create a room and share a 6-character code with a friend
- Live side-by-side video powered by WebRTC
- 6 frame styles: None, Polaroid, Neon, Floral, Film Strip, Vintage
- Countdown timer: instant, 3s, 5s, or 10s — synced across both users
- Solo mode: works with just yourself, full-width video
- Download captured photos

---

## Prerequisites

- Node.js 18+
- A Firebase project with Google Auth enabled

---

## Firebase Setup (one-time)

1. Go to [console.firebase.google.com](https://console.firebase.google.com) and create a project
2. In the project: **Authentication → Get started**
3. **Sign-in method → Google → Enable** → save
4. **Project Settings → Your apps → Add app (Web)** → copy the config values

---

## Installation

```bash
# Clone or enter the project folder
cd photobooth

# Install all dependencies (root + client + server)
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..
```

---

## Configuration

```bash
cp client/.env.example client/.env.local
```

Open `client/.env.local` and fill in your Firebase values:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

VITE_WS_URL=ws://localhost:3001
```

---

## Running the App

```bash
npm run dev
```

This starts both services at once:

| Service | URL |
|---|---|
| React client | http://localhost:5173 |
| Signaling server | http://localhost:3001 |

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Run services separately

```bash
# Terminal 1 — signaling server only
npm run dev:server

# Terminal 2 — React client only
npm run dev:client
```

---

## Turning Off

Press `Ctrl+C` in the terminal where `npm run dev` is running.

If you started them separately, press `Ctrl+C` in each terminal.

To verify nothing is still running on the ports:

```bash
lsof -ti :5173 | xargs kill -9 2>/dev/null
lsof -ti :3001 | xargs kill -9 2>/dev/null
```

---

## How to Use

1. Open the app and **Sign in with Google**
2. Click **Create Room** — you'll get a 6-character room code
3. Share the code with a friend — they go to the app, click **Join Room**, and enter the code
4. Once connected, both users see each other live on screen
5. Pick a **frame** from the right sidebar
6. Set a **timer** (instant / 3s / 5s / 10s) and click the shutter button
7. The countdown is synced — both users capture at the same moment
8. Photos appear in the strip at the bottom — hover to **download** or **delete**

---

## Project Structure

```
photobooth/
├── client/               # React + Vite frontend
│   └── src/
│       ├── context/      # Persistent WebSocket context
│       ├── hooks/        # useWebRTC
│       ├── pages/        # LoginPage, LobbyPage, RoomPage
│       ├── components/   # VideoDisplay, FrameSelector, PhotoStrip, etc.
│       ├── frames.ts     # Frame definitions (canvas drawing + CSS preview)
│       └── types.ts      # Shared WebSocket message types
└── server/               # Node.js WebSocket signaling server
    └── src/
        └── index.ts      # Room management + WebRTC signaling relay
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, TypeScript |
| Styling | Tailwind CSS v4 |
| Auth | Firebase Authentication (Google) |
| Video | WebRTC (peer-to-peer) |
| Signaling | Node.js + `ws` (WebSocket) |
| Photo capture | Canvas API |
| Routing | React Router v6 |
