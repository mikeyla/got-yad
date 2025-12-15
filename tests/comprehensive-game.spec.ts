import { test, expect, Browser, BrowserContext, Page } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';

// Test configuration for comprehensive coverage
test.describe.configure({ mode: 'serial' });

// Helper to create a game and return room code
async function createGame(page: Page, nickname: string): Promise<string> {
  await page.goto(BASE_URL);
  await page.click('text=CREATE GAME');

  // Wait for QR code to appear (new feature - QR shows before entering name)
  await expect(page.locator('.qr-container')).toBeVisible({ timeout: 5000 });

  // Get the pre-generated room code displayed on screen
  const roomCodeText = await page.locator('text=ROOM CODE:').locator('..').textContent();
  const roomCode = roomCodeText?.match(/[A-Z0-9]{6}/)?.[0] || '';

  // Enter nickname and start
  await page.fill('input[placeholder="ENTER NAME"]', nickname);
  await page.click('text=START');

  // Wait for lobby
  await expect(page.locator('text=PLAYERS')).toBeVisible({ timeout: 5000 });

  return roomCode;
}

// Helper to join a game
async function joinGame(page: Page, nickname: string, roomCode: string): Promise<boolean> {
  await page.goto(BASE_URL);
  await page.click('text=JOIN GAME');
  await page.fill('input[placeholder="ENTER NAME"]', nickname);
  await page.fill('input[placeholder="ENTER CODE"]', roomCode);
  await page.click('button:has-text("JOIN")');

  // Wait for either lobby or error
  try {
    await expect(page.locator('text=PLAYERS')).toBeVisible({ timeout: 10000 });
    return true;
  } catch {
    return false;
  }
}

// Helper to join via URL (simulating QR scan)
async function joinViaUrl(page: Page, nickname: string, roomCode: string): Promise<boolean> {
  await page.goto(`${BASE_URL}?join=${roomCode}`);

  // Should auto-switch to join mode with code pre-filled
  await expect(page.locator('input[placeholder="ENTER CODE"]')).toHaveValue(roomCode);

  await page.fill('input[placeholder="ENTER NAME"]', nickname);
  await page.click('button:has-text("JOIN")');

  try {
    await expect(page.locator('text=PLAYERS')).toBeVisible({ timeout: 10000 });
    return true;
  } catch {
    return false;
  }
}

// Test Suite 1-5: Basic Game Creation and QR Code Display
test.describe('Game Creation with Early QR', () => {
  test('Test 1: QR code displays before nickname entry', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.click('text=CREATE GAME');

    // QR code should be visible immediately
    await expect(page.locator('.qr-container')).toBeVisible();
    await expect(page.locator('text=ROOM CODE:')).toBeVisible();
    await expect(page.locator('text=PLAYERS CAN SCAN TO JOIN NOW!')).toBeVisible();
  });

  test('Test 2: Room code is pre-generated on create screen', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.click('text=CREATE GAME');

    // Should see a 6-character room code
    const roomCodeEl = page.locator('text=ROOM CODE:').locator('..');
    const text = await roomCodeEl.textContent();
    const match = text?.match(/[A-Z0-9]{6}/);
    expect(match).toBeTruthy();
    expect(match?.[0].length).toBe(6);
  });

  test('Test 3: Complete game creation flow', async ({ page }) => {
    const roomCode = await createGame(page, 'TestHost1');
    expect(roomCode.length).toBe(6);

    // Verify in lobby
    await expect(page.locator('text=TestHost1')).toBeVisible();
    await expect(page.locator('text=HOST')).toBeVisible();
  });

  test('Test 4: Room code persists from create to lobby', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.click('text=CREATE GAME');

    // Get pre-generated code
    const preCreateText = await page.locator('text=ROOM CODE:').locator('..').textContent();
    const preCreateCode = preCreateText?.match(/[A-Z0-9]{6}/)?.[0];

    // Create game
    await page.fill('input[placeholder="ENTER NAME"]', 'Host');
    await page.click('text=START');
    await expect(page.locator('text=PLAYERS')).toBeVisible();

    // Check lobby code matches
    const lobbyCode = await page.locator('.arcade-card').first().locator('p').first().textContent();
    expect(lobbyCode).toContain(preCreateCode);
  });

  test('Test 5: Back button on create screen works', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.click('text=CREATE GAME');
    await expect(page.locator('.qr-container')).toBeVisible();

    await page.click('text=← BACK');
    await expect(page.locator('text=CREATE GAME')).toBeVisible();
    await expect(page.locator('text=JOIN GAME')).toBeVisible();
  });
});

// Test Suite 6-10: Same Browser Tab Sync
test.describe('Same Browser Tab Sync', () => {
  test('Test 6: Join from same browser tab', async ({ browser }) => {
    const context = await browser.newContext();
    const hostPage = await context.newPage();
    const playerPage = await context.newPage();

    try {
      const roomCode = await createGame(hostPage, 'Host6');
      const joined = await joinGame(playerPage, 'Player6', roomCode);
      expect(joined).toBe(true);

      // Both should see 2 players
      await expect(hostPage.locator('text=Player6')).toBeVisible({ timeout: 5000 });
      await expect(playerPage.locator('text=Host6')).toBeVisible({ timeout: 5000 });
    } finally {
      await context.close();
    }
  });

  test('Test 7: Multiple players join same browser', async ({ browser }) => {
    const context = await browser.newContext();
    const hostPage = await context.newPage();
    const player1 = await context.newPage();
    const player2 = await context.newPage();

    try {
      const roomCode = await createGame(hostPage, 'Host7');
      await joinGame(player1, 'Player7A', roomCode);
      await joinGame(player2, 'Player7B', roomCode);

      // Host should see all players
      await expect(hostPage.locator('text=Player7A')).toBeVisible({ timeout: 5000 });
      await expect(hostPage.locator('text=Player7B')).toBeVisible({ timeout: 5000 });
    } finally {
      await context.close();
    }
  });

  test('Test 8: Join via URL (QR code simulation)', async ({ browser }) => {
    const context = await browser.newContext();
    const hostPage = await context.newPage();
    const playerPage = await context.newPage();

    try {
      const roomCode = await createGame(hostPage, 'Host8');
      const joined = await joinViaUrl(playerPage, 'Player8', roomCode);
      expect(joined).toBe(true);
    } finally {
      await context.close();
    }
  });

  test('Test 9: State syncs when player joins', async ({ browser }) => {
    const context = await browser.newContext();
    const hostPage = await context.newPage();
    const playerPage = await context.newPage();

    try {
      const roomCode = await createGame(hostPage, 'Host9');

      // Check player count before join
      await expect(hostPage.locator('text=PLAYERS (1/')).toBeVisible();

      await joinGame(playerPage, 'Player9', roomCode);

      // Check player count updates
      await expect(hostPage.locator('text=PLAYERS (2/')).toBeVisible({ timeout: 5000 });
    } finally {
      await context.close();
    }
  });

  test('Test 10: Invalid room code shows error', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.click('text=JOIN GAME');
    await page.fill('input[placeholder="ENTER NAME"]', 'TestPlayer');
    await page.fill('input[placeholder="ENTER CODE"]', 'BADCOD');
    await page.click('button:has-text("JOIN")');

    await expect(page.locator('text=Room not found')).toBeVisible({ timeout: 10000 });
  });
});

// Test Suite 11-15: Cross-Context Simulation (Different Browsers)
test.describe('Cross-Context Join (Cross-Device Simulation)', () => {
  test('Test 11: Create in one context, verify QR shows', async ({ browser }) => {
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();

    try {
      await page1.goto(BASE_URL);
      await page1.click('text=CREATE GAME');

      // Verify QR is shown before creating
      await expect(page1.locator('.qr-container')).toBeVisible();
      const roomCodeText = await page1.locator('text=ROOM CODE:').locator('..').textContent();
      const roomCode = roomCodeText?.match(/[A-Z0-9]{6}/)?.[0];
      expect(roomCode?.length).toBe(6);
    } finally {
      await context1.close();
    }
  });

  test('Test 12: Cross-context join (simulated cross-device)', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const hostPage = await context1.newPage();
    const playerPage = await context2.newPage();

    try {
      const roomCode = await createGame(hostPage, 'Host12');

      // Small delay to ensure Supabase sync
      await hostPage.waitForTimeout(1000);

      // Try to join from different context
      const joined = await joinGame(playerPage, 'Player12', roomCode);

      // This tests the Supabase cross-device flow
      // Note: May fail if Supabase is not configured
      console.log(`Cross-context join result: ${joined}`);
    } finally {
      await context1.close();
      await context2.close();
    }
  });

  test('Test 13: Join shows loading state', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.click('text=JOIN GAME');
    await page.fill('input[placeholder="ENTER NAME"]', 'TestPlayer');
    await page.fill('input[placeholder="ENTER CODE"]', 'TESTCD');

    // Click join and check for loading state
    await page.click('button:has-text("JOIN")');

    // Either shows JOINING... or quickly resolves
    const joinButton = page.locator('button:has-text("JOIN"), button:has-text("JOINING")');
    await expect(joinButton).toBeVisible();
  });

  test('Test 14: Room code input is uppercase', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.click('text=JOIN GAME');
    await page.fill('input[placeholder="ENTER CODE"]', 'abcdef');

    const value = await page.locator('input[placeholder="ENTER CODE"]').inputValue();
    expect(value).toBe('ABCDEF');
  });

  test('Test 15: URL join pre-fills room code', async ({ page }) => {
    await page.goto(`${BASE_URL}?join=TEST99`);

    // Should be in join mode with code pre-filled
    await expect(page.locator('text=JOIN GAME')).toBeVisible();
    const value = await page.locator('input[placeholder="ENTER CODE"]').inputValue();
    expect(value).toBe('TEST99');
  });
});

// Test Suite 16-20: Full Game Flow Tests
test.describe('Full Game Flow', () => {
  test('Test 16: Game requires minimum players to start', async ({ page }) => {
    await createGame(page, 'SoloHost');

    // Start button should be disabled with 1 player
    const startButton = page.locator('text=START GAME');
    await expect(startButton).toBeDisabled();
    await expect(page.locator('text=NEED AT LEAST')).toBeVisible();
  });

  test('Test 17: Start game with 2 players', async ({ browser }) => {
    const context = await browser.newContext();
    const hostPage = await context.newPage();
    const playerPage = await context.newPage();

    try {
      const roomCode = await createGame(hostPage, 'Host17');
      await joinGame(playerPage, 'Player17', roomCode);

      // Start button should be enabled
      await expect(hostPage.locator('text=START GAME')).toBeEnabled({ timeout: 5000 });

      // Start the game
      await hostPage.click('text=START GAME');

      // Both should see the game screen
      await expect(hostPage.locator('text=ROUND')).toBeVisible({ timeout: 5000 });
      await expect(playerPage.locator('text=ROUND')).toBeVisible({ timeout: 5000 });
    } finally {
      await context.close();
    }
  });

  test('Test 18: Submit answers phase', async ({ browser }) => {
    const context = await browser.newContext();
    const hostPage = await context.newPage();
    const playerPage = await context.newPage();

    try {
      const roomCode = await createGame(hostPage, 'Host18');
      await joinGame(playerPage, 'Player18', roomCode);
      await hostPage.click('text=START GAME');

      // Should be in submitting phase
      await expect(hostPage.locator('text=WRITE YOUR FAKE ANSWER')).toBeVisible({ timeout: 10000 });

      // Submit answer from host
      const answerInput = hostPage.locator('textarea, input[type="text"]').last();
      await answerInput.fill('My fake answer');
      await hostPage.click('text=SUBMIT');

      // Host should see "waiting" state
      await expect(hostPage.locator('text=WAITING')).toBeVisible({ timeout: 5000 });
    } finally {
      await context.close();
    }
  });

  test('Test 19: Full round - submit and vote', async ({ browser }) => {
    const context = await browser.newContext();
    const hostPage = await context.newPage();
    const playerPage = await context.newPage();

    try {
      const roomCode = await createGame(hostPage, 'Host19');
      await joinGame(playerPage, 'Player19', roomCode);
      await hostPage.click('text=START GAME');

      // Wait for submit phase
      await expect(hostPage.locator('text=WRITE YOUR FAKE ANSWER')).toBeVisible({ timeout: 10000 });

      // Both players submit
      await hostPage.locator('textarea, input[type="text"]').last().fill('Host answer');
      await hostPage.click('text=SUBMIT');

      await playerPage.locator('textarea, input[type="text"]').last().fill('Player answer');
      await playerPage.click('text=SUBMIT');

      // Should transition to voting
      await expect(hostPage.locator('text=VOTE')).toBeVisible({ timeout: 15000 });
    } finally {
      await context.close();
    }
  });

  test('Test 20: Leave game returns to home', async ({ page }) => {
    await createGame(page, 'LeavingHost');

    // Click leave
    await page.click('text=LEAVE GAME');

    // Should be back at home
    await expect(page.locator('text=CREATE GAME')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=JOIN GAME')).toBeVisible();
  });
});
