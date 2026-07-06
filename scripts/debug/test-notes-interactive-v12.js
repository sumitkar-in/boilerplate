const { runTest, login } = require('./playwright-helper');

runTest('test-notes-interactive-v12', async (page) => {
  
    
  
    await login(page);
  
    await page.goto('http://localhost:5173/notes', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
  
    // Pin the first note
    await page.locator('.notes-card__top button').first().click();
    await page.waitForTimeout(800);
  
    // Reload fully (new navigation, clears any in-memory react state)
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: 'shot-notes-pin-after-reload.png', fullPage: true });
  
    
});
