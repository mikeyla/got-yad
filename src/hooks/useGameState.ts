import { useState, useCallback } from 'react';
import { GameState, Bid, GamePhase } from '../types/game';
import {
  createInitialState,
  rollDice,
  isValidBid,
  resolveChallenge,
  getOtherPlayer,
  formatBid,
} from '../utils/gameLogic';

export function useGameState() {
  const [state, setState] = useState<GameState>(createInitialState());
  const [isAnimating, setIsAnimating] = useState(false);

  const setPlayerNames = useCallback((name1: string, name2: string) => {
    setState(prev => ({
      ...prev,
      player1: { ...prev.player1, name: name1 || 'Player 1' },
      player2: { ...prev.player2, name: name2 || 'Player 2' },
    }));
  }, []);

  const startGame = useCallback(() => {
    setIsAnimating(true);
    setState(prev => ({
      ...prev,
      phase: 'rolling',
      lastAction: 'Rolling dice...',
    }));

    // Simulate dice rolling animation
    setTimeout(() => {
      const p1Dice = rollDice(state.dicePerPlayer);
      const p2Dice = rollDice(state.dicePerPlayer);

      setState(prev => ({
        ...prev,
        phase: 'bidding',
        player1: { ...prev.player1, dice: p1Dice, isCurrentTurn: true },
        player2: { ...prev.player2, dice: p2Dice, isCurrentTurn: false },
        currentBid: null,
        lastAction: `${prev.player1.name}'s turn to bid first!`,
      }));
      setIsAnimating(false);
    }, 1000);
  }, [state.dicePerPlayer]);

  const placeBid = useCallback((quantity: number, faceValue: number) => {
    const currentPlayer = state.player1.isCurrentTurn ? state.player1 : state.player2;
    const totalDice = state.dicePerPlayer * 2;

    const newBid: Bid = {
      quantity,
      faceValue,
      playerId: currentPlayer.id,
    };

    if (!isValidBid(newBid, state.currentBid, totalDice)) {
      return false;
    }

    setState(prev => {
      const nextPlayer = currentPlayer.id === 1 ? prev.player2 : prev.player1;
      return {
        ...prev,
        currentBid: newBid,
        player1: { ...prev.player1, isCurrentTurn: currentPlayer.id !== 1 },
        player2: { ...prev.player2, isCurrentTurn: currentPlayer.id !== 2 },
        lastAction: `${currentPlayer.name} bids: ${formatBid(newBid)}. ${nextPlayer.name}'s turn!`,
      };
    });

    return true;
  }, [state]);

  const callBluff = useCallback(() => {
    if (!state.currentBid) return;

    const challenger = state.player1.isCurrentTurn ? state.player1 : state.player2;
    const bidder = state.player1.isCurrentTurn ? state.player2 : state.player1;

    setState(prev => ({
      ...prev,
      phase: 'challenge',
      lastAction: `${challenger.name} calls "GOT YA!" on ${bidder.name}!`,
    }));

    // Show the challenge animation, then reveal
    setTimeout(() => {
      setState(prev => ({
        ...prev,
        phase: 'reveal',
      }));

      // After reveal, determine winner
      setTimeout(() => {
        const result = resolveChallenge(
          state.currentBid!,
          state.player1.dice,
          state.player2.dice,
          challenger.id
        );

        const roundWinner = result.winner;
        const winnerPlayer = roundWinner === 1 ? state.player1 : state.player2;
        const loserPlayer = roundWinner === 1 ? state.player2 : state.player1;

        const newScore = winnerPlayer.score + 1;
        const gameWon = newScore >= state.winningScore;

        const resultMessage = result.wasBluff
          ? `It was a bluff! Only ${result.actualCount} dice showed ${state.currentBid!.faceValue}. ${challenger.name} wins the round!`
          : `Not a bluff! ${result.actualCount} dice showed ${state.currentBid!.faceValue}. ${bidder.name} wins the round!`;

        setState(prev => ({
          ...prev,
          phase: gameWon ? 'gameEnd' : 'roundEnd',
          roundWinner,
          winner: gameWon ? roundWinner : null,
          player1: {
            ...prev.player1,
            score: roundWinner === 1 ? newScore : prev.player1.score,
          },
          player2: {
            ...prev.player2,
            score: roundWinner === 2 ? newScore : prev.player2.score,
          },
          lastAction: resultMessage,
        }));
      }, 2000);
    }, 1500);
  }, [state]);

  const startNewRound = useCallback(() => {
    setIsAnimating(true);
    setState(prev => ({
      ...prev,
      phase: 'rolling',
      roundNumber: prev.roundNumber + 1,
      currentBid: null,
      roundWinner: null,
      lastAction: 'Rolling dice for new round...',
    }));

    setTimeout(() => {
      const p1Dice = rollDice(state.dicePerPlayer);
      const p2Dice = rollDice(state.dicePerPlayer);

      // Loser of previous round goes first
      const loserGoesFirst = state.roundWinner === 2;

      setState(prev => ({
        ...prev,
        phase: 'bidding',
        player1: { ...prev.player1, dice: p1Dice, isCurrentTurn: loserGoesFirst },
        player2: { ...prev.player2, dice: p2Dice, isCurrentTurn: !loserGoesFirst },
        lastAction: `Round ${prev.roundNumber}! ${loserGoesFirst ? prev.player1.name : prev.player2.name}'s turn to bid first!`,
      }));
      setIsAnimating(false);
    }, 1000);
  }, [state.dicePerPlayer, state.roundWinner]);

  const resetGame = useCallback(() => {
    setState(prev => ({
      ...createInitialState(),
      player1: { ...createInitialState().player1, name: prev.player1.name },
      player2: { ...createInitialState().player2, name: prev.player2.name },
    }));
  }, []);

  const getCurrentPlayer = useCallback(() => {
    return state.player1.isCurrentTurn ? state.player1 : state.player2;
  }, [state.player1.isCurrentTurn]);

  const getWaitingPlayer = useCallback(() => {
    return state.player1.isCurrentTurn ? state.player2 : state.player1;
  }, [state.player1.isCurrentTurn]);

  return {
    state,
    isAnimating,
    setPlayerNames,
    startGame,
    placeBid,
    callBluff,
    startNewRound,
    resetGame,
    getCurrentPlayer,
    getWaitingPlayer,
  };
}
