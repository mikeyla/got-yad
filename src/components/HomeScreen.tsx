import React, { useState, useEffect } from 'react';
import { GAME_CONFIG } from '../types/game';

interface HomeScreenProps {
  onCreateGame: (nickname: string) => void;
  onJoinGame: (nickname: string, code: string) => void;
  initialJoinCode?: string;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onCreateGame, onJoinGame, initialJoinCode }) => {
  const [nickname, setNickname] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [mode, setMode] = useState<'select' | 'create' | 'join'>('select');
  const [error, setError] = useState('');

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
    onCreateGame(nickname.trim());
  };

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
          <h2 className="arcade-font text-sm text-center mb-6 text-[hsl(var(--accent))]">
            CREATE GAME
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
              className="arcade-btn w-full"
            >
              JOIN
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
