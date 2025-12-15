import { useEffect, useRef, useCallback, useState } from 'react';
import { createClient, RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import type { GameState, Player } from '../types/game';
import { generateId, getRandomColor } from '../types/game';

// Generate a unique session ID for this browser tab
const SESSION_ID = Math.random().toString(36).substring(2, 15);

// Storage key prefix
const STORAGE_KEY_PREFIX = 'gotya_room_';

// Supabase configuration (from environment variables)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if Supabase is configured
const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

interface RoomData {
  state: GameState;
  lastUpdate: number;
  hostSessionId: string;
}

/**
 * Game Sync Hook
 *
 * Provides real-time synchronization:
 * - If Supabase is configured (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY):
 *   Uses Supabase Realtime for true cross-device play
 * - Otherwise:
 *   Uses localStorage + BroadcastChannel for same-browser tab sync
 */
export function useGameSync(
  roomCode: string,
  isHost: boolean,
  onStateUpdate: (state: GameState) => void
) {
  const channelRef = useRef<BroadcastChannel | null>(null);
  const supabaseRef = useRef<SupabaseClient | null>(null);
  const realtimeChannelRef = useRef<RealtimeChannel | null>(null);
  const isHostRef = useRef(isHost);
  const pollingRef = useRef<number | null>(null);
  const [connected, setConnected] = useState(false);
  const [syncMode, setSyncMode] = useState<'local' | 'supabase'>(
    isSupabaseConfigured ? 'supabase' : 'local'
  );

  isHostRef.current = isHost;

  const storageKey = roomCode ? `${STORAGE_KEY_PREFIX}${roomCode}` : '';

  // Initialize Supabase client if configured
  useEffect(() => {
    if (isSupabaseConfigured && !supabaseRef.current) {
      try {
        supabaseRef.current = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);
        console.log('[Sync] Using Supabase for cross-device sync');
      } catch (e) {
        console.error('[Sync] Failed to initialize Supabase, falling back to local:', e);
        setSyncMode('local');
      }
    } else if (!isSupabaseConfigured) {
      console.log('[Sync] Using localStorage for same-browser sync');
      setSyncMode('local');
    }
  }, []);

  // Save state to storage (host only)
  const saveState = useCallback(async (state: GameState) => {
    if (!storageKey || !isHostRef.current) return;

    const roomData: RoomData = {
      state,
      lastUpdate: Date.now(),
      hostSessionId: SESSION_ID,
    };

    // Always save to localStorage
    try {
      localStorage.setItem(storageKey, JSON.stringify(roomData));
    } catch (e) {
      console.error('Failed to save state to localStorage:', e);
    }

    // Also save to Supabase if configured
    if (supabaseRef.current) {
      try {
        const { error } = await supabaseRef.current
          .from('game_rooms')
          .upsert({
            room_code: roomCode,
            state: JSON.stringify(state),
            last_update: new Date().toISOString(),
            host_session_id: SESSION_ID,
          }, { onConflict: 'room_code' });

        if (error) {
          console.error('Failed to save state to Supabase:', error);
        }
      } catch (e) {
        console.error('Supabase save error:', e);
      }
    }
  }, [storageKey, roomCode]);

  // Sync version for immediate use (no await)
  const loadStateSync = useCallback((): GameState | null => {
    if (!storageKey) return null;

    try {
      const data = localStorage.getItem(storageKey);
      if (data) {
        const roomData: RoomData = JSON.parse(data);
        if (Date.now() - roomData.lastUpdate < 3600000) {
          return roomData.state;
        }
      }
    } catch (e) {
      console.error('Failed to load state:', e);
    }
    return null;
  }, [storageKey]);

  // Load state by a specific room code (useful for joining - localStorage only)
  const loadStateByCode = useCallback((code: string): GameState | null => {
    if (!code) return null;

    const key = `${STORAGE_KEY_PREFIX}${code}`;
    try {
      const data = localStorage.getItem(key);
      if (data) {
        const roomData: RoomData = JSON.parse(data);
        if (Date.now() - roomData.lastUpdate < 3600000) {
          return roomData.state;
        }
      }
    } catch (e) {
      console.error('Failed to load state by code:', e);
    }
    return null;
  }, []);

  // Fetch room from Supabase by code (for cross-device join)
  const fetchRoomFromSupabase = useCallback(async (code: string): Promise<GameState | null> => {
    if (!supabaseRef.current || !code) return null;

    try {
      const { data, error } = await supabaseRef.current
        .from('game_rooms')
        .select('state, last_update')
        .eq('room_code', code)
        .single();

      if (error) {
        console.log('[Sync] Room not found in Supabase:', error.message);
        return null;
      }

      if (data && data.state) {
        const state = JSON.parse(data.state) as GameState;
        console.log('[Sync] Fetched room from Supabase:', code, 'players:', state.players.length);
        return state;
      }
    } catch (e) {
      console.error('[Sync] Failed to fetch from Supabase:', e);
    }
    return null;
  }, []);

  // Join room via Supabase (for cross-device join)
  const joinRoomViaSupabase = useCallback(async (nickname: string, code: string): Promise<{ player: Player; state: GameState } | null> => {
    if (!supabaseRef.current) {
      console.log('[Sync] Supabase not configured, cannot join cross-device');
      return null;
    }

    // First fetch the current room state
    const existingState = await fetchRoomFromSupabase(code);
    if (!existingState) {
      console.log('[Sync] Cannot join - room not found');
      return null;
    }

    // Check if game already started
    if (existingState.phase !== 'lobby') {
      console.log('[Sync] Cannot join - game already started');
      return null;
    }

    // Create new player
    const newPlayer: Player = {
      id: generateId(),
      nickname,
      avatarColor: getRandomColor(),
      score: 0,
      isHost: false,
      hasAnswered: false,
      hasVoted: false,
    };

    // Add player to state
    const updatedState: GameState = {
      ...existingState,
      players: [...existingState.players, newPlayer],
    };

    // Save to Supabase
    try {
      const { error } = await supabaseRef.current
        .from('game_rooms')
        .update({
          state: JSON.stringify(updatedState),
          last_update: new Date().toISOString(),
        })
        .eq('room_code', code);

      if (error) {
        console.error('[Sync] Failed to update room in Supabase:', error);
        return null;
      }

      // Also save to localStorage for this device
      const key = `${STORAGE_KEY_PREFIX}${code}`;
      const roomData: RoomData = {
        state: updatedState,
        lastUpdate: Date.now(),
        hostSessionId: '',
      };
      localStorage.setItem(key, JSON.stringify(roomData));

      // Broadcast join via realtime
      const channel = supabaseRef.current.channel(`room:${code}`);
      await channel.send({
        type: 'broadcast',
        event: 'player_joined',
        payload: { player: newPlayer, state: updatedState, senderId: SESSION_ID },
      });

      console.log('[Sync] Successfully joined room via Supabase');
      return { player: newPlayer, state: updatedState };
    } catch (e) {
      console.error('[Sync] Join error:', e);
      return null;
    }
  }, [fetchRoomFromSupabase]);

  // Broadcast state update
  const broadcastState = useCallback(async (state: GameState) => {
    // Save to storage
    await saveState(state);

    // Broadcast via BroadcastChannel (for same-browser tabs)
    if (channelRef.current) {
      channelRef.current.postMessage({
        type: 'STATE_UPDATE',
        state,
        senderId: SESSION_ID,
      });
    }

    // Broadcast via Supabase Realtime if configured
    if (realtimeChannelRef.current) {
      await realtimeChannelRef.current.send({
        type: 'broadcast',
        event: 'state_update',
        payload: { state, senderId: SESSION_ID },
      });
    }
  }, [saveState]);

  // Request to join a room (non-host)
  const requestJoin = useCallback((nickname: string, roomCodeToJoin?: string): Player | null => {
    const targetCode = roomCodeToJoin || roomCode;
    const targetKey = `${STORAGE_KEY_PREFIX}${targetCode}`;

    if (!targetCode) return null;

    // Create new player
    const newPlayer: Player = {
      id: generateId(),
      nickname,
      avatarColor: getRandomColor(),
      score: 0,
      isHost: false,
      hasAnswered: false,
      hasVoted: false,
    };

    // Try to load existing room from localStorage (synchronous check)
    const existingState = roomCodeToJoin ? loadStateByCode(roomCodeToJoin) : loadStateSync();
    if (existingState) {
      // Add player to existing state
      const updatedState: GameState = {
        ...existingState,
        players: [...existingState.players, newPlayer],
      };

      // Save updated state to the correct key
      const roomData: RoomData = {
        state: updatedState,
        lastUpdate: Date.now(),
        hostSessionId: '', // Non-host update
      };
      localStorage.setItem(targetKey, JSON.stringify(roomData));

      // Broadcast the join via BroadcastChannel for the target room
      const targetChannel = new BroadcastChannel(`gotya-${targetCode}`);
      targetChannel.postMessage({
        type: 'PLAYER_JOINED',
        player: newPlayer,
        state: updatedState,
        senderId: SESSION_ID,
      });
      targetChannel.close();

      // Also broadcast via Supabase if configured
      if (realtimeChannelRef.current) {
        realtimeChannelRef.current.send({
          type: 'broadcast',
          event: 'player_joined',
          payload: { player: newPlayer, state: updatedState, senderId: SESSION_ID },
        });
      }

      return newPlayer;
    }

    return null;
  }, [roomCode, loadStateSync, loadStateByCode]);

  // Initialize sync
  useEffect(() => {
    if (!roomCode) return;

    // Create BroadcastChannel for same-origin sync
    const channelName = `gotya-${roomCode}`;
    channelRef.current = new BroadcastChannel(channelName);
    setConnected(true);

    // Handle messages from other tabs
    const handleMessage = async (event: MessageEvent) => {
      const { type, state, player, senderId } = event.data;

      // Ignore our own messages
      if (senderId === SESSION_ID) return;

      switch (type) {
        case 'STATE_UPDATE':
          if (!isHostRef.current && state) {
            onStateUpdate(state);
          }
          break;

        case 'PLAYER_JOINED':
          if (isHostRef.current && player) {
            // Reload state to see the new player
            const currentState = loadStateSync();
            if (currentState) {
              onStateUpdate(currentState);
            }
          }
          break;
      }
    };

    channelRef.current.addEventListener('message', handleMessage);

    // Also listen for storage events (cross-tab sync fallback)
    const handleStorage = (event: StorageEvent) => {
      if (event.key === storageKey && event.newValue && !isHostRef.current) {
        try {
          const roomData: RoomData = JSON.parse(event.newValue);
          onStateUpdate(roomData.state);
        } catch (e) {
          console.error('Failed to parse storage event:', e);
        }
      }
    };

    window.addEventListener('storage', handleStorage);

    // Set up Supabase Realtime if configured
    if (supabaseRef.current) {
      try {
        const channel = supabaseRef.current
          .channel(`room:${roomCode}`)
          .on('broadcast', { event: 'state_update' }, ({ payload }) => {
            if (payload.senderId !== SESSION_ID && !isHostRef.current) {
              onStateUpdate(payload.state);
            }
          })
          .on('broadcast', { event: 'player_joined' }, ({ payload }) => {
            if (payload.senderId !== SESSION_ID && isHostRef.current) {
              onStateUpdate(payload.state);
            }
          })
          .subscribe((status, err) => {
            if (status === 'SUBSCRIBED') {
              console.log('[Sync] Supabase Realtime connected');
              setSyncMode('supabase');
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              console.warn('[Sync] Supabase connection failed, using local mode:', err);
              setSyncMode('local');
            }
          });

        realtimeChannelRef.current = channel;
      } catch (e) {
        console.error('[Sync] Failed to set up Supabase Realtime, using local mode:', e);
        setSyncMode('local');
      }
    }

    // Start polling for updates (fallback for unreliable events)
    // Both host and non-host poll to ensure sync reliability
    let lastUpdate = 0;
    let lastPlayerCount = 0;
    pollingRef.current = window.setInterval(() => {
      const data = localStorage.getItem(storageKey);
      if (data) {
        try {
          const roomData: RoomData = JSON.parse(data);

          if (isHostRef.current) {
            // Host: only update if player count changed (someone joined/left)
            const currentCount = roomData.state.players.length;
            if (currentCount !== lastPlayerCount) {
              lastPlayerCount = currentCount;
              lastUpdate = roomData.lastUpdate;
              onStateUpdate(roomData.state);
            }
          } else {
            // Non-host: update on any state change
            if (roomData.lastUpdate > lastUpdate) {
              lastUpdate = roomData.lastUpdate;
              lastPlayerCount = roomData.state.players.length;
              onStateUpdate(roomData.state);
            }
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    }, 500); // Poll every 500ms

    return () => {
      channelRef.current?.removeEventListener('message', handleMessage);
      channelRef.current?.close();
      channelRef.current = null;
      window.removeEventListener('storage', handleStorage);
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
      if (realtimeChannelRef.current) {
        supabaseRef.current?.removeChannel(realtimeChannelRef.current);
        realtimeChannelRef.current = null;
      }
      setConnected(false);
    };
  }, [roomCode, storageKey, onStateUpdate, loadStateSync]);

  // Clean up room when leaving
  const cleanupRoom = useCallback(async () => {
    if (storageKey && isHostRef.current) {
      localStorage.removeItem(storageKey);

      // Also remove from Supabase if configured
      if (supabaseRef.current) {
        await supabaseRef.current
          .from('game_rooms')
          .delete()
          .eq('room_code', roomCode);
      }
    }
  }, [storageKey, roomCode]);

  return {
    sessionId: SESSION_ID,
    connected,
    syncMode,
    broadcastState,
    requestJoin,
    loadState: loadStateSync, // Use sync version for API compatibility
    loadStateByCode, // Load by specific room code (for joining)
    fetchRoomFromSupabase, // Fetch room from Supabase (cross-device)
    joinRoomViaSupabase, // Join room via Supabase (cross-device)
    saveState,
    cleanupRoom,
  };
}

export { SESSION_ID };
