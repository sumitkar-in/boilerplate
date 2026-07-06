const { runTest, login } = require('./playwright-helper');

runTest('test-login-interactive-v19', async (page) => {
  
    
     => console.log('PAGEERROR:', err.message));
  
    await login(page);
  
    await page.goto('http://localhost:5173/knowledge-bot', { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'shot-kb-page.png', fullPage: true });
  
    // ask a question
    await page.fill('.knowledge-composer textarea', 'who are you and what can you help with? answer in 2 sentences with one **bold** word and a - bullet list of 2 items');
    await page.click('.knowledge-composer button:has-text("Send")');
    await page.waitForTimeout(8000);
    await page.screenshot({ path: 'shot-kb-chat.png', fullPage: true });
  
    
});
