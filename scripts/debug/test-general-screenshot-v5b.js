const { runTest } = require('./playwright-helper');

runTest('test-general-screenshot-v5b', async (page) => {
  
    
    await page.goto('http://localhost:5173/super-admin/login', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    console.log('url:', page.url());
    const inputCount = await page.locator('input').count();
    console.log('input count:', inputCount);
    await page.screenshot({ path: 'shot-sa-login.png' });
    
});
