/**
 * Test the localStorage-based sync mechanism
 * This simulates two browser tabs syncing via localStorage
 */

// Simple mock for localStorage
class MockStorage {
  private data: Map<string, string> = new Map();
  private listeners: ((key: string, value: string | null) => void)[] = [];

  setItem(key: string, value: string): void {
    this.data.set(key, value);
    // Notify other "tabs"
    this.listeners.forEach(listener => listener(key, value));
  }

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }

  onStorageChange(listener: (key: string, value: string | null) => void): void {
    this.listeners.push(listener);
  }
}

// Shared storage between "tabs"
const sharedStorage = new MockStorage();

// Simulate game state
interface Player {
  id: string;
  nickname: string;
  score: number;
  isHost: boolean;
  hasAnswered: boolean;
  hasVoted: boolean;
}

interface GameState {
  roomCode: string;
  phase: string;
  players: Player[];
  currentRound: number;
}

interface RoomData {
  state: GameState;
  lastUpdate: number;
  hostSessionId: string;
}

const STORAGE_KEY_PREFIX = 'gotya_room_';

// Tab 1: Host
class HostTab {
  private sessionId = 'host-session-123';
  private roomCode = '';
  private state: GameState | null = null;

  createGame(nickname: string): string {
    this.roomCode = this.generateCode();
    this.state = {
      roomCode: this.roomCode,
      phase: 'lobby',
      players: [{
        id: 'host-player',
        nickname,
        score: 0,
        isHost: true,
        hasAnswered: false,
        hasVoted: false,
      }],
      currentRound: 0,
    };

    this.saveState();
    return this.roomCode;
  }

  private generateCode(): string {
    return 'GAME01';
  }

  private saveState(): void {
    if (!this.state) return;
    const roomData: RoomData = {
      state: this.state,
      lastUpdate: Date.now(),
      hostSessionId: this.sessionId,
    };
    const key = `${STORAGE_KEY_PREFIX}${this.roomCode}`;
    sharedStorage.setItem(key, JSON.stringify(roomData));
  }

  loadState(): GameState | null {
    const key = `${STORAGE_KEY_PREFIX}${this.roomCode}`;
    const data = sharedStorage.getItem(key);
    if (data) {
      const roomData: RoomData = JSON.parse(data);
      this.state = roomData.state;
      return roomData.state;
    }
    return null;
  }

  getState(): GameState | null {
    return this.state;
  }

  startGame(): void {
    if (this.state) {
      this.state.phase = 'submitting';
      this.saveState();
    }
  }

  getPlayersCount(): number {
    return this.state?.players.length ?? 0;
  }
}

// Tab 2: Player
class PlayerTab {
  private roomCode = '';
  private playerId = '';
  private state: GameState | null = null;

  joinGame(nickname: string, roomCode: string): boolean {
    this.roomCode = roomCode;
    const key = `${STORAGE_KEY_PREFIX}${roomCode}`;
    const data = sharedStorage.getItem(key);

    if (!data) {
      console.log('  [Player] Room not found');
      return false;
    }

    const roomData: RoomData = JSON.parse(data);
    this.state = roomData.state;

    // Add ourselves to the game
    this.playerId = 'player-' + Math.random().toString(36).slice(2, 8);
    this.state.players.push({
      id: this.playerId,
      nickname,
      score: 0,
      isHost: false,
      hasAnswered: false,
      hasVoted: false,
    });

    // Save updated state back
    const updatedRoomData: RoomData = {
      state: this.state,
      lastUpdate: Date.now(),
      hostSessionId: roomData.hostSessionId,
    };
    sharedStorage.setItem(key, JSON.stringify(updatedRoomData));

    console.log(`  [Player] Joined as "${nickname}" with ID ${this.playerId}`);
    return true;
  }

  loadState(): GameState | null {
    const key = `${STORAGE_KEY_PREFIX}${this.roomCode}`;
    const data = sharedStorage.getItem(key);
    if (data) {
      const roomData: RoomData = JSON.parse(data);
      this.state = roomData.state;
      return roomData.state;
    }
    return null;
  }

  getPhase(): string {
    return this.state?.phase ?? '';
  }
}

// Run tests
async function runSyncTests() {
  console.log('\n===========================================');
  console.log('  SYNC MECHANISM TESTS');
  console.log('===========================================\n');

  let passed = 0;
  let failed = 0;

  // Test 1: Host creates game
  console.log('TEST 1: Host creates game');
  const host = new HostTab();
  const roomCode = host.createGame('Alice');
  if (roomCode && host.getState()?.phase === 'lobby') {
    console.log(`  ✓ Host created room ${roomCode}`);
    passed++;
  } else {
    console.log('  ✗ Failed to create game');
    failed++;
  }

  // Test 2: Player joins via storage
  console.log('\nTEST 2: Player joins via localStorage');
  const player = new PlayerTab();
  const joined = player.joinGame('Bob', roomCode);
  if (joined) {
    console.log('  ✓ Player joined successfully');
    passed++;
  } else {
    console.log('  ✗ Failed to join');
    failed++;
  }

  // Test 3: Host sees new player
  console.log('\nTEST 3: Host sees new player after reload');
  const hostState = host.loadState();
  if (hostState && hostState.players.length === 2) {
    const playerNames = hostState.players.map(p => p.nickname).join(', ');
    console.log(`  ✓ Host sees ${hostState.players.length} players: ${playerNames}`);
    passed++;
  } else {
    console.log(`  ✗ Host sees wrong player count: ${hostState?.players.length}`);
    failed++;
  }

  // Test 4: Host starts game
  console.log('\nTEST 4: Host starts game');
  host.startGame();
  if (host.getState()?.phase === 'submitting') {
    console.log('  ✓ Game phase changed to submitting');
    passed++;
  } else {
    console.log('  ✗ Phase not changed');
    failed++;
  }

  // Test 5: Player sees game started
  console.log('\nTEST 5: Player sees game started');
  const playerState = player.loadState();
  if (playerState?.phase === 'submitting') {
    console.log('  ✓ Player sees submitting phase');
    passed++;
  } else {
    console.log(`  ✗ Player sees wrong phase: ${playerState?.phase}`);
    failed++;
  }

  // Test 6: Multiple players join
  console.log('\nTEST 6: Third player joins');
  const player2 = new PlayerTab();
  player2.joinGame('Charlie', roomCode);
  host.loadState();
  if (host.getPlayersCount() === 3) {
    console.log('  ✓ Three players in game');
    passed++;
  } else {
    console.log(`  ✗ Wrong player count: ${host.getPlayersCount()}`);
    failed++;
  }

  // Test 7: Room not found
  console.log('\nTEST 7: Join non-existent room');
  const player3 = new PlayerTab();
  const joinedFake = player3.joinGame('Dave', 'FAKE99');
  if (!joinedFake) {
    console.log('  ✓ Correctly rejected non-existent room');
    passed++;
  } else {
    console.log('  ✗ Should have rejected non-existent room');
    failed++;
  }

  // Test 8: State persistence
  console.log('\nTEST 8: State persistence');
  const key = `${STORAGE_KEY_PREFIX}${roomCode}`;
  const storedData = sharedStorage.getItem(key);
  if (storedData) {
    const parsed = JSON.parse(storedData);
    if (parsed.state.players.length === 3) {
      console.log('  ✓ State correctly persisted in storage');
      passed++;
    } else {
      console.log('  ✗ State not correctly persisted');
      failed++;
    }
  } else {
    console.log('  ✗ No data in storage');
    failed++;
  }

  // Summary
  console.log('\n===========================================');
  console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
  console.log('===========================================\n');

  if (failed > 0) {
    throw new Error(`${failed} tests failed`);
  }
}

runSyncTests().catch(console.error);
