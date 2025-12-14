import { useGameState } from './hooks/useGameState';
import { HomeScreen } from './components/HomeScreen';
import { LobbyScreen } from './components/LobbyScreen';
import { GameScreen } from './components/GameScreen';
import './index.css';

function App() {
  const {
    state,
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

  const handleCreateGame = (nickname: string) => {
    createGame(nickname);
  };

  const handleJoinGame = (nickname: string, _code: string) => {
    // For local testing, just add a player to the existing game
    // In a real app, this would connect to a server
    joinGame(nickname);
  };

  const handleAddPlayer = (nickname: string) => {
    joinGame(nickname);
  };

  return (
    <div className="min-h-screen relative">
      {/* Scanline overlay for arcade effect */}
      <div className="scanlines fixed inset-0 pointer-events-none z-50" />

      {state.phase === 'home' && (
        <HomeScreen
          onCreateGame={handleCreateGame}
          onJoinGame={handleJoinGame}
        />
      )}

      {state.phase === 'lobby' && (
        <LobbyScreen
          roomCode={state.roomCode}
          players={state.players}
          currentPlayerId={state.currentPlayerId}
          onStartGame={startGame}
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
