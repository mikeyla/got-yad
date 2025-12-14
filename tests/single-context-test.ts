/**
 * Single Context Test - Uses one browser context with two tabs
 * This tests the BroadcastChannel/localStorage sync mechanism
 */

import { chromium, Browser, Page } from 'playwright';

const BASE_URL = 'http://localhost:5173';
const NUM_GAMES = 20;

interface GameResult {
  gameNum: number;
  success: boolean;
  error?: string;
  player1Score: number;
  player2Score: number;
  rounds: number;
  bugs: string[];
  duration: number;
}

const results: GameResult[] = [];
const allBugs: Map<string, number> = new Map();

async function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function setupPage(page: Page): Promise<void> {
  // Block ALL external requests - only allow localhost
  await page.route('**/*', async (route) => {
    const url = route.request().url();
    if (url.startsWith('http://localhost') || url.startsWith('data:')) {
      await route.continue();
    } else {
      await route.abort();
    }
  });
}

async function safeClick(page: Page, selector: string, timeout = 5000): Promise<boolean> {
  try {
    await page.waitForSelector(selector, { timeout });
    await page.click(selector);
    return true;
  } catch {
    return false;
  }
}

async function safeType(page: Page, selector: string, text: string, timeout = 5000): Promise<boolean> {
  try {
    await page.waitForSelector(selector, { timeout });
    await page.fill(selector, text);
    return true;
  } catch {
    return false;
  }
}

async function waitForText(page: Page, text: string, timeout = 10000): Promise<boolean> {
  try {
    await page.waitForSelector(`text=${text}`, { timeout });
    return true;
  } catch {
    return false;
  }
}

async function playGame(browser: Browser, gameNum: number): Promise<GameResult> {
  const startTime = Date.now();
  const bugs: string[] = [];
  let player1Score = 0;
  let player2Score = 0;
  let rounds = 0;

  // Use a single context with two pages (tabs) - this enables localStorage/BroadcastChannel sync
  const context = await browser.newContext();

  const player1 = await context.newPage();
  await setupPage(player1);

  const player2 = await context.newPage();
  await setupPage(player2);

  try {
    console.log(`\n--- GAME ${gameNum} ---`);

    // Player 1: Create game
    console.log('  P1: Creating game...');
    await player1.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await wait(2000);

    const homeLoaded = await waitForText(player1, 'CREATE GAME', 5000);
    if (!homeLoaded) {
      bugs.push('Home screen did not load properly');
      throw new Error('Home screen failed to load');
    }

    await safeClick(player1, 'text=CREATE GAME');
    await wait(500);

    await safeType(player1, 'input[placeholder="ENTER NAME"]', `Host${gameNum}`);
    await wait(200);

    await safeClick(player1, 'text=START');
    await wait(1500);

    const lobbyLoaded = await waitForText(player1, 'ROOM CODE', 5000);
    if (!lobbyLoaded) {
      bugs.push('Lobby screen did not load');
      throw new Error('Lobby failed to load');
    }

    // Get room code
    const roomCodeEl = await player1.$('.arcade-font.text-3xl');
    const roomCode = await roomCodeEl?.textContent();
    if (!roomCode || roomCode.length !== 6) {
      bugs.push(`Invalid room code: ${roomCode}`);
      throw new Error('Invalid room code');
    }
    console.log(`  Room code: ${roomCode}`);

    // Check QR code and copy button
    const qrSvg = await player1.$('svg');
    if (!qrSvg) {
      bugs.push('QR code not displayed');
    }

    // Player 2: Join game (same browser context - should see same localStorage)
    console.log('  P2: Joining game...');
    await player2.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await wait(2000);

    const p2HomeLoaded = await waitForText(player2, 'JOIN GAME', 5000);
    if (!p2HomeLoaded) {
      bugs.push('P2 home screen did not load');
      throw new Error('P2 home failed');
    }

    await safeClick(player2, 'text=JOIN GAME');
    await wait(500);

    await safeType(player2, 'input[placeholder="ENTER NAME"]', `Guest${gameNum}`);
    await wait(200);

    await safeType(player2, 'input[placeholder="ENTER CODE"]', roomCode);
    await wait(200);

    await safeClick(player2, 'text=JOIN');
    await wait(2000);

    // Wait for sync polling to propagate (poll interval is 500ms)
    await wait(1500);

    // Check if P2 is in lobby or got error
    const p2InLobby = await waitForText(player2, 'WAITING FOR HOST', 3000) ||
                      await waitForText(player2, 'ROOM CODE', 3000);

    if (p2InLobby) {
      console.log('  P2: In lobby (sync working)');
    } else {
      const errorShown = await player2.$('text=Room not found');
      if (errorShown) {
        bugs.push('Room not found error shown (localStorage sync issue)');
      } else {
        bugs.push('P2 not in lobby - unknown state');
      }
    }

    // Give sync time to propagate (poll interval is 500ms, need ~2 polls)
    await wait(1500);

    // P1's tab should have polled and seen the new player
    await player1.bringToFront();
    await wait(500);

    // Check if P1 sees P2
    const p1SeesP2 = await player1.$(`text=Guest${gameNum}`);
    if (p1SeesP2) {
      console.log('  P1: Sees P2 in lobby');
    } else {
      // In same-context mode, the player should sync
      bugs.push('P1 does not see P2 (sync issue)');
    }

    // P1: Start game
    console.log('  P1: Starting game...');
    const startBtn = await player1.$('text=START GAME');
    if (startBtn) {
      await startBtn.click();
      await wait(2000);
    } else {
      // Maybe not enough players - try adding a local player
      const addLocal = await player1.$('text=ADD LOCAL PLAYER');
      if (addLocal) {
        console.log('  Adding local player...');
        await addLocal.click();
        await wait(500);
        await safeType(player1, 'input[placeholder="ENTER NAME"]', `Local${gameNum}`);
        await wait(200);
        await safeClick(player1, 'text=ADD');
        await wait(500);

        const startBtn2 = await player1.$('text=START GAME');
        if (startBtn2) {
          await startBtn2.click();
          await wait(2000);
        } else {
          bugs.push('Start game button not found even with 2 players');
          throw new Error('Cannot start game');
        }
      } else {
        bugs.push('Neither START GAME nor ADD LOCAL PLAYER found');
        throw new Error('Cannot start game');
      }
    }

    // Check game started
    const gameStarted = await waitForText(player1, 'WRITE YOUR ANSWER', 5000) ||
                        await player1.$('textarea') !== null;
    if (!gameStarted) {
      bugs.push('Game phase did not start');
      throw new Error('Game did not start');
    }

    // Play through rounds
    for (let round = 1; round <= 5; round++) {
      rounds = round;
      console.log(`  Round ${round}...`);

      // Check question is displayed
      const question = await player1.$('.arcade-card p');
      if (!question) {
        bugs.push(`Round ${round}: Question not displayed`);
      }

      // P1 submit answer
      const textarea1 = await player1.$('textarea');
      if (textarea1) {
        await textarea1.fill(`FakeAnswer_P1_R${round}`);
        await wait(200);
        const submit1 = await player1.$('text=SUBMIT');
        if (submit1) {
          await submit1.click();
          console.log('    P1 submitted');
        }
      }

      // Check if P2 is in game and can submit
      await player2.bringToFront();
      await wait(500);

      const textarea2 = await player2.$('textarea');
      if (textarea2) {
        await textarea2.fill(`FakeAnswer_P2_R${round}`);
        await wait(200);
        const submit2 = await player2.$('text=SUBMIT');
        if (submit2) {
          await submit2.click();
          console.log('    P2 submitted');
        }
      } else {
        // P2 might not be in sync - check their state
        const p2Waiting = await player2.$('text=ANSWER SUBMITTED');
        if (!p2Waiting) {
          bugs.push(`Round ${round}: P2 not in sync with game`);
        }
      }

      // If local mode with player switcher
      await player1.bringToFront();
      await wait(500);

      const playerBtns = await player1.$$('button:has(div[style*="background-color"])');
      if (playerBtns.length > 1 && !textarea2) {
        // Switch to local P2 and submit
        await playerBtns[1].click();
        await wait(500);
        const ta = await player1.$('textarea');
        if (ta) {
          await ta.fill(`FakeAnswer_P2_R${round}`);
          await wait(200);
          await safeClick(player1, 'text=SUBMIT');
          console.log('    Local P2 submitted');
        }
        await playerBtns[0].click();
        await wait(300);
      }

      // Wait for voting phase
      await wait(3000);

      const votingPhase = await waitForText(player1, 'PICK THE REAL ANSWER', 8000) ||
                          await player1.$('.answer-option') !== null;

      if (votingPhase) {
        // Vote
        await wait(300);
        const options = await player1.$$('.answer-option');
        for (const opt of options) {
          const text = await opt.textContent();
          if (!text?.includes('YOUR ANSWER')) {
            await opt.click();
            break;
          }
        }
        await wait(200);
        const voteBtn = await player1.$('text=VOTE');
        if (voteBtn) {
          await voteBtn.click();
          console.log('    P1 voted');
        }

        // P2 vote (if in sync)
        await player2.bringToFront();
        await wait(300);
        const p2Options = await player2.$$('.answer-option');
        if (p2Options.length > 0) {
          for (const opt of p2Options) {
            const text = await opt.textContent();
            if (!text?.includes('YOUR ANSWER')) {
              await opt.click();
              break;
            }
          }
          await wait(200);
          const voteBtn2 = await player2.$('text=VOTE');
          if (voteBtn2) {
            await voteBtn2.click();
            console.log('    P2 voted');
          }
        }

        // Local player vote if applicable
        await player1.bringToFront();
        await wait(300);
        if (playerBtns.length > 1) {
          await playerBtns[1].click();
          await wait(300);
          const opts = await player1.$$('.answer-option');
          for (const opt of opts) {
            const text = await opt.textContent();
            if (!text?.includes('YOUR ANSWER')) {
              await opt.click();
              break;
            }
          }
          await wait(200);
          const btn = await player1.$('text=VOTE');
          if (btn) {
            await btn.click();
            console.log('    Local P2 voted');
          }
        }
      }

      // Wait for reveal phase
      await player1.bringToFront();
      await wait(3000);

      const reveal = await waitForText(player1, 'CORRECT ANSWER', 8000) ||
                     await waitForText(player1, 'GOT YA', 3000) ||
                     await waitForText(player1, 'NICE', 3000) ||
                     await waitForText(player1, 'TOO SLOW', 3000);

      if (!reveal) {
        bugs.push(`Round ${round}: Reveal phase not shown`);
      }

      // Wait for next round
      await wait(8000);

      // Check game over
      const gameOver = await player1.$('text=GAME OVER');
      if (gameOver) {
        console.log('  Game Over!');
        break;
      }
    }

    // Get final scores
    await wait(2000);
    const gameOverScreen = await waitForText(player1, 'GAME OVER', 5000);

    if (!gameOverScreen) {
      bugs.push('Game over screen not shown');
    }

    const scores = await player1.$$('.score-display');
    if (scores.length >= 1) {
      player1Score = parseInt(await scores[0].textContent() || '0') || 0;
    }
    if (scores.length >= 2) {
      player2Score = parseInt(await scores[1].textContent() || '0') || 0;
    }

    console.log(`  Final: P1=${player1Score}, P2=${player2Score}`);

    // Check Play Again
    const playAgain = await player1.$('text=PLAY AGAIN');
    if (!playAgain) {
      bugs.push('Play Again button not found');
    }

    return {
      gameNum,
      success: true,
      player1Score,
      player2Score,
      rounds,
      bugs,
      duration: Date.now() - startTime,
    };

  } catch (error: any) {
    console.log(`  ERROR: ${error.message}`);
    return {
      gameNum,
      success: false,
      error: error.message,
      player1Score,
      player2Score,
      rounds,
      bugs,
      duration: Date.now() - startTime,
    };
  } finally {
    await context.close();
  }
}

async function runAllTests() {
  console.log('\n========================================');
  console.log('  SINGLE CONTEXT TEST - 20 GAMES');
  console.log('  (Two tabs in same browser)');
  console.log('========================================\n');

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-software-rasterizer',
      '--disable-extensions',
      '--disable-background-networking',
      '--single-process',
    ],
  });

  try {
    for (let i = 1; i <= NUM_GAMES; i++) {
      const result = await playGame(browser, i);
      results.push(result);

      for (const bug of result.bugs) {
        allBugs.set(bug, (allBugs.get(bug) || 0) + 1);
      }

      await wait(500);
    }
  } finally {
    await browser.close();
  }

  // Print summary
  console.log('\n========================================');
  console.log('  TEST SUMMARY');
  console.log('========================================\n');

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const totalDuration = results.reduce((acc, r) => acc + r.duration, 0);

  console.log(`Games played: ${NUM_GAMES}`);
  console.log(`Successful: ${successful}`);
  console.log(`Failed: ${failed}`);
  console.log(`Success rate: ${((successful / NUM_GAMES) * 100).toFixed(1)}%`);
  console.log(`Total time: ${(totalDuration / 1000 / 60).toFixed(1)} minutes`);

  if (failed > 0) {
    console.log('\n--- FAILED GAMES ---');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  Game ${r.gameNum}: ${r.error}`);
    });
  }

  console.log('\n--- BUGS FOUND (by frequency) ---');
  if (allBugs.size === 0) {
    console.log('No bugs found!');
  } else {
    const sorted = [...allBugs.entries()].sort((a, b) => b[1] - a[1]);
    sorted.forEach(([bug, count], i) => {
      console.log(`${i + 1}. [${count}x] ${bug}`);
    });
  }

  console.log('\n--- GAME RESULTS ---');
  results.forEach(r => {
    const status = r.success ? '✓' : '✗';
    console.log(`${status} G${r.gameNum}: P1=${r.player1Score}, P2=${r.player2Score}, R=${r.rounds}, ${(r.duration/1000).toFixed(0)}s`);
  });

  if (allBugs.size > 0 || failed > 0) {
    console.log(`\n⚠️  ${allBugs.size} unique bugs, ${failed} failed games`);
  } else {
    console.log('\n✅ All games passed!');
  }
}

runAllTests().catch(console.error);
