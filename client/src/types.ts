export type Role = 'host' | 'guest';

// Messages the client sends to the server
export type ClientMessage =
  | { type: 'create-room'; displayName: string; photoURL: string }
  | { type: 'join-room'; roomId: string; displayName: string; photoURL: string }
  | { type: 'offer'; offer: RTCSessionDescriptionInit }
  | { type: 'answer'; answer: RTCSessionDescriptionInit }
  | { type: 'ice-candidate'; candidate: RTCIceCandidateInit }
  | { type: 'start-countdown'; duration: number }
  | { type: 'capture' }
  | { type: 'leave-room' };

// Messages the server sends to the client
export type ServerMessage =
  | { type: 'room-created'; roomId: string }
  | { type: 'room-joined'; roomId: string; peerName: string; peerPhoto: string }
  | { type: 'peer-joined'; peerName: string; peerPhoto: string }
  | { type: 'peer-left' }
  | { type: 'offer'; offer: RTCSessionDescriptionInit }
  | { type: 'answer'; answer: RTCSessionDescriptionInit }
  | { type: 'ice-candidate'; candidate: RTCIceCandidateInit }
  | { type: 'countdown'; duration: number; startedAt: number }
  | { type: 'capture' }
  | { type: 'error'; message: string };

export interface CapturedPhoto {
  id: string;
  dataUrl: string;
  frameId: string;
  takenAt: number;
}
