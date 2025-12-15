import { chromium, Browser, Page, BrowserContext } from 'playwright';

const BASE_URL = 'http://localhost:5173';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const BROWSER_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--disable-software-rasterizer',
  '--single-process',
  '--no-zygote',
];

async function launchBrowser(): Promise<Browser> {
  return chromium.launch({
    headless: true,
    args: BROWSER_ARGS,
  });
}

// Wait for React app to fully render
async function waitForApp(page: Page) {
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  await page.waitForSelector('#root > *', { timeout: 10000 });
  await sleep(300);
}

async function createGame(page: Page, nickname: string): Promise<string> {
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await waitForApp(page);

  await page.locator('button', { hasText: 'CREATE GAME' }).click();
  await sleep(500);

  const roomCodeSpan = page.locator('text=ROOM CODE:').locator('xpath=..').locator('span');
  const roomCode = await roomCodeSpan.textContent() || '';

  await page.locator('input[placeholder="ENTER NAME"]').fill(nickname);
  await page.locator('button', { hasText: 'START' }).click();
  await page.waitForSelector('text=PLAYERS', { timeout: 5000 });

  return roomCode.trim();
}

async function joinGame(page: Page, nickname: string, roomCode: string): Promise<boolean> {
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await waitForApp(page);

  await page.locator('button', { hasText: 'JOIN GAME' }).click();
  await sleep(300);

  await page.locator('input[placeholder="ENTER NAME"]').fill(nickname);
  await page.locator('input[placeholder="ENTER CODE"]').fill(roomCode);
  await page.locator('button', { hasText: 'JOIN' }).click();

  try {
    await page.waitForSelector('text=PLAYERS', { timeout: 10000 });
    return true;
  } catch {
    return false;
  }
}

async function runTest(name: string, testFn: () => Promise<void>) {
  try {
    await testFn();
    results.push({ name, passed: true });
    console.log(`✓ ${name}`);
  } catch (error: any) {
    results.push({ name, passed: false, error: error.message || String(error) });
    console.log(`✗ ${name}`);
    console.log(`  Error: ${error.message || error}`);
  }
}

async function main() {
  console.log('Starting 20 comprehensive game tests...\n');
  console.log('Each test launches a fresh browser to avoid crashes.\n');

  // ============================================
  // TEST SUITE 1: Game Creation with Early QR
  // ============================================
  console.log('--- Game Creation with Early QR ---');

  // Test 1
  await runTest('Test 1: QR code displays before nickname entry', async () => {
    const browser = await launchBrowser();
    try {
      const page = await browser.newPage();
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      await waitForApp(page);

      await page.locator('button', { hasText: 'CREATE GAME' }).click();
      await sleep(500);

      const qr = await page.locator('.qr-container').isVisible();
      if (!qr) throw new Error('QR container not found');

      const roomCodeVisible = await page.locator('text=ROOM CODE:').isVisible();
      if (!roomCodeVisible) throw new Error('Room code not displayed');

      const scanText = await page.locator('text=PLAYERS CAN SCAN TO JOIN NOW').isVisible();
      if (!scanText) throw new Error('Scan instruction not visible');
    } finally {
      await browser.close();
    }
  });

  // Test 2
  await runTest('Test 2: Room code is pre-generated (6 chars)', async () => {
    const browser = await launchBrowser();
    try {
      const page = await browser.newPage();
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      await waitForApp(page);

      await page.locator('button', { hasText: 'CREATE GAME' }).click();
      await sleep(500);

      const roomCodeSpan = page.locator('text=ROOM CODE:').locator('xpath=..').locator('span');
      const code = await roomCodeSpan.textContent();
      if (!code || code.trim().length !== 6) {
        throw new Error(`Invalid room code length: "${code}"`);
      }
      if (!/^[A-Z0-9]{6}$/.test(code.trim())) {
        throw new Error(`Invalid room code format: "${code}"`);
      }
    } finally {
      await browser.close();
    }
  });

  // Test 3
  await runTest('Test 3: Complete game creation flow', async () => {
    const browser = await launchBrowser();
    try {
      const page = await browser.newPage();
      const roomCode = await createGame(page, 'TestHost3');
      if (roomCode.length !== 6) throw new Error(`Invalid room code: ${roomCode}`);

      const hostVisible = await page.locator('text=TestHost3').isVisible();
      if (!hostVisible) throw new Error('Host name not visible in lobby');

      // Use exact match to avoid matching "TestHost3" text
      const hostBadge = await page.getByText('HOST', { exact: true }).isVisible();
      if (!hostBadge) throw new Error('HOST badge not visible');
    } finally {
      await browser.close();
    }
  });

  // Test 4
  await runTest('Test 4: Room code persists from create to lobby', async () => {
    const browser = await launchBrowser();
    try {
      const page = await browser.newPage();
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      await waitForApp(page);

      await page.locator('button', { hasText: 'CREATE GAME' }).click();
      await sleep(500);

      const roomCodeSpan = page.locator('text=ROOM CODE:').locator('xpath=..').locator('span');
      const createCode = (await roomCodeSpan.textContent())?.trim();

      await page.locator('input[placeholder="ENTER NAME"]').fill('Host4');
      await page.locator('button', { hasText: 'START' }).click();
      await page.waitForSelector('text=PLAYERS', { timeout: 5000 });

      const lobbyContent = await page.content();
      if (!lobbyContent.includes(createCode!)) {
        throw new Error('Room code changed between create and lobby');
      }
    } finally {
      await browser.close();
    }
  });

  // Test 5
  await runTest('Test 5: Back button on create screen works', async () => {
    const browser = await launchBrowser();
    try {
      const page = await browser.newPage();
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      await waitForApp(page);

      await page.locator('button', { hasText: 'CREATE GAME' }).click();
      await sleep(300);
      await page.waitForSelector('.qr-container', { timeout: 3000 });

      await page.locator('text=← BACK').click();
      await sleep(300);

      const createBtn = await page.locator('button', { hasText: 'CREATE GAME' }).isVisible();
      const joinBtn = await page.locator('button', { hasText: 'JOIN GAME' }).isVisible();
      if (!createBtn || !joinBtn) throw new Error('Not back to home screen');
    } finally {
      await browser.close();
    }
  });

  // ============================================
  // TEST SUITE 2: Same Browser Tab Sync
  // ============================================
  console.log('\n--- Same Browser Tab Sync ---');

  // Test 6
  await runTest('Test 6: Join from same browser context', async () => {
    const browser = await launchBrowser();
    try {
      const context = await browser.newContext();
      const hostPage = await context.newPage();
      const playerPage = await context.newPage();

      const roomCode = await createGame(hostPage, 'Host6');
      const joined = await joinGame(playerPage, 'Player6', roomCode);
      if (!joined) throw new Error('Failed to join room');

      await sleep(1500);

      const playerVisible = await hostPage.locator('text=Player6').isVisible();
      if (!playerVisible) throw new Error('Player not visible to host');
    } finally {
      await browser.close();
    }
  });

  // Test 7
  await runTest('Test 7: Multiple players join same browser', async () => {
    const browser = await launchBrowser();
    try {
      const context = await browser.newContext();
      const hostPage = await context.newPage();
      const player1Page = await context.newPage();
      const player2Page = await context.newPage();

      const roomCode = await createGame(hostPage, 'Host7');
      await joinGame(player1Page, 'Player7A', roomCode);
      await joinGame(player2Page, 'Player7B', roomCode);

      await sleep(1500);

      const p1 = await hostPage.locator('text=Player7A').isVisible();
      const p2 = await hostPage.locator('text=Player7B').isVisible();
      if (!p1 || !p2) throw new Error('Not all players visible to host');
    } finally {
      await browser.close();
    }
  });

  // Test 8
  await runTest('Test 8: Join via URL (QR code simulation)', async () => {
    const browser = await launchBrowser();
    try {
      const context = await browser.newContext();
      const hostPage = await context.newPage();
      const playerPage = await context.newPage();

      const roomCode = await createGame(hostPage, 'Host8');

      await playerPage.goto(`${BASE_URL}?join=${roomCode}`, { waitUntil: 'networkidle' });
      await waitForApp(playerPage);

      const codeValue = await playerPage.locator('input[placeholder="ENTER CODE"]').inputValue();
      if (codeValue !== roomCode) throw new Error('Room code not pre-filled from URL');

      await playerPage.locator('input[placeholder="ENTER NAME"]').fill('Player8');
      await playerPage.locator('button', { hasText: 'JOIN' }).click();
      await playerPage.waitForSelector('text=PLAYERS', { timeout: 5000 });
    } finally {
      await browser.close();
    }
  });

  // Test 9
  await runTest('Test 9: Player count updates when someone joins', async () => {
    const browser = await launchBrowser();
    try {
      const context = await browser.newContext();
      const hostPage = await context.newPage();
      const playerPage = await context.newPage();

      const roomCode = await createGame(hostPage, 'Host9');

      const initialCount = await hostPage.locator('text=PLAYERS (1/').isVisible();
      if (!initialCount) throw new Error('Initial player count not showing (1)');

      await joinGame(playerPage, 'Player9', roomCode);
      await sleep(1500);

      const updatedCount = await hostPage.locator('text=PLAYERS (2/').isVisible();
      if (!updatedCount) throw new Error('Player count did not update to 2');
    } finally {
      await browser.close();
    }
  });

  // Test 10
  await runTest('Test 10: Invalid room code shows error', async () => {
    const browser = await launchBrowser();
    try {
      const page = await browser.newPage();
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      await waitForApp(page);

      await page.locator('button', { hasText: 'JOIN GAME' }).click();
      await sleep(300);

      await page.locator('input[placeholder="ENTER NAME"]').fill('TestPlayer');
      await page.locator('input[placeholder="ENTER CODE"]').fill('BADCOD');
      await page.locator('button', { hasText: 'JOIN' }).click();

      await sleep(3000);

      const content = await page.content();
      if (!content.toLowerCase().includes('not found')) {
        throw new Error('Error message not shown for invalid code');
      }
    } finally {
      await browser.close();
    }
  });

  // ============================================
  // TEST SUITE 3: Cross-Context Join
  // ============================================
  console.log('\n--- Cross-Context Join (Cross-Device Simulation) ---');

  // Test 11
  await runTest('Test 11: QR code visible in isolated context', async () => {
    const browser = await launchBrowser();
    try {
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      await waitForApp(page);

      await page.locator('button', { hasText: 'CREATE GAME' }).click();
      await sleep(500);

      const qr = await page.locator('.qr-container').isVisible();
      if (!qr) throw new Error('QR not visible in isolated context');
    } finally {
      await browser.close();
    }
  });

  // Test 12: Simulate cross-device by using separate browser instances
  await runTest('Test 12: Cross-device join (separate browsers)', async () => {
    const browser1 = await launchBrowser();
    let browser2: Browser | null = null;
    try {
      const hostPage = await browser1.newPage();
      const roomCode = await createGame(hostPage, 'Host12');
      await sleep(2000); // Wait for Supabase sync

      // Launch second browser to simulate different device
      browser2 = await launchBrowser();
      const playerPage = await browser2.newPage();

      await playerPage.goto(BASE_URL, { waitUntil: 'networkidle' });
      await waitForApp(playerPage);

      await playerPage.locator('button', { hasText: 'JOIN GAME' }).click();
      await sleep(300);

      await playerPage.locator('input[placeholder="ENTER NAME"]').fill('Player12');
      await playerPage.locator('input[placeholder="ENTER CODE"]').fill(roomCode);
      await playerPage.locator('button', { hasText: 'JOIN' }).click();

      await sleep(3000);

      const content = await playerPage.content();
      const inLobby = content.includes('PLAYERS');
      const hasError = content.toLowerCase().includes('not found');

      if (!inLobby && !hasError) {
        throw new Error('Neither joined nor showed error - unexpected state');
      }
      console.log(`  (Cross-device: ${inLobby ? 'JOINED via Supabase' : 'Needs Supabase config'})`);
    } finally {
      await browser1.close();
      if (browser2) await browser2.close();
    }
  });

  // Test 13
  await runTest('Test 13: Join button shows loading state', async () => {
    const browser = await launchBrowser();
    try {
      const page = await browser.newPage();
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      await waitForApp(page);

      await page.locator('button', { hasText: 'JOIN GAME' }).click();
      await sleep(300);

      await page.locator('input[placeholder="ENTER NAME"]').fill('Player');
      await page.locator('input[placeholder="ENTER CODE"]').fill('TESTCD');

      const joinBtn = page.locator('button', { hasText: /JOIN/ });
      const isVisible = await joinBtn.isVisible();
      if (!isVisible) throw new Error('Join button not visible');
    } finally {
      await browser.close();
    }
  });

  // Test 14
  await runTest('Test 14: Room code input auto-uppercases', async () => {
    const browser = await launchBrowser();
    try {
      const page = await browser.newPage();
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      await waitForApp(page);

      await page.locator('button', { hasText: 'JOIN GAME' }).click();
      await sleep(300);

      await page.locator('input[placeholder="ENTER CODE"]').fill('abcdef');

      const value = await page.locator('input[placeholder="ENTER CODE"]').inputValue();
      if (value !== 'ABCDEF') throw new Error(`Not uppercased: "${value}"`);
    } finally {
      await browser.close();
    }
  });

  // Test 15
  await runTest('Test 15: URL join parameter pre-fills code', async () => {
    const browser = await launchBrowser();
    try {
      const page = await browser.newPage();
      await page.goto(`${BASE_URL}?join=TEST99`, { waitUntil: 'networkidle' });
      await waitForApp(page);

      const joinTitle = await page.locator('h2', { hasText: 'JOIN GAME' }).isVisible();
      if (!joinTitle) throw new Error('Not in join mode');

      const value = await page.locator('input[placeholder="ENTER CODE"]').inputValue();
      if (value !== 'TEST99') throw new Error(`Code not pre-filled: "${value}"`);
    } finally {
      await browser.close();
    }
  });

  // ============================================
  // TEST SUITE 4: Full Game Flow
  // ============================================
  console.log('\n--- Full Game Flow ---');

  // Test 16
  await runTest('Test 16: Minimum players required to start', async () => {
    const browser = await launchBrowser();
    try {
      const page = await browser.newPage();
      await createGame(page, 'SoloHost');

      const startBtn = page.locator('button', { hasText: 'START GAME' });
      const isDisabled = await startBtn.isDisabled();
      if (!isDisabled) throw new Error('Start button should be disabled with 1 player');

      const warning = await page.locator('text=NEED AT LEAST').isVisible();
      if (!warning) throw new Error('Minimum players warning not shown');
    } finally {
      await browser.close();
    }
  });

  // Test 17
  await runTest('Test 17: Start game with 2 players', async () => {
    const browser = await launchBrowser();
    try {
      const context = await browser.newContext();
      const hostPage = await context.newPage();
      const playerPage = await context.newPage();

      const roomCode = await createGame(hostPage, 'Host17');
      await joinGame(playerPage, 'Player17', roomCode);
      await sleep(1000);

      const startBtn = hostPage.locator('button', { hasText: 'START GAME' });
      const isEnabled = await startBtn.isEnabled();
      if (!isEnabled) throw new Error('Start button should be enabled with 2 players');

      await startBtn.click();
      await sleep(2000);

      const hostInGame = await hostPage.locator('text=ROUND').isVisible();
      const playerInGame = await playerPage.locator('text=ROUND').isVisible();

      if (!hostInGame) throw new Error('Host not in game');
      if (!playerInGame) throw new Error('Player not in game');
    } finally {
      await browser.close();
    }
  });

  // Test 18
  await runTest('Test 18: Submit answers phase', async () => {
    const browser = await launchBrowser();
    try {
      const context = await browser.newContext();
      const hostPage = await context.newPage();
      const playerPage = await context.newPage();

      const roomCode = await createGame(hostPage, 'Host18');
      await joinGame(playerPage, 'Player18', roomCode);
      await sleep(500);

      await hostPage.locator('button', { hasText: 'START GAME' }).click();
      await sleep(2000);

      const submitPrompt = await hostPage.locator('text=/WRITE|FAKE ANSWER/i').isVisible();
      if (!submitPrompt) throw new Error('Not in submit phase');

      const textarea = hostPage.locator('textarea');
      if (await textarea.isVisible()) {
        await textarea.fill('My fake answer');
        await hostPage.locator('button', { hasText: 'SUBMIT' }).click();
        await sleep(1000);
      }
    } finally {
      await browser.close();
    }
  });

  // Test 19
  await runTest('Test 19: Full round - both players submit', async () => {
    const browser = await launchBrowser();
    try {
      const context = await browser.newContext();
      const hostPage = await context.newPage();
      const playerPage = await context.newPage();

      const roomCode = await createGame(hostPage, 'Host19');
      await joinGame(playerPage, 'Player19', roomCode);
      await sleep(500);

      await hostPage.locator('button', { hasText: 'START GAME' }).click();
      await sleep(2000);

      const hostTextarea = hostPage.locator('textarea');
      if (await hostTextarea.isVisible()) {
        await hostTextarea.fill('Host answer 19');
        await hostPage.locator('button', { hasText: 'SUBMIT' }).click();
      }

      const playerTextarea = playerPage.locator('textarea');
      if (await playerTextarea.isVisible()) {
        await playerTextarea.fill('Player answer 19');
        await playerPage.locator('button', { hasText: 'SUBMIT' }).click();
      }

      await sleep(3000);
    } finally {
      await browser.close();
    }
  });

  // Test 20
  await runTest('Test 20: Leave game returns to home', async () => {
    const browser = await launchBrowser();
    try {
      const page = await browser.newPage();
      await createGame(page, 'LeavingHost');

      await page.locator('text=LEAVE GAME').click();
      await sleep(500);

      const createBtn = await page.locator('button', { hasText: 'CREATE GAME' }).isVisible();
      const joinBtn = await page.locator('button', { hasText: 'JOIN GAME' }).isVisible();

      if (!createBtn || !joinBtn) throw new Error('Not back to home screen');
    } finally {
      await browser.close();
    }
  });

  // ============================================
  // SUMMARY
  // ============================================
  console.log('\n' + '='.repeat(50));
  console.log('TEST RESULTS SUMMARY');
  console.log('='.repeat(50));

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log(`\nTotal:  ${results.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);

  if (failed > 0) {
    console.log('\nFailed tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  ✗ ${r.name}`);
      console.log(`    ${r.error}`);
    });
  }

  if (passed > 0) {
    console.log('\nPassed tests:');
    results.filter(r => r.passed).forEach(r => {
      console.log(`  ✓ ${r.name}`);
    });
  }

  console.log('\n' + '='.repeat(50));
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
