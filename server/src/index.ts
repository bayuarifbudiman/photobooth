import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer });

// --- Types ---

type Role = 'host' | 'guest';

interface Client {
  ws: WebSocket;
  userId: string;
  roomId: string;
  role: Role;
  displayName: string;
  photoURL: string;
}

interface Room {
  id: string;
  host: Client | null;
  guest: Client | null;
  createdAt: number;
}

// --- State ---

const rooms = new Map<string, Room>();

// Clean up stale rooms older than 2 hours
setInterval(() => {
  const cutoff = Date.now() - 2 * 60 * 60 * 1000;
  for (const [id, room] of rooms) {
    if (room.createdAt < cutoff) rooms.delete(id);
  }
}, 10 * 60 * 1000);

// --- Helpers ---

function send(ws: WebSocket, data: object) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

function getPeer(room: Room, role: Role): Client | null {
  return role === 'host' ? room.guest : room.host;
}

// --- WebSocket ---

wss.on('connection', (ws) => {
  let client: Client | null = null;

  ws.on('message', (raw) => {
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    switch (msg.type) {
      case 'create-room': {
        const roomId = uuidv4().slice(0, 6).toUpperCase();
        const userId = uuidv4();
        client = {
          ws,
          userId,
          roomId,
          role: 'host',
          displayName: (msg.displayName as string) || 'Host',
          photoURL: (msg.photoURL as string) || '',
        };
        rooms.set(roomId, { id: roomId, host: client, guest: null, createdAt: Date.now() });
        send(ws, { type: 'room-created', roomId });
        break;
      }

      case 'join-room': {
        const roomId = (msg.roomId as string).toUpperCase();
        const room = rooms.get(roomId);
        if (!room) {
          send(ws, { type: 'error', message: 'Room not found.' });
          return;
        }
        if (room.guest) {
          send(ws, { type: 'error', message: 'Room is full.' });
          return;
        }
        const userId = uuidv4();
        client = {
          ws,
          userId,
          roomId,
          role: 'guest',
          displayName: (msg.displayName as string) || 'Guest',
          photoURL: (msg.photoURL as string) || '',
        };
        room.guest = client;
        send(ws, {
          type: 'room-joined',
          roomId,
          peerName: room.host?.displayName,
          peerPhoto: room.host?.photoURL,
        });
        if (room.host) {
          send(room.host.ws, {
            type: 'peer-joined',
            peerName: client.displayName,
            peerPhoto: client.photoURL,
          });
        }
        break;
      }

      // WebRTC signaling — relay to the other peer
      case 'offer':
      case 'answer':
      case 'ice-candidate': {
        if (!client) return;
        const room = rooms.get(client.roomId);
        if (!room) return;
        const peer = getPeer(room, client.role);
        if (peer) send(peer.ws, msg);
        break;
      }

      case 'start-countdown': {
        if (!client) return;
        const room = rooms.get(client.roomId);
        if (!room) return;
        const payload = { type: 'countdown', duration: msg.duration, startedAt: Date.now() };
        if (room.host) send(room.host.ws, payload);
        if (room.guest) send(room.guest.ws, payload);
        break;
      }

      case 'capture': {
        if (!client) return;
        const room = rooms.get(client.roomId);
        if (!room) return;
        if (room.host) send(room.host.ws, { type: 'capture' });
        if (room.guest) send(room.guest.ws, { type: 'capture' });
        break;
      }

      case 'leave-room': {
        handleLeave();
        break;
      }
    }
  });

  function handleLeave() {
    if (!client) return;
    const room = rooms.get(client.roomId);
    if (room) {
      const peer = getPeer(room, client.role);
      if (peer) send(peer.ws, { type: 'peer-left' });
      if (client.role === 'host') {
        rooms.delete(client.roomId);
      } else {
        room.guest = null;
      }
    }
    client = null;
  }

  ws.on('close', handleLeave);
  ws.on('error', handleLeave);
});

// Health check
app.get('/health', (_req, res) => res.json({ ok: true, rooms: rooms.size }));

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Signaling server running on http://localhost:${PORT}`);
});
