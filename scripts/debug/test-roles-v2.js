const { runTest, login } = require('./playwright-helper');

runTest('test-roles-v2', async (page) => {
  
    
     => console.log('PAGEERROR:', err.message));
  
    await login(page);
  
    await page.goto('http://localhost:5173/settings/roles', { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    await page.screenshot({ path: 'shot-roles2.png', fullPage: true });
  
    await page.click('button:has-text("New role")');
    await page.waitForTimeout(400);
    await page.screenshot({ path: 'shot-roles-modal.png', fullPage: true });
  
    
});
