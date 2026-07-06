const { runTest, login } = require('./playwright-helper');

runTest('test-employees-interactive-v1', async (page) => {
  
    
     => console.log('CONSOLE:', msg.text()));
     => console.log('PAGEERROR:', err.message));
  
    await page.goto('http://localhost:5173/login/demo', { waitUntil: 'networkidle' }).catch(() => {});
    console.log('URL after goto:', page.url());
    await page.screenshot({ path: 'shot-1-login.png' });
  
    // Try to find email/password fields
    const emailInput = await page.$('input[type="email"], input[name="email"]');
    const passInput = await page.$('input[type="password"]');
    console.log('emailInput found:', !!emailInput, 'passInput found:', !!passInput);
  
    if (emailInput && passInput) {
      const slugInput = await page.$('input[name="slug"], input#slug, label:has-text("Tenant slug") + input');
      if (slugInput) await slugInput.fill('demo');
      else {
        const inputs = await page.$$('input');
        if (inputs.length >= 3) await inputs[0].fill('demo');
      }
      await emailInput.fill('owner@demo.test');
      await passInput.fill('DevPassw0rd1!');
      await page.screenshot({ path: 'shot-2-filled.png' });
      await page.click('button[type="submit"]');
      await page.waitForTimeout(2000);
      console.log('URL after login:', page.url());
      await page.screenshot({ path: 'shot-3-after-login.png' });
    }
  
    await page.goto('http://localhost:5173/departments', { waitUntil: 'networkidle' }).catch(() => {});
    await page.waitForTimeout(1000);
    console.log('departments URL:', page.url());
    await page.screenshot({ path: 'shot-4-departments.png', fullPage: true });
  
    await page.goto('http://localhost:5173/employees', { waitUntil: 'networkidle' }).catch(() => {});
    await page.waitForTimeout(1000);
    console.log('employees URL:', page.url());
    await page.screenshot({ path: 'shot-5-employees.png', fullPage: true });
  
    
});
