import React, { useState, useEffect, useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { GAME_CONFIG, generateRoomCode } from '../types/game';

interface HomeScreenProps {
  onCreateGame: (nickname: string, roomCode: string) => void;
  onJoinGame: (nickname: string, code: string) => void;
  initialJoinCode?: string;
  externalError?: string;
  isJoining?: boolean;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onCreateGame, onJoinGame, initialJoinCode, externalError, isJoining }) => {
  const [nickname, setNickname] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [mode, setMode] = useState<'select' | 'create' | 'join'>('select');
  const [error, setError] = useState('');

  // Pre-generate room code for QR display before game creation
  const previewRoomCode = useMemo(() => generateRoomCode(), []);

  // Update error when external error changes
  useEffect(() => {
    if (externalError) {
      setError(externalError);
    }
  }, [externalError]);

  // Auto-switch to join mode if we have an initial join code
  useEffect(() => {
    if (initialJoinCode) {
      setRoomCode(initialJoinCode);
      setMode('join');
    }
  }, [initialJoinCode]);

  const handleCreate = () => {
    if (!nickname.trim()) {
      setError('Enter a nickname!');
      return;
    }
    if (nickname.length > GAME_CONFIG.MAX_NICKNAME_LENGTH) {
      setError(`Nickname too long! Max ${GAME_CONFIG.MAX_NICKNAME_LENGTH} characters.`);
      return;
    }
    onCreateGame(nickname.trim(), previewRoomCode);
  };

  // Generate join URL for QR code
  const joinUrl = `${window.location.origin}?join=${previewRoomCode}`;

  const handleJoin = () => {
    if (!nickname.trim()) {
      setError('Enter a nickname!');
      return;
    }
    if (!roomCode.trim()) {
      setError('Enter a room code!');
      return;
    }
    if (nickname.length > GAME_CONFIG.MAX_NICKNAME_LENGTH) {
      setError(`Nickname too long! Max ${GAME_CONFIG.MAX_NICKNAME_LENGTH} characters.`);
      return;
    }
    onJoinGame(nickname.trim(), roomCode.trim().toUpperCase());
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      {/* Title */}
      <div className="text-center mb-12 float">
        <h1 className="arcade-font text-4xl md:text-6xl mb-4">
          <span className="text-[hsl(var(--destructive))] flicker">GOT</span>
          <span className="text-[hsl(var(--accent))] flicker"> YA!</span>
        </h1>
        <p className="arcade-font text-xs text-[hsl(var(--muted-foreground))] tracking-wider">
          THE ULTIMATE BLUFF GAME
        </p>
      </div>

      {/* Tagline */}
      <p className="arcade-font text-[10px] text-center text-[hsl(var(--muted-foreground))] mb-8 max-w-md">
        OUTSMART. OUTGUESS. OUTPLAY.
      </p>

      {mode === 'select' && (
        <div className="space-y-4 w-full max-w-xs">
          <button
            onClick={() => setMode('create')}
            className="arcade-btn w-full"
          >
            CREATE GAME
          </button>
          <button
            onClick={() => setMode('join')}
            className="arcade-btn arcade-btn-secondary w-full"
          >
            JOIN GAME
          </button>

          <p className="arcade-font text-[8px] text-center text-[hsl(var(--muted-foreground))] mt-8">
            UP TO 20 PLAYERS • TEST YOUR WITS
          </p>
        </div>
      )}

      {mode === 'create' && (
        <div className="arcade-card w-full max-w-md">
          <h2 className="arcade-font text-sm text-center mb-4 text-[hsl(var(--accent))]">
            CREATE GAME
          </h2>

          {/* Early QR code display - players can scan while host enters name */}
          <div className="text-center mb-4">
            <p className="arcade-font text-[10px] text-[hsl(var(--muted-foreground))] mb-2">
              ROOM CODE: <span className="text-[hsl(var(--accent))]">{previewRoomCode}</span>
            </p>
            <div className="qr-container mx-auto mb-2" style={{ width: 'fit-content' }}>
              <QRCodeSVG
                value={joinUrl}
                size={100}
                level="M"
                bgColor="hsl(60, 100%, 97%)"
                fgColor="hsl(240, 20%, 4%)"
              />
            </div>
            <p className="arcade-font text-[8px] text-[hsl(var(--muted-foreground))]">
              PLAYERS CAN SCAN TO JOIN NOW!
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="arcade-font text-[10px] text-[hsl(var(--muted-foreground))] block mb-2">
                YOUR NICKNAME
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => {
                  setNickname(e.target.value);
                  setError('');
                }}
                placeholder="ENTER NAME"
                maxLength={GAME_CONFIG.MAX_NICKNAME_LENGTH}
                className="arcade-input"
                autoFocus
              />
            </div>

            {error && (
              <p className="arcade-font text-[10px] text-[hsl(var(--destructive))] text-center shake">
                {error}
              </p>
            )}

            <button
              onClick={handleCreate}
              className="arcade-btn arcade-btn-yellow w-full"
            >
              START
            </button>

            <button
              onClick={() => {
                setMode('select');
                setError('');
              }}
              className="arcade-font text-[10px] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] w-full text-center py-2"
            >
              ← BACK
            </button>
          </div>
        </div>
      )}

      {mode === 'join' && (
        <div className="arcade-card w-full max-w-md">
          <h2 className="arcade-font text-sm text-center mb-6 text-[hsl(var(--primary))]">
            JOIN GAME
          </h2>

          <div className="space-y-4">
            <div>
              <label className="arcade-font text-[10px] text-[hsl(var(--muted-foreground))] block mb-2">
                YOUR NICKNAME
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => {
                  setNickname(e.target.value);
                  setError('');
                }}
                placeholder="ENTER NAME"
                maxLength={GAME_CONFIG.MAX_NICKNAME_LENGTH}
                className="arcade-input"
                autoFocus
              />
            </div>

            <div>
              <label className="arcade-font text-[10px] text-[hsl(var(--muted-foreground))] block mb-2">
                ROOM CODE
              </label>
              <input
                type="text"
                value={roomCode}
                onChange={(e) => {
                  setRoomCode(e.target.value.toUpperCase());
                  setError('');
                }}
                placeholder="ENTER CODE"
                maxLength={6}
                className="arcade-input"
              />
            </div>

            {error && (
              <p className="arcade-font text-[10px] text-[hsl(var(--destructive))] text-center shake">
                {error}
              </p>
            )}

            <button
              onClick={handleJoin}
              disabled={isJoining}
              className={`arcade-btn w-full ${isJoining ? 'opacity-50 cursor-wait' : ''}`}
            >
              {isJoining ? 'JOINING...' : 'JOIN'}
            </button>

            <button
              onClick={() => {
                setMode('select');
                setError('');
              }}
              className="arcade-font text-[10px] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] w-full text-center py-2"
            >
              ← BACK
            </button>
          </div>
        </div>
      )}

      {/* Insert coin blinking text */}
      <p className="arcade-font text-[10px] text-[hsl(var(--success))] mt-12 blink">
        INSERT COIN
      </p>
    </div>
  );
};
