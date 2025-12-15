import { createClient } from '@supabase/supabase-js';

// Load from .env
const SUPABASE_URL = 'https://aakivcbhpbuxjifudqlf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFha2l2Y2JocGJ1eGppZnVkcWxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU3NDExMjMsImV4cCI6MjA4MTMxNzEyM30._5kZIMyyl-4_baYP1waCDfJQo8SrH9q55_toAaM-rB4';

async function main() {
  console.log('=== SUPABASE CONNECTION TEST ===\n');

  console.log('1. Creating Supabase client...');
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  console.log('2. Testing connection by querying game_rooms table...');

  try {
    // Try to read from game_rooms
    const { data, error } = await supabase
      .from('game_rooms')
      .select('room_code, last_update')
      .limit(5);

    if (error) {
      console.log('   ✗ Error querying game_rooms:', error.message);
      console.log('   Error details:', error);
    } else {
      console.log('   ✓ Connection successful!');
      console.log(`   Found ${data?.length || 0} existing rooms`);
      if (data && data.length > 0) {
        console.log('   Recent rooms:', data.map(r => r.room_code).join(', '));
      }
    }

    // Try to create a test room
    console.log('\n3. Testing room creation...');
    const testCode = 'TEST' + Math.random().toString(36).substring(2, 4).toUpperCase();
    const testState = {
      roomCode: testCode,
      phase: 'lobby',
      players: [{ id: 'test', nickname: 'TestHost', isHost: true }],
    };

    const { error: insertError } = await supabase
      .from('game_rooms')
      .upsert({
        room_code: testCode,
        state: JSON.stringify(testState),
        last_update: new Date().toISOString(),
      });

    if (insertError) {
      console.log('   ✗ Error creating room:', insertError.message);
    } else {
      console.log(`   ✓ Created test room: ${testCode}`);

      // Try to read it back
      console.log('\n4. Testing room lookup...');
      const { data: lookupData, error: lookupError } = await supabase
        .from('game_rooms')
        .select('state')
        .eq('room_code', testCode)
        .single();

      if (lookupError) {
        console.log('   ✗ Error looking up room:', lookupError.message);
      } else {
        console.log('   ✓ Room found!');
        const state = JSON.parse(lookupData.state);
        console.log(`   Room code: ${state.roomCode}`);
        console.log(`   Phase: ${state.phase}`);
        console.log(`   Players: ${state.players.length}`);
      }

      // Clean up test room
      console.log('\n5. Cleaning up test room...');
      await supabase.from('game_rooms').delete().eq('room_code', testCode);
      console.log('   ✓ Test room deleted');
    }

  } catch (err) {
    console.error('Test failed:', err);
  }

  console.log('\n=== TEST COMPLETE ===');
}

main();
