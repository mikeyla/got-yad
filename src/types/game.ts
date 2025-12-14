export interface Player {
  id: 1 | 2;
  name: string;
  dice: number[];
  score: number;
  isCurrentTurn: boolean;
}

export interface Bid {
  quantity: number;
  faceValue: number;
  playerId: 1 | 2;
}

export type GamePhase =
  | 'setup'           // Players entering names
  | 'rolling'         // Dice are being rolled
  | 'bidding'         // Active bidding phase
  | 'challenge'       // Someone called "Got Ya!"
  | 'reveal'          // Showing all dice
  | 'roundEnd'        // Showing round result
  | 'gameEnd';        // Game over

export interface GameState {
  phase: GamePhase;
  player1: Player;
  player2: Player;
  currentBid: Bid | null;
  roundNumber: number;
  lastAction: string;
  winner: 1 | 2 | null;
  roundWinner: 1 | 2 | null;
  dicePerPlayer: number;
  winningScore: number;
}

export interface GameAction {
  type: 'START_GAME' | 'ROLL_DICE' | 'PLACE_BID' | 'CALL_BLUFF' | 'NEW_ROUND' | 'RESET_GAME';
  payload?: any;
}
