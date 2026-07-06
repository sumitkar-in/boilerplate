const { runTest, login } = require('./playwright-helper');

runTest('test-documents-interactive-v16', async (page) => {
  
    
     => console.log('PAGEERROR:', err.message));
  
    await login(page);
  
    await page.goto('http://localhost:5173/documents', { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'shot-documents.png', fullPage: true });
  
    
});
