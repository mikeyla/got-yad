import React from 'react';
import { GameState } from '../types/game';
import { PlayerCard } from './PlayerCard';
import { BidSelector } from './BidSelector';
import { DiceHand } from './Dice';
import { formatBid } from '../utils/gameLogic';

interface GameBoardProps {
  state: GameState;
  onPlaceBid: (quantity: number, faceValue: number) => boolean;
  onCallBluff: () => void;
  onNewRound: () => void;
  onResetGame: () => void;
  onShowRules: () => void;
  isAnimating: boolean;
}

export const GameBoard: React.FC<GameBoardProps> = ({
  state,
  onPlaceBid,
  onCallBluff,
  onNewRound,
  onResetGame,
  onShowRules,
  isAnimating,
}) => {
  const { phase, player1, player2, currentBid, roundNumber, lastAction, winner, roundWinner } = state;
  const currentPlayer = player1.isCurrentTurn ? player1 : player2;
  const waitingPlayer = player1.isCurrentTurn ? player2 : player1;

  const renderPhaseContent = () => {
    switch (phase) {
      case 'rolling':
        return (
          <div className="text-center py-12 animate-pulse">
            <div className="text-6xl mb-4">🎲</div>
            <p className="text-xl text-purple-300">Rolling dice...</p>
          </div>
        );

      case 'bidding':
        return (
          <div className="space-y-6">
            {/* Current bid display */}
            {currentBid && (
              <div className="text-center bg-white/5 rounded-xl p-4">
                <p className="text-sm text-gray-400 mb-1">Current Bid</p>
                <p className="text-2xl font-bold text-purple-300">
                  {formatBid(currentBid)}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  by {currentBid.playerId === 1 ? player1.name : player2.name}
                </p>
              </div>
            )}

            {/* Bid Selector for current player */}
            <BidSelector
              currentBid={currentBid}
              totalDice={state.dicePerPlayer * 2}
              onPlaceBid={onPlaceBid}
              onCallBluff={onCallBluff}
              disabled={isAnimating}
              playerName={currentPlayer.name}
            />
          </div>
        );

      case 'challenge':
        return (
          <div className="text-center py-12">
            <div className="text-8xl mb-4 animate-bounce-in">🎯</div>
            <h2 className="text-4xl font-black gradient-text mb-2">GOT YA!</h2>
            <p className="text-xl text-purple-300">{lastAction}</p>
          </div>
        );

      case 'reveal':
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center mb-4">
              <h2 className="text-2xl font-bold text-purple-300">Revealing all dice...</h2>
              {currentBid && (
                <p className="text-gray-400 mt-2">
                  Checking for: {formatBid(currentBid)}
                </p>
              )}
            </div>

            {/* Show both players' dice */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="card">
                <h3 className="font-bold text-center mb-4">{player1.name}'s Dice</h3>
                <DiceHand
                  dice={player1.dice}
                  hidden={false}
                  highlightValue={currentBid?.faceValue}
                />
              </div>
              <div className="card">
                <h3 className="font-bold text-center mb-4">{player2.name}'s Dice</h3>
                <DiceHand
                  dice={player2.dice}
                  hidden={false}
                  highlightValue={currentBid?.faceValue}
                />
              </div>
            </div>
          </div>
        );

      case 'roundEnd':
        const roundWinnerPlayer = roundWinner === 1 ? player1 : player2;
        return (
          <div className="text-center py-8 animate-fade-in">
            <div className="text-6xl mb-4">🏆</div>
            <h2 className="text-3xl font-bold gradient-text mb-2">
              {roundWinnerPlayer.name} wins the round!
            </h2>
            <p className="text-gray-400 mb-6">{lastAction}</p>

            {/* Show both players' dice */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="card">
                <h3 className="font-bold text-center mb-4">{player1.name}'s Dice</h3>
                <DiceHand
                  dice={player1.dice}
                  hidden={false}
                  highlightValue={currentBid?.faceValue}
                />
              </div>
              <div className="card">
                <h3 className="font-bold text-center mb-4">{player2.name}'s Dice</h3>
                <DiceHand
                  dice={player2.dice}
                  hidden={false}
                  highlightValue={currentBid?.faceValue}
                />
              </div>
            </div>

            {/* Score update */}
            <div className="bg-white/5 rounded-xl p-4 mb-6">
              <p className="text-sm text-gray-400">Score</p>
              <p className="text-2xl font-bold">
                <span className={player1.score > player2.score ? 'text-green-400' : ''}>
                  {player1.name}: {player1.score}
                </span>
                <span className="mx-4 text-gray-500">vs</span>
                <span className={player2.score > player1.score ? 'text-green-400' : ''}>
                  {player2.name}: {player2.score}
                </span>
              </p>
            </div>

            <button onClick={onNewRound} className="btn-primary text-lg">
              Start Next Round
            </button>
          </div>
        );

      case 'gameEnd':
        const gameWinnerPlayer = winner === 1 ? player1 : player2;
        return (
          <div className="text-center py-8 animate-fade-in">
            <div className="text-8xl mb-4">👑</div>
            <h2 className="text-4xl font-black gradient-text mb-2">
              {gameWinnerPlayer.name} Wins!
            </h2>
            <p className="text-xl text-purple-300 mb-2">Champion of Got Ya!</p>
            <p className="text-gray-400 mb-8">{lastAction}</p>

            {/* Final Score */}
            <div className="bg-white/5 rounded-xl p-6 mb-8 max-w-md mx-auto">
              <p className="text-sm text-gray-400 mb-2">Final Score</p>
              <p className="text-3xl font-bold">
                <span className={player1.score > player2.score ? 'text-green-400' : 'text-gray-400'}>
                  {player1.name}: {player1.score}
                </span>
                <span className="mx-4 text-gray-500">-</span>
                <span className={player2.score > player1.score ? 'text-green-400' : 'text-gray-400'}>
                  {player2.name}: {player2.score}
                </span>
              </p>
            </div>

            <div className="flex gap-4 justify-center">
              <button onClick={onResetGame} className="btn-primary text-lg">
                Play Again
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen p-4 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold gradient-text">Got Ya!</h1>
          <p className="text-sm text-gray-400">Round {roundNumber}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={onShowRules} className="btn-secondary py-2 px-4 text-sm">
            Rules
          </button>
          <button onClick={onResetGame} className="btn-secondary py-2 px-4 text-sm">
            New Game
          </button>
        </div>
      </header>

      {/* Player Cards */}
      {phase !== 'rolling' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <PlayerCard
            player={player1}
            isOpponent={player2.isCurrentTurn && phase === 'bidding'}
            showDice={phase !== 'gameEnd'}
            highlightValue={phase === 'reveal' || phase === 'roundEnd' ? currentBid?.faceValue : undefined}
            isWinner={phase === 'roundEnd' && roundWinner === 1}
          />
          <PlayerCard
            player={player2}
            isOpponent={player1.isCurrentTurn && phase === 'bidding'}
            showDice={phase !== 'gameEnd'}
            highlightValue={phase === 'reveal' || phase === 'roundEnd' ? currentBid?.faceValue : undefined}
            isWinner={phase === 'roundEnd' && roundWinner === 2}
          />
        </div>
      )}

      {/* Status Message */}
      {phase === 'bidding' && (
        <div className="text-center mb-4">
          <p className="text-purple-300 text-lg font-medium animate-pulse">
            {lastAction}
          </p>
        </div>
      )}

      {/* Main Game Content */}
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-2xl">
          {renderPhaseContent()}
        </div>
      </div>

      {/* Footer hint */}
      {phase === 'bidding' && (
        <footer className="text-center py-4 text-sm text-gray-500">
          <p>
            💡 Remember: 1s are wild! They count as any face value.
          </p>
        </footer>
      )}
    </div>
  );
};
