import React, { useState } from 'react';
import { GAME_CONFIG } from '../types/game';

interface HomeScreenProps {
  onCreateGame: (nickname: string) => void;
  onJoinGame: (nickname: string, code: string) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onCreateGame, onJoinGame }) => {
  const [nickname, setNickname] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [mode, setMode] = useState<'select' | 'create' | 'join'>('select');
  const [error, setError] = useState('');

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
      <div className="text-center mb-12">
        <h1 className="arcade-font text-4xl md:text-6xl mb-4">
          <span className="text-red-500 glow-text">GOT</span>
          <span className="text-yellow-400 glow-text"> YA!</span>
        </h1>
        <p className="arcade-font text-xs text-gray-400 tracking-wider">
          THE ULTIMATE BLUFF GAME
        </p>
      </div>

      {/* Tagline */}
      <p className="arcade-font text-[10px] text-center text-gray-500 mb-8 max-w-md">
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
            className="arcade-btn arcade-btn-blue w-full"
          >
            JOIN GAME
          </button>

          <p className="arcade-font text-[8px] text-center text-gray-500 mt-8">
            UP TO 20 PLAYERS • TEST YOUR WITS
          </p>
        </div>
      )}

      {mode === 'create' && (
        <div className="arcade-card w-full max-w-md">
          <h2 className="arcade-font text-sm text-center mb-6 text-yellow-400">
            CREATE GAME
          </h2>

          <div className="space-y-4">
            <div>
              <label className="arcade-font text-[10px] text-gray-400 block mb-2">
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
              <p className="arcade-font text-[10px] text-red-500 text-center shake">
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
              className="arcade-font text-[10px] text-gray-400 hover:text-white w-full text-center py-2"
            >
              ← BACK
            </button>
          </div>
        </div>
      )}

      {mode === 'join' && (
        <div className="arcade-card w-full max-w-md">
          <h2 className="arcade-font text-sm text-center mb-6 text-cyan-400">
            JOIN GAME
          </h2>

          <div className="space-y-4">
            <div>
              <label className="arcade-font text-[10px] text-gray-400 block mb-2">
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
              <label className="arcade-font text-[10px] text-gray-400 block mb-2">
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
              <p className="arcade-font text-[10px] text-red-500 text-center shake">
                {error}
              </p>
            )}

            <button
              onClick={handleJoin}
              className="arcade-btn arcade-btn-blue w-full"
            >
              JOIN
            </button>

            <button
              onClick={() => {
                setMode('select');
                setError('');
              }}
              className="arcade-font text-[10px] text-gray-400 hover:text-white w-full text-center py-2"
            >
              ← BACK
            </button>
          </div>
        </div>
      )}

      {/* Insert coin blinking text */}
      <p className="arcade-font text-[10px] text-green-400 mt-12 blink">
        INSERT COIN
      </p>
    </div>
  );
};
