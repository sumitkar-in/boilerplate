const { runTest, login } = require('./playwright-helper');

runTest('test-notes-interactive-v10', async (page) => {
  
    
     => {
      if (res.url().includes('/notes')) {
        console.log(res.request().method(), res.status(), res.url());
        try {
          const body = await res.text();
          if (body.length < 2000) console.log('  ->', body);
        } catch {}
      }
    });
  
    await login(page);
  
    await page.goto('http://localhost:5173/notes', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
  
    await page.click('text=Take a note...');
    await page.waitForTimeout(300);
    await page.fill('.notes-composer input', 'Persistence test note');
    await page.fill('.notes-composer textarea', 'checking backend persistence');
    await page.click('.notes-composer__actions >> text=Save');
    await page.waitForTimeout(1500);
  
    
});
