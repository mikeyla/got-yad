import React from 'react';
import { Player } from '../types/game';
import { DiceHand } from './Dice';

interface PlayerCardProps {
  player: Player;
  isOpponent?: boolean;
  showDice?: boolean;
  highlightValue?: number;
  isWinner?: boolean;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({
  player,
  isOpponent = false,
  showDice = true,
  highlightValue,
  isWinner = false,
}) => {
  return (
    <div
      className={`
        card relative overflow-hidden transition-all duration-300
        ${player.isCurrentTurn ? 'ring-2 ring-purple-500 glow-purple' : ''}
        ${isWinner ? 'ring-2 ring-green-500 glow-green' : ''}
      `}
    >
      {/* Active Turn Indicator */}
      {player.isCurrentTurn && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-pink-500 animate-pulse" />
      )}

      {/* Winner Badge */}
      {isWinner && (
        <div className="absolute -top-1 -right-1 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
          Winner!
        </div>
      )}

      {/* Player Info */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={`
              w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold
              ${player.id === 1
                ? 'bg-gradient-to-br from-blue-500 to-cyan-500'
                : 'bg-gradient-to-br from-pink-500 to-orange-500'}
            `}
          >
            {player.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="font-bold text-lg">{player.name}</h3>
            <p className="text-sm text-gray-400">
              {player.isCurrentTurn ? 'Your turn!' : 'Waiting...'}
            </p>
          </div>
        </div>

        {/* Score */}
        <div className="text-right">
          <p className="text-sm text-gray-400">Score</p>
          <p className="text-3xl font-bold gradient-text">{player.score}</p>
        </div>
      </div>

      {/* Dice Display */}
      {showDice && player.dice.length > 0 && (
        <div className="mt-4 pt-4 border-t border-white/10">
          <DiceHand
            dice={player.dice}
            hidden={isOpponent}
            highlightValue={highlightValue}
            label={isOpponent ? "Opponent's Dice (Hidden)" : 'Your Dice'}
          />
        </div>
      )}
    </div>
  );
};
