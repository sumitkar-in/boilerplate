const { runTest, login } = require('./playwright-helper');

runTest('test-roles-verify', async (page) => {
  
    
     => console.log('PAGEERROR:', err.message));
  
    await login(page);
  
    await page.goto('http://localhost:5173/settings/roles', { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'shot-roles-final.png', fullPage: true });
  
    
});
