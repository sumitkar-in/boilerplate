const { runTest, login } = require('./playwright-helper');

runTest('test-calendar-tagcheck', async (page) => {
  
    
    await login(page);
    await page.goto('http://localhost:5173/calendar', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    const tags = await page.evaluate(() => {
      const q = (s) => { const e = document.querySelector(s); return e ? e.tagName : null; };
      return { root: q('.rdp-root'), grid: q('.rdp-month_grid'), weekdays: q('.rdp-weekdays'), weekday: q('.rdp-weekday'), week: q('.rdp-week'), day: q('.rdp-day') };
    });
    console.log(JSON.stringify(tags));
    
});
