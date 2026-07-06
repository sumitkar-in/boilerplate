const { runTest, login } = require('./playwright-helper');

runTest('test-general-interactive-v6', async (page) => {
  
    
     => console.log('CONSOLE:', msg.text()));
     => {
      if (res.url().includes('/admin/tenants') && res.request().method() === 'GET') {
        console.log('RESPONSE', res.status(), res.url());
        try { console.log(await res.text()); } catch {}
      }
    });
  
    await page.goto('http://localhost:5173/super-admin/login', { waitUntil: 'networkidle' });
    const inputs = await page.$$('input');
    await inputs[0].fill('admin@example.com');
    await inputs[1].fill('SuperAdminPassw0rd1!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1500);
  
    await page.goto('http://localhost:5173/admin/tenants', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
  
    
});
