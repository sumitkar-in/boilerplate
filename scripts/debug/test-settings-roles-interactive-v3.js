const { runTest, login } = require('./playwright-helper');

runTest('test-settings-roles-interactive-v3', async (page) => {
  
    
  
    await login(page);
  
    await page.goto('http://localhost:5173/settings/roles', { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'shot-roles.png', fullPage: true });
  
    
});
