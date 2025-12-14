/**
 * Real Browser Test - Plays the game 20 times with two browser contexts
 * This simulates actual multiplayer gameplay
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
}

const results: GameResult[] = [];
const allBugs: string[] = [];

async function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForSelector(page: Page, selector: string, timeout = 10000): Promise<boolean> {
  try {
    await page.waitForSelector(selector, { timeout });
    return true;
  } catch {
    return false;
  }
}

async function playGame(browser: Browser, gameNum: number): Promise<GameResult> {
  const bugs: string[] = [];
  let player1Score = 0;
  let player2Score = 0;
  let winner = 'Unknown';
  let rounds = 0;

  // Create two separate browser contexts (like two different browsers)
  const context1 = await browser.newContext();
  const context2 = await browser.newContext();

  const player1 = await context1.newPage();
  const player2 = await context2.newPage();

  try {
    console.log(`\n--- GAME ${gameNum} ---`);

    // Player 1: Create game
    console.log('  P1: Opening home page...');
    await player1.goto(BASE_URL);
    await wait(1000);

    // Check home screen loaded
    const homeLoaded = await waitForSelector(player1, 'text=CREATE GAME', 5000);
    if (!homeLoaded) {
      bugs.push('Home screen did not load properly');
      throw new Error('Home screen failed to load');
    }

    console.log('  P1: Creating game...');
    await player1.click('text=CREATE GAME');
    await wait(500);

    // Enter nickname
    const nameInput = await player1.waitForSelector('input[placeholder="ENTER NAME"]', { timeout: 5000 });
    if (!nameInput) {
      bugs.push('Name input not found on create screen');
      throw new Error('Name input not found');
    }

    await nameInput.fill(`Player1_G${gameNum}`);
    await wait(300);

    // Click START
    await player1.click('text=START');
    await wait(1500);

    // Check we're in lobby
    const lobbyLoaded = await waitForSelector(player1, 'text=ROOM CODE', 5000);
    if (!lobbyLoaded) {
      bugs.push('Lobby screen did not load after creating game');
      throw new Error('Lobby failed to load');
    }

    // Get room code
    const roomCodeEl = await player1.waitForSelector('.arcade-font.text-3xl', { timeout: 5000 });
    const roomCode = await roomCodeEl?.textContent();
    if (!roomCode || roomCode.length !== 6) {
      bugs.push(`Invalid room code: ${roomCode}`);
      throw new Error('Invalid room code');
    }
    console.log(`  Room code: ${roomCode}`);

    // Check QR code exists
    const qrCode = await player1.$('svg[class*="qr"]') || await player1.$('.qr-container svg');
    if (!qrCode) {
      bugs.push('QR code not displayed in lobby');
    }

    // Check copy button exists
    const copyBtn = await player1.$('.copy-btn') || await player1.$('button[title="Copy room code"]');
    if (!copyBtn) {
      bugs.push('Copy button not found in lobby');
    }

    // Player 2: Join game
    console.log('  P2: Joining game...');
    await player2.goto(BASE_URL);
    await wait(1000);

    await player2.click('text=JOIN GAME');
    await wait(500);

    // Enter nickname and room code
    const nameInput2 = await player2.waitForSelector('input[placeholder="ENTER NAME"]', { timeout: 5000 });
    await nameInput2?.fill(`Player2_G${gameNum}`);
    await wait(300);

    const codeInput = await player2.waitForSelector('input[placeholder="ENTER CODE"]', { timeout: 5000 });
    await codeInput?.fill(roomCode);
    await wait(300);

    await player2.click('text=JOIN');
    await wait(2000);

    // Check P2 is in lobby
    const p2InLobby = await waitForSelector(player2, 'text=WAITING FOR HOST', 5000) ||
                       await waitForSelector(player2, `text=Player2_G${gameNum}`, 5000);
    if (!p2InLobby) {
      bugs.push('Player 2 could not join the lobby');
      throw new Error('P2 failed to join');
    }
    console.log('  P2: Joined lobby');

    // Check P1 sees P2
    await wait(1000);
    const p1SeesP2 = await player1.$(`text=Player2_G${gameNum}`);
    if (!p1SeesP2) {
      bugs.push('Player 1 does not see Player 2 in lobby (sync issue)');
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

    // Check both players are in submitting phase
    const p1InGame = await waitForSelector(player1, 'text=WRITE YOUR ANSWER', 5000) ||
                      await waitForSelector(player1, 'textarea', 5000);
    const p2InGame = await waitForSelector(player2, 'text=WRITE YOUR ANSWER', 5000) ||
                      await waitForSelector(player2, 'textarea', 5000);

    if (!p1InGame) {
      bugs.push('Player 1 did not enter game phase');
    }
    if (!p2InGame) {
      bugs.push('Player 2 did not enter game phase (sync issue)');
    }

    // Play through rounds (up to 5)
    for (let round = 1; round <= 5; round++) {
      rounds = round;
      console.log(`  Round ${round}...`);

      // Check for question display
      const questionEl = await player1.$('.arcade-card p');
      if (!questionEl) {
        bugs.push(`Round ${round}: Question not displayed`);
      }

      // Submit answers
      const textarea1 = await player1.$('textarea');
      const textarea2 = await player2.$('textarea');

      if (textarea1) {
        await textarea1.fill(`FakeAnswer_P1_R${round}_G${gameNum}`);
        await wait(200);
        const submitBtn1 = await player1.$('text=SUBMIT');
        if (submitBtn1) {
          await submitBtn1.click();
          console.log('    P1 submitted answer');
        } else {
          bugs.push(`Round ${round}: P1 submit button not found`);
        }
      }

      if (textarea2) {
        await textarea2.fill(`FakeAnswer_P2_R${round}_G${gameNum}`);
        await wait(200);
        const submitBtn2 = await player2.$('text=SUBMIT');
        if (submitBtn2) {
          await submitBtn2.click();
          console.log('    P2 submitted answer');
        } else {
          bugs.push(`Round ${round}: P2 submit button not found`);
        }
      }

      // Wait for voting phase
      await wait(3000);

      // Check voting phase
      const p1Voting = await waitForSelector(player1, 'text=PICK THE REAL ANSWER', 8000) ||
                        await waitForSelector(player1, '.answer-option', 8000);
      const p2Voting = await waitForSelector(player2, 'text=PICK THE REAL ANSWER', 8000) ||
                        await waitForSelector(player2, '.answer-option', 8000);

      if (!p1Voting) {
        bugs.push(`Round ${round}: P1 did not enter voting phase`);
      }
      if (!p2Voting) {
        bugs.push(`Round ${round}: P2 did not enter voting phase`);
      }

      // Vote (try to find and click an answer)
      await wait(500);
      const answerOptions1 = await player1.$$('.answer-option');
      const answerOptions2 = await player2.$$('.answer-option');

      // P1 votes for first available option (not their own)
      if (answerOptions1.length > 0) {
        // Try to find an answer that's not marked as "(YOUR ANSWER)"
        for (const opt of answerOptions1) {
          const text = await opt.textContent();
          if (!text?.includes('YOUR ANSWER')) {
            await opt.click();
            await wait(200);
            break;
          }
        }
        const voteBtn1 = await player1.$('text=VOTE');
        if (voteBtn1) {
          await voteBtn1.click();
          console.log('    P1 voted');
        }
      }

      if (answerOptions2.length > 0) {
        for (const opt of answerOptions2) {
          const text = await opt.textContent();
          if (!text?.includes('YOUR ANSWER')) {
            await opt.click();
            await wait(200);
            break;
          }
        }
        const voteBtn2 = await player2.$('text=VOTE');
        if (voteBtn2) {
          await voteBtn2.click();
          console.log('    P2 voted');
        }
      }

      // Wait for reveal phase
      await wait(3000);

      const revealPhase = await waitForSelector(player1, 'text=CORRECT ANSWER', 10000) ||
                          await waitForSelector(player1, 'text=GOT YA', 10000) ||
                          await waitForSelector(player1, 'text=NICE', 10000) ||
                          await waitForSelector(player1, 'text=TOO SLOW', 10000);

      if (!revealPhase) {
        bugs.push(`Round ${round}: Reveal phase did not show`);
      }

      // Wait for next round or game end
      await wait(10000);

      // Check if game ended
      const gameOver = await player1.$('text=GAME OVER');
      if (gameOver) {
        console.log('  Game Over!');
        break;
      }
    }

    // Check final scores
    await wait(2000);
    const gameOverScreen = await waitForSelector(player1, 'text=GAME OVER', 5000) ||
                            await waitForSelector(player1, 'text=LEADERBOARD', 5000);

    if (!gameOverScreen) {
      bugs.push('Game over screen did not display');
    }

    // Try to get scores from leaderboard
    const scoreElements = await player1.$$('.score-display');
    if (scoreElements.length >= 2) {
      const score1Text = await scoreElements[0].textContent();
      const score2Text = await scoreElements[1].textContent();
      player1Score = parseInt(score1Text || '0') || 0;
      player2Score = parseInt(score2Text || '0') || 0;
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
    };
  } finally {
    await context1.close();
    await context2.close();
  }
}

async function runAllTests() {
  console.log('\n========================================');
  console.log('  REAL BROWSER TEST - 20 GAMES');
  console.log('========================================\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    for (let i = 1; i <= NUM_GAMES; i++) {
      const result = await playGame(browser, i);
      results.push(result);

      // Collect unique bugs
      for (const bug of result.bugs) {
        if (!allBugs.includes(bug)) {
          allBugs.push(bug);
        }
      }

      // Small delay between games
      await wait(1000);
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

  console.log(`Games played: ${NUM_GAMES}`);
  console.log(`Successful: ${successful}`);
  console.log(`Failed: ${failed}`);
  console.log(`Success rate: ${((successful / NUM_GAMES) * 100).toFixed(1)}%`);

  if (failed > 0) {
    console.log('\nFailed games:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  Game ${r.gameNum}: ${r.error}`);
    });
  }

  console.log('\n--- BUGS FOUND ---');
  if (allBugs.length === 0) {
    console.log('No bugs found!');
  } else {
    allBugs.forEach((bug, i) => {
      console.log(`${i + 1}. ${bug}`);
    });
  }

  console.log('\n--- GAME RESULTS ---');
  results.forEach(r => {
    const status = r.success ? '✓' : '✗';
    console.log(`${status} Game ${r.gameNum}: P1=${r.player1Score}, P2=${r.player2Score}, Winner=${r.winner}, Rounds=${r.rounds}`);
  });

  // Return exit code based on bugs found
  if (allBugs.length > 0 || failed > 0) {
    console.log(`\n⚠️  Found ${allBugs.length} unique bugs and ${failed} failed games`);
  } else {
    console.log('\n✅ All games completed successfully with no bugs!');
  }
}

runAllTests().catch(console.error);
