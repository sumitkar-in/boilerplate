const { runTest, login } = require('./playwright-helper');

runTest('test-roles-new', async (page) => {
  
    
     => console.log('PAGEERROR:', err.message));
     => { if (msg.type() === 'error') console.log('CONSOLE ERROR:', msg.text()); });
     => { if (!res.ok() && res.url().includes('/api/')) console.log('BAD RESPONSE', res.status(), res.url()); });
  
    await login(page);
    await page.goto('http://localhost:5173/settings/roles', { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
  
    await page.click('button:has-text("New role")');
    await page.waitForTimeout(400);
    await page.screenshot({ path: 'shot-roles-new-modal.png', fullPage: true });
  
    await page.fill('input#input-key', 'qa-role-2');
    await page.fill('input#input-name', 'QA Role 2');
    await page.click('.ui-modal button:has-text("Create role")');
    await page.waitForTimeout(1200);
    await page.screenshot({ path: 'shot-roles-new-result.png', fullPage: true });
  
    
});
