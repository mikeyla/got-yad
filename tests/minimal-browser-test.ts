/**
 * Minimal Browser Test - Tries multiple approaches
 * Uses aggressive resource blocking and environment fixes
 */

import { chromium, firefox, Browser, Page } from 'playwright';

const BASE_URL = 'http://localhost:5173';

async function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testWithChromium(): Promise<boolean> {
  console.log('\n=== TRYING CHROMIUM WITH AGGRESSIVE BLOCKING ===\n');

  let browser: Browser | null = null;

  try {
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--disable-extensions',
        '--disable-background-networking',
        '--disable-sync',
        '--disable-translate',
        '--disable-features=TranslateUI',
        '--disable-default-apps',
        '--no-first-run',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
        '--single-process',
      ],
    });

    const context = await browser.newContext({
      ignoreHTTPSErrors: true,
      javaScriptEnabled: true,
      offline: false,
    });

    const page = await context.newPage();

    // Block ALL external requests - only allow localhost
    await page.route('**/*', async (route) => {
      const url = route.request().url();
      if (url.startsWith('http://localhost') || url.startsWith('data:')) {
        await route.continue();
      } else {
        console.log(`  Blocked: ${url.substring(0, 80)}`);
        await route.abort();
      }
    });

    page.on('console', msg => {
      if (!msg.text().includes('Download the React DevTools')) {
        console.log('  PAGE:', msg.text().substring(0, 100));
      }
    });
    page.on('pageerror', err => console.log('  ERROR:', err.message));
    page.on('crash', () => console.log('  CRASHED!'));

    console.log('Navigating to localhost...');
    const response = await page.goto(BASE_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    console.log(`Response: ${response?.status()}`);

    // Wait for React
    await wait(3000);

    // Check if page loaded
    const content = await page.content();
    console.log(`Page length: ${content.length} chars`);

    const hasCreateGame = await page.$('text=CREATE GAME');
    console.log(`CREATE GAME button: ${hasCreateGame ? 'FOUND' : 'NOT FOUND'}`);

    if (hasCreateGame) {
      console.log('✓ Chromium test PASSED!');
      return true;
    }

    return false;
  } catch (error: any) {
    console.log(`Chromium failed: ${error.message}`);
    return false;
  } finally {
    if (browser) await browser.close();
  }
}

async function testWithFirefox(): Promise<boolean> {
  console.log('\n=== TRYING FIREFOX ===\n');

  let browser: Browser | null = null;

  try {
    // Try with modified environment
    browser = await firefox.launch({
      headless: true,
      firefoxUserPrefs: {
        'network.dns.disablePrefetch': true,
        'network.prefetch-next': false,
        'browser.cache.disk.enable': false,
        'browser.cache.memory.enable': false,
      },
    });

    const context = await browser.newContext({
      ignoreHTTPSErrors: true,
    });

    const page = await context.newPage();

    // Block external requests
    await page.route('**/*', async (route) => {
      const url = route.request().url();
      if (url.startsWith('http://localhost') || url.startsWith('data:')) {
        await route.continue();
      } else {
        await route.abort();
      }
    });

    page.on('console', msg => console.log('  PAGE:', msg.text().substring(0, 100)));
    page.on('pageerror', err => console.log('  ERROR:', err.message));

    console.log('Navigating to localhost...');
    const response = await page.goto(BASE_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    console.log(`Response: ${response?.status()}`);
    await wait(3000);

    const hasCreateGame = await page.$('text=CREATE GAME');
    console.log(`CREATE GAME button: ${hasCreateGame ? 'FOUND' : 'NOT FOUND'}`);

    if (hasCreateGame) {
      console.log('✓ Firefox test PASSED!');
      return true;
    }

    return false;
  } catch (error: any) {
    console.log(`Firefox failed: ${error.message}`);
    return false;
  } finally {
    if (browser) await browser.close();
  }
}

async function runMinimalTest() {
  console.log('========================================');
  console.log('  MINIMAL BROWSER TEST');
  console.log('========================================');

  // Try Chromium first
  const chromiumOk = await testWithChromium();
  if (chromiumOk) {
    console.log('\n✓ Chromium works! Will use it for full tests.');
    return 'chromium';
  }

  // Try Firefox
  const firefoxOk = await testWithFirefox();
  if (firefoxOk) {
    console.log('\n✓ Firefox works! Will use it for full tests.');
    return 'firefox';
  }

  console.log('\n✗ No browser worked in this environment.');
  return null;
}

runMinimalTest().then(result => {
  if (result) {
    console.log(`\nRecommendation: Use ${result} for testing`);
  } else {
    console.log('\nBrowser testing not possible in this environment.');
    process.exit(1);
  }
}).catch(console.error);
