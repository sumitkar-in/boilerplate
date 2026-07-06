const { runTest, login } = require('./playwright-helper');

runTest('test-settings-revert', async (page) => {
  
    
  
    await login(page);
  
    await page.goto('http://localhost:5173/settings/tenant/access-policy', { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    await page.fill('input[type="number"]', '480');
    await page.click('button:has-text("Save settings")');
    await page.waitForTimeout(800);
  
    
});
