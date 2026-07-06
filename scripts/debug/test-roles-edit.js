const { runTest, login } = require('./playwright-helper');

runTest('test-roles-edit', async (page) => {
  
    
     => console.log('PAGEERROR:', err.message));
  
    await login(page);
    await page.goto('http://localhost:5173/settings/roles', { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    await page.screenshot({ path: 'shot-roles-with-edit.png', fullPage: true });
  
    // create
    await page.click('button:has-text("New role")');
    await page.waitForTimeout(300);
    await page.fill('input#input-key', 'qa-edit-role');
    await page.fill('input#input-name', 'QA Edit Role');
    await page.click('.ui-modal button:has-text("Create role")');
    await page.waitForTimeout(1000);
  
    // edit it
    const row = page.locator('.members-list__row', { hasText: 'QA Edit Role' });
    await row.locator('button:has-text("Edit")').click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: 'shot-roles-edit-modal.png', fullPage: true });
    await page.fill('input#input-name', 'QA Edit Role Updated');
    await page.click('.ui-modal button:has-text("Save role")');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'shot-roles-edited.png', fullPage: true });
  
    // cleanup
    const updatedRow = page.locator('.members-list__row', { hasText: 'QA Edit Role Updated' });
    await updatedRow.locator('button:has-text("Delete")').click();
    await page.waitForTimeout(300);
    await page.click('.ui-modal button:has-text("Delete")');
    await page.waitForTimeout(800);
  
    
});
