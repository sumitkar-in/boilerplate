const { runTest, login } = require('./playwright-helper');

runTest('test-settings-interactive-v13', async (page) => {
  
    
     => console.log('PAGEERROR:', err.message));
     => { if (msg.type() === 'error') console.log('CONSOLE ERR:', msg.text()); });
  
    await login(page);
  
    await page.goto('http://localhost:5173/settings/tenant', { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    console.log('url after nav to settings/tenant:', page.url());
    await page.screenshot({ path: 'shot-settings-branding.png', fullPage: true });
  
    await page.click('text=Dashboard');
    await page.waitForTimeout(500);
    console.log('url after clicking Dashboard:', page.url());
    await page.screenshot({ path: 'shot-settings-dashboard.png', fullPage: true });
  
    await page.click('text=Access policy');
    await page.waitForTimeout(500);
    console.log('url after clicking Access policy:', page.url());
    await page.screenshot({ path: 'shot-settings-access.png', fullPage: true });
  
    
});
