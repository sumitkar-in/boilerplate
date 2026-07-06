const { runTest, login } = require('./playwright-helper');

runTest('test-employees', async (page) => {
  
    
     => {});
     => { if (!res.ok()) console.log('BAD RESPONSE', res.status(), res.url()); });
  
    await login(page);
  
    await page.goto('http://localhost:5173/employees', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: 'sweep-employees.png', fullPage: true });
  
    const pending = await page.evaluate(() => performance.getEntriesByType('resource').filter(r => !r.responseEnd).map(r => r.name));
    console.log('pending resources', pending);
  
    
});
