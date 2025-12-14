import { useState, useCallback, useEffect, useRef } from 'react';
import type { GameState, Player, Answer } from '../types/game';
import {
  GAME_CONFIG,
  generateRoomCode,
  generateId,
  getRandomColor,
  shuffleArray,
} from '../types/game';
import { getRandomQuestions } from '../data/questions';

const createInitialState = (): GameState => ({
  phase: 'home',
  roomCode: '',
  players: [],
  currentPlayerId: '',
  questions: [],
  currentQuestionIndex: 0,
  answers: [],
  timeRemaining: 0,
  roundNumber: 1,
  totalRounds: GAME_CONFIG.TOTAL_ROUNDS,
  fooledBy: undefined,
});

export function useGameState() {
  const [state, setState] = useState<GameState>(createInitialState());
  const timerRef = useRef<number | null>(null);

  // Timer effect
  useEffect(() => {
    if (state.timeRemaining > 0 && (state.phase === 'submitting' || state.phase === 'voting' || state.phase === 'revealing')) {
      timerRef.current = window.setTimeout(() => {
        setState(prev => ({ ...prev, timeRemaining: prev.timeRemaining - 1 }));
      }, 1000);
    } else if (state.timeRemaining === 0) {
      // Handle phase transitions
      if (state.phase === 'submitting') {
        transitionToVoting();
      } else if (state.phase === 'voting') {
        transitionToRevealing();
      } else if (state.phase === 'revealing') {
        transitionToNextRound();
      }
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [state.timeRemaining, state.phase]);

  const createGame = useCallback((hostNickname: string) => {
    const roomCode = generateRoomCode();
    const hostPlayer: Player = {
      id: generateId(),
      nickname: hostNickname || 'Player 1',
      avatarColor: getRandomColor(),
      score: 0,
      isHost: true,
      hasAnswered: false,
      hasVoted: false,
    };

    setState(prev => ({
      ...prev,
      phase: 'lobby',
      roomCode,
      players: [hostPlayer],
      currentPlayerId: hostPlayer.id,
    }));

    return roomCode;
  }, []);

  const joinGame = useCallback((nickname: string) => {
    const newPlayer: Player = {
      id: generateId(),
      nickname: nickname || `Player ${state.players.length + 1}`,
      avatarColor: getRandomColor(),
      score: 0,
      isHost: false,
      hasAnswered: false,
      hasVoted: false,
    };

    setState(prev => ({
      ...prev,
      players: [...prev.players, newPlayer],
      currentPlayerId: newPlayer.id,
    }));

    return newPlayer.id;
  }, [state.players.length]);

  const startGame = useCallback(() => {
    if (state.players.length < GAME_CONFIG.MIN_PLAYERS) {
      return false;
    }

    const questions = getRandomQuestions(GAME_CONFIG.TOTAL_ROUNDS);

    // Add the correct answer as the first answer
    const correctAnswer: Answer = {
      id: generateId(),
      playerId: 'system',
      playerNickname: 'The Truth',
      text: questions[0].correctAnswer,
      isCorrect: true,
      voteCount: 0,
      votedBy: [],
    };

    setState(prev => ({
      ...prev,
      phase: 'submitting',
      questions,
      currentQuestionIndex: 0,
      roundNumber: 1,
      answers: [correctAnswer],
      timeRemaining: GAME_CONFIG.SUBMIT_TIME,
      players: prev.players.map(p => ({
        ...p,
        hasAnswered: false,
        hasVoted: false,
        currentAnswer: undefined,
        votedAnswerId: undefined,
      })),
    }));

    return true;
  }, [state.players.length]);

  const submitAnswer = useCallback((playerId: string, answerText: string) => {
    const player = state.players.find(p => p.id === playerId);
    if (!player || player.hasAnswered) return false;

    const newAnswer: Answer = {
      id: generateId(),
      playerId,
      playerNickname: player.nickname,
      text: answerText.trim(),
      isCorrect: false,
      voteCount: 0,
      votedBy: [],
    };

    setState(prev => ({
      ...prev,
      answers: [...prev.answers, newAnswer],
      players: prev.players.map(p =>
        p.id === playerId
          ? { ...p, hasAnswered: true, currentAnswer: answerText }
          : p
      ),
    }));

    return true;
  }, [state.players]);

  const transitionToVoting = useCallback(() => {
    // Shuffle answers so correct answer isn't always first
    setState(prev => ({
      ...prev,
      phase: 'voting',
      answers: shuffleArray(prev.answers),
      timeRemaining: GAME_CONFIG.VOTE_TIME,
      players: prev.players.map(p => ({ ...p, hasVoted: false, votedAnswerId: undefined })),
    }));
  }, []);

  const submitVote = useCallback((playerId: string, answerId: string) => {
    const player = state.players.find(p => p.id === playerId);
    const answer = state.answers.find(a => a.id === answerId);

    if (!player || player.hasVoted || !answer) return false;

    // Can't vote for your own answer
    if (answer.playerId === playerId) return false;

    setState(prev => ({
      ...prev,
      answers: prev.answers.map(a =>
        a.id === answerId
          ? { ...a, voteCount: a.voteCount + 1, votedBy: [...a.votedBy, playerId] }
          : a
      ),
      players: prev.players.map(p =>
        p.id === playerId
          ? { ...p, hasVoted: true, votedAnswerId: answerId }
          : p
      ),
    }));

    return true;
  }, [state.players, state.answers]);

  const transitionToRevealing = useCallback(() => {
    // Calculate scores
    const currentPlayer = state.players.find(p => p.id === state.currentPlayerId);
    const votedAnswer = state.answers.find(a => a.id === currentPlayer?.votedAnswerId);

    let fooledBy: string | undefined;
    if (votedAnswer && !votedAnswer.isCorrect) {
      fooledBy = votedAnswer.playerNickname;
    }

    // Update scores
    const updatedPlayers = state.players.map(player => {
      let newScore = player.score;

      // Check if player voted correctly
      const playerVotedAnswer = state.answers.find(a => a.id === player.votedAnswerId);
      if (playerVotedAnswer?.isCorrect) {
        newScore += GAME_CONFIG.CORRECT_VOTE_POINTS;
      }

      // Check if player's fake answer fooled anyone
      const playerAnswer = state.answers.find(a => a.playerId === player.id);
      if (playerAnswer && !playerAnswer.isCorrect) {
        newScore += playerAnswer.voteCount * GAME_CONFIG.FOOL_POINTS;
      }

      return { ...player, score: newScore };
    });

    setState(prev => ({
      ...prev,
      phase: 'revealing',
      timeRemaining: GAME_CONFIG.REVEAL_TIME,
      players: updatedPlayers,
      fooledBy,
    }));
  }, [state.players, state.answers, state.currentPlayerId]);

  const transitionToNextRound = useCallback(() => {
    const nextIndex = state.currentQuestionIndex + 1;

    if (nextIndex >= state.totalRounds) {
      // Game over
      setState(prev => ({
        ...prev,
        phase: 'finished',
        timeRemaining: 0,
      }));
    } else {
      // Next round
      const correctAnswer: Answer = {
        id: generateId(),
        playerId: 'system',
        playerNickname: 'The Truth',
        text: state.questions[nextIndex].correctAnswer,
        isCorrect: true,
        voteCount: 0,
        votedBy: [],
      };

      setState(prev => ({
        ...prev,
        phase: 'submitting',
        currentQuestionIndex: nextIndex,
        roundNumber: nextIndex + 1,
        answers: [correctAnswer],
        timeRemaining: GAME_CONFIG.SUBMIT_TIME,
        fooledBy: undefined,
        players: prev.players.map(p => ({
          ...p,
          hasAnswered: false,
          hasVoted: false,
          currentAnswer: undefined,
          votedAnswerId: undefined,
        })),
      }));
    }
  }, [state.currentQuestionIndex, state.totalRounds, state.questions]);

  const resetGame = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    setState(createInitialState());
  }, []);

  const getCurrentQuestion = useCallback(() => {
    return state.questions[state.currentQuestionIndex];
  }, [state.questions, state.currentQuestionIndex]);

  const getCurrentPlayer = useCallback(() => {
    return state.players.find(p => p.id === state.currentPlayerId);
  }, [state.players, state.currentPlayerId]);

  const getLeaderboard = useCallback(() => {
    return [...state.players].sort((a, b) => b.score - a.score);
  }, [state.players]);

  // For local two-player mode: switch active player
  const switchPlayer = useCallback((playerId: string) => {
    setState(prev => ({ ...prev, currentPlayerId: playerId }));
  }, []);

  // Check if all players have completed current action
  const allPlayersAnswered = state.players.every(p => p.hasAnswered);
  const allPlayersVoted = state.players.every(p => p.hasVoted);

  // Auto-advance when all players are done
  useEffect(() => {
    if (state.phase === 'submitting' && allPlayersAnswered && state.timeRemaining > 0) {
      transitionToVoting();
    }
  }, [allPlayersAnswered, state.phase, state.timeRemaining, transitionToVoting]);

  useEffect(() => {
    if (state.phase === 'voting' && allPlayersVoted && state.timeRemaining > 0) {
      transitionToRevealing();
    }
  }, [allPlayersVoted, state.phase, state.timeRemaining, transitionToRevealing]);

  return {
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
    allPlayersAnswered,
    allPlayersVoted,
  };
}
