import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import type { Player } from '../types/game';
import { GAME_CONFIG } from '../types/game';

interface LobbyScreenProps {
  roomCode: string;
  players: Player[];
  currentPlayerId: string;
  onStartGame: () => void;
  onAddPlayer: (nickname: string) => void;
  onLeaveGame: () => void;
  syncStatus?: {
    connected: boolean;
    mode: 'local' | 'supabase';
  };
}

// Copy icon SVG
const CopyIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

// Check icon SVG
const CheckIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export const LobbyScreen: React.FC<LobbyScreenProps> = ({
  roomCode,
  players,
  currentPlayerId,
  onStartGame,
  onAddPlayer,
  onLeaveGame,
  syncStatus,
}) => {
  const [newPlayerName, setNewPlayerName] = useState('');
  const [copied, setCopied] = useState(false);
  const currentPlayer = players.find(p => p.id === currentPlayerId);
  const isHost = currentPlayer?.isHost;
  const canStart = players.length >= GAME_CONFIG.MIN_PLAYERS;

  // Generate join URL
  const joinUrl = `${window.location.origin}?join=${roomCode}`;

  const handleAddPlayer = () => {
    if (newPlayerName.trim()) {
      onAddPlayer(newPlayerName.trim());
      setNewPlayerName('');
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = roomCode;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      {/* Sync Status Indicator */}
      {syncStatus && (
        <div className="fixed top-4 right-4 flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${syncStatus.connected ? 'bg-green-400' : 'bg-yellow-400'} ${syncStatus.connected ? '' : 'animate-pulse'}`} />
          <span className="arcade-font text-[8px] text-[hsl(var(--muted-foreground))]">
            {syncStatus.mode === 'supabase' ? 'ONLINE' : 'LOCAL'}
          </span>
        </div>
      )}

      {/* Room Code Section */}
      <div className="text-center mb-8">
        <p className="arcade-font text-[10px] text-[hsl(var(--muted-foreground))] mb-2">ROOM CODE</p>
        <div className="arcade-card inline-flex items-center gap-4 px-6 py-4">
          <p className="arcade-font text-3xl tracking-[0.3em] text-[hsl(var(--accent))]" style={{ textShadow: '0 0 10px hsl(50 100% 50% / 0.5)' }}>
            {roomCode}
          </p>
          <button
            onClick={handleCopyCode}
            className={`copy-btn ${copied ? 'copied' : ''}`}
            title="Copy room code"
          >
            {copied ? <CheckIcon /> : <CopyIcon />}
          </button>
        </div>
        <p className="arcade-font text-[8px] text-[hsl(var(--muted-foreground))] mt-2">
          {copied ? 'COPIED!' : 'CLICK TO COPY'}
        </p>
      </div>

      {/* QR Code Section */}
      <div className="text-center mb-8">
        <p className="arcade-font text-[10px] text-[hsl(var(--muted-foreground))] mb-3">SCAN TO JOIN</p>
        <div className="qr-container">
          <QRCodeSVG
            value={joinUrl}
            size={120}
            level="M"
            bgColor="hsl(60, 100%, 97%)"
            fgColor="hsl(240, 20%, 4%)"
          />
        </div>
      </div>

      {/* Players List */}
      <div className="arcade-card w-full max-w-md mb-6">
        <h2 className="arcade-font text-xs text-center mb-4 text-[hsl(var(--primary))]">
          PLAYERS ({players.length}/{GAME_CONFIG.MAX_PLAYERS})
        </h2>

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {players.map((player) => (
            <div
              key={player.id}
              className={`flex items-center gap-3 p-3 border-2 ${
                player.id === currentPlayerId
                  ? 'border-[hsl(var(--accent))] bg-[hsl(var(--accent)/0.1)]'
                  : 'border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]'
              }`}
            >
              {/* Avatar */}
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold"
                style={{ backgroundColor: player.avatarColor }}
              >
                {player.nickname.charAt(0).toUpperCase()}
              </div>

              {/* Name */}
              <div className="flex-1">
                <p className="font-bold text-[hsl(var(--foreground))]">
                  {player.nickname}
                  {player.id === currentPlayerId && (
                    <span className="text-[hsl(var(--accent))] text-xs ml-2">(YOU)</span>
                  )}
                </p>
                {player.isHost && (
                  <p className="arcade-font text-[8px] text-[hsl(var(--destructive))]">HOST</p>
                )}
              </div>

              {/* Ready indicator */}
              <span className="arcade-font text-[8px] text-[hsl(var(--success))]">
                READY
              </span>
            </div>
          ))}
        </div>

        {/* Add player for local testing */}
        {players.length < GAME_CONFIG.MAX_PLAYERS && (
          <div className="mt-4 pt-4 border-t border-[hsl(var(--border))]">
            <p className="arcade-font text-[8px] text-[hsl(var(--muted-foreground))] mb-2">
              ADD LOCAL PLAYER (FOR TESTING)
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
                placeholder="PLAYER NAME"
                maxLength={GAME_CONFIG.MAX_NICKNAME_LENGTH}
                className="arcade-input flex-1 py-2 text-xs"
                onKeyDown={(e) => e.key === 'Enter' && handleAddPlayer()}
              />
              <button
                onClick={handleAddPlayer}
                className="arcade-btn py-2 px-4 text-[8px]"
              >
                ADD
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Waiting message or Start button */}
      {isHost ? (
        <div className="space-y-4 w-full max-w-md">
          {!canStart && (
            <p className="arcade-font text-[10px] text-center text-[hsl(var(--destructive))]">
              NEED AT LEAST {GAME_CONFIG.MIN_PLAYERS} PLAYERS TO START
            </p>
          )}
          <button
            onClick={onStartGame}
            disabled={!canStart}
            className={`arcade-btn arcade-btn-yellow w-full ${
              !canStart ? 'opacity-50 cursor-not-allowed' : 'pulse-glow'
            }`}
          >
            START GAME
          </button>
        </div>
      ) : (
        <div className="text-center">
          <p className="arcade-font text-[10px] text-[hsl(var(--muted-foreground))] blink">
            WAITING FOR HOST TO START...
          </p>
        </div>
      )}

      {/* Leave button */}
      <button
        onClick={onLeaveGame}
        className="arcade-font text-[10px] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] mt-8"
      >
        LEAVE GAME
      </button>
    </div>
  );
};
