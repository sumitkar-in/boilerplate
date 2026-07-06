const { runTest, login } = require('./playwright-helper');

runTest('test-notes-interactive-v11', async (page) => {
  
    
  
    await login(page);
  
    await page.goto('http://localhost:5173/notes', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: 'shot-notes-existing.png', fullPage: true });
  
    
});
