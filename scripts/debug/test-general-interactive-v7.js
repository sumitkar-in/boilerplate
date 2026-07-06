const { runTest, login } = require('./playwright-helper');

runTest('test-general-interactive-v7', async (page) => {
  
    
  
    await page.goto('http://localhost:5173/super-admin/login', { waitUntil: 'networkidle' });
    const inputs = await page.$$('input');
    await inputs[0].fill('admin@example.com');
    await inputs[1].fill('SuperAdminPassw0rd1!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1500);
  
    await page.goto('http://localhost:5173/admin/tenants/cb979f03-fcd8-4fb4-bf93-e45011e5a985', { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await page.mouse.wheel(0, 400);
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'shot-tenant-page-scrolled.png', fullPage: true });
  
    
});
