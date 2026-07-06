const { runTest, login } = require('./playwright-helper');

runTest('test-notes-cleanup', async (page) => {
  
    
  
    await login(page);
  
    await page.goto('http://localhost:5173/notes', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
  
    // Trash both test notes, then permanently delete them
    for (let i = 0; i < 2; i++) {
      const trashBtn = page.locator('.notes-card button[title="Trash"]').first();
      if (await trashBtn.count()) {
        await trashBtn.click();
        await page.waitForTimeout(600);
      }
    }
  
    await page.click('text=Trash');
    await page.waitForTimeout(600);
    for (let i = 0; i < 2; i++) {
      const deleteBtn = page.locator('.notes-card button[title="Delete forever"]').first();
      if (await deleteBtn.count()) {
        await deleteBtn.click();
        await page.waitForTimeout(400);
        const confirmBtn = page.locator('button', { hasText: 'Delete forever' }).last();
        if (await confirmBtn.count()) {
          await confirmBtn.click();
          await page.waitForTimeout(600);
        }
      }
    }
    await page.screenshot({ path: 'shot-notes-cleaned.png', fullPage: true });
  
    
});
