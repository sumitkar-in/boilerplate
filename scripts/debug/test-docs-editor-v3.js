const { runTest, login } = require('./playwright-helper');

runTest('test-docs-editor-v3', async (page) => {
    page.on('pageerror', (err) => console.log('PAGEERROR:', err.message));

    await login(page);
  
    await page.goto('http://localhost:5173/documents', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
  
    await page.click('button[aria-label="Create page"]');
    await page.waitForTimeout(600);
    await page.click('button:has-text("Edit")');
    await page.waitForTimeout(600);
    await page.screenshot({ path: 'shot-docs-newpage.png', fullPage: true });
  
    // type into the rich text editor
    await page.click('.documents-rich-editor__input');
    await page.keyboard.type('Hello from the document editor. ');
    await page.keyboard.press('Control+B');
    await page.keyboard.type('bold text');
    await page.keyboard.press('Control+B');
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'shot-docs-typing.png', fullPage: true });
  
    // click a toolbar format
    await page.click('.documents-rich-editor__toolbar button:has-text("Quote")');
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'shot-docs-toolbar.png', fullPage: true });
  
    await page.click('button:has-text("Save")');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'shot-docs-saved.png', fullPage: true });
  
    
});
