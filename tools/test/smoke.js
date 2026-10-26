const { chromium } = require('/usr/local/lib/pnpm/5/.pnpm/playwright-core@1.59.1/node_modules/playwright-core');
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push('PE ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('CE ' + m.text()); });
  await p.goto('http://127.0.0.1:8787/'); await p.waitForTimeout(1500);
  await p.screenshot({ path: '/tmp/th1.png' });
  console.log(await p.evaluate(() => document.getElementById('app').innerText.slice(0, 500)));
  console.log(errs.join('\n'));
  await b.close();
})();
