// End-to-end tests: node tools/test/e2e.js [baseURL]   (default http://127.0.0.1:8787/)
// Runs every flow on a mobile (390x844, touch) and a desktop (1280x860) profile, plus axe-core on the main screens.
const { chromium } = require('/usr/local/lib/pnpm/5/.pnpm/playwright-core@1.59.1/node_modules/playwright-core');
const fs = require('fs'), path = require('path');
const BASE = process.argv[2] || 'http://127.0.0.1:8787/';
const AXE = fs.readFileSync(process.env.AXE || '/tmp/pw/node_modules/axe-core/axe.min.js', 'utf8');
const OUT = path.join(__dirname, 'out'); fs.mkdirSync(OUT, { recursive: true });
let fails = 0, passes = 0;
const ok = (c, msg) => { if (c) { passes++; console.log('  ✓ ' + msg); } else { fails++; console.log('  ✗ ' + msg); } };
async function axe(p, name, prof) {
  await p.waitForTimeout(350);   // let the .18s fade-in finish so contrast is measured at full opacity
  await p.waitForFunction(() => ['0', '1'].includes(getComputedStyle(document.getElementById('toast')).opacity));  // not mid-fade
  await p.evaluate(AXE);
  const r = await p.evaluate(() => axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] } }));
  const v = r.violations.filter(x => x.impact === 'serious' || x.impact === 'critical' || x.impact === 'moderate');
  ok(!v.length, `axe ${name}: ${v.length ? v.map(x => `${x.id}(${x.impact}) ${x.nodes.slice(0, 2).map(n => n.target.join(' ')).join(' | ')}`).join('; ') : 'no serious/moderate violations'}`);
  await p.screenshot({ path: path.join(OUT, `${prof}-${name}.png`), fullPage: true });
}
const go = async (p, hash) => { await p.evaluate(h => { location.hash = h; }, hash); await p.waitForTimeout(250); };
const text = p => p.evaluate(() => document.getElementById('app').innerText);
async function run(prof, opts) {
  console.log(`\n== ${prof}`);
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const ctx = await b.newContext({ ...opts, acceptDownloads: true, serviceWorkers: 'allow' });
  const p = await ctx.newPage();
  const errs = [], foreign = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  ctx.on('request', r => { const u = r.url(); if (!u.startsWith(new URL(BASE).origin) && !u.startsWith('data:') && !u.startsWith('blob:')) foreign.push(u); });
  let dialogAnswer = true; p.on('dialog', d => (dialogAnswer ? d.accept() : d.dismiss()));
  await p.goto(BASE); await p.waitForSelector('h1');
  ok((await p.getAttribute('html', 'dir')) === 'rtl' && (await p.title()) === 'תאוריה לנהיגה', 'RTL + Hebrew title');
  ok(/לא מוצר רשמי/.test(await text(p)), 'disclaimer on welcome');
  await axe(p, 'welcome', prof);
  // onboarding
  await p.click('a[href="#/onboard/1"]'); await p.waitForSelector('input[value="B"]');
  ok(await p.isDisabled('.row .btn.primary'), 'next disabled until class chosen');
  await axe(p, 'onboard-class', prof);
  await p.click('label:has(input[value="B"])'); await p.click('.row .btn.primary');
  await p.waitForSelector('input[value="en"]'); await axe(p, 'onboard-lang', prof);
  await p.click('a[href="#/onboard/3"]'); await p.fill('#nm', 'נועה<script>');
  await p.click('.row .btn.primary.big'); await p.waitForSelector('.drive');
  const s0 = await p.evaluate(() => window.__theory.S().profile);
  ok(s0.cls === 'B' && s0.lang === 'he' && s0.name === 'נועהscript', `profile saved + name sanitised (${s0.name})`);
  ok(await p.isVisible('#nav'), 'bottom nav visible');
  await axe(p, 'home', prof);
  // practice: answer 10, first wrong on purpose
  await go(p, '#/practice/mix'); await p.waitForSelector('.answers .ans');
  for (let i = 0; i < 10; i++) {
    const id = await p.evaluate(() => +document.querySelector('.qmeta .muted').textContent.match(/\d+/)[0]);
    const c = await p.evaluate(id => window.__theory.view(id).c, id);
    if (i === 0) await p.click('.iconbtn[aria-pressed]');            // bookmark the first question
    const sel = i < 3 ? `.answers .ans:not([data-i="${c}"])` : `.answers .ans[data-i="${c}"]`;
    await p.click(sel);
    if (i === 0) { ok(await p.isVisible('.ans.ok') && await p.isVisible('.ans.bad'), 'wrong answer: shows correct + wrong'); await axe(p, 'question-answered', prof); }
    await p.click('.next');
  }
  await p.waitForSelector('.result');
  ok(/7\s*\/\s*10|7 מתוך 10/.test(await text(p)), 'summary 7/10');
  const st1 = await p.evaluate(() => { const S = window.__theory.S(); return { xp: S.xp, n: Object.keys(S.q).length, bm: S.bm.length }; });
  ok(st1.xp === 76 && st1.n === 10 && st1.bm === 1, `XP/records/bookmark (${JSON.stringify(st1)})`);
  // keyboard answer
  await go(p, '#/practice/law'); await p.waitForSelector('.answers .ans'); await p.keyboard.press('2');
  ok(await p.isVisible('.next'), 'keyboard 1-4 answers'); await go(p, '#/home');
  // signs
  await go(p, '#/signs'); await p.click('a[href="#/signs/go"]'); await p.waitForSelector('.qimg');
  await p.waitForFunction(() => document.querySelector('.qimg').complete);
  ok(await p.evaluate(() => document.querySelector('.qimg').naturalWidth > 100), 'sign image loads locally');
  await axe(p, 'signs', prof); await go(p, '#/home');
  // review (3 wrong → mistakes)
  await go(p, '#/review'); await p.waitForSelector('h1');
  ok(/3/.test(await text(p)), 'review lists mistakes');
  await p.click('a[href="#/review/go"], a[href="#/review/all"]'); await p.waitForSelector('.answers .ans');
  ok(true, 'review session starts'); await go(p, '#/home');
  // bookmarks
  await go(p, '#/bookmarks'); await p.waitForSelector('.qlist li'); await axe(p, 'bookmarks', prof);
  // exam: leave guard
  await go(p, '#/exam'); await axe(p, 'exam-intro', prof);
  await p.click('.btn.primary.big'); await p.waitForSelector('#timer');
  ok(/40:00|39:5\d/.test(await p.textContent('#timer')), 'timer 40:00');
  dialogAnswer = false; await p.click('#nav a[data-route="home"]'); await p.waitForTimeout(400); dialogAnswer = true;
  ok(await p.isVisible('#timer'), 'leaving exam cancelled stays in exam');
  await axe(p, 'exam-question', prof);
  // answer all 30 correctly
  for (let i = 0; i < 30; i++) {
    const c = await p.evaluate(() => { const e = window.__theory.exam; return window.__theory.view(e.ids[e.i]).c; });
    await p.click(`.answers .ans[data-i="${c}"]`);
    if (i < 29) await p.click('.nav2 .btn.primary');
  }
  await p.click('.nav2 .btn:has-text("הגשה"), .nav2 .btn:has-text("Submit")'); await p.waitForSelector('.result.pass');
  ok(/30/.test(await text(p)), 'exam 30/30 pass'); await axe(p, 'exam-result', prof);
  // second exam: submit empty → fail
  await p.click('.row .btn.primary'); await p.waitForSelector('#timer');
  await p.click('.nav2 .btn:has-text("הגשה")'); await p.waitForSelector('.result.fail');
  ok(await p.evaluate(() => window.__theory.S().ex.length === 2 && window.__theory.S().ex[1][2] === 0), 'empty exam scored 0, history 2');
  // stats / parent / about / settings
  for (const r of ['stats', 'parent', 'about', 'settings']) { await go(p, '#/' + r); await p.waitForSelector('h1'); await axe(p, r, prof); }
  ok(/CC|Creative Commons/.test(await (async () => { await go(p, '#/about'); return text(p); })()), 'about credits CC BY');
  ok(/משרד התחבורה/.test(await text(p)), 'about names the ministry as source');
  // backup code → reset → restore → undo
  await go(p, '#/settings');
  await p.click('#bk-code'); await p.waitForSelector('.codeout textarea');
  const code = await p.inputValue('.codeout textarea'); ok(/^TH1U?-[\w-]+-[0-9a-f]{4}$/.test(code), 'backup code generated');
  const before = await p.evaluate(() => JSON.stringify(window.__theory.S().q));
  await p.click('.card.danger .btn'); await p.waitForSelector('a[href="#/onboard/1"]');
  ok(await p.evaluate(() => !window.__theory.S().profile), 'reset → welcome');
  await go(p, '#/settings'); await p.fill('#codein', code.slice(0, -1) + (code.endsWith('0') ? '1' : '0'));
  await p.click('#bk-restore'); await p.waitForTimeout(300);
  ok(/לא שלם|פגום/.test(await p.textContent('#toast')), `corrupted code rejected (${await p.textContent('#toast')})`);
  await p.fill('#codein', code); await p.click('#bk-restore'); await p.waitForSelector('.drive');
  ok(await p.evaluate(b => JSON.stringify(window.__theory.S().q) === b, before), 'restore from code: same progress');
  await go(p, '#/settings'); await p.waitForSelector('.card#backup');
  ok(await p.isVisible('#bk-undo'), 'undo restore offered');
  // file export → import (sanitised)
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#bk-export')]);
  const f = path.join(OUT, 'backup.json'); await dl.saveAs(f);
  const j = JSON.parse(fs.readFileSync(f, 'utf8')); ok(j.app === 'theory-il' && j.state.profile.cls === 'B', `backup file ${dl.suggestedFilename()}`);
  j.state.profile.name = '<img src=x onerror=alert(1)>'; j.state.profile.cls = 'ZZ'; j.state.evil = { a: 1 }; j.state.q['abc'] = [1, 2, 3, 4, 5]; j.state.xp = -5;
  const f2 = path.join(OUT, 'evil.json'); fs.writeFileSync(f2, JSON.stringify(j));
  await p.setInputFiles('#filein', f2); await p.waitForSelector('.drive');
  const ev = await p.evaluate(() => { const S = window.__theory.S(); return { name: S.profile.name, cls: S.profile.cls, evil: 'evil' in S, abc: 'abc' in S.q, xp: S.xp, imgs: document.querySelectorAll('img[src="x"]').length }; });
  ok(!/[<>]/.test(ev.name) && ev.cls === 'B' && !ev.evil && !ev.abc && ev.xp === 0 && !ev.imgs, `sanitised import ${JSON.stringify(ev)}`);
  // translations + UI language + theme
  await go(p, '#/settings'); await p.selectOption('#sl', 'en'); await p.waitForTimeout(400);
  await go(p, '#/practice/signs'); await p.waitForSelector('.qtext');
  ok((await p.getAttribute('.qtext', 'lang')) === 'en' && (await p.getAttribute('.qtext', 'dir')) === 'ltr', 'English question text, LTR inside RTL UI');
  await p.click('.qtools .chip'); ok((await p.getAttribute('.qtext', 'lang')) === 'he', 'toggle to official Hebrew');
  await go(p, '#/settings'); await p.selectOption('#su', 'en'); await p.waitForTimeout(300);
  ok((await p.getAttribute('html', 'dir')) === 'ltr' && (await p.getAttribute('html', 'lang')) === 'en', 'English UI is LTR');
  await go(p, '#/home'); await axe(p, 'home-en', prof);
  await go(p, '#/settings'); await p.selectOption('#su', 'he'); await p.selectOption('#st', 'dark'); await p.waitForTimeout(300);
  await go(p, '#/home'); await axe(p, 'home-dark', prof);
  await go(p, '#/exam'); await p.click('.btn.primary.big'); await p.waitForSelector('#timer'); await axe(p, 'exam-dark', prof);
  dialogAnswer = true; await go(p, '#/home');
  // persistence across reload + IndexedDB mirror recovery
  await p.reload(); await p.waitForSelector('.drive'); ok(true, 'progress survives reload');
  await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForSelector('.drive');
  ok(await p.evaluate(() => !!window.__theory.S().profile), 'recovered from IndexedDB after localStorage loss');
  // offline
  await p.evaluate(() => navigator.serviceWorker.ready); await p.reload(); await p.waitForSelector('.drive');
  await p.waitForFunction(async () => { const c = await caches.open('theory-il-img-v1'); return (await c.keys()).length >= 442; }, null, { timeout: 60000 }).catch(() => {});
  const nImg = await p.evaluate(async () => (await (await caches.open('theory-il-img-v1')).keys()).length);
  ok(nImg >= 442, `all question images precached (${nImg})`);
  await ctx.setOffline(true); await p.reload(); await p.waitForSelector('.drive');
  await go(p, '#/signs/go'); await p.waitForSelector('.qimg'); await p.waitForFunction(() => document.querySelector('.qimg').complete);
  ok(await p.evaluate(() => document.querySelector('.qimg').naturalWidth > 100), 'works offline (shell + images)');
  await ctx.setOffline(false);
  ok(!foreign.length, `no third-party requests ${foreign.slice(0, 3).join(' ')}`);
  ok(!errs.length, `no console/page errors ${errs.slice(0, 3).join(' | ')}`);
  // horizontal overflow check
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'no horizontal overflow');
  await b.close();
}
(async () => {
  await run('mobile', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale: 'he-IL' });
  await run('desktop', { viewport: { width: 1280, height: 860 }, locale: 'he-IL' });
  console.log(`\n${passes} passed, ${fails} failed`); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
