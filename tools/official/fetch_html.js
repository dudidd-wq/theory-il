// v1.16 (review #12 T1b): helper for fetch_cache.py – opens each official HTML page once in a real (headed) Chrome and
// writes its rendered text (document.body.innerText) to <out>/<stem>.txt. gov.il answers scripted/headless clients with a
// Cloudflare block page, so this needs a display (run it under `xvfb-run -a`, as fetch_cache.py does).
// usage: node fetch_html.js <outdir> <stem>=<url> [<stem>=<url> ...]
let pw;
for (const m of ['playwright-core', 'playwright', '/usr/local/lib/pnpm/5/.pnpm/playwright-core@1.59.1/node_modules/playwright-core']) {
  try { pw = require(m); break; } catch (e) {}
}
if (!pw) { console.error('playwright-core not found (npm i playwright-core)'); process.exit(2); }
const fs = require('fs'), path = require('path');
(async () => {
  const [out, ...jobs] = process.argv.slice(2);
  const exe = process.env.CHROME || ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find(f => fs.existsSync(f));
  const b = await pw.chromium.launch({ executablePath: exe, headless: false, args: ['--no-sandbox'] });
  const p = await b.newPage({ locale: 'he-IL' });
  for (const j of jobs) {
    const i = j.indexOf('='), stem = j.slice(0, i), url = j.slice(i + 1);
    try {
      await p.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    } catch (e) { console.error(stem, 'goto:', e.message.split('\n')[0]); }
    await p.waitForTimeout(3000);
    const t = await p.evaluate(() => document.body.innerText);
    fs.writeFileSync(path.join(out, stem + '.txt'), t);
    console.log(stem, t.length);
    await p.waitForTimeout(1500);   // one request per page, spaced out
  }
  await b.close();
})();
