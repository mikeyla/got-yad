import React from 'react';

interface DiceProps {
  value: number;
  size?: 'sm' | 'md' | 'lg';
  isRolling?: boolean;
  hidden?: boolean;
  highlighted?: boolean;
}

const sizeClasses = {
  sm: 'w-10 h-10',
  md: 'w-14 h-14',
  lg: 'w-20 h-20',
};

const pipSizes = {
  sm: 'w-1.5 h-1.5',
  md: 'w-2.5 h-2.5',
  lg: 'w-3.5 h-3.5',
};

// Pip positions for each die face
const pipPositions: Record<number, string[]> = {
  1: ['center'],
  2: ['top-right', 'bottom-left'],
  3: ['top-right', 'center', 'bottom-left'],
  4: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
  5: ['top-left', 'top-right', 'center', 'bottom-left', 'bottom-right'],
  6: ['top-left', 'top-right', 'middle-left', 'middle-right', 'bottom-left', 'bottom-right'],
};

const positionClasses: Record<string, string> = {
  'top-left': 'top-1.5 left-1.5',
  'top-right': 'top-1.5 right-1.5',
  'middle-left': 'top-1/2 left-1.5 -translate-y-1/2',
  'middle-right': 'top-1/2 right-1.5 -translate-y-1/2',
  'bottom-left': 'bottom-1.5 left-1.5',
  'bottom-right': 'bottom-1.5 right-1.5',
  'center': 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
};

export const Dice: React.FC<DiceProps> = ({
  value,
  size = 'md',
  isRolling = false,
  hidden = false,
  highlighted = false,
}) => {
  const positions = pipPositions[value] || [];

  return (
    <div
      className={`
        ${sizeClasses[size]}
        relative rounded-xl shadow-lg
        ${hidden ? 'bg-gradient-to-br from-purple-600 to-pink-600' : 'bg-white'}
        ${isRolling ? 'animate-dice-roll' : ''}
        ${highlighted ? 'ring-4 ring-yellow-400 ring-opacity-75' : ''}
        transition-all duration-200 transform hover:scale-105
      `}
    >
      {hidden ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-white font-bold text-xl">?</span>
        </div>
      ) : (
        positions.map((pos, index) => (
          <div
            key={index}
            className={`
              absolute ${positionClasses[pos]} ${pipSizes[size]}
              bg-gray-800 rounded-full
            `}
          />
        ))
      )}
    </div>
  );
};

interface DiceHandProps {
  dice: number[];
  hidden?: boolean;
  isRolling?: boolean;
  highlightValue?: number;
  label?: string;
}

export const DiceHand: React.FC<DiceHandProps> = ({
  dice,
  hidden = false,
  isRolling = false,
  highlightValue,
  label,
}) => {
  return (
    <div className="flex flex-col items-center gap-3">
      {label && (
        <span className="text-sm text-purple-300 font-medium">{label}</span>
      )}
      <div className="flex gap-2 flex-wrap justify-center">
        {dice.map((value, index) => (
          <Dice
            key={index}
            value={value}
            hidden={hidden}
            isRolling={isRolling}
            highlighted={highlightValue !== undefined && (value === highlightValue || (value === 1 && highlightValue !== 1))}
          />
        ))}
      </div>
    </div>
  );
};
