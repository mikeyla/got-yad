/**
 * Full Game Test - Plays the game 20 times with two browser contexts
 * Uses aggressive resource blocking to work in sandboxed environments
 */

import { chromium, Browser, BrowserContext, Page } from 'playwright';

const BASE_URL = 'http://localhost:5173';
const NUM_GAMES = 20;

interface GameResult {
  gameNum: number;
  success: boolean;
  error?: string;
  player1Score: number;
  player2Score: number;
  winner: string;
  rounds: number;
  bugs: string[];
  duration: number;
}

const results: GameResult[] = [];
const allBugs: Map<string, number> = new Map();

async function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function setupPage(context: BrowserContext): Promise<Page> {
  const page = await context.newPage();

  // Block ALL external requests - only allow localhost
  await page.route('**/*', async (route) => {
    const url = route.request().url();
    if (url.startsWith('http://localhost') || url.startsWith('data:')) {
      await route.continue();
    } else {
      await route.abort();
    }
  });

  return page;
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
  let winner = 'Unknown';
  let rounds = 0;

  // Create two separate browser contexts (like two different browsers)
  const context1 = await browser.newContext();
  const context2 = await browser.newContext();

  const player1 = await setupPage(context1);
  const player2 = await setupPage(context2);

  try {
    console.log(`\n--- GAME ${gameNum} ---`);

    // Player 1: Create game
    console.log('  P1: Opening home page...');
    await player1.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await wait(1500);

    // Check home screen loaded
    const homeLoaded = await waitForText(player1, 'CREATE GAME', 5000);
    if (!homeLoaded) {
      bugs.push('Home screen did not load properly');
      throw new Error('Home screen failed to load');
    }

    console.log('  P1: Creating game...');
    await safeClick(player1, 'text=CREATE GAME');
    await wait(500);

    // Enter nickname
    const nameTyped = await safeType(player1, 'input[placeholder="ENTER NAME"]', `Host${gameNum}`);
    if (!nameTyped) {
      bugs.push('Name input not found on create screen');
      throw new Error('Name input not found');
    }
    await wait(300);

    // Click START
    await safeClick(player1, 'text=START');
    await wait(1500);

    // Check we're in lobby
    const lobbyLoaded = await waitForText(player1, 'ROOM CODE', 5000);
    if (!lobbyLoaded) {
      bugs.push('Lobby screen did not load after creating game');
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

    // Check QR code exists (look for any SVG in the lobby area)
    const qrCode = await player1.$('svg');
    if (!qrCode) {
      bugs.push('QR code not displayed in lobby');
    }

    // Player 2: Join game
    console.log('  P2: Joining game...');
    await player2.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await wait(1500);

    const joinClicked = await safeClick(player2, 'text=JOIN GAME');
    if (!joinClicked) {
      bugs.push('JOIN GAME button not found');
      throw new Error('Join button not found');
    }
    await wait(500);

    // Enter nickname and room code
    await safeType(player2, 'input[placeholder="ENTER NAME"]', `Guest${gameNum}`);
    await wait(300);

    await safeType(player2, 'input[placeholder="ENTER CODE"]', roomCode);
    await wait(300);

    await safeClick(player2, 'text=JOIN');
    await wait(2000);

    // Note: In local mode (no Supabase in sandbox), P2 won't actually join P1's game
    // They'll be in separate sessions. Let's verify this behavior.
    const p2InLobby = await waitForText(player2, 'WAITING FOR HOST', 3000) ||
                       await waitForText(player2, 'ROOM CODE', 3000);

    if (!p2InLobby) {
      // Check if we got an error message
      const errorMsg = await player2.$('text=Room not found');
      if (errorMsg) {
        bugs.push('Room not found error shown (expected in local mode without Supabase)');
        // This is actually expected behavior in sandboxed environment without Supabase
        console.log('  [Expected] Local mode - rooms not shared across contexts');
      } else {
        bugs.push('Player 2 could not join - unknown error');
      }
    } else {
      console.log('  P2: In lobby');
    }

    // Since we're in local mode, let's test the game flow with just P1
    // P1 can add a local player and play
    console.log('  Testing local multiplayer mode...');

    // Check if ADD LOCAL PLAYER button exists
    const addLocalBtn = await player1.$('text=ADD LOCAL PLAYER');
    if (addLocalBtn) {
      console.log('  P1: Adding local player...');
      await addLocalBtn.click();
      await wait(500);

      await safeType(player1, 'input[placeholder="ENTER NAME"]', `Local${gameNum}`);
      await wait(200);
      await safeClick(player1, 'text=ADD');
      await wait(500);
    }

    // P1: Start game
    console.log('  P1: Starting game...');
    const startBtn = await player1.$('text=START GAME');
    if (!startBtn) {
      bugs.push('Start game button not found for host');
      throw new Error('Start button not found');
    }
    await startBtn.click();
    await wait(2000);

    // Check P1 is in submitting phase
    const p1InGame = await waitForText(player1, 'WRITE YOUR ANSWER', 5000) ||
                      await player1.$('textarea') !== null;

    if (!p1InGame) {
      bugs.push('Player 1 did not enter game phase');
      throw new Error('Game phase not started');
    }

    // Play through rounds
    for (let round = 1; round <= 5; round++) {
      rounds = round;
      console.log(`  Round ${round}...`);

      // Check for question display
      const questionEl = await player1.$('.arcade-card p');
      if (!questionEl) {
        bugs.push(`Round ${round}: Question not displayed`);
      }

      // Submit answer for current player
      const textarea = await player1.$('textarea');
      if (textarea) {
        await textarea.fill(`TestAnswer_R${round}_G${gameNum}`);
        await wait(200);

        const submitBtn = await player1.$('text=SUBMIT');
        if (submitBtn) {
          await submitBtn.click();
          console.log('    Submitted answer');
        } else {
          bugs.push(`Round ${round}: Submit button not found`);
        }
      }

      // Wait a bit - in local mode, we need to switch players
      await wait(1000);

      // Check if there are player switcher buttons (local mode)
      const playerBtns = await player1.$$('button:has(div[style*="background-color"])');
      if (playerBtns.length > 1) {
        // Switch to second player and submit
        await playerBtns[1].click();
        await wait(500);

        const textarea2 = await player1.$('textarea');
        if (textarea2) {
          await textarea2.fill(`TestAnswer2_R${round}_G${gameNum}`);
          await wait(200);
          await safeClick(player1, 'text=SUBMIT');
          console.log('    Submitted answer (P2)');
        }

        // Switch back
        await playerBtns[0].click();
        await wait(500);
      }

      // Wait for voting phase
      await wait(3000);

      // Check voting phase
      const votingPhase = await waitForText(player1, 'PICK THE REAL ANSWER', 8000) ||
                          await player1.$('.answer-option') !== null;

      if (!votingPhase) {
        // Might have auto-advanced due to timeout
        const revealing = await player1.$('text=CORRECT ANSWER');
        if (!revealing) {
          bugs.push(`Round ${round}: Voting phase did not appear`);
        }
      } else {
        // Vote for an answer
        await wait(500);
        const answerOptions = await player1.$$('.answer-option');

        if (answerOptions.length > 0) {
          // Find an answer we can vote for (not our own)
          for (const opt of answerOptions) {
            const text = await opt.textContent();
            if (!text?.includes('YOUR ANSWER')) {
              await opt.click();
              await wait(200);
              break;
            }
          }

          const voteBtn = await player1.$('text=VOTE');
          if (voteBtn) {
            await voteBtn.click();
            console.log('    Voted');
          }

          // If local mode, switch to P2 and vote
          if (playerBtns.length > 1) {
            await playerBtns[1].click();
            await wait(500);

            const opts2 = await player1.$$('.answer-option');
            for (const opt of opts2) {
              const text = await opt.textContent();
              if (!text?.includes('YOUR ANSWER')) {
                await opt.click();
                await wait(200);
                break;
              }
            }

            const voteBtn2 = await player1.$('text=VOTE');
            if (voteBtn2) {
              await voteBtn2.click();
              console.log('    Voted (P2)');
            }
          }
        }
      }

      // Wait for reveal phase
      await wait(3000);

      const revealPhase = await waitForText(player1, 'CORRECT ANSWER', 8000) ||
                          await waitForText(player1, 'GOT YA', 3000) ||
                          await waitForText(player1, 'NICE', 3000) ||
                          await waitForText(player1, 'TOO SLOW', 3000);

      if (!revealPhase) {
        bugs.push(`Round ${round}: Reveal phase did not show`);
      }

      // Wait for next round or game end
      await wait(8000);

      // Check if game ended
      const gameOver = await player1.$('text=GAME OVER');
      if (gameOver) {
        console.log('  Game Over!');
        break;
      }
    }

    // Check final scores
    await wait(2000);
    const gameOverScreen = await waitForText(player1, 'GAME OVER', 5000) ||
                            await waitForText(player1, 'LEADERBOARD', 5000);

    if (!gameOverScreen) {
      bugs.push('Game over screen did not display');
    }

    // Try to get scores from leaderboard
    const scoreElements = await player1.$$('.score-display');
    if (scoreElements.length >= 1) {
      const score1Text = await scoreElements[0]?.textContent();
      player1Score = parseInt(score1Text || '0') || 0;
      if (scoreElements.length >= 2) {
        const score2Text = await scoreElements[1]?.textContent();
        player2Score = parseInt(score2Text || '0') || 0;
      }
    }

    // Determine winner
    if (player1Score > player2Score) {
      winner = 'Player 1';
    } else if (player2Score > player1Score) {
      winner = 'Player 2';
    } else {
      winner = 'Tie';
    }

    console.log(`  Final scores: P1=${player1Score}, P2=${player2Score}, Winner=${winner}`);

    // Check Play Again button
    const playAgainBtn = await player1.$('text=PLAY AGAIN');
    if (!playAgainBtn) {
      bugs.push('Play Again button not found');
    }

    return {
      gameNum,
      success: true,
      player1Score,
      player2Score,
      winner,
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
      winner,
      rounds,
      bugs,
      duration: Date.now() - startTime,
    };
  } finally {
    await context1.close();
    await context2.close();
  }
}

async function runAllTests() {
  console.log('\n========================================');
  console.log('  FULL GAME TEST - 20 GAMES');
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
    ],
  });

  try {
    for (let i = 1; i <= NUM_GAMES; i++) {
      const result = await playGame(browser, i);
      results.push(result);

      // Collect bugs with counts
      for (const bug of result.bugs) {
        allBugs.set(bug, (allBugs.get(bug) || 0) + 1);
      }

      // Small delay between games
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
  const avgDuration = totalDuration / results.length;

  console.log(`Games played: ${NUM_GAMES}`);
  console.log(`Successful: ${successful}`);
  console.log(`Failed: ${failed}`);
  console.log(`Success rate: ${((successful / NUM_GAMES) * 100).toFixed(1)}%`);
  console.log(`Average game duration: ${(avgDuration / 1000).toFixed(1)}s`);
  console.log(`Total test time: ${(totalDuration / 1000).toFixed(1)}s`);

  if (failed > 0) {
    console.log('\n--- FAILED GAMES ---');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  Game ${r.gameNum}: ${r.error}`);
    });
  }

  console.log('\n--- BUGS FOUND (sorted by frequency) ---');
  if (allBugs.size === 0) {
    console.log('No bugs found!');
  } else {
    const sortedBugs = [...allBugs.entries()].sort((a, b) => b[1] - a[1]);
    sortedBugs.forEach(([bug, count], i) => {
      console.log(`${i + 1}. [${count}x] ${bug}`);
    });
  }

  console.log('\n--- GAME RESULTS ---');
  results.forEach(r => {
    const status = r.success ? '✓' : '✗';
    console.log(`${status} Game ${r.gameNum}: P1=${r.player1Score}, P2=${r.player2Score}, Rounds=${r.rounds}, Duration=${(r.duration/1000).toFixed(1)}s`);
  });

  // Summary
  if (allBugs.size > 0 || failed > 0) {
    console.log(`\n⚠️  Found ${allBugs.size} unique bugs across ${failed + results.filter(r => r.bugs.length > 0).length} games`);
  } else {
    console.log('\n✅ All games completed successfully with no bugs!');
  }
}

runAllTests().catch(console.error);
