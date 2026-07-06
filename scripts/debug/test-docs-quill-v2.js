const { runTest, login } = require('./playwright-helper');

runTest('test-docs-quill-v2', async (page) => {
  
    
     => console.log('PAGEERROR:', err.message));
  
    await login(page);
  
    await page.goto('http://localhost:5173/documents', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: 'shot-docs-before.png', fullPage: true });
  
    
});
