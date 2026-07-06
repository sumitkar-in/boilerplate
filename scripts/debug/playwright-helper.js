const { chromium } = require('playwright');

/**
 * Standard test wrapper that runs the browser lifecycle, attaches event listeners,
 * and handles the login routine.
 * @param {string} testName The name of the test for logging purposes.
 * @param {function(Page): Promise<void>} testFn Callback function with browser page.
 */
async function runTest(testName, testFn) {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({
      ignoreHTTPSErrors: true,
      viewport: { width: 1400, height: 900 }
    });

    // Attach diagnostic error listeners
    page.on('pageerror', (err) => console.log(`[${testName}] PAGEERROR:`, err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.log(`[${testName}] CONSOLE ERROR:`, msg.text());
      }
    });
    page.on('response', (res) => {
      if (!res.ok() && res.url().includes('/api/')) {
        console.log(`[${testName}] BAD RESPONSE`, res.status(), res.url());
      }
    });

    await testFn(page);
  } catch (err) {
    console.error(`[${testName}] TEST FAILED:`, err);
  } finally {
    await browser.close();
  }
}

/**
 * Standard login procedure.
 * @param {Page} page The Playwright Page instance.
 * @param {string} [host='http://localhost:5173'] The host root URL.
 */
async function login(page, host = 'http://localhost:5173') {
  await page.goto(`${host}/login`, { waitUntil: 'networkidle' });
  const inputs = await page.$$('input');
  await inputs[0].fill('demo');
  await inputs[1].fill('owner@demo.test');
  await inputs[2].fill('DevPassw0rd1!');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1500);
}

module.exports = {
  runTest,
  login
};
