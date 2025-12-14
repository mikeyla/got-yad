/**
 * Debug test - check why page isn't loading
 */

import { firefox } from 'playwright';

const BASE_URL = 'http://localhost:5173';

async function debugTest() {
  console.log('Starting debug test...');

  const browser = await firefox.launch({
    headless: true,
  });

  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();

  // Block external resources that might fail in sandboxed environment
  await page.route('**/*.{woff,woff2,ttf,otf}', route => route.abort());
  await page.route('**/fonts.googleapis.com/**', route => route.abort());
  await page.route('**/fonts.gstatic.com/**', route => route.abort());

  // Enable console logging
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  page.on('crash', () => console.log('PAGE CRASHED!'));

  try {
    console.log(`Navigating to ${BASE_URL}...`);
    const response = await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

    console.log(`Response status: ${response?.status()}`);
    console.log(`Response URL: ${response?.url()}`);

    // Wait a bit for React to render
    await page.waitForTimeout(3000);

    // Get page content
    const content = await page.content();
    console.log('\n--- PAGE HTML (first 2000 chars) ---');
    console.log(content.substring(0, 2000));

    // Try to find any text
    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log('\n--- PAGE TEXT ---');
    console.log(bodyText || '(empty)');

    // Check for specific elements
    const hasCreateGame = await page.$('text=CREATE GAME');
    const hasAnyButton = await page.$('button');
    const hasArcadeFont = await page.$('.arcade-font');

    console.log('\n--- ELEMENT CHECK ---');
    console.log(`CREATE GAME text: ${hasCreateGame ? 'FOUND' : 'NOT FOUND'}`);
    console.log(`Any button: ${hasAnyButton ? 'FOUND' : 'NOT FOUND'}`);
    console.log(`.arcade-font: ${hasArcadeFont ? 'FOUND' : 'NOT FOUND'}`);

    // Take screenshot
    await page.screenshot({ path: '/home/user/got-yad/tests/debug-screenshot.png' });
    console.log('\nScreenshot saved to tests/debug-screenshot.png');

  } catch (error: any) {
    console.log('Error:', error.message);
  } finally {
    await browser.close();
  }
}

debugTest();
