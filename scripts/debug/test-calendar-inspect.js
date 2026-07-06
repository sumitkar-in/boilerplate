const { runTest, login } = require('./playwright-helper');

runTest('test-calendar-inspect', async (page) => {
  
    
  
    await login(page);
  
    await page.goto('http://localhost:5173/calendar', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
  
    const info = await page.evaluate(() => {
      function box(sel) {
        const el = document.querySelector(sel);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        return { sel, w: r.width, h: r.height, display: cs.display, overflow: cs.overflow, tableLayout: cs.tableLayout, width: cs.width };
      }
      return [
        box('.calendar-picker-card'),
        box('.rdp'),
        box('.rdp table'),
        box('.rdp-month_grid'),
        box('.rdp-weekdays'),
        box('.rdp-week'),
        box('.rdp-weekday'),
        box('.rdp-day'),
      ];
    });
    console.log(JSON.stringify(info, null, 2));
  
    
});
