const { runTest, login } = require('./playwright-helper');

runTest('test-roles-debug', async (page) => {
  
    
     => console.log('PAGEERROR:', err.message, err.stack));
     => console.log('CONSOLE', msg.type(), msg.text()));
  
    await login(page);
    await page.goto('http://localhost:5173/settings/roles', { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
  
    await page.click('button:has-text("New role")');
    await page.waitForTimeout(1000);
    const modalCount = await page.$$eval('.ui-modal-overlay', (els) => els.length);
    console.log('modal overlay count:', modalCount);
  
    
});
