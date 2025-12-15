import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:5173';

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('=== CROSS-DEVICE JOIN DEBUG TEST ===\n');

  // Launch two completely separate browsers (simulating different devices)
  console.log('1. Launching HOST browser...');
  const hostBrowser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const hostPage = await hostBrowser.newPage();

  // Capture console logs from host
  hostPage.on('console', msg => {
    if (msg.text().includes('[Sync]') || msg.text().includes('[App]')) {
      console.log(`  [HOST] ${msg.text()}`);
    }
  });

  try {
    // HOST: Create a game
    console.log('\n2. HOST: Creating game...');
    await hostPage.goto(BASE_URL, { waitUntil: 'networkidle' });
    await hostPage.waitForSelector('#root > *', { timeout: 10000 });
    await sleep(500);

    await hostPage.locator('button', { hasText: 'CREATE GAME' }).click();
    await sleep(500);

    // Get the room code
    const roomCodeSpan = hostPage.locator('text=ROOM CODE:').locator('xpath=..').locator('span');
    const roomCode = (await roomCodeSpan.textContent())?.trim() || '';
    console.log(`   Room code: ${roomCode}`);

    // Enter nickname and create
    await hostPage.locator('input[placeholder="ENTER NAME"]').fill('HostPlayer');
    await hostPage.locator('button', { hasText: 'START' }).click();
    await hostPage.waitForSelector('text=PLAYERS', { timeout: 5000 });
    console.log('   Game created, in lobby');

    // Wait for Supabase to sync
    console.log('\n3. Waiting for Supabase sync...');
    await sleep(3000);

    // Launch PLAYER browser (different browser = different device simulation)
    console.log('\n4. Launching PLAYER browser (simulating different device)...');
    const playerBrowser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    const playerPage = await playerBrowser.newPage();

    // Capture console logs from player
    playerPage.on('console', msg => {
      if (msg.text().includes('[Sync]') || msg.text().includes('[App]')) {
        console.log(`  [PLAYER] ${msg.text()}`);
      }
    });

    try {
      console.log('\n5. PLAYER: Attempting to join...');
      await playerPage.goto(BASE_URL, { waitUntil: 'networkidle' });
      await playerPage.waitForSelector('#root > *', { timeout: 10000 });
      await sleep(500);

      await playerPage.locator('button', { hasText: 'JOIN GAME' }).click();
      await sleep(300);

      await playerPage.locator('input[placeholder="ENTER NAME"]').fill('PhonePlayer');
      await playerPage.locator('input[placeholder="ENTER CODE"]').fill(roomCode);

      console.log(`   Clicking JOIN with code: ${roomCode}`);
      await playerPage.locator('button', { hasText: 'JOIN' }).click();

      // Wait and check result
      console.log('\n6. Waiting for join result...');
      await sleep(5000);

      const playerContent = await playerPage.content();
      const inLobby = playerContent.includes('PLAYERS');
      const hasError = playerContent.toLowerCase().includes('not found');

      console.log('\n=== RESULT ===');
      if (inLobby) {
        console.log('✓ SUCCESS: Player joined the lobby!');

        // Check if host sees the player
        await sleep(1000);
        const hostContent = await hostPage.content();
        if (hostContent.includes('PhonePlayer')) {
          console.log('✓ SUCCESS: Host can see the player!');
        } else {
          console.log('⚠ WARNING: Host does not see the player yet');
        }
      } else if (hasError) {
        console.log('✗ FAILED: Room not found error');
        console.log('  This means Supabase lookup failed or room was not synced');
      } else {
        console.log('? UNKNOWN: Neither in lobby nor error shown');
        // Take screenshot for debugging
        await playerPage.screenshot({ path: '/home/user/got-yad/tests/player-result.png' });
        console.log('  Screenshot saved to tests/player-result.png');
      }

    } finally {
      await playerBrowser.close();
    }

  } finally {
    await hostBrowser.close();
  }

  console.log('\n=== TEST COMPLETE ===');
}

main().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
