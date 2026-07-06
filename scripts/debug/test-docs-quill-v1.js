const { runTest, login } = require('./playwright-helper');

runTest('test-docs-quill-v1', async (page) => {
  
    
     => console.log('PAGEERROR:', err.message));
  
    await login(page);
  
    await page.goto('http://localhost:5173/documents', { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
  
    // create a space if needed, then a page
    const hasSpace = await page.$('.documents-sidebar :text("ENG")');
    if (!hasSpace) {
      await page.click('text=Spaces >> xpath=following-sibling::button | //button[contains(@aria-label,"space")]').catch(() => {});
    }
    await page.screenshot({ path: 'shot-docs-before.png', fullPage: true });
  
    
});
