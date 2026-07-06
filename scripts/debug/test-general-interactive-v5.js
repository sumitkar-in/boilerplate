const { runTest, login } = require('./playwright-helper');

runTest('test-general-interactive-v5', async (page) => {
  
    
     => console.log('PAGEERROR:', err.message));
  
    await page.goto('http://localhost:5173/super-admin/login', { waitUntil: 'networkidle' });
    const inputs = await page.$$('input');
    await inputs[0].fill('admin@example.com');
    await inputs[1].fill('SuperAdminPassw0rd1!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1500);
    console.log('after super admin login:', page.url());
  
    await page.goto('http://localhost:5173/admin/tenants', { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'shot-admin-tenants.png', fullPage: true });
  
    // click Open on first row
    const openBtn = await page.locator('button', { hasText: 'Open' }).first();
    if (await openBtn.count()) {
      await openBtn.click();
      await page.waitForTimeout(1000);
      console.log('tenant page url:', page.url());
      await page.screenshot({ path: 'shot-admin-tenant-page.png', fullPage: true });
    }
  
    
});
