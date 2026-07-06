const { runTest, login } = require('./playwright-helper');

runTest('test-roles-cal', async (page) => {
  
    
     => console.log('PAGEERROR:', err.message));
     => { if (msg.type() === 'error') console.log('CONSOLE ERROR:', msg.text()); });
  
    await login(page);
  
    await page.goto('http://localhost:5173/settings/roles', { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'shot-roles.png', fullPage: true });
  
    await page.goto('http://localhost:5173/calendar', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'shot-calendar.png', fullPage: true });
  
    
});
