import { useEffect, useRef, useCallback } from 'react';
import type { GameState } from '../types/game';

interface SyncMessage {
  type: 'STATE_UPDATE' | 'JOIN_REQUEST' | 'JOIN_RESPONSE' | 'PLAYER_ACTION';
  payload: unknown;
  senderId: string;
  roomCode: string;
}

// Generate a unique session ID for this browser tab
const SESSION_ID = Math.random().toString(36).substring(2, 15);

export function useGameSync(
  roomCode: string,
  isHost: boolean,
  _state: GameState, // Used for broadcasting
  onStateUpdate: (state: GameState) => void,
  onPlayerJoin: (nickname: string, sessionId: string) => void
) {
  const channelRef = useRef<BroadcastChannel | null>(null);
  const isHostRef = useRef(isHost);
  isHostRef.current = isHost;

  // Initialize broadcast channel
  useEffect(() => {
    if (!roomCode) return;

    const channelName = `gotya-${roomCode}`;
    channelRef.current = new BroadcastChannel(channelName);

    const handleMessage = (event: MessageEvent<SyncMessage>) => {
      const { type, payload, senderId, roomCode: msgRoomCode } = event.data;

      // Ignore our own messages
      if (senderId === SESSION_ID) return;
      // Ignore messages for other rooms
      if (msgRoomCode !== roomCode) return;

      switch (type) {
        case 'STATE_UPDATE':
          // Non-hosts receive state updates from host
          if (!isHostRef.current) {
            onStateUpdate(payload as GameState);
          }
          break;

        case 'JOIN_REQUEST':
          // Host handles join requests
          if (isHostRef.current) {
            const { nickname, sessionId } = payload as { nickname: string; sessionId: string };
            onPlayerJoin(nickname, sessionId);
          }
          break;

        case 'JOIN_RESPONSE':
          // New player receives initial state
          const { targetSessionId, state: initialState } = payload as {
            targetSessionId: string;
            state: GameState;
          };
          if (targetSessionId === SESSION_ID) {
            onStateUpdate(initialState);
          }
          break;

        case 'PLAYER_ACTION':
          // Host receives player actions and updates state
          if (isHostRef.current) {
            // Action handling is done in the main hook
          }
          break;
      }
    };

    channelRef.current.addEventListener('message', handleMessage);

    return () => {
      channelRef.current?.removeEventListener('message', handleMessage);
      channelRef.current?.close();
      channelRef.current = null;
    };
  }, [roomCode, onStateUpdate, onPlayerJoin]);

  // Broadcast state updates (host only)
  const broadcastState = useCallback((newState: GameState) => {
    if (!channelRef.current || !isHostRef.current) return;

    const message: SyncMessage = {
      type: 'STATE_UPDATE',
      payload: newState,
      senderId: SESSION_ID,
      roomCode,
    };

    channelRef.current.postMessage(message);
  }, [roomCode]);

  // Request to join a game (non-host)
  const requestJoin = useCallback((nickname: string) => {
    if (!channelRef.current) return;

    const message: SyncMessage = {
      type: 'JOIN_REQUEST',
      payload: { nickname, sessionId: SESSION_ID },
      senderId: SESSION_ID,
      roomCode,
    };

    channelRef.current.postMessage(message);
  }, [roomCode]);

  // Send join response with initial state (host)
  const sendJoinResponse = useCallback((targetSessionId: string, currentState: GameState) => {
    if (!channelRef.current) return;

    const message: SyncMessage = {
      type: 'JOIN_RESPONSE',
      payload: { targetSessionId, state: currentState },
      senderId: SESSION_ID,
      roomCode,
    };

    channelRef.current.postMessage(message);
  }, [roomCode]);

  // Send player action
  const sendAction = useCallback((action: unknown) => {
    if (!channelRef.current) return;

    const message: SyncMessage = {
      type: 'PLAYER_ACTION',
      payload: { action, sessionId: SESSION_ID },
      senderId: SESSION_ID,
      roomCode,
    };

    channelRef.current.postMessage(message);
  }, [roomCode]);

  return {
    sessionId: SESSION_ID,
    broadcastState,
    requestJoin,
    sendJoinResponse,
    sendAction,
  };
}

export { SESSION_ID };
