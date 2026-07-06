const { runTest, login } = require('./playwright-helper');

runTest('test-app-sweep', async (page) => {
  
    
    const errors = {};
  
    await login(page);
  
    for (const [name, path] of pages) {
      const pageErrors = [];
      const handler = (err) => pageErrors.push(err.message);
      
      try {
        await page.goto(`http://localhost:5173${path}`, { waitUntil: 'networkidle', timeout: 15000 });
        await page.waitForTimeout(900);
        await page.screenshot({ path: `sweep-${name}.png`, fullPage: true });
      } catch (e) {
        pageErrors.push('NAV_ERROR: ' + e.message);
      }
      page.off('pageerror', handler);
      if (pageErrors.length) errors[name] = pageErrors;
    }
  
    console.log('ERRORS:', JSON.stringify(errors, null, 2));
    
});
