/**
 * Automated gameplay testing script
 * Run with: npx tsx src/test-gameplay.ts
 */

import {
  GAME_CONFIG,
  generateRoomCode,
  generateId,
  getRandomColor,
  shuffleArray,
} from './types/game';
import type { GameState, Player, Answer, Question } from './types/game';

// Simple question set for testing
const TEST_QUESTIONS: Question[] = [
  { id: '1', text: 'What is 2+2?', correctAnswer: '4', category: 'Math' },
  { id: '2', text: 'Capital of France?', correctAnswer: 'Paris', category: 'Geography' },
  { id: '3', text: 'Largest planet?', correctAnswer: 'Jupiter', category: 'Science' },
  { id: '4', text: 'Year WW2 ended?', correctAnswer: '1945', category: 'History' },
  { id: '5', text: 'H2O is?', correctAnswer: 'Water', category: 'Science' },
];

// Game state simulator
class GameSimulator {
  state: GameState;
  logs: string[] = [];

  constructor() {
    this.state = this.createInitialState();
  }

  log(msg: string) {
    this.logs.push(msg);
    console.log(msg);
  }

  createInitialState(): GameState {
    return {
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
    };
  }

  createGame(nickname: string): string {
    const roomCode = generateRoomCode();
    const hostPlayer: Player = {
      id: generateId(),
      nickname,
      avatarColor: getRandomColor(),
      score: 0,
      isHost: true,
      hasAnswered: false,
      hasVoted: false,
    };

    this.state = {
      ...this.state,
      phase: 'lobby',
      roomCode,
      players: [hostPlayer],
      currentPlayerId: hostPlayer.id,
    };

    this.log(`✓ Created game with code: ${roomCode}, host: ${nickname}`);
    return roomCode;
  }

  joinGame(nickname: string): string {
    const newPlayer: Player = {
      id: generateId(),
      nickname,
      avatarColor: getRandomColor(),
      score: 0,
      isHost: false,
      hasAnswered: false,
      hasVoted: false,
    };

    this.state = {
      ...this.state,
      players: [...this.state.players, newPlayer],
    };

    this.log(`✓ ${nickname} joined the game (${this.state.players.length} players)`);
    return newPlayer.id;
  }

  startGame(): boolean {
    if (this.state.players.length < GAME_CONFIG.MIN_PLAYERS) {
      this.log(`✗ Cannot start: need ${GAME_CONFIG.MIN_PLAYERS} players, have ${this.state.players.length}`);
      return false;
    }

    const questions = TEST_QUESTIONS.slice(0, GAME_CONFIG.TOTAL_ROUNDS);

    const correctAnswer: Answer = {
      id: generateId(),
      playerId: 'system',
      playerNickname: 'The Truth',
      text: questions[0].correctAnswer,
      isCorrect: true,
      voteCount: 0,
      votedBy: [],
    };

    this.state = {
      ...this.state,
      phase: 'submitting',
      questions,
      currentQuestionIndex: 0,
      roundNumber: 1,
      answers: [correctAnswer],
      timeRemaining: GAME_CONFIG.SUBMIT_TIME,
      players: this.state.players.map(p => ({
        ...p,
        hasAnswered: false,
        hasVoted: false,
        currentAnswer: undefined,
        votedAnswerId: undefined,
      })),
    };

    this.log(`✓ Game started! Round 1/${GAME_CONFIG.TOTAL_ROUNDS}`);
    this.log(`  Question: ${questions[0].text}`);
    return true;
  }

  submitAnswer(playerId: string, answerText: string): boolean {
    const player = this.state.players.find(p => p.id === playerId);
    if (!player) {
      this.log(`✗ Player ${playerId} not found`);
      return false;
    }
    if (player.hasAnswered) {
      this.log(`✗ ${player.nickname} already answered`);
      return false;
    }

    const newAnswer: Answer = {
      id: generateId(),
      playerId,
      playerNickname: player.nickname,
      text: answerText,
      isCorrect: false,
      voteCount: 0,
      votedBy: [],
    };

    this.state = {
      ...this.state,
      answers: [...this.state.answers, newAnswer],
      players: this.state.players.map(p =>
        p.id === playerId
          ? { ...p, hasAnswered: true, currentAnswer: answerText }
          : p
      ),
    };

    this.log(`✓ ${player.nickname} submitted: "${answerText}"`);
    return true;
  }

  transitionToVoting() {
    this.state = {
      ...this.state,
      phase: 'voting',
      answers: shuffleArray(this.state.answers),
      timeRemaining: GAME_CONFIG.VOTE_TIME,
      players: this.state.players.map(p => ({ ...p, hasVoted: false, votedAnswerId: undefined })),
    };
    this.log(`→ Transitioned to VOTING phase`);
    this.log(`  Answers (shuffled):`);
    this.state.answers.forEach((a, i) => {
      this.log(`    ${String.fromCharCode(65 + i)}. "${a.text}" ${a.isCorrect ? '(CORRECT)' : `(by ${a.playerNickname})`}`);
    });
  }

  submitVote(playerId: string, answerId: string): boolean {
    const player = this.state.players.find(p => p.id === playerId);
    const answer = this.state.answers.find(a => a.id === answerId);

    if (!player) {
      this.log(`✗ Player ${playerId} not found`);
      return false;
    }
    if (!answer) {
      this.log(`✗ Answer ${answerId} not found`);
      return false;
    }
    if (player.hasVoted) {
      this.log(`✗ ${player.nickname} already voted`);
      return false;
    }
    if (answer.playerId === playerId) {
      this.log(`✗ ${player.nickname} tried to vote for their own answer!`);
      return false;
    }

    this.state = {
      ...this.state,
      answers: this.state.answers.map(a =>
        a.id === answerId
          ? { ...a, voteCount: a.voteCount + 1, votedBy: [...a.votedBy, playerId] }
          : a
      ),
      players: this.state.players.map(p =>
        p.id === playerId
          ? { ...p, hasVoted: true, votedAnswerId: answerId }
          : p
      ),
    };

    this.log(`✓ ${player.nickname} voted for: "${answer.text}"`);
    return true;
  }

  transitionToRevealing() {
    // Calculate scores
    const updatedPlayers = this.state.players.map(player => {
      let newScore = player.score;

      // Check if player voted correctly
      const playerVotedAnswer = this.state.answers.find(a => a.id === player.votedAnswerId);
      if (playerVotedAnswer?.isCorrect) {
        newScore += GAME_CONFIG.CORRECT_VOTE_POINTS;
        this.log(`  ${player.nickname} voted correctly! +${GAME_CONFIG.CORRECT_VOTE_POINTS}`);
      }

      // Check if player's fake answer fooled anyone
      const playerAnswer = this.state.answers.find(a => a.playerId === player.id);
      if (playerAnswer && !playerAnswer.isCorrect && playerAnswer.voteCount > 0) {
        const foolPoints = playerAnswer.voteCount * GAME_CONFIG.FOOL_POINTS;
        newScore += foolPoints;
        this.log(`  ${player.nickname} fooled ${playerAnswer.voteCount} player(s)! +${foolPoints}`);
      }

      return { ...player, score: newScore };
    });

    this.state = {
      ...this.state,
      phase: 'revealing',
      timeRemaining: GAME_CONFIG.REVEAL_TIME,
      players: updatedPlayers,
    };

    this.log(`→ Transitioned to REVEALING phase`);
    this.log(`  Correct answer: "${this.state.questions[this.state.currentQuestionIndex].correctAnswer}"`);
  }

  transitionToNextRound() {
    const nextIndex = this.state.currentQuestionIndex + 1;

    if (nextIndex >= this.state.totalRounds) {
      this.state = {
        ...this.state,
        phase: 'finished',
        timeRemaining: 0,
      };
      this.log(`→ GAME OVER!`);
      this.log(`  Final scores:`);
      const sorted = [...this.state.players].sort((a, b) => b.score - a.score);
      sorted.forEach((p, i) => {
        this.log(`    ${i + 1}. ${p.nickname}: ${p.score} points`);
      });
      return;
    }

    const correctAnswer: Answer = {
      id: generateId(),
      playerId: 'system',
      playerNickname: 'The Truth',
      text: this.state.questions[nextIndex].correctAnswer,
      isCorrect: true,
      voteCount: 0,
      votedBy: [],
    };

    this.state = {
      ...this.state,
      phase: 'submitting',
      currentQuestionIndex: nextIndex,
      roundNumber: nextIndex + 1,
      answers: [correctAnswer],
      timeRemaining: GAME_CONFIG.SUBMIT_TIME,
      fooledBy: undefined,
      players: this.state.players.map(p => ({
        ...p,
        hasAnswered: false,
        hasVoted: false,
        currentAnswer: undefined,
        votedAnswerId: undefined,
      })),
    };

    this.log(`→ Round ${nextIndex + 1}/${this.state.totalRounds}`);
    this.log(`  Question: ${this.state.questions[nextIndex].text}`);
  }

  // Check all players have answered
  allPlayersAnswered(): boolean {
    return this.state.players.every(p => p.hasAnswered);
  }

  // Check all players have voted
  allPlayersVoted(): boolean {
    return this.state.players.every(p => p.hasVoted);
  }
}

// Test scenarios
async function runTest(testNum: number, scenario: string) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`TEST ${testNum}: ${scenario}`);
  console.log('='.repeat(60));

  const game = new GameSimulator();
  const errors: string[] = [];

  try {
    // Vary the test based on scenario
    switch (scenario) {
      case 'basic_2_players':
        await test_basic_2_players(game);
        break;
      case 'basic_3_players':
        await test_basic_3_players(game);
        break;
      case 'player_tries_own_vote':
        await test_player_tries_own_vote(game);
        break;
      case 'duplicate_answer':
        await test_duplicate_answer(game);
        break;
      case 'empty_answer':
        await test_empty_answer(game);
        break;
      case 'all_vote_correct':
        await test_all_vote_correct(game);
        break;
      case 'all_fooled':
        await test_all_fooled(game);
        break;
      case 'mixed_voting':
        await test_mixed_voting(game);
        break;
      case 'late_join_attempt':
        await test_late_join_attempt(game);
        break;
      case 'full_5_rounds':
        await test_full_5_rounds(game);
        break;
      default:
        errors.push(`Unknown scenario: ${scenario}`);
    }

    console.log(`\n✓ TEST ${testNum} PASSED`);
  } catch (err) {
    console.log(`\n✗ TEST ${testNum} FAILED: ${err}`);
    errors.push(String(err));
  }

  return errors;
}

// Test: Basic 2 player game
async function test_basic_2_players(game: GameSimulator) {
  game.createGame('Alice');
  const bobId = game.joinGame('Bob');

  if (!game.startGame()) throw new Error('Failed to start game');

  // Submit answers
  const aliceId = game.state.players[0].id;
  game.submitAnswer(aliceId, 'Five');
  game.submitAnswer(bobId, 'Three');

  if (!game.allPlayersAnswered()) throw new Error('Not all players answered');

  game.transitionToVoting();

  // Find correct answer and vote
  const correctAnswer = game.state.answers.find(a => a.isCorrect);
  const aliceAnswer = game.state.answers.find(a => a.playerId === aliceId);

  if (!correctAnswer || !aliceAnswer) throw new Error('Answers not found');

  // Alice votes for correct, Bob votes for Alice's fake
  game.submitVote(aliceId, correctAnswer.id);
  game.submitVote(bobId, aliceAnswer.id);

  if (!game.allPlayersVoted()) throw new Error('Not all players voted');

  game.transitionToRevealing();

  // Check scores
  const alice = game.state.players.find(p => p.nickname === 'Alice');
  const bob = game.state.players.find(p => p.nickname === 'Bob');

  if (!alice || !bob) throw new Error('Players not found');

  // Alice should have 1 (correct vote) + 500 (fooled Bob) = 501
  if (alice.score !== 501) throw new Error(`Alice score wrong: ${alice.score}, expected 501`);
  // Bob should have 0
  if (bob.score !== 0) throw new Error(`Bob score wrong: ${bob.score}, expected 0`);
}

// Test: 3 player game
async function test_basic_3_players(game: GameSimulator) {
  game.createGame('Alice');
  const bobId = game.joinGame('Bob');
  const charlieId = game.joinGame('Charlie');

  if (!game.startGame()) throw new Error('Failed to start game');

  const aliceId = game.state.players[0].id;

  game.submitAnswer(aliceId, 'Five');
  game.submitAnswer(bobId, 'Three');
  game.submitAnswer(charlieId, 'Six');

  game.transitionToVoting();

  const correctAnswer = game.state.answers.find(a => a.isCorrect);
  const bobAnswer = game.state.answers.find(a => a.playerId === bobId);

  if (!correctAnswer || !bobAnswer) throw new Error('Answers not found');

  // Alice and Charlie vote correct, Bob votes for his own (should fail)
  game.submitVote(aliceId, correctAnswer.id);
  const bobSelfVote = game.submitVote(bobId, bobAnswer.id);
  if (bobSelfVote) throw new Error('Bob should not be able to vote for himself');

  // Bob votes for correct instead
  game.submitVote(bobId, correctAnswer.id);
  game.submitVote(charlieId, correctAnswer.id);

  game.transitionToRevealing();

  // All should have 1 point each
  game.state.players.forEach(p => {
    if (p.score !== 1) throw new Error(`${p.nickname} score wrong: ${p.score}, expected 1`);
  });
}

// Test: Player tries to vote for own answer
async function test_player_tries_own_vote(game: GameSimulator) {
  game.createGame('Alice');
  game.joinGame('Bob');
  game.startGame();

  const aliceId = game.state.players[0].id;
  const bobId = game.state.players[1].id;

  game.submitAnswer(aliceId, 'My Answer');
  game.submitAnswer(bobId, 'Bob Answer');

  game.transitionToVoting();

  const aliceAnswer = game.state.answers.find(a => a.playerId === aliceId);
  if (!aliceAnswer) throw new Error('Alice answer not found');

  const result = game.submitVote(aliceId, aliceAnswer.id);
  if (result) throw new Error('Should not allow voting for own answer');
}

// Test: Duplicate answers (same text)
async function test_duplicate_answer(game: GameSimulator) {
  game.createGame('Alice');
  game.joinGame('Bob');
  game.startGame();

  const aliceId = game.state.players[0].id;
  const bobId = game.state.players[1].id;

  // Both submit same fake answer
  game.submitAnswer(aliceId, 'Same Answer');
  game.submitAnswer(bobId, 'Same Answer');

  // Should have 3 answers (correct + 2 fakes)
  if (game.state.answers.length !== 3) {
    throw new Error(`Expected 3 answers, got ${game.state.answers.length}`);
  }

  game.transitionToVoting();

  // Voting should still work
  const correctAnswer = game.state.answers.find(a => a.isCorrect);
  if (!correctAnswer) throw new Error('Correct answer not found');

  game.submitVote(aliceId, correctAnswer.id);
  game.submitVote(bobId, correctAnswer.id);
}

// Test: Empty answer handling
async function test_empty_answer(game: GameSimulator) {
  game.createGame('Alice');
  game.joinGame('Bob');
  game.startGame();

  const aliceId = game.state.players[0].id;
  const bobId = game.state.players[1].id;

  // Submit empty and whitespace answers
  game.submitAnswer(aliceId, '   ');
  game.submitAnswer(bobId, 'Valid');

  // Both should be counted as answered (the UI should validate, but state accepts)
  if (!game.state.players[0].hasAnswered) {
    throw new Error('Alice should be marked as answered');
  }
}

// Test: All players vote correctly
async function test_all_vote_correct(game: GameSimulator) {
  game.createGame('Alice');
  game.joinGame('Bob');
  game.startGame();

  const aliceId = game.state.players[0].id;
  const bobId = game.state.players[1].id;

  game.submitAnswer(aliceId, 'Fake A');
  game.submitAnswer(bobId, 'Fake B');

  game.transitionToVoting();

  const correctAnswer = game.state.answers.find(a => a.isCorrect);
  if (!correctAnswer) throw new Error('Correct answer not found');

  game.submitVote(aliceId, correctAnswer.id);
  game.submitVote(bobId, correctAnswer.id);

  game.transitionToRevealing();

  // Both should have 1 point
  if (game.state.players[0].score !== 1 || game.state.players[1].score !== 1) {
    throw new Error('Both players should have 1 point');
  }
}

// Test: All players get fooled
async function test_all_fooled(game: GameSimulator) {
  game.createGame('Alice');
  game.joinGame('Bob');
  game.startGame();

  const aliceId = game.state.players[0].id;
  const bobId = game.state.players[1].id;

  game.submitAnswer(aliceId, 'Fake A');
  game.submitAnswer(bobId, 'Fake B');

  game.transitionToVoting();

  const aliceAnswer = game.state.answers.find(a => a.playerId === aliceId);
  const bobAnswer = game.state.answers.find(a => a.playerId === bobId);

  if (!aliceAnswer || !bobAnswer) throw new Error('Answers not found');

  // Alice votes for Bob's fake, Bob votes for Alice's fake
  game.submitVote(aliceId, bobAnswer.id);
  game.submitVote(bobId, aliceAnswer.id);

  game.transitionToRevealing();

  // Each fooled 1 person = 500 points each
  if (game.state.players[0].score !== 500 || game.state.players[1].score !== 500) {
    throw new Error(`Expected both to have 500, got Alice: ${game.state.players[0].score}, Bob: ${game.state.players[1].score}`);
  }
}

// Test: Mixed voting patterns
async function test_mixed_voting(game: GameSimulator) {
  game.createGame('Alice');
  const bobId = game.joinGame('Bob');
  const charlieId = game.joinGame('Charlie');
  game.startGame();

  const aliceId = game.state.players[0].id;

  game.submitAnswer(aliceId, 'Fake A');
  game.submitAnswer(bobId, 'Fake B');
  game.submitAnswer(charlieId, 'Fake C');

  game.transitionToVoting();

  const correctAnswer = game.state.answers.find(a => a.isCorrect);
  const aliceAnswer = game.state.answers.find(a => a.playerId === aliceId);

  if (!correctAnswer || !aliceAnswer) throw new Error('Answers not found');

  // Alice votes correct, Bob and Charlie vote for Alice's fake
  game.submitVote(aliceId, correctAnswer.id);
  game.submitVote(bobId, aliceAnswer.id);
  game.submitVote(charlieId, aliceAnswer.id);

  game.transitionToRevealing();

  // Alice: 1 (correct) + 1000 (fooled 2) = 1001
  // Bob: 0
  // Charlie: 0
  const alice = game.state.players.find(p => p.nickname === 'Alice');
  if (!alice || alice.score !== 1001) {
    throw new Error(`Alice should have 1001, got ${alice?.score}`);
  }
}

// Test: Late join attempt (after game started)
async function test_late_join_attempt(game: GameSimulator) {
  game.createGame('Alice');
  game.joinGame('Bob');
  game.startGame();

  // Try to join after game started - this should still add player to state
  // (In real app, UI would prevent this, but testing state behavior)
  game.joinGame('Charlie');

  // Charlie should be in players list
  const charlie = game.state.players.find(p => p.nickname === 'Charlie');
  if (!charlie) throw new Error('Charlie should be in players list');

  // But Charlie hasn't answered yet
  if (charlie.hasAnswered) throw new Error('Charlie should not have answered');
}

// Test: Full 5 rounds
async function test_full_5_rounds(game: GameSimulator) {
  game.createGame('Alice');
  game.joinGame('Bob');
  game.startGame();

  const aliceId = game.state.players[0].id;
  const bobId = game.state.players[1].id;

  for (let round = 0; round < 5; round++) {
    if (game.state.phase !== 'submitting') {
      throw new Error(`Round ${round + 1}: Expected submitting phase, got ${game.state.phase}`);
    }

    game.submitAnswer(aliceId, `Alice Round ${round + 1}`);
    game.submitAnswer(bobId, `Bob Round ${round + 1}`);

    game.transitionToVoting();

    const correctAnswer = game.state.answers.find(a => a.isCorrect);
    if (!correctAnswer) throw new Error(`Round ${round + 1}: Correct answer not found`);

    game.submitVote(aliceId, correctAnswer.id);
    game.submitVote(bobId, correctAnswer.id);

    game.transitionToRevealing();
    game.transitionToNextRound();
  }

  // Should be finished
  if (game.state.phase !== 'finished') {
    throw new Error(`Expected finished phase, got ${game.state.phase}`);
  }

  // Both should have 5 points (1 per round)
  if (game.state.players[0].score !== 5 || game.state.players[1].score !== 5) {
    throw new Error(`Expected both to have 5 points`);
  }
}

// Run all tests
async function main() {
  console.log('\n🎮 GOT YA! GAMEPLAY TESTS');
  console.log('Testing game logic with 10 different scenarios...\n');

  const scenarios = [
    'basic_2_players',
    'basic_3_players',
    'player_tries_own_vote',
    'duplicate_answer',
    'empty_answer',
    'all_vote_correct',
    'all_fooled',
    'mixed_voting',
    'late_join_attempt',
    'full_5_rounds',
  ];

  const allErrors: string[] = [];

  for (let i = 0; i < scenarios.length; i++) {
    const errors = await runTest(i + 1, scenarios[i]);
    allErrors.push(...errors);
  }

  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));

  if (allErrors.length === 0) {
    console.log('✓ All 10 tests passed!');
  } else {
    console.log(`✗ ${allErrors.length} error(s) found:`);
    allErrors.forEach(e => console.log(`  - ${e}`));
  }
}

main().catch(console.error);
