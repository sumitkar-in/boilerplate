const { runTest, login } = require('./playwright-helper');

runTest('test-login-interactive-v21', async (page) => {
  
    
  
    await login(page);
  
    await page.goto('http://localhost:5173/knowledge-bot', { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'shot-kb-clean.png', fullPage: true });
  
    await page.fill('.knowledge-composer textarea', 'who are you?');
    await page.click('.knowledge-composer button:has-text("Send")');
    await page.waitForTimeout(8000);
    await page.evaluate(() => {
      const el = document.querySelector('.knowledge-messages');
      if (el) el.scrollTop = el.scrollHeight;
    });
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'shot-kb-clean-answer.png', fullPage: true });
  
    
});
