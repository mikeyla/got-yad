import React, { useState } from 'react';

interface SetupScreenProps {
  onStart: (name1: string, name2: string) => void;
  onShowRules: () => void;
}

export const SetupScreen: React.FC<SetupScreenProps> = ({ onStart, onShowRules }) => {
  const [player1Name, setPlayer1Name] = useState('');
  const [player2Name, setPlayer2Name] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onStart(player1Name || 'Player 1', player2Name || 'Player 2');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card max-w-md w-full animate-fade-in">
        {/* Logo/Title */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-black gradient-text mb-2">Got Ya!</h1>
          <p className="text-purple-300">The Ultimate Bluff Game</p>
        </div>

        {/* Description */}
        <p className="text-gray-400 text-center mb-6">
          A two-player dice game of deception and strategy. Bluff your way to victory
          or call out your opponent's lies!
        </p>

        {/* Player Names Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-purple-300 mb-2">
              Player 1 Name
            </label>
            <input
              type="text"
              value={player1Name}
              onChange={(e) => setPlayer1Name(e.target.value)}
              placeholder="Enter name..."
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10
                       focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20
                       outline-none transition-all text-white placeholder-gray-500"
              maxLength={20}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-purple-300 mb-2">
              Player 2 Name
            </label>
            <input
              type="text"
              value={player2Name}
              onChange={(e) => setPlayer2Name(e.target.value)}
              placeholder="Enter name..."
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10
                       focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20
                       outline-none transition-all text-white placeholder-gray-500"
              maxLength={20}
            />
          </div>

          <button type="submit" className="btn-primary w-full text-lg mt-6">
            Start Game
          </button>
        </form>

        {/* Rules Button */}
        <button
          onClick={onShowRules}
          className="btn-secondary w-full mt-4"
        >
          How to Play
        </button>

        {/* Quick Rules */}
        <div className="mt-8 pt-6 border-t border-white/10">
          <h3 className="font-bold text-sm text-purple-300 mb-3">Quick Rules</h3>
          <ul className="text-sm text-gray-400 space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-purple-400">•</span>
              Each player rolls 5 dice (hidden from opponent)
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-400">•</span>
              Take turns bidding on total dice showing a face value
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-400">•</span>
              Call "Got Ya!" if you think they're bluffing
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-400">•</span>
              First to win 3 rounds wins the game!
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
