const { runTest, login } = require('./playwright-helper');

runTest('test-tasks-interactive-v4', async (page) => {
  
    
  
    await login(page);
  
    // super-admin tenant page needs super-admin login; skip if not accessible; check tasks assignee picker instead
    await page.goto('http://localhost:5173/tasks', { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'shot-tasks.png', fullPage: true });
  
    const newTaskBtn = await page.locator('button', { hasText: /Create/i }).first();
    if (await newTaskBtn.count()) {
      await newTaskBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'shot-task-modal.png', fullPage: true });
    }
  
    
});
