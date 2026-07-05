import { useCallback, useEffect, useRef, useState } from 'react';
import { ClientMessage, ServerMessage } from '../types';

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

interface UseWebRTCOptions {
  isHost: boolean;
  peerConnected: boolean;
  send: (msg: ClientMessage) => void;
  subscribe: (listener: (msg: ServerMessage) => void) => () => void;
}

export function useWebRTC({ isHost, peerConnected, send, subscribe }: UseWebRTCOptions) {
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Acquire camera + mic once
  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: { width: 1280, height: 720 }, audio: true })
      .then((stream) => {
        localStreamRef.current = stream;
        setLocalStream(stream);
      })
      .catch((err) => {
        setCameraError((err as Error).message || 'Camera access denied');
      });

    return () => {
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const createPeer = useCallback(() => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    // Add local tracks
    localStreamRef.current?.getTracks().forEach((track) => {
      pc.addTrack(track, localStreamRef.current!);
    });

    // Receive remote tracks
    const remoteMs = new MediaStream();
    pc.ontrack = (e) => {
      e.streams[0]?.getTracks().forEach((track) => remoteMs.addTrack(track));
      setRemoteStream(remoteMs);
    };

    // Send ICE candidates to peer
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        send({ type: 'ice-candidate', candidate: e.candidate.toJSON() });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        setRemoteStream(null);
      }
    };

    peerRef.current = pc;
    return pc;
  }, [send]);

  // Handle signaling messages
  useEffect(() => {
    const unsubscribe = subscribe(async (msg) => {
      switch (msg.type) {
        case 'peer-joined': {
          if (!isHost) return;
          const pc = createPeer();
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          send({ type: 'offer', offer });
          break;
        }
        case 'offer': {
          if (isHost) return;
          const pc = createPeer();
          await pc.setRemoteDescription(msg.offer);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          send({ type: 'answer', answer });
          break;
        }
        case 'answer': {
          await peerRef.current?.setRemoteDescription(msg.answer);
          break;
        }
        case 'ice-candidate': {
          try {
            await peerRef.current?.addIceCandidate(msg.candidate);
          } catch {
            // ignore stale candidates
          }
          break;
        }
        case 'peer-left': {
          peerRef.current?.close();
          peerRef.current = null;
          setRemoteStream(null);
          break;
        }
      }
    });
    return unsubscribe;
  }, [subscribe, send, isHost, createPeer]);

  // Clean up peer connection when peerConnected goes false
  useEffect(() => {
    if (!peerConnected) {
      peerRef.current?.close();
      peerRef.current = null;
      setRemoteStream(null);
    }
  }, [peerConnected]);

  return { localStream, remoteStream, cameraError };
}
