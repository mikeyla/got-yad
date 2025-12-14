import React from 'react';
import { Dice } from './Dice';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="card max-w-2xl w-full max-h-[90vh] overflow-y-auto relative z-10 animate-bounce-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold gradient-text">How to Play Got Ya!</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20
                     flex items-center justify-center transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="space-y-6 text-gray-300">
          {/* Overview */}
          <section>
            <h3 className="font-bold text-purple-300 mb-2">Overview</h3>
            <p>
              Got Ya! is a two-player bluffing game where you try to out-think your opponent.
              Each player has hidden dice, and you take turns making bids about how many dice
              of a certain value are on the table (combined between both players).
            </p>
          </section>

          {/* Setup */}
          <section>
            <h3 className="font-bold text-purple-300 mb-2">Setup</h3>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-purple-400">1.</span>
                Each player rolls 5 dice and keeps them hidden from their opponent
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-400">2.</span>
                You can see your own dice but not your opponent's
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-400">3.</span>
                Player 1 makes the opening bid
              </li>
            </ul>
          </section>

          {/* Bidding */}
          <section>
            <h3 className="font-bold text-purple-300 mb-2">Making Bids</h3>
            <p className="mb-3">
              A bid consists of a <strong>quantity</strong> and a <strong>face value</strong>.
              For example: "3 dice showing 4" means you're claiming there are at least
              three 4s among all 10 dice.
            </p>
            <div className="bg-white/5 rounded-lg p-4 flex items-center justify-center gap-4">
              <span className="text-2xl font-bold">3 ×</span>
              <Dice value={4} size="lg" />
            </div>
          </section>

          {/* Raising */}
          <section>
            <h3 className="font-bold text-purple-300 mb-2">Raising the Bid</h3>
            <p className="mb-2">Each new bid must be higher than the previous one:</p>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-green-400">✓</span>
                <strong>Higher quantity</strong>: "4 dice showing 2" beats "3 dice showing 5"
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400">✓</span>
                <strong>Same quantity, higher face</strong>: "3 dice showing 5" beats "3 dice showing 4"
              </li>
            </ul>
          </section>

          {/* Wilds */}
          <section>
            <h3 className="font-bold text-purple-300 mb-2">Wild 1s</h3>
            <div className="flex items-center gap-3 mb-2">
              <Dice value={1} size="md" />
              <span>=</span>
              <span className="text-purple-300">Wild!</span>
            </div>
            <p>
              Dice showing <strong>1</strong> are wild and count as any face value
              (except when bidding on 1s specifically).
            </p>
          </section>

          {/* Calling */}
          <section>
            <h3 className="font-bold text-purple-300 mb-2">Calling "Got Ya!"</h3>
            <p className="mb-2">
              Instead of raising the bid, you can call <strong>"Got Ya!"</strong> if you
              think your opponent is bluffing. When you call:
            </p>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-red-400">→</span>
                All dice are revealed
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400">→</span>
                Count all dice matching the bid's face (including wild 1s)
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400">🏆</span>
                If actual count is <strong>less than</strong> the bid, the challenger wins!
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400">💀</span>
                If actual count <strong>meets or exceeds</strong> the bid, the bidder wins!
              </li>
            </ul>
          </section>

          {/* Winning */}
          <section>
            <h3 className="font-bold text-purple-300 mb-2">Winning the Game</h3>
            <p>
              First player to win <strong>3 rounds</strong> wins the game!
              After each round, dice are re-rolled and the loser goes first.
            </p>
          </section>

          {/* Tips */}
          <section className="bg-purple-500/10 rounded-lg p-4">
            <h3 className="font-bold text-purple-300 mb-2">Pro Tips</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-yellow-400">💡</span>
                Watch your opponent's reaction to your bids
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-400">💡</span>
                Remember: there are 10 total dice, and 1s are wild
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-400">💡</span>
                Bluff confidently! Hesitation gives you away
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-400">💡</span>
                Keep track of which faces have been bid on
              </li>
            </ul>
          </section>
        </div>

        {/* Close Button */}
        <button onClick={onClose} className="btn-primary w-full mt-6">
          Got it, let's play!
        </button>
      </div>
    </div>
  );
};
