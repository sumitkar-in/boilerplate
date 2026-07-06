const { runTest, login } = require('./playwright-helper');

runTest('test-settings-interactive-v14', async (page) => {
  
    
     => console.log('PAGEERROR:', err.message));
  
    await login(page);
  
    await page.goto('http://localhost:5173/settings/tenant', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
  
    await page.click('.tenant-settings-nav >> text=Dashboard');
    await page.waitForTimeout(500);
    console.log('url:', page.url());
    await page.screenshot({ path: 'shot-settings-dashboard2.png', fullPage: true });
  
    await page.click('.tenant-settings-nav >> text=Access policy');
    await page.waitForTimeout(500);
    console.log('url:', page.url());
    await page.screenshot({ path: 'shot-settings-access2.png', fullPage: true });
  
    // test save on Access policy
    await page.fill('input[type="number"]', '600');
    await page.click('button:has-text("Save settings")');
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'shot-settings-access-saved.png', fullPage: true });
  
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'shot-settings-access-reloaded.png', fullPage: true });
  
    
});
