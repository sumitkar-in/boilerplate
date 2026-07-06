const { runTest, login } = require('./playwright-helper');

runTest('test-notes-interactive-v8', async (page) => {
  
    
     => { if (msg.type() === 'error') console.log('ERR:', msg.text()); });
  
    await login(page);
  
    await page.goto('http://localhost:5173/settings/members', { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'shot-members-settings.png', fullPage: true });
  
    const addBtn = await page.locator('button', { hasText: /Add a user/i }).first();
    if (await addBtn.count()) {
      await addBtn.click();
      await page.waitForTimeout(400);
      await page.screenshot({ path: 'shot-members-modal.png', fullPage: true });
    }
  
    await page.goto('http://localhost:5173/notes', { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'shot-notes.png', fullPage: true });
  
    await page.goto('http://localhost:5173/settings/roles', { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'shot-roles2.png', fullPage: true });
  
    
});
