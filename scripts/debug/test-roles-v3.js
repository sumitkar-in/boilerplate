const { runTest, login } = require('./playwright-helper');

runTest('test-roles-v3', async (page) => {
  
    
     => console.log('PAGEERROR:', err.message));
  
    await login(page);
  
    await page.goto('http://localhost:5173/settings/roles', { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
  
    await page.click('button:has-text("New role")');
    await page.waitForTimeout(300);
    await page.fill('input#input-key', 'qa-test-role');
    await page.fill('input#input-name', 'QA Test Role');
    await page.click('button:has-text("Create role")');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'shot-roles-created.png', fullPage: true });
  
    // delete it
    const row = page.locator('.members-list__row', { hasText: 'QA Test Role' });
    await row.locator('button:has-text("Delete")').click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: 'shot-roles-confirm.png', fullPage: true });
    await page.click('.ui-modal button:has-text("Delete")');
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'shot-roles-after-delete.png', fullPage: true });
  
    
});
