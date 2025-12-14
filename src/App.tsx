import React, { useState } from 'react';
import { useGameState } from './hooks/useGameState';
import { SetupScreen } from './components/SetupScreen';
import { GameBoard } from './components/GameBoard';
import { RulesModal } from './components/RulesModal';
import './index.css';

function App() {
  const {
    state,
    isAnimating,
    setPlayerNames,
    startGame,
    placeBid,
    callBluff,
    startNewRound,
    resetGame,
  } = useGameState();

  const [showRules, setShowRules] = useState(false);

  const handleStartGame = (name1: string, name2: string) => {
    setPlayerNames(name1, name2);
    startGame();
  };

  const handleResetGame = () => {
    resetGame();
  };

  return (
    <div className="min-h-screen">
      {state.phase === 'setup' ? (
        <SetupScreen
          onStart={handleStartGame}
          onShowRules={() => setShowRules(true)}
        />
      ) : (
        <GameBoard
          state={state}
          onPlaceBid={placeBid}
          onCallBluff={callBluff}
          onNewRound={startNewRound}
          onResetGame={handleResetGame}
          onShowRules={() => setShowRules(true)}
          isAnimating={isAnimating}
        />
      )}

      <RulesModal isOpen={showRules} onClose={() => setShowRules(false)} />
    </div>
  );
}

export default App;
