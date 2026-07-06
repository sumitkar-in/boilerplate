const { runTest, login } = require('./playwright-helper');

runTest('test-roles-check', async (page) => {
  
    
    await login(page);
    await page.goto('http://localhost:5173/settings/roles', { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    await page.screenshot({ path: 'shot-roles-check.png', fullPage: true });
    
});
