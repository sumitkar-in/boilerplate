/* eslint-disable */
const { runTest, login } = require('./playwright-helper');

runTest('test-task-detail-v2', async (page) => {
    await login(page);
  
    await page.goto('http://localhost:5173/task/TASK-000002', { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
  
    // clear the accidentally-saved description
    const descBox = await page.$('.task-detail-section textarea');
    await descBox.fill('');
    await page.click('.task-detail-title');
    await page.waitForTimeout(800);
  
    // fill the correct comment box
    await page.fill('.task-detail-comment-form textarea', 'This is a real test comment');
    await page.click('.task-detail-comment-form button:has-text("Comment")');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'shot-task-detail-comment2.png', fullPage: true });
  
    // delete flow
    await page.click('.task-detail-delete');
    await page.waitForTimeout(400);
    await page.screenshot({ path: 'shot-task-detail-delete-confirm.png', fullPage: true });
    await page.click('.ui-modal button:has-text("Delete")');
    await page.waitForTimeout(1000);
    console.log('URL after delete:', page.url());
  
    
});
