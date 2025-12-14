import { useState } from 'react';
import type { GameState, Question, Answer, Player } from '../types/game';
import { GAME_CONFIG } from '../types/game';

interface GameScreenProps {
  state: GameState;
  currentQuestion: Question | undefined;
  currentPlayer: Player | undefined;
  onSubmitAnswer: (playerId: string, answer: string) => void;
  onSubmitVote: (playerId: string, answerId: string) => void;
  onSwitchPlayer: (playerId: string) => void;
  leaderboard: Player[];
  onPlayAgain: () => void;
}

export const GameScreen: React.FC<GameScreenProps> = ({
  state,
  currentQuestion,
  currentPlayer,
  onSubmitAnswer,
  onSubmitVote,
  onSwitchPlayer,
  leaderboard,
  onPlayAgain,
}) => {
  const [answerText, setAnswerText] = useState('');
  const [selectedAnswerId, setSelectedAnswerId] = useState<string | null>(null);

  const timerPercentage = state.phase === 'submitting'
    ? (state.timeRemaining / GAME_CONFIG.SUBMIT_TIME) * 100
    : state.phase === 'voting'
    ? (state.timeRemaining / GAME_CONFIG.VOTE_TIME) * 100
    : (state.timeRemaining / GAME_CONFIG.REVEAL_TIME) * 100;

  const handleSubmitAnswer = () => {
    if (currentPlayer && answerText.trim()) {
      onSubmitAnswer(currentPlayer.id, answerText.trim());
      setAnswerText('');
    }
  };

  const handleSubmitVote = () => {
    if (currentPlayer && selectedAnswerId) {
      onSubmitVote(currentPlayer.id, selectedAnswerId);
      setSelectedAnswerId(null);
    }
  };

  const getAnswerClass = (answer: Answer) => {
    if (state.phase === 'revealing') {
      if (answer.isCorrect) return 'correct';
      if (currentPlayer?.votedAnswerId === answer.id) return 'incorrect';
      return '';
    }
    if (state.phase === 'voting') {
      if (selectedAnswerId === answer.id) return 'selected';
    }
    return '';
  };

  const canVoteForAnswer = (answer: Answer) => {
    if (!currentPlayer) return false;
    if (currentPlayer.hasVoted) return false;
    // Can't vote for your own answer
    if (answer.playerId === currentPlayer.id) return false;
    return true;
  };

  return (
    <div className="min-h-screen flex flex-col p-4">
      {/* Header */}
      <header className="flex items-center justify-between mb-4">
        <div>
          <p className="arcade-font text-[10px] text-gray-400">
            ROUND {state.roundNumber}/{state.totalRounds}
          </p>
          {currentQuestion && (
            <p className="arcade-font text-[8px] text-cyan-400 mt-1">
              {currentQuestion.category.toUpperCase()}
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="arcade-font text-[8px] text-gray-400">SCORE</p>
          <p className="arcade-font text-lg text-yellow-400 score-display">
            {currentPlayer?.score || 0}
          </p>
        </div>
      </header>

      {/* Timer Bar */}
      <div className="w-full h-3 bg-black/50 border-2 border-white mb-6">
        <div
          className="timer-bar h-full"
          style={{ width: `${timerPercentage}%` }}
        />
      </div>

      {/* Player Selector (for local multiplayer) */}
      {state.phase !== 'revealing' && state.phase !== 'finished' && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {state.players.map(player => (
            <button
              key={player.id}
              onClick={() => onSwitchPlayer(player.id)}
              className={`flex items-center gap-2 px-3 py-2 border-2 transition-all flex-shrink-0 ${
                currentPlayer?.id === player.id
                  ? 'border-yellow-400 bg-yellow-400/20'
                  : 'border-white/20 bg-white/5 hover:bg-white/10'
              }`}
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ backgroundColor: player.avatarColor }}
              >
                {player.nickname.charAt(0)}
              </div>
              <span className="text-sm font-medium">{player.nickname}</span>
              {state.phase === 'submitting' && player.hasAnswered && (
                <span className="arcade-font text-[6px] text-green-400">✓</span>
              )}
              {state.phase === 'voting' && player.hasVoted && (
                <span className="arcade-font text-[6px] text-green-400">✓</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center">
        {/* Question Display */}
        {currentQuestion && state.phase !== 'finished' && (
          <div className="arcade-card w-full max-w-2xl mb-6">
            <p className="text-lg md:text-xl text-center font-medium">
              {currentQuestion.text}
            </p>
          </div>
        )}

        {/* Submitting Phase */}
        {state.phase === 'submitting' && currentPlayer && (
          <div className="w-full max-w-md">
            <h2 className="arcade-font text-xs text-center mb-4 text-yellow-400">
              WRITE YOUR ANSWER TO WIN!
            </h2>

            {currentPlayer.hasAnswered ? (
              <div className="text-center">
                <p className="arcade-font text-[10px] text-green-400 mb-2">
                  ✓ ANSWER SUBMITTED!
                </p>
                <p className="text-gray-400 text-sm">
                  Waiting for other players...
                </p>
                <div className="mt-4 arcade-card">
                  <p className="text-xs text-gray-400 mb-1">Your answer:</p>
                  <p className="font-medium">{currentPlayer.currentAnswer}</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <textarea
                  value={answerText}
                  onChange={(e) => setAnswerText(e.target.value)}
                  placeholder="Type your fake answer..."
                  maxLength={GAME_CONFIG.MAX_ANSWER_LENGTH}
                  className="w-full p-4 bg-black/30 border-4 border-white text-white
                           placeholder-gray-500 focus:outline-none focus:border-yellow-400
                           transition-colors resize-none h-24"
                  autoFocus
                />
                <p className="text-right text-xs text-gray-400">
                  {answerText.length}/{GAME_CONFIG.MAX_ANSWER_LENGTH}
                </p>
                <button
                  onClick={handleSubmitAnswer}
                  disabled={!answerText.trim()}
                  className={`arcade-btn arcade-btn-yellow w-full ${
                    !answerText.trim() ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  SUBMIT
                </button>
              </div>
            )}

            <p className="arcade-font text-[8px] text-center text-gray-500 mt-4">
              {state.timeRemaining}s REMAINING
            </p>
          </div>
        )}

        {/* Voting Phase */}
        {state.phase === 'voting' && currentPlayer && (
          <div className="w-full max-w-md">
            <h2 className="arcade-font text-xs text-center mb-4 text-cyan-400">
              PICK THE REAL ANSWER!
            </h2>

            {currentPlayer.hasVoted ? (
              <div className="text-center">
                <p className="arcade-font text-[10px] text-green-400 mb-2">
                  ✓ VOTE SUBMITTED!
                </p>
                <p className="text-gray-400 text-sm">
                  Waiting for other players...
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {state.answers.map((answer, index) => {
                  const canVote = canVoteForAnswer(answer);
                  const isOwn = answer.playerId === currentPlayer.id;

                  return (
                    <button
                      key={answer.id}
                      onClick={() => canVote && setSelectedAnswerId(answer.id)}
                      disabled={!canVote}
                      className={`answer-option ${getAnswerClass(answer)} ${
                        !canVote ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="arcade-font text-sm text-yellow-400">
                          {String.fromCharCode(65 + index)}
                        </span>
                        <span className="flex-1">{answer.text}</span>
                        {isOwn && (
                          <span className="arcade-font text-[6px] text-gray-500">
                            (YOUR ANSWER)
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}

                <button
                  onClick={handleSubmitVote}
                  disabled={!selectedAnswerId}
                  className={`arcade-btn arcade-btn-blue w-full mt-4 ${
                    !selectedAnswerId ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  VOTE
                </button>
              </div>
            )}

            <p className="arcade-font text-[8px] text-center text-gray-500 mt-4">
              {state.timeRemaining}s REMAINING
            </p>
          </div>
        )}

        {/* Revealing Phase */}
        {state.phase === 'revealing' && (
          <div className="w-full max-w-md">
            {/* Got Ya! Animation */}
            {state.fooledBy && (
              <div className="text-center mb-6 bounce-in">
                <h2 className="arcade-font text-2xl text-red-500 glow-text mb-2">
                  GOT YA!
                </h2>
                <p className="arcade-font text-[10px] text-yellow-400">
                  {state.fooledBy} fooled you!
                </p>
              </div>
            )}

            <h2 className="arcade-font text-xs text-center mb-4 text-green-400">
              THE CORRECT ANSWER IS...
            </h2>

            <div className="space-y-3">
              {state.answers.map((answer, index) => (
                <div
                  key={answer.id}
                  className={`answer-option ${getAnswerClass(answer)}`}
                >
                  <div className="flex items-start gap-3">
                    <span className="arcade-font text-sm text-yellow-400">
                      {String.fromCharCode(65 + index)}
                    </span>
                    <div className="flex-1">
                      <p>{answer.text}</p>
                      {answer.isCorrect && (
                        <p className="arcade-font text-[8px] text-green-400 mt-1">
                          ✓ CORRECT ANSWER
                        </p>
                      )}
                      {!answer.isCorrect && answer.voteCount > 0 && (
                        <p className="arcade-font text-[8px] text-red-400 mt-1">
                          {answer.voteCount} {answer.voteCount === 1 ? 'vote' : 'votes'} •
                          +{answer.voteCount * GAME_CONFIG.FOOL_POINTS} pts to {answer.playerNickname}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <p className="arcade-font text-[8px] text-center text-gray-500 mt-4">
              NEXT ROUND IN {state.timeRemaining}s
            </p>
          </div>
        )}

        {/* Finished Phase - Leaderboard */}
        {state.phase === 'finished' && (
          <div className="w-full max-w-md text-center">
            <h2 className="arcade-font text-2xl text-yellow-400 glow-text mb-2">
              GAME OVER!
            </h2>
            <p className="arcade-font text-[10px] text-gray-400 mb-6">
              LEADERBOARD
            </p>

            <div className="space-y-3 mb-8">
              {leaderboard.map((player, index) => (
                <div
                  key={player.id}
                  className={`flex items-center gap-3 p-4 border-4 ${
                    index === 0
                      ? 'border-yellow-400 bg-yellow-400/20'
                      : index === 1
                      ? 'border-gray-300 bg-gray-300/10'
                      : index === 2
                      ? 'border-orange-600 bg-orange-600/10'
                      : 'border-white/20 bg-white/5'
                  }`}
                >
                  <span className="arcade-font text-lg w-8">
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}
                  </span>
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold"
                    style={{ backgroundColor: player.avatarColor }}
                  >
                    {player.nickname.charAt(0)}
                  </div>
                  <span className="flex-1 text-left font-bold">{player.nickname}</span>
                  <span className="arcade-font text-lg text-yellow-400 score-display">
                    {player.score}
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={onPlayAgain}
              className="arcade-btn arcade-btn-yellow w-full"
            >
              PLAY AGAIN
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
