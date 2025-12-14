import { useEffect, useState, useCallback, useRef } from 'react';
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
  const [joinError, setJoinError] = useState<string | null>(null);
  const lastBroadcastRef = useRef<string>('');

  // Handle state updates from sync (other tabs/browsers)
  const handleStateUpdate = useCallback((newState: GameState) => {
    setState(newState);
  }, [setState]);

  // Initialize sync with correct API
  const sync = useGameSync(
    state.roomCode,
    isHost,
    handleStateUpdate
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

  // Broadcast state updates when host makes changes (with deduplication)
  useEffect(() => {
    if (isHost && state.roomCode) {
      const stateJson = JSON.stringify(state);
      if (stateJson !== lastBroadcastRef.current) {
        lastBroadcastRef.current = stateJson;
        sync.broadcastState(state);
      }
    }
  }, [isHost, state, sync.broadcastState]);

  const handleCreateGame = (nickname: string) => {
    const code = createGame(nickname);
    setIsHost(true);
    return code;
  };

  const handleJoinGame = useCallback((nickname: string, code: string) => {
    // Clear any previous errors
    setJoinError(null);

    // Try to join existing room via sync
    setIsHost(false);

    // First check if room exists in storage
    const existingState = sync.loadState();
    if (existingState && existingState.roomCode === code) {
      // Room exists - add ourselves as a player
      const player = sync.requestJoin(nickname);
      if (player) {
        // Successfully added - now load the full state
        const updatedState = sync.loadState();
        if (updatedState) {
          setState({ ...updatedState, currentPlayerId: player.id });
        }
      } else {
        setJoinError('Failed to join room. Please try again.');
      }
    } else {
      // Room doesn't exist - show error
      setJoinError('Room not found! Check the code and try again.');
    }
  }, [sync, setState]);

  const handleAddPlayer = (nickname: string) => {
    joinGame(nickname);
  };

  const handleStartGame = () => {
    startGame();
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
          externalError={joinError || undefined}
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
          syncStatus={{
            connected: sync.connected,
            mode: sync.syncMode,
          }}
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
          isOnlineMode={sync.syncMode === 'supabase'}
        />
      )}
    </div>
  );
}

export default App;
