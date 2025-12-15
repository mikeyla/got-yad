import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:5173';

async function main() {
  console.log('Starting simple test...');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });

  const page = await browser.newPage();

  try {
    console.log('Navigating to', BASE_URL);
    await page.goto(BASE_URL, { timeout: 10000 });
    console.log('Page loaded');

    // Wait for page to render
    await page.waitForLoadState('domcontentloaded');
    console.log('DOM loaded');

    // Get page content
    const content = await page.content();
    console.log('Page content length:', content.length);
    console.log('Contains CREATE GAME:', content.includes('CREATE GAME'));

    // Try different selectors
    const btns = await page.$$('button');
    console.log('Found buttons:', btns.length);

    for (const btn of btns) {
      const text = await btn.textContent();
      console.log('  Button text:', text);
    }

    // Take screenshot for debugging
    await page.screenshot({ path: '/home/user/got-yad/tests/debug-screenshot.png' });
    console.log('Screenshot saved to tests/debug-screenshot.png');

    // Try to click
    if (content.includes('CREATE GAME')) {
      console.log('Trying to click CREATE GAME...');
      await page.click('button:text("CREATE GAME")', { timeout: 5000 });
      console.log('Clicked successfully!');

      await page.waitForTimeout(500);

      // Check for QR
      const qr = await page.$('.qr-container');
      console.log('QR container found:', !!qr);

      const roomCode = await page.locator('text=ROOM CODE:').textContent();
      console.log('Room code text:', roomCode);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
    console.log('Browser closed');
  }
}

main();
