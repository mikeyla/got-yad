import { GameState, Bid, Player } from '../types/game';

// Roll a single die (1-6)
export function rollDie(): number {
  return Math.floor(Math.random() * 6) + 1;
}

// Roll multiple dice
export function rollDice(count: number): number[] {
  return Array.from({ length: count }, () => rollDie());
}

// Count how many dice show a specific value (including wilds if enabled)
export function countDiceWithValue(
  player1Dice: number[],
  player2Dice: number[],
  faceValue: number,
  onesAreWild: boolean = true
): number {
  const allDice = [...player1Dice, ...player2Dice];
  return allDice.filter(die => {
    if (die === faceValue) return true;
    // 1s are wild (count as any value) unless bidding on 1s
    if (onesAreWild && die === 1 && faceValue !== 1) return true;
    return false;
  }).length;
}

// Check if a bid is valid (must be higher than previous bid)
export function isValidBid(newBid: Bid, currentBid: Bid | null, totalDice: number): boolean {
  // Can't bid more than total dice
  if (newBid.quantity > totalDice) return false;

  // Face value must be 1-6
  if (newBid.faceValue < 1 || newBid.faceValue > 6) return false;

  // Quantity must be at least 1
  if (newBid.quantity < 1) return false;

  // First bid is always valid
  if (!currentBid) return true;

  // Must be higher quantity, or same quantity with higher face value
  if (newBid.quantity > currentBid.quantity) return true;
  if (newBid.quantity === currentBid.quantity && newBid.faceValue > currentBid.faceValue) return true;

  return false;
}

// Determine who wins when a bluff is called
export function resolveChallenge(
  bid: Bid,
  player1Dice: number[],
  player2Dice: number[],
  challengerId: 1 | 2
): { winner: 1 | 2; actualCount: number; wasBluff: boolean } {
  const actualCount = countDiceWithValue(player1Dice, player2Dice, bid.faceValue);
  const wasBluff = actualCount < bid.quantity;

  // If it was a bluff, the challenger wins
  // If it wasn't a bluff, the bidder wins
  const winner = wasBluff ? challengerId : bid.playerId;

  return { winner, actualCount, wasBluff };
}

// Generate a smart AI bid suggestion (for hints or AI opponent)
export function suggestBid(
  myDice: number[],
  currentBid: Bid | null,
  totalDice: number
): Bid | null {
  // Count my dice
  const myCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  myDice.forEach(die => myCounts[die]++);

  // Include wild 1s in counts for other values
  const effectiveCounts: Record<number, number> = { ...myCounts };
  for (let i = 2; i <= 6; i++) {
    effectiveCounts[i] += myCounts[1];
  }

  if (!currentBid) {
    // First bid - bid conservatively based on what we have
    let bestFace = 2;
    let bestCount = effectiveCounts[2];
    for (let i = 3; i <= 6; i++) {
      if (effectiveCounts[i] >= bestCount) {
        bestCount = effectiveCounts[i];
        bestFace = i;
      }
    }
    // Assume opponent has similar distribution, estimate total
    const estimatedTotal = Math.max(1, Math.round(bestCount * 2 * 0.8));
    return { quantity: Math.min(estimatedTotal, totalDice), faceValue: bestFace, playerId: 1 };
  }

  // Raise the bid
  // Try same quantity, higher face
  for (let face = currentBid.faceValue + 1; face <= 6; face++) {
    if (effectiveCounts[face] >= Math.ceil(currentBid.quantity / 2)) {
      return { quantity: currentBid.quantity, faceValue: face, playerId: 1 };
    }
  }

  // Try higher quantity
  const newQuantity = currentBid.quantity + 1;
  if (newQuantity <= totalDice) {
    let bestFace = 2;
    for (let i = 2; i <= 6; i++) {
      if (effectiveCounts[i] >= Math.ceil(newQuantity / 2)) {
        bestFace = i;
        break;
      }
    }
    return { quantity: newQuantity, faceValue: bestFace, playerId: 1 };
  }

  // No good bid available
  return null;
}

// Create initial game state
export function createInitialState(): GameState {
  return {
    phase: 'setup',
    player1: {
      id: 1,
      name: 'Player 1',
      dice: [],
      score: 0,
      isCurrentTurn: true,
    },
    player2: {
      id: 2,
      name: 'Player 2',
      dice: [],
      score: 0,
      isCurrentTurn: false,
    },
    currentBid: null,
    roundNumber: 1,
    lastAction: 'Welcome to Got Ya!',
    winner: null,
    roundWinner: null,
    dicePerPlayer: 5,
    winningScore: 3,
  };
}

// Get the other player
export function getOtherPlayer(playerId: 1 | 2): 1 | 2 {
  return playerId === 1 ? 2 : 1;
}

// Format bid for display
export function formatBid(bid: Bid): string {
  const diceWord = bid.quantity === 1 ? 'die' : 'dice';
  return `${bid.quantity} ${diceWord} showing ${bid.faceValue}`;
}
