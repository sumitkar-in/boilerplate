const { runTest, login } = require('./playwright-helper');

runTest('test-departments-interactive-v2', async (page) => {
  
    
     => console.log('PAGEERROR:', err.message));
  
    await login(page);
  
    await page.goto('http://localhost:5173/departments', { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
  
    // Click the "Eng" name cell to trigger inline edit
    const cell = await page.locator('td', { hasText: 'Eng' }).first();
    await cell.click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'shot-dept-editing.png' });
  
    // Check if an input appeared inside that cell
    const editInput = await page.locator('td input, td textarea').first();
    const count = await page.locator('td input, td textarea').count();
    console.log('editable inputs in table after click:', count);
  
    
});
