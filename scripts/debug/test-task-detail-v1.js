/* eslint-disable */
const { runTest, login } = require('./playwright-helper');

runTest('test-task-detail-v1', async (page) => {
    await login(page);
  
    await page.goto('http://localhost:5173/tasks', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'shot-tasks-board.png', fullPage: true });
  
    // create a task
    await page.click('button:has-text("Create")');
    await page.waitForTimeout(500);
    await page.fill('input#input-summary', 'Verify task detail page');
    await page.click('.ui-modal button:has-text("Save task")');
    await page.waitForTimeout(1200);
    console.log('URL after create:', page.url());
    await page.screenshot({ path: 'shot-task-detail.png', fullPage: true });
  
    // add a comment
    const textareas = await page.$$('textarea');
    await textareas[0].fill('This is a test comment');
    await page.click('button:has-text("Comment")');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'shot-task-detail-comment.png', fullPage: true });
  
    // change status
    await page.selectOption('.task-detail-status select', 'in_progress');
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'shot-task-detail-status.png', fullPage: true });
  
    
});
