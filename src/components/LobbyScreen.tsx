import React from 'react';
import type { Player } from '../types/game';
import { GAME_CONFIG } from '../types/game';

interface LobbyScreenProps {
  roomCode: string;
  players: Player[];
  currentPlayerId: string;
  onStartGame: () => void;
  onAddPlayer: (nickname: string) => void;
  onLeaveGame: () => void;
}

export const LobbyScreen: React.FC<LobbyScreenProps> = ({
  roomCode,
  players,
  currentPlayerId,
  onStartGame,
  onAddPlayer,
  onLeaveGame,
}) => {
  const [newPlayerName, setNewPlayerName] = React.useState('');
  const currentPlayer = players.find(p => p.id === currentPlayerId);
  const isHost = currentPlayer?.isHost;
  const canStart = players.length >= GAME_CONFIG.MIN_PLAYERS;

  const handleAddPlayer = () => {
    if (newPlayerName.trim()) {
      onAddPlayer(newPlayerName.trim());
      setNewPlayerName('');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      {/* Room Code */}
      <div className="text-center mb-8">
        <p className="arcade-font text-[10px] text-gray-400 mb-2">ROOM CODE</p>
        <div className="arcade-card inline-block px-8 py-4">
          <p className="arcade-font text-3xl tracking-[0.5em] text-yellow-400 glow-text">
            {roomCode}
          </p>
        </div>
        <p className="arcade-font text-[8px] text-gray-500 mt-2">
          SHARE THIS CODE WITH FRIENDS
        </p>
      </div>

      {/* Players List */}
      <div className="arcade-card w-full max-w-md mb-6">
        <h2 className="arcade-font text-xs text-center mb-4 text-cyan-400">
          PLAYERS ({players.length}/{GAME_CONFIG.MAX_PLAYERS})
        </h2>

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {players.map((player) => (
            <div
              key={player.id}
              className={`flex items-center gap-3 p-3 border-2 ${
                player.id === currentPlayerId
                  ? 'border-yellow-400 bg-yellow-400/10'
                  : 'border-white/20 bg-white/5'
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
                <p className="font-bold text-white">
                  {player.nickname}
                  {player.id === currentPlayerId && (
                    <span className="text-yellow-400 text-xs ml-2">(YOU)</span>
                  )}
                </p>
                {player.isHost && (
                  <p className="arcade-font text-[8px] text-red-400">HOST</p>
                )}
              </div>

              {/* Ready indicator */}
              <span className="arcade-font text-[8px] text-green-400">
                READY
              </span>
            </div>
          ))}
        </div>

        {/* Add player for local testing */}
        {players.length < GAME_CONFIG.MAX_PLAYERS && (
          <div className="mt-4 pt-4 border-t border-white/20">
            <p className="arcade-font text-[8px] text-gray-400 mb-2">
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
                className="arcade-btn arcade-btn-blue py-2 px-4 text-[8px]"
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
            <p className="arcade-font text-[10px] text-center text-red-400">
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
          <p className="arcade-font text-[10px] text-gray-400 blink">
            WAITING FOR HOST TO START...
          </p>
        </div>
      )}

      {/* Leave button */}
      <button
        onClick={onLeaveGame}
        className="arcade-font text-[10px] text-gray-400 hover:text-red-400 mt-8"
      >
        LEAVE GAME
      </button>
    </div>
  );
};
