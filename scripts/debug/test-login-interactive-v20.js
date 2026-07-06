const { runTest, login } = require('./playwright-helper');

runTest('test-login-interactive-v20', async (page) => {
  
    
     => {
      if (res.url().includes('chat/stream')) console.log('STREAM RESPONSE', res.status());
    });
  
    await login(page);
  
    await page.goto('http://localhost:5173/knowledge-bot', { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
  
    await page.fill('.knowledge-composer textarea', 'who are you and what can you help with? answer in 2 sentences with one **bold** word and a - bullet list of 2 items');
    await page.click('.knowledge-composer button:has-text("Send")');
    await page.waitForTimeout(10000);
  
    // scroll chat messages to bottom
    await page.evaluate(() => {
      const el = document.querySelector('.knowledge-messages');
      if (el) el.scrollTop = el.scrollHeight;
    });
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'shot-kb-chat-scrolled.png', fullPage: true });
  
    
});
