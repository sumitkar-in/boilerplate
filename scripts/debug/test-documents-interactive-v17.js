const { runTest, login } = require('./playwright-helper');

runTest('test-documents-interactive-v17', async (page) => {
  
    
     => console.log('PAGEERROR:', err.message));
  
    await login(page);
  
    await page.goto('http://localhost:5173/documents', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
  
    await page.click('button[aria-label="Create space"]');
    await page.waitForTimeout(400);
    const modalInputs = await page.$$('.ui-modal input, [role="dialog"] input');
    await page.fill('input[placeholder="ENG"]', 'ENG');
    await page.fill('input[placeholder="Engineering"]', 'Engineering');
    await page.click('button:has-text("Create")');
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'shot-doc-space-created.png', fullPage: true });
  
    await page.click('button[aria-label="Create page"]');
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'shot-doc-page-created.png', fullPage: true });
  
    // reader view - toggle to view mode via Cancel? Currently in edit mode (isEditing true after create)
    await page.fill('.documents-title-input', 'My Runbook');
    await page.fill('.documents-markdown-editor', '# Hello\n\nThis is **bold** content.');
    await page.click('button:has-text("Save")');
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'shot-doc-reader.png', fullPage: true });
  
    await page.click('button:has-text("Comments")');
    await page.waitForTimeout(400);
    await page.screenshot({ path: 'shot-doc-comments.png', fullPage: true });
  
    
});
