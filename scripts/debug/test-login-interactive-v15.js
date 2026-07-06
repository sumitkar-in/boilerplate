const { runTest, login } = require('./playwright-helper');

runTest('test-login-interactive-v15', async (page) => {
  
    
     => console.log('PAGEERROR:', err.message));
  
    await login(page);
  
    await page.goto('http://localhost:5173/bpql', { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'shot-bpql.png', fullPage: true });
  
    // open table settings/new table modal to check field-row grid alignment
    await page.click('button:has-text("New table")');
    await page.waitForTimeout(500);
    // add a field and switch it to select type to see the 4-column layout
    await page.click('button:has-text("Add field")');
    await page.waitForTimeout(300);
    const typeSelects = await page.$$('.bpql-field-row select');
    if (typeSelects.length) {
      await typeSelects[typeSelects.length - 1].selectOption('select');
      await page.waitForTimeout(300);
    }
    await page.screenshot({ path: 'shot-bpql-table-modal.png', fullPage: true });
  
    
});
