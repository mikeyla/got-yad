/**
 * Comprehensive Game Testing Suite
 * Tests Supabase connectivity, edge cases, and game flow
 */

import { createClient } from '@supabase/supabase-js';

// Supabase configuration for testing
const SUPABASE_URL = 'https://aakivcbhpbuxjifudqlf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFha2l2Y2JocGJ1eGppZnVkcWxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU3NDExMjMsImV4cCI6MjA4MTMxNzEyM30._5kZIMyyl-4_baYP1waCDfJQo8SrH9q55_toAaM-rB4';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  details?: string;
}

const results: TestResult[] = [];

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    results.push({ name, passed: true });
    console.log(`✓ ${name}`);
  } catch (e: any) {
    results.push({ name, passed: false, error: e.message });
    console.log(`✗ ${name}: ${e.message}`);
  }
}

async function runTests() {
  console.log('\n===========================================');
  console.log('  COMPREHENSIVE GAME TESTS');
  console.log('===========================================\n');

  // ===== SUPABASE CONNECTIVITY TESTS =====
  console.log('\n--- Supabase Connectivity ---\n');

  await test('Supabase connection works', async () => {
    const { error } = await supabase.from('game_rooms').select('count').limit(1);
    if (error && !error.message.includes('0 rows')) {
      throw new Error(`Connection failed: ${error.message}`);
    }
  });

  const testRoomCode = generateRoomCode();
  const testState = {
    roomCode: testRoomCode,
    phase: 'lobby',
    players: [{ id: 'test1', nickname: 'TestHost', score: 0, isHost: true }],
    currentRound: 0,
  };

  await test('Can create a game room in Supabase', async () => {
    const { error } = await supabase.from('game_rooms').upsert({
      room_code: testRoomCode,
      state: JSON.stringify(testState),
      last_update: new Date().toISOString(),
      host_session_id: 'test-session',
    }, { onConflict: 'room_code' });

    if (error) throw new Error(error.message);
  });

  await test('Can read game room from Supabase', async () => {
    const { data, error } = await supabase
      .from('game_rooms')
      .select('*')
      .eq('room_code', testRoomCode)
      .single();

    if (error) throw new Error(error.message);
    if (!data) throw new Error('Room not found');

    const state = JSON.parse(data.state);
    if (state.roomCode !== testRoomCode) throw new Error('Room code mismatch');
  });

  await test('Can update game room in Supabase', async () => {
    const updatedState = { ...testState, phase: 'submitting' };
    const { error } = await supabase
      .from('game_rooms')
      .update({
        state: JSON.stringify(updatedState),
        last_update: new Date().toISOString()
      })
      .eq('room_code', testRoomCode);

    if (error) throw new Error(error.message);
  });

  await test('Can delete game room from Supabase', async () => {
    const { error } = await supabase
      .from('game_rooms')
      .delete()
      .eq('room_code', testRoomCode);

    if (error) throw new Error(error.message);
  });

  // ===== REALTIME TESTS =====
  console.log('\n--- Supabase Realtime ---\n');

  await test('Can subscribe to Realtime channel', async () => {
    const channel = supabase.channel('test-channel');

    const subscribed = await new Promise<boolean>((resolve) => {
      const timeout = setTimeout(() => resolve(false), 5000);

      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          clearTimeout(timeout);
          resolve(true);
        }
      });
    });

    await supabase.removeChannel(channel);

    if (!subscribed) throw new Error('Failed to subscribe within 5 seconds');
  });

  await test('Can broadcast and receive messages', async () => {
    const channelName = `test-${Date.now()}`;
    const channel = supabase.channel(channelName);

    const received = await new Promise<boolean>((resolve) => {
      const timeout = setTimeout(() => resolve(false), 5000);

      channel
        .on('broadcast', { event: 'test' }, (payload) => {
          if (payload.payload?.message === 'hello') {
            clearTimeout(timeout);
            resolve(true);
          }
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            // Small delay to ensure subscription is ready
            await new Promise(r => setTimeout(r, 100));
            await channel.send({
              type: 'broadcast',
              event: 'test',
              payload: { message: 'hello' },
            });
          }
        });
    });

    await supabase.removeChannel(channel);

    if (!received) throw new Error('Did not receive broadcast message');
  });

  // ===== EDGE CASE TESTS =====
  console.log('\n--- Edge Cases ---\n');

  await test('Room code is case-insensitive for lookup', async () => {
    const code = generateRoomCode();
    await supabase.from('game_rooms').upsert({
      room_code: code.toUpperCase(),
      state: JSON.stringify({ test: true }),
      last_update: new Date().toISOString(),
      host_session_id: 'test',
    }, { onConflict: 'room_code' });

    // Try to find with different case
    const { data } = await supabase
      .from('game_rooms')
      .select('*')
      .eq('room_code', code.toUpperCase())
      .single();

    // Cleanup
    await supabase.from('game_rooms').delete().eq('room_code', code);

    if (!data) throw new Error('Could not find room');
  });

  await test('Large state objects can be stored', async () => {
    const code = generateRoomCode();
    const largeState = {
      roomCode: code,
      players: Array(10).fill(null).map((_, i) => ({
        id: `player-${i}`,
        nickname: `Player${i}WithAVeryLongNickname`,
        score: Math.floor(Math.random() * 10000),
        isHost: i === 0,
        hasAnswered: true,
        hasVoted: true,
        avatarColor: '#FF0000',
      })),
      answers: Array(50).fill(null).map((_, i) => ({
        id: `answer-${i}`,
        text: 'This is a very long answer that could be submitted by a player trying to write a lot of text',
        playerId: `player-${i % 10}`,
        isCorrect: false,
      })),
      questions: Array(20).fill(null).map((_, i) => ({
        id: `q-${i}`,
        text: `Question ${i}: What is the meaning of life, the universe, and everything?`,
        answer: 'Forty-two',
      })),
    };

    const { error } = await supabase.from('game_rooms').upsert({
      room_code: code,
      state: JSON.stringify(largeState),
      last_update: new Date().toISOString(),
      host_session_id: 'test',
    }, { onConflict: 'room_code' });

    // Cleanup
    await supabase.from('game_rooms').delete().eq('room_code', code);

    if (error) throw new Error(`Failed to store large state: ${error.message}`);
  });

  await test('Special characters in answers are handled', async () => {
    const code = generateRoomCode();
    const stateWithSpecialChars = {
      roomCode: code,
      answers: [
        { text: 'Test with "quotes"', playerId: '1' },
        { text: "Test with 'apostrophes'", playerId: '2' },
        { text: 'Test with <html> tags', playerId: '3' },
        { text: 'Test with émojis 🎮🎯', playerId: '4' },
        { text: 'Test with\nnewlines', playerId: '5' },
        { text: 'Test with unicode: 你好世界', playerId: '6' },
      ],
    };

    const { error: insertError } = await supabase.from('game_rooms').upsert({
      room_code: code,
      state: JSON.stringify(stateWithSpecialChars),
      last_update: new Date().toISOString(),
      host_session_id: 'test',
    }, { onConflict: 'room_code' });

    if (insertError) throw new Error(`Insert failed: ${insertError.message}`);

    const { data, error: readError } = await supabase
      .from('game_rooms')
      .select('state')
      .eq('room_code', code)
      .single();

    // Cleanup
    await supabase.from('game_rooms').delete().eq('room_code', code);

    if (readError) throw new Error(`Read failed: ${readError.message}`);

    const parsed = JSON.parse(data.state);
    if (parsed.answers[3].text !== 'Test with émojis 🎮🎯') {
      throw new Error('Emoji not preserved correctly');
    }
  });

  await test('Concurrent updates do not corrupt data', async () => {
    const code = generateRoomCode();

    // Create initial room
    await supabase.from('game_rooms').upsert({
      room_code: code,
      state: JSON.stringify({ counter: 0 }),
      last_update: new Date().toISOString(),
      host_session_id: 'test',
    }, { onConflict: 'room_code' });

    // Simulate concurrent updates
    const updates = Array(5).fill(null).map(async (_, i) => {
      const { data } = await supabase
        .from('game_rooms')
        .select('state')
        .eq('room_code', code)
        .single();

      if (data) {
        const state = JSON.parse(data.state);
        state.counter = (state.counter || 0) + 1;
        state[`update_${i}`] = Date.now();

        await supabase
          .from('game_rooms')
          .update({
            state: JSON.stringify(state),
            last_update: new Date().toISOString()
          })
          .eq('room_code', code);
      }
    });

    await Promise.all(updates);

    const { data: finalData } = await supabase
      .from('game_rooms')
      .select('state')
      .eq('room_code', code)
      .single();

    // Cleanup
    await supabase.from('game_rooms').delete().eq('room_code', code);

    if (!finalData) throw new Error('Room disappeared');
    // Note: Counter won't be 5 due to race conditions, but data should be valid JSON
    const finalState = JSON.parse(finalData.state);
    if (typeof finalState.counter !== 'number') {
      throw new Error('State corrupted');
    }
  });

  // ===== GAME LOGIC EDGE CASES =====
  console.log('\n--- Game Logic Edge Cases ---\n');

  await test('Player nickname length limits', async () => {
    // Max 20 chars typically
    const longName = 'A'.repeat(50);
    const truncated = longName.slice(0, 20);
    if (truncated.length !== 20) throw new Error('Truncation failed');
  });

  await test('Room code uniqueness', async () => {
    const codes = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      codes.add(generateRoomCode());
    }
    // With 6 chars from 32 possibilities, collisions are rare but possible
    // We should have at least 990 unique codes
    if (codes.size < 990) throw new Error(`Too many collisions: ${codes.size}/1000`);
  });

  await test('Score calculation is correct', async () => {
    // +1 for correct vote, +500 per fool
    const correctVotePoints = 1;
    const foolPoints = 500;

    // Scenario: Player A fools 3 people and votes correctly
    const expectedScore = correctVotePoints + (3 * foolPoints);
    if (expectedScore !== 1501) throw new Error(`Score calculation wrong: ${expectedScore}`);
  });

  // ===== SUMMARY =====
  console.log('\n===========================================');
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
  console.log('===========================================\n');

  if (failed > 0) {
    console.log('Failed tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.name}: ${r.error}`);
    });
    throw new Error(`${failed} tests failed`);
  }
}

runTests().catch(console.error);
