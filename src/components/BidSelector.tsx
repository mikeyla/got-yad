import React, { useState, useEffect } from 'react';
import { Bid } from '../types/game';
import { Dice } from './Dice';

interface BidSelectorProps {
  currentBid: Bid | null;
  totalDice: number;
  onPlaceBid: (quantity: number, faceValue: number) => boolean;
  onCallBluff: () => void;
  disabled?: boolean;
  playerName: string;
}

export const BidSelector: React.FC<BidSelectorProps> = ({
  currentBid,
  totalDice,
  onPlaceBid,
  onCallBluff,
  disabled = false,
  playerName,
}) => {
  const [quantity, setQuantity] = useState(currentBid ? currentBid.quantity : 1);
  const [faceValue, setFaceValue] = useState(currentBid ? currentBid.faceValue + 1 : 2);
  const [error, setError] = useState<string | null>(null);

  // Reset to valid starting values when currentBid changes
  useEffect(() => {
    if (currentBid) {
      // Start with same quantity, next face value
      if (currentBid.faceValue < 6) {
        setQuantity(currentBid.quantity);
        setFaceValue(currentBid.faceValue + 1);
      } else {
        // Need to increase quantity
        setQuantity(currentBid.quantity + 1);
        setFaceValue(1);
      }
    } else {
      setQuantity(1);
      setFaceValue(2);
    }
    setError(null);
  }, [currentBid]);

  const handleQuantityChange = (delta: number) => {
    const newQuantity = Math.max(1, Math.min(totalDice, quantity + delta));
    setQuantity(newQuantity);
    setError(null);
  };

  const handleFaceChange = (newFace: number) => {
    setFaceValue(newFace);
    setError(null);
  };

  const handleBid = () => {
    const success = onPlaceBid(quantity, faceValue);
    if (!success) {
      setError('Invalid bid! Must be higher than the current bid.');
    }
  };

  const isValidBid = () => {
    if (!currentBid) return true;
    if (quantity > currentBid.quantity) return true;
    if (quantity === currentBid.quantity && faceValue > currentBid.faceValue) return true;
    return false;
  };

  return (
    <div className="card max-w-md mx-auto animate-slide-up">
      <h3 className="text-lg font-bold text-center mb-4 text-purple-200">
        {playerName}'s Turn
      </h3>

      {currentBid && (
        <div className="bg-white/5 rounded-lg p-3 mb-4 text-center">
          <span className="text-sm text-gray-400">Current bid: </span>
          <span className="font-bold text-purple-300">
            {currentBid.quantity} × <span className="inline-flex items-center"><Dice value={currentBid.faceValue} size="sm" /></span>
          </span>
        </div>
      )}

      <div className="space-y-6">
        {/* Quantity Selector */}
        <div className="flex flex-col items-center gap-2">
          <label className="text-sm text-gray-400">How many dice?</label>
          <div className="flex items-center gap-4">
            <button
              onClick={() => handleQuantityChange(-1)}
              disabled={quantity <= 1 || disabled}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20
                       disabled:opacity-30 disabled:cursor-not-allowed
                       flex items-center justify-center text-xl font-bold transition-all"
            >
              −
            </button>
            <span className="text-4xl font-bold w-16 text-center gradient-text">
              {quantity}
            </span>
            <button
              onClick={() => handleQuantityChange(1)}
              disabled={quantity >= totalDice || disabled}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20
                       disabled:opacity-30 disabled:cursor-not-allowed
                       flex items-center justify-center text-xl font-bold transition-all"
            >
              +
            </button>
          </div>
        </div>

        {/* Face Value Selector */}
        <div className="flex flex-col items-center gap-2">
          <label className="text-sm text-gray-400">Showing which face?</label>
          <div className="flex gap-2 flex-wrap justify-center">
            {[1, 2, 3, 4, 5, 6].map(face => (
              <button
                key={face}
                onClick={() => handleFaceChange(face)}
                disabled={disabled}
                className={`
                  p-1 rounded-lg transition-all transform
                  ${faceValue === face
                    ? 'ring-2 ring-purple-500 scale-110 bg-purple-500/20'
                    : 'hover:bg-white/10'}
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
              >
                <Dice value={face} size="sm" />
              </button>
            ))}
          </div>
        </div>

        {/* Bid Preview */}
        <div className="text-center py-2 bg-white/5 rounded-lg">
          <span className="text-gray-400">Your bid: </span>
          <span className={`font-bold ${isValidBid() ? 'text-green-400' : 'text-red-400'}`}>
            "{quantity} {quantity === 1 ? 'die' : 'dice'} showing {faceValue}"
          </span>
        </div>

        {error && (
          <p className="text-red-400 text-sm text-center animate-shake">{error}</p>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          {currentBid && (
            <button
              onClick={onCallBluff}
              disabled={disabled}
              className="btn-danger flex-1 text-lg"
            >
              🎯 Got Ya!
            </button>
          )}
          <button
            onClick={handleBid}
            disabled={disabled || !isValidBid()}
            className="btn-primary flex-1 text-lg"
          >
            Place Bid
          </button>
        </div>

        {/* Hint */}
        <p className="text-xs text-gray-500 text-center">
          {currentBid
            ? 'Raise the bid or call "Got Ya!" if you think they\'re bluffing!'
            : 'Make the opening bid - guess how many dice show a certain face.'}
        </p>
      </div>
    </div>
  );
};
