import { useEffect, useState, useCallback } from 'react';
import { useGameState } from './hooks/useGameState';
import { useGameSync } from './hooks/useGameSync';
import { HomeScreen } from './components/HomeScreen';
import { LobbyScreen } from './components/LobbyScreen';
import { GameScreen } from './components/GameScreen';
import type { GameState } from './types/game';
import './index.css';

function App() {
  const {
    state,
    setState,
    createGame,
    joinGame,
    startGame,
    submitAnswer,
    submitVote,
    resetGame,
    getCurrentQuestion,
    getCurrentPlayer,
    getLeaderboard,
    switchPlayer,
  } = useGameState();

  const [isHost, setIsHost] = useState(false);
  const [pendingJoinCode, setPendingJoinCode] = useState<string | null>(null);

  // Handle state updates from other browsers
  const handleStateUpdate = useCallback((newState: GameState) => {
    setState(newState);
  }, [setState]);

  // Handle player join requests (host only)
  const handlePlayerJoin = useCallback((nickname: string, sessionId: string) => {
    if (isHost) {
      joinGame(nickname);
      // Send the updated state to the new player
      sync.sendJoinResponse(sessionId, state);
    }
  }, [isHost, joinGame, state]);

  // Initialize sync
  const sync = useGameSync(
    state.roomCode,
    isHost,
    state,
    handleStateUpdate,
    handlePlayerJoin
  );

  // Check for join code in URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const joinCode = params.get('join');
    if (joinCode) {
      setPendingJoinCode(joinCode.toUpperCase());
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Broadcast state updates when host makes changes
  useEffect(() => {
    if (isHost && state.roomCode) {
      sync.broadcastState(state);
    }
  }, [isHost, state, sync]);

  const handleCreateGame = (nickname: string) => {
    const code = createGame(nickname);
    setIsHost(true);
    return code;
  };

  const handleJoinGame = (nickname: string, code: string) => {
    // Join the game with the room code
    setIsHost(false);
    joinGame(nickname, code);
  };

  const handleAddPlayer = (nickname: string) => {
    joinGame(nickname);
    // Broadcast the updated state
    if (isHost) {
      setTimeout(() => {
        sync.broadcastState(state);
      }, 100);
    }
  };

  const handleStartGame = () => {
    const success = startGame();
    if (success && isHost) {
      // Broadcast will happen automatically via useEffect
    }
  };

  return (
    <div className="min-h-screen relative">
      {/* Scanline overlay for arcade effect */}
      <div className="scanlines fixed inset-0 pointer-events-none z-50" />

      {state.phase === 'home' && (
        <HomeScreen
          onCreateGame={handleCreateGame}
          onJoinGame={handleJoinGame}
          initialJoinCode={pendingJoinCode || undefined}
        />
      )}

      {state.phase === 'lobby' && (
        <LobbyScreen
          roomCode={state.roomCode}
          players={state.players}
          currentPlayerId={state.currentPlayerId}
          onStartGame={handleStartGame}
          onAddPlayer={handleAddPlayer}
          onLeaveGame={resetGame}
        />
      )}

      {(state.phase === 'submitting' ||
        state.phase === 'voting' ||
        state.phase === 'revealing' ||
        state.phase === 'finished') && (
        <GameScreen
          state={state}
          currentQuestion={getCurrentQuestion()}
          currentPlayer={getCurrentPlayer()}
          onSubmitAnswer={submitAnswer}
          onSubmitVote={submitVote}
          onSwitchPlayer={switchPlayer}
          leaderboard={getLeaderboard()}
          onPlayAgain={resetGame}
        />
      )}
    </div>
  );
}

export default App;
