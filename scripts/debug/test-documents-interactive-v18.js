const { runTest, login } = require('./playwright-helper');

runTest('test-documents-interactive-v18', async (page) => {
  
    
     => console.log('PAGEERROR:', err.message));
  
    await login(page);
  
    await page.goto('http://localhost:5173/documents', { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
  
    await page.click('button:has-text("Edit")');
    await page.waitForTimeout(400);
    await page.screenshot({ path: 'shot-doc-editor.png', fullPage: true });
  
    await page.fill('.documents-title-input', 'My Runbook');
    await page.fill('.documents-markdown-editor', '# Hello\n\nThis is **bold** content.');
    await page.click('button:has-text("Save")');
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'shot-doc-reader2.png', fullPage: true });
  
    await page.click('button:has-text("Comments")');
    await page.waitForTimeout(400);
    await page.fill('textarea', 'This looks good!');
    await page.click('button:has-text("Comment")');
    await page.waitForTimeout(600);
    await page.screenshot({ path: 'shot-doc-comments2.png', fullPage: true });
  
    await page.click('button:has-text("History")');
    await page.waitForTimeout(400);
    await page.screenshot({ path: 'shot-doc-history.png', fullPage: true });
  
    
});
