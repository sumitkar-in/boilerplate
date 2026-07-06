const { runTest, login } = require('./playwright-helper');

runTest('test-notes-interactive-v9', async (page) => {
  
    
     => { if (msg.type() === 'error') console.log('ERR:', msg.text()); });
     => console.log('PAGEERROR:', err.message));
  
    await login(page);
  
    await page.goto('http://localhost:5173/notes', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
  
    // Create a note via the composer
    await page.click('text=Take a note...');
    await page.waitForTimeout(300);
    await page.fill('.notes-composer input', 'Persistence test note');
    await page.fill('.notes-composer textarea', 'checking backend persistence');
    await page.click('.notes-composer__actions >> text=Save');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'shot-notes-created.png', fullPage: true });
  
    // Pin it
    const pinBtn = await page.locator('.notes-card__top button').first();
    await pinBtn.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'shot-notes-pinned.png', fullPage: true });
  
    // Reload the page fully - if pin persisted via API (not localStorage), it should still show pinned
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'shot-notes-after-reload.png', fullPage: true });
  
    
});
