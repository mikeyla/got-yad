// Game types for Got Ya! trivia bluff game

export interface Player {
  id: string;
  nickname: string;
  avatarColor: string;
  score: number;
  isHost: boolean;
  hasAnswered: boolean;
  hasVoted: boolean;
  currentAnswer?: string;
  votedAnswerId?: string;
}

export interface Answer {
  id: string;
  playerId: string;
  playerNickname: string;
  text: string;
  isCorrect: boolean;
  voteCount: number;
  votedBy: string[]; // player IDs who voted for this
}

export interface Question {
  id: string;
  text: string;
  correctAnswer: string;
  category: string;
}

export type GamePhase =
  | 'home'        // Main menu
  | 'lobby'       // Waiting for players
  | 'submitting'  // Players writing fake answers (30s)
  | 'voting'      // Players voting on answers (20s)
  | 'revealing'   // Showing correct answer (8s)
  | 'finished';   // Game over, show leaderboard

export interface GameState {
  phase: GamePhase;
  roomCode: string;
  players: Player[];
  currentPlayerId: string;
  questions: Question[];
  currentQuestionIndex: number;
  answers: Answer[];
  timeRemaining: number;
  roundNumber: number;
  totalRounds: number;
  fooledBy?: string; // nickname of player who fooled current player
}

export const GAME_CONFIG = {
  SUBMIT_TIME: 30,
  VOTE_TIME: 20,
  REVEAL_TIME: 8,
  TOTAL_ROUNDS: 5,
  MIN_PLAYERS: 2,
  MAX_PLAYERS: 20,
  CORRECT_VOTE_POINTS: 1,
  FOOL_POINTS: 500,
  MAX_ANSWER_LENGTH: 100,
  MAX_NICKNAME_LENGTH: 12,
};

// Avatar colors (arcade palette)
export const AVATAR_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
  '#F8B500', '#FF69B4', '#00CED1', '#FFD700', '#7B68EE',
  '#FF7F50', '#00FA9A', '#FF1493', '#1E90FF', '#32CD32',
];

export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

export function getRandomColor(): string {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}

export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
