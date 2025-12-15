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

  // Use refs to access latest state in timer callbacks
  const stateRef = useRef(state);
  stateRef.current = state;

  // Clear timer helper
  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Transition functions using setState with functional updates to avoid stale closure issues
  const transitionToVoting = useCallback(() => {
    clearTimer();
    setState(prev => ({
      ...prev,
      phase: 'voting',
      answers: shuffleArray(prev.answers),
      timeRemaining: GAME_CONFIG.VOTE_TIME,
      players: prev.players.map(p => ({ ...p, hasVoted: false, votedAnswerId: undefined })),
    }));
  }, [clearTimer]);

  const transitionToRevealing = useCallback(() => {
    clearTimer();
    setState(prev => {
      // Calculate scores based on current state
      const currentPlayer = prev.players.find(p => p.id === prev.currentPlayerId);
      const votedAnswer = prev.answers.find(a => a.id === currentPlayer?.votedAnswerId);

      let fooledBy: string | undefined;
      if (votedAnswer && !votedAnswer.isCorrect) {
        fooledBy = votedAnswer.playerNickname;
      }

      // Update scores
      const updatedPlayers = prev.players.map(player => {
        let newScore = player.score;

        // Check if player voted correctly
        const playerVotedAnswer = prev.answers.find(a => a.id === player.votedAnswerId);
        if (playerVotedAnswer?.isCorrect) {
          newScore += GAME_CONFIG.CORRECT_VOTE_POINTS;
        }

        // Check if player's fake answer fooled anyone
        const playerAnswer = prev.answers.find(a => a.playerId === player.id);
        if (playerAnswer && !playerAnswer.isCorrect) {
          newScore += playerAnswer.voteCount * GAME_CONFIG.FOOL_POINTS;
        }

        return { ...player, score: newScore };
      });

      return {
        ...prev,
        phase: 'revealing',
        timeRemaining: GAME_CONFIG.REVEAL_TIME,
        players: updatedPlayers,
        fooledBy,
      };
    });
  }, [clearTimer]);

  const transitionToNextRound = useCallback(() => {
    clearTimer();
    setState(prev => {
      const nextIndex = prev.currentQuestionIndex + 1;

      if (nextIndex >= prev.totalRounds) {
        // Game over
        return {
          ...prev,
          phase: 'finished',
          timeRemaining: 0,
        };
      } else {
        // Next round
        const correctAnswer: Answer = {
          id: generateId(),
          playerId: 'system',
          playerNickname: 'The Truth',
          text: prev.questions[nextIndex].correctAnswer,
          isCorrect: true,
          voteCount: 0,
          votedBy: [],
        };

        return {
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
        };
      }
    });
  }, [clearTimer]);

  // Timer effect with refs to get latest transition functions
  const transitionToVotingRef = useRef(transitionToVoting);
  const transitionToRevealingRef = useRef(transitionToRevealing);
  const transitionToNextRoundRef = useRef(transitionToNextRound);

  transitionToVotingRef.current = transitionToVoting;
  transitionToRevealingRef.current = transitionToRevealing;
  transitionToNextRoundRef.current = transitionToNextRound;

  useEffect(() => {
    const { timeRemaining, phase } = state;

    if (timeRemaining > 0 && (phase === 'submitting' || phase === 'voting' || phase === 'revealing')) {
      timerRef.current = window.setTimeout(() => {
        setState(prev => ({ ...prev, timeRemaining: prev.timeRemaining - 1 }));
      }, 1000);
    } else if (timeRemaining === 0 && phase !== 'home' && phase !== 'lobby' && phase !== 'finished') {
      // Use refs to call the latest transition function
      if (phase === 'submitting') {
        transitionToVotingRef.current();
      } else if (phase === 'voting') {
        transitionToRevealingRef.current();
      } else if (phase === 'revealing') {
        transitionToNextRoundRef.current();
      }
    }

    return clearTimer;
  }, [state.timeRemaining, state.phase, clearTimer]);

  const createGame = useCallback((hostNickname: string, preGeneratedCode?: string) => {
    const roomCode = preGeneratedCode || generateRoomCode();
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

  const joinGame = useCallback((nickname: string, roomCode?: string) => {
    setState(prev => {
      const newPlayer: Player = {
        id: generateId(),
        nickname: nickname || `Player ${prev.players.length + 1}`,
        avatarColor: getRandomColor(),
        score: 0,
        isHost: false,
        hasAnswered: false,
        hasVoted: false,
      };

      return {
        ...prev,
        // Set room code and phase if joining a new room
        ...(roomCode && prev.roomCode !== roomCode ? {
          phase: 'lobby' as const,
          roomCode,
        } : {}),
        players: [...prev.players, newPlayer],
        currentPlayerId: newPlayer.id,
      };
    });
  }, []);

  const startGame = useCallback(() => {
    setState(prev => {
      if (prev.players.length < GAME_CONFIG.MIN_PLAYERS) {
        return prev;
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

      return {
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
      };
    });
    return true;
  }, []);

  const submitAnswer = useCallback((playerId: string, answerText: string) => {
    let success = false;

    setState(prev => {
      const player = prev.players.find(p => p.id === playerId);
      if (!player || player.hasAnswered) return prev;

      success = true;

      const newAnswer: Answer = {
        id: generateId(),
        playerId,
        playerNickname: player.nickname,
        text: answerText.trim(),
        isCorrect: false,
        voteCount: 0,
        votedBy: [],
      };

      return {
        ...prev,
        answers: [...prev.answers, newAnswer],
        players: prev.players.map(p =>
          p.id === playerId
            ? { ...p, hasAnswered: true, currentAnswer: answerText }
            : p
        ),
      };
    });

    return success;
  }, []);

  const submitVote = useCallback((playerId: string, answerId: string) => {
    let success = false;

    setState(prev => {
      const player = prev.players.find(p => p.id === playerId);
      const answer = prev.answers.find(a => a.id === answerId);

      if (!player || player.hasVoted || !answer) return prev;

      // Can't vote for your own answer
      if (answer.playerId === playerId) return prev;

      success = true;

      return {
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
      };
    });

    return success;
  }, []);

  const resetGame = useCallback(() => {
    clearTimer();
    setState(createInitialState());
  }, [clearTimer]);

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
  const allPlayersAnswered = state.players.length > 0 && state.players.every(p => p.hasAnswered);
  const allPlayersVoted = state.players.length > 0 && state.players.every(p => p.hasVoted);

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
    allPlayersAnswered,
    allPlayersVoted,
  };
}
