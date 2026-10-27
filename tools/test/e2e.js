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
  // a toast that fades out while axe runs gives a bogus contrast result: let any toast finish first (its contrast is checked on its own below)
  await p.waitForFunction(() => { const e = document.getElementById('toast'); return !e.classList.contains('show') && getComputedStyle(e).opacity === '0'; }, null, { timeout: 15000 });
  await p.evaluate(AXE);
  const r = await p.evaluate(() => axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] } }));
  const v = r.violations;   // every impact, minor included (review #3 finding 10)
  if (v.length && process.env.AXEDBG) console.log(JSON.stringify(v.map(x => x.nodes.map(n => [n.html, n.failureSummary]))));
  ok(!v.length, `axe ${name}: ${v.length ? v.map(x => `${x.id}(${x.impact}) ${x.nodes.slice(0, 2).map(n => n.target.join(' ')).join(' | ')}`).join('; ') : 'no violations'}`);
  await p.screenshot({ path: path.join(OUT, `${prof}-${name}.png`), fullPage: true });
}
// v1.20.1 (review #17 #4): the live site's first load (cold CDN + service-worker install) can be slow – wait longer and retry once
async function load(p) {
  for (let i = 0; ; i++) {
    try { await p.goto(BASE, { timeout: 90000, waitUntil: 'domcontentloaded' }); await p.waitForSelector('h1', { timeout: 60000 }); return; }
    catch (e) { if (i) throw e; console.log('  (slow first load – retrying once)'); }
  }
}
const go = async (p, hash) => { await p.evaluate(h => { location.hash = h; }, hash); await p.waitForTimeout(250); };
const text = p => p.evaluate(() => document.getElementById('app').innerText);
// no test hook in the app: state is read from localStorage, correct answers from the published data files
const S = p => p.evaluate(() => JSON.parse(localStorage.getItem('theoryIL.state') || 'null') || {});
const META = p => p.evaluate(() => JSON.parse(localStorage.getItem('theoryIL.meta') || '{}'));
let QH = null; const correct = id => QH.get(id).c;
const curId = p => p.evaluate(() => +document.querySelector('.qmeta .muted').textContent.match(/\d+/)[0]);
async function run(prof, opts) {
  console.log(`\n== ${prof}`);
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const ctx = await b.newContext({ ...opts, acceptDownloads: true, serviceWorkers: 'allow' });
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new URL(BASE).origin });
  const p = await ctx.newPage();
  const errs = [], foreign = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  ctx.on('request', r => { const u = r.url(); if (!u.startsWith(new URL(BASE).origin) && !u.startsWith('data:') && !u.startsWith('blob:')) foreign.push(u); });
  let dialogAnswer = true; p.on('dialog', d => (dialogAnswer ? d.accept() : d.dismiss()));
  await load(p);
  QH ||= new Map((await p.evaluate(() => fetch('data/q.he.json').then(r => r.json()))).map(q => [q.id, q]));
  ok(await p.evaluate(() => !('__theory' in window)), 'no test hook in production');
  ok(/עודכן לאחרונה/.test(await text(p)) && await p.isVisible('img.hero'), 'welcome: bank-date notice + illustration');
  ok((await p.getAttribute('html', 'dir')) === 'rtl' && (await p.title()) === 'תאוריה לנהיגה', 'RTL + Hebrew title');
  ok(/לא מוצר רשמי/.test(await text(p)), 'disclaimer on welcome');
  await axe(p, 'welcome', prof);
  // onboarding
  await p.click('a[href="#/onboard/1"]'); await p.waitForSelector('input[value="B"]');
  ok(await p.isDisabled('.row .btn.primary'), 'next disabled until class chosen');
  await axe(p, 'onboard-class', prof);
  await p.click('label:has(input[value="B"])'); await p.waitForSelector('.elig');
  ok(/15 וחצי/.test(await p.textContent('.elig')) && (await p.getAttribute('.elig a', 'href')).includes('oldid=3085628'), 'eligibility for class B with a cited law link');
  await axe(p, 'onboard-elig', prof);
  await p.click('.row .btn.primary');
  await p.waitForSelector('input[value="en"]'); await axe(p, 'onboard-lang', prof);
  await p.click('a[href="#/onboard/3"]'); await p.fill('#nm', 'נועה<script>');
  await p.click('.row .btn.primary.big'); await p.waitForSelector('.drive');
  const s0 = (await S(p)).profile;
  ok(s0.cls === 'B' && s0.lang === 'he' && s0.name === 'נועהscript', `profile saved + name sanitised (${s0.name})`);
  ok(await p.isVisible('#nav'), 'bottom nav visible');
  { const bb = await p.locator('a.brand').first().boundingBox(); ok(bb && bb.height >= 44 && bb.width >= 44, `logo link tap target ≥ 44px (${bb && Math.round(bb.width)}x${bb && Math.round(bb.height)})`); }
  await axe(p, 'home', prof);
  // practice: answer 10, first wrong on purpose
  await go(p, '#/practice/mix'); await p.waitForSelector('.answers .ans');
  for (let i = 0; i < 10; i++) {
    const c = correct(await curId(p));
    if (i === 0) await p.click('.iconbtn[aria-pressed]');            // bookmark the first question
    const sel = i < 3 ? `.answers .ans:not([data-i="${c}"])` : `.answers .ans[data-i="${c}"]`;
    await p.click(sel);
    if (i === 0) { ok(await p.isVisible('.ans.ok') && await p.isVisible('.ans.bad'), 'wrong answer: shows correct + wrong'); await axe(p, 'question-answered', prof); }
    if (i === 0) { const k = await p.evaluate(async id => { const m = await import('./js/learn.js'); const [cov, sg] = await Promise.all(['data/coverage.json', 'data/signs.json'].map(u => fetch(u).then(r => r.json()))); const x = m.explain(id, 'B', cov, sg); return [x?.kind, !!x?.lesson]; }, await curId(p));
      ok(await p.isVisible('.why') && await p.locator('.why a.btn.primary[data-learn]').count() === (k[1] ? 1 : 0), `wrong answer: why box + lesson link whenever a lesson shows the question (${k[0]}${k[1] ? ', linked' : ''})`);
      if (k[1]) ok(/^(לשיעור מהמאגר|ללמוד את זה):/.test(await p.textContent('.why a[data-learn]')) && (k[0] === 'none') === /^לשיעור מהמאגר/.test(await p.textContent('.why a[data-learn]')), 'lesson link: "לשיעור מהמאגר" for a bank-only lesson, "ללמוד את זה" only when a rule explains it');
      ok(!/הישג/.test(await p.textContent('#toast')), 'no achievement toast on a wrong answer'); }
    if (i === 3 && await p.locator('.why').count()) ok(await p.locator('.why a.btn.primary').count() === 0, 'right answer: related lesson is a quiet link');
    await p.click('.next');
  }
  await p.waitForSelector('.result');
  ok(/7\s*\/\s*10|7 מתוך 10/.test(await text(p)), 'summary 7/10');
  const st1 = await (async () => { const s = await S(p); return { xp: s.xp, n: Object.keys(s.q).length, bm: s.bm.length, v: s.v }; })();
  ok(st1.xp === 76 && st1.n === 10 && st1.bm === 1 && st1.v === 2, `XP/records/bookmark (${JSON.stringify(st1)})`);
  // keyboard answer
  await go(p, '#/practice/law'); await p.waitForSelector('.answers .ans'); await p.keyboard.press('2');
  ok(await p.isVisible('.next'), 'keyboard 1-4 answers'); await go(p, '#/home');
  // signs
  await go(p, '#/signs'); await p.click('a[href="#/signs/go"]'); await p.waitForSelector('.answers .ans'); await p.waitForSelector('.qcard .qimg');
  await p.waitForFunction(() => document.querySelector('.qcard .qimg').complete);
  ok(await p.evaluate(() => document.querySelector('.qcard .qimg').naturalWidth > 100), 'sign image loads locally');
  await axe(p, 'signs', prof); await go(p, '#/home');
  // v1.22: sign flashcards – picture → (flip) official number + meaning + source; self-rating moves the card's own Leitner box (local, kept in backups)
  { const SG = await p.evaluate(() => fetch('data/signs.json').then(r => r.json())); await go(p, '#/signs'); await p.waitForSelector('#fc-stat');
    await p.click('a[href="#/signs/cards"]'); await p.waitForSelector('#fc-show'); const n = await p.getAttribute('.fccard', 'data-n');
    const hid = await p.isHidden('#fc-back'); await p.click('#fc-show'); const bt = await p.textContent('#fc-back');
    ok(hid && SG.img[n] && (await p.getAttribute('.fccard .fcimg', 'src')).endsWith(SG.img[n]) && bt.includes(SG.e[n].slice(0, 30)) && bt.includes('תמרור ' + n)
      && await p.getAttribute('#fc-back a.chip', 'href') === SG.src.url && /כרטיס 1 מתוך 10/.test(await p.textContent('#fc-pos')), `flashcard ${n}: picture, flip → official meaning + number + sign-table link`);
    await axe(p, 'flashcard', prof);
    const d0 = await p.evaluate(() => Math.floor((Date.now() - new Date().getTimezoneOffset() * 6e4) / 864e5));
    await p.click('#fc-yes'); await p.waitForSelector('#fc-pos:has-text("כרטיס 2")'); const m = await p.getAttribute('.fccard', 'data-n');
    await p.click('#fc-show'); await p.click('#fc-no'); const fc = (await S(p)).fc;
    ok(JSON.stringify(fc[n]) === JSON.stringify([1, d0 + 1, 1, 1]) && JSON.stringify(fc[m]) === JSON.stringify([0, d0, 1, 0]), `self-rating: 'ידעתי' → back in 1 day, 'עוד לא' → today ${JSON.stringify([fc[n], fc[m]])}`);
    await go(p, '#/signs/cards/txt'); await p.waitForSelector('#fc-show');
    ok(await p.isVisible('.fccard > .fcmean') && !(await p.isVisible('.fcimg')), 'meaning → picture mode: meaning first, picture after the flip');
    await p.click('#fc-show'); ok(await p.isVisible('#fc-back .fcimg'), 'flip shows the picture'); }
  // review (3 wrong → mistakes)
  await go(p, '#/review'); await p.waitForSelector('h1');
  ok(+((await text(p)).match(/(\d+) טעויות/) || [0, 0])[1] >= 3, 'review lists mistakes');
  ok(await p.locator('a[href^="#/review/all-"]').count() >= 1, 'mistakes filter by topic offered');
  { const taught = await p.evaluate(async () => { const m = await import('./js/learn.js'); const [cov, sg] = await Promise.all(['data/coverage.json', 'data/signs.json'].map(u => fetch(u).then(r => r.json())));
      const st = JSON.parse(Object.entries(localStorage).find(([k]) => k === 'theoryIL.state')?.[1] || '{}'); const qs = Object.entries(st.q || st.qs || {}).filter(([, r]) => Array.isArray(r) && r[2] > r[3] && r[0] < 3).map(([k]) => +k);
      return qs.filter(id => m.explain(id, 'B', cov, sg)?.lesson).length; });
    const n = await p.locator('#rv-lessons a[data-learn]').count();
    ok(taught === null ? n >= 0 : (taught > 0 ? n >= 1 && await p.locator('a[href^="#/review/ln-"]').count() >= 1 : n === 0), `mistakes grouped by lesson (${n} lesson links, ${taught} taught mistakes)`); }
  await p.click('a[href="#/review/go"], a[href="#/review/all"]'); await p.waitForSelector('.answers .ans');
  ok(true, 'review session starts'); await go(p, '#/home');
  // v1.22: 'תרגול יומי' – 10 questions, the questions missed today come first; 'תרגל את החלשים' – from the learner's own weakest lesson
  { await go(p, '#/home'); await p.waitForSelector('#dy-mix'); const s0 = await S(p), wrong = Object.entries(s0.q).filter(([, r]) => r[2] > r[3] && r[0] < 3).map(([k]) => +k);
    const nd = +((await p.textContent('#dy-mix')).match(/(\d+) לחזרה/) || [])[1];
    ok(/^10 שאלות להיום/.test(await p.textContent('#dy-mix')) && nd >= wrong.length && /חוזרת אחרי יום, 3 ימים ושבוע/.test(await p.textContent('#dy-mix')) && /אחרי עוד כמה תשובות/.test(await p.textContent('#wk-list')),
      `home: daily practice card (10 questions, ${nd} due incl. ${wrong.length} missed), no weak spots yet`);
    await p.click('a[href="#/practice/daily"]'); await p.waitForSelector('.answers .ans'); const seen = [];
    for (let i = 0; i < 10; i++) { seen.push(await curId(p)); await p.click(`.answers .ans[data-i="${correct(seen[i])}"]`); await p.click('.next'); }
    await p.waitForSelector('.result');
    ok(wrong.every(id => seen.includes(id)) && new Set(seen).size === 10, `daily practice: 10 questions, all ${wrong.length} missed ones included`);
    const L = (await p.evaluate(() => fetch('data/lessons.json').then(r => r.json()))).lessons.find(l => l.cls.includes('B') && l.quiz?.length >= 5), raw = await p.evaluate(() => localStorage.getItem('theoryIL.state'));
    const mine = await p.evaluate(async ([qs, lid]) => { const m = await import('./js/learn.js'); const [cov, sg] = await Promise.all(['data/coverage.json', 'data/signs.json'].map(u => fetch(u).then(r => r.json())));
      return qs.filter(id => m.explain(id, 'B', cov, sg)?.lesson?.id === lid); }, [L.quiz, L.id]);
    await p.evaluate(ids => { const s = JSON.parse(localStorage.getItem('theoryIL.state')); ids.forEach(id => { s.q[id] = [0, 99999, 2, 0, 1]; }); localStorage.setItem('theoryIL.state', JSON.stringify(s)); }, mine);
    await p.reload(); await go(p, '#/home'); await p.waitForSelector('#wk-list');
    const wl = await p.textContent('#wk-list');
    ok(mine.length >= 2 && wl.includes(L.title) && /\(0%\)/.test(wl) && await p.locator('a[href="#/practice/weak"]').count() === 1, `weak spots from own answers: '${L.title}' (0%) listed`);
    await p.click('a[href="#/practice/weak"]'); await p.waitForSelector('.answers .ans');
    { const c0 = await curId(p), lt = await p.evaluate(async id => { const m = await import('./js/learn.js'); const [cov, sg] = await Promise.all(['data/coverage.json', 'data/signs.json'].map(u => fetch(u).then(r => r.json())));
        return m.explain(id, 'B', cov, sg)?.lesson?.title || ''; }, c0);
      ok(mine.includes(c0) || (lt && wl.includes(lt)), `weak-spots practice starts with a question of a listed weak lesson (${lt})`); }
    await p.evaluate(r => localStorage.setItem('theoryIL.state', r), raw); await p.reload(); await p.waitForSelector('h1'); }
  // search by text and by number
  await go(p, '#/search'); await p.waitForSelector('#sq'); await p.fill('#sq', 'חגורת בטיחות'); await p.waitForTimeout(400);
  const nRes = +((await text(p)).match(/(\d+) תוצאות/) || [0, 0])[1];
  ok(nRes > 3 && (await p.locator('.sres .qlist li').count()) === Math.min(40, nRes) && !/null/.test(await p.textContent('.sres')), `search by text (${nRes})`);
  await axe(p, 'search', prof);
  await p.fill('#sq', '1535'); await p.waitForTimeout(400);
  ok(/1 תוצאות/.test(await text(p)) && /1535/.test(await p.textContent('.sres .qlist li')), 'search by question number');
  await p.click('a[href="#/search/go"]'); await p.waitForSelector('.answers .ans'); ok((await curId(p)) === 1535, 'practise search results');
  // v1.20 (review #16 N1): Q584's why box shows sign 626's whole entry incl. 'כוחו יפה: עד לצומת הקרוב' (v1.19 cut it at 220 chars)
  await go(p, '#/search'); await p.waitForSelector('#sq'); await p.fill('#sq', '584'); await p.waitForTimeout(400);
  if (/584/.test(await p.textContent('.sres'))) {
    await p.click('a[href="#/search/go"]'); await p.waitForSelector('.answers .ans'); const i84 = await curId(p), c84 = correct(i84);
    await p.click(`.answers .ans:not([data-i="${c84}"])`); await p.waitForSelector('.why');
    const w84 = await p.textContent('.why');
    ok(i84 === 584 && /כוחו יפה: עד לצומת הקרוב/.test(w84) && !/…/.test(w84), 'why box: sign 626 shown whole with its "כוחו יפה" column (Q584)');
  }
  // v1.15 (review #11 F1): a class-A question opened via search under class B still shows its (A) lesson, not "not explained yet"
  await go(p, '#/search'); await p.waitForSelector('#sq'); await p.fill('#sq', '1595'); await p.waitForTimeout(400);
  if (/1595/.test(await p.textContent('.sres'))) {
    await p.click('a[href="#/search/go"]'); await p.waitForSelector('.answers .ans'); const c95 = correct(await curId(p));
    await p.click(`.answers .ans:not([data-i="${c95}"])`); await p.waitForSelector('.why');
    const wt = await p.textContent('.why'), lk = await p.getAttribute('.why a[data-learn]', 'href').catch(() => null);
    ok(!/עדיין לא מוסבר/.test(wt) && /^#\/learn\/moto\/peek$/.test(lk || ''), `class-A Q1595 under class B: why box links its lesson read-only (${lk})`);
    await go(p, lk || '#/learn/moto/peek'); await p.waitForTimeout(300); ok(/#\/learn\/moto\/peek$/.test(p.url()) && await p.locator('.rules, .rule, .lstep').count() > 0, 'other-class lesson opens read-only');
  } else ok(false, 'search finds class-A Q1595 under class B');
  // v1.15 (review #11): widget controls are ≥24px tap targets
  for (const l of ['signs', 'signs3', 'speed', 'rules3']) {
    await go(p, '#/learn/' + l + '/peek'); await p.waitForTimeout(400);
    const sm = await p.evaluate(() => [...document.querySelectorAll('.viz input, .viz select, .viz button')].filter(e => e.offsetParent).map(e => { const b = e.getBoundingClientRect(); return [e.id || e.type, Math.round(b.width), Math.round(b.height)]; }).filter(x => x[1] < 24 || x[2] < 24));
    ok(!sm.length, `${l}: widget controls ≥24px ${JSON.stringify(sm)}`);
  }
  await go(p, '#/home');
  // bookmarks
  await go(p, '#/bookmarks'); await p.waitForSelector('.qlist li'); await axe(p, 'bookmarks', prof);
  // exam: leave guard
  await go(p, '#/exam'); await axe(p, 'exam-intro', prof);
  await p.click('.btn.primary.big'); await p.waitForSelector('#timer');
  ok(/40:00|39:5\d/.test(await p.textContent('#timer')), 'timer 40:00');
  dialogAnswer = false; await p.click('#nav a[data-route="home"]'); await p.waitForTimeout(400); dialogAnswer = true;
  ok(await p.isVisible('#timer'), 'leaving exam cancelled stays in exam');
  await axe(p, 'exam-question', prof);
  // topic-weighted mix: per-topic counts match the class pool's shares (largest remainder, ±1)
  const ex0 = await p.evaluate(() => JSON.parse(localStorage.getItem('theoryIL.exam')));
  const shares = {}, got = {}; for (const q of QH.values()) if (q.t.includes('B')) shares[q.k] = (shares[q.k] || 0) + 1;
  const tot = Object.values(shares).reduce((a, b) => a + b, 0); for (const id of ex0.ids) got[QH.get(id).k] = (got[QH.get(id).k] || 0) + 1;
  ok(ex0.ids.length === 30 && Object.keys(shares).every(k => Math.abs((got[k] || 0) - 30 * shares[k] / tot) < 1.01), `exam topic mix ${JSON.stringify(got)}`);
  // answer 2, reload → resume with the same answers and deadline
  for (let i = 0; i < 2; i++) { await p.click(`.answers .ans[data-i="${correct(await curId(p))}"]`); await p.click('.nav2 .btn.primary'); }
  await p.reload(); await p.waitForSelector('.banner');
  ok(/ענית על 2 מתוך 30/.test(await text(p)), 'unfinished exam offered after reload');
  await p.click('.banner .btn.primary'); await p.waitForSelector('#timer');
  ok((await p.locator('.gbtn.done').count()) === 2, 'exam resumed with its answers');
  // answer all 30 correctly
  await p.click('.grid summary'); await p.click('.gbtn >> nth=0');
  for (let i = 0; i < 30; i++) {
    await p.click(`.answers .ans[data-i="${correct(await curId(p))}"]`);
    if (i < 29) await p.click('.nav2 .btn.primary');
  }
  await p.click('.nav2 .btn:has-text("הגשה"), .nav2 .btn:has-text("Submit")'); await p.waitForSelector('.result.pass');
  ok(/30/.test(await text(p)) && await p.locator('.confetti').count() === 1, 'exam 30/30 pass + celebration'); await axe(p, 'exam-result', prof);
  ok(await p.evaluate(() => !localStorage.getItem('theoryIL.exam')), 'finished exam cleared from storage');
  const nq0 = Object.keys((await S(p)).q).length;
  // second exam: submit empty → fail
  await p.click('.row .btn.primary'); await p.waitForSelector('#timer');
  await p.click('.nav2 .btn:has-text("הגשה")'); await p.waitForSelector('.result.fail');
  { const s = await S(p); ok(s.ex.length === 2 && s.ex[1][2] === 0, 'empty exam scored 0, history 2');
    ok(Object.keys(s.q).length === nq0, 'unanswered exam questions not recorded as mistakes'); }
  ok(/לא נענו/.test(await text(p)), 'unanswered note on result');
  // stats / parent / about / settings
  for (const r of ['stats', 'parent', 'about', 'settings']) { await go(p, '#/' + r); await p.waitForSelector('h1'); await axe(p, r, prof); }
  await p.evaluate(() => { const e = document.getElementById('toast'); e.textContent = 'בדיקה'; e.classList.add('show'); }); await p.waitForTimeout(450); await p.evaluate(AXE);
  ok(!(await p.evaluate(() => axe.run(document.getElementById('toast'), { runOnly: ['color-contrast'] }).then(r => r.violations.length))), 'toast contrast');
  await p.evaluate(() => document.getElementById('toast').classList.remove('show'));
  ok(/CC|Creative Commons/.test(await (async () => { await go(p, '#/about'); return text(p); })()), 'about credits CC BY');
  ok(await p.locator('#ab-ccbysa a[href="https://creativecommons.org/licenses/by-sa/4.0/"]').count() === 1, 'about credits Wikisource CC BY-SA 4.0 with a link');
  ok(/משרד התחבורה/.test(await text(p)), 'about names the ministry as source');
  ok(await p.locator('a[href*="meyda.education.gov.il"][href*="traffic-s07-"], a[href*="traffic-s13-"], a[href*="traffic-s17-"], a[href*="traffic-s21-"]').count() === 4 && await p.locator('a[href*="oldid=2968550"]').count() === 1, 'about: v1.12 sources (MoE topics 7/13/17/21 + Compensation Law s.1, pinned oldid) are linked');
  { const CV = await p.evaluate(() => fetch('data/coverage.json').then(r => r.json())); const tx = await text(p);
    ok(['B', 'A', 'C1', 'C', 'D', '1'].every(c => tx.includes(`${c} ${(+CV.tot[c][2]).toFixed(1)}% / ${(+CV.tot[c][1]).toFixed(1)}%`)) && /אף רישיון אינו מכוסה במלואו/.test(tx), 'about: every class partial, computed per-class strict / full figures (strict first)');
    const hb = await p.locator('#ab-covB').innerText(), E = CV.est, f1 = x => (+x).toFixed(1);
    ok(hb.indexOf(f1(E.B_strict) + '%') >= 0 && hb.indexOf(f1(E.B_strict) + '%') < hb.indexOf(f1(E.B_full) + '%') && hb.includes(`≈${f1(E.B_est)}% (${f1(E.B_lo)}–${f1(E.B_hi)}%)`) && hb.includes(`${E.k} מתוך ${E.n}`),
       `about (v1.16 H1): class-B headline – strict first, then full as judged with the estimate ≈${f1(E.B_est)}% (${f1(E.B_lo)}–${f1(E.B_hi)}%)`); }
  ok(/לא כולל תיאור מילולי/.test(await text(p)) && (await p.locator('.elig').count()) === 6, 'about: picture-question accessibility note + eligibility for all 6 classes');
  ok(/כל המאגר/.test(await text(p)) && (await p.locator('table.tbl tbody tr').count()) >= 7 && !/kolzchut/.test(await p.content()), 'about: whole-bank coverage table for all classes, no Kol Zchut link');
  // learning stage: path → lesson (law chips, diagram + text alternative, recap) → mini-quiz → mastery → unlock
  const LJ = await p.evaluate(() => fetch('data/lessons.json').then(r => r.json())), LB = LJ.lessons.filter(l => l.cls.includes('B'));
  await go(p, '#/learn'); await p.waitForSelector('.lessons');
  ok(await p.locator('.lessons li').count() === LB.length && await p.locator('.lessons li[data-i="1"] a').count() === 1 && await p.locator('.lessons li[data-i="2"] [aria-disabled="true"]').count() === 1, `learn path: ${LB.length} lessons for B, only the first open`);
  await axe(p, 'learn-path', prof);
  // v1.21 (1d): lessons grouped by topic (each once, in path order inside a topic), per-topic progress + minutes, a 'next lesson' button
  { const ids = await p.$$eval('.lgroup .lessons li', ls => ls.map(l => l.dataset.id)), ng = await p.locator('.lgroup').count();
    const nums = await p.$$eval('.lgroup', gs => gs.map(g => [...g.querySelectorAll('li')].map(l => +l.dataset.i)));
    ok(ng >= 5 && ids.length === LB.length && new Set(ids).size === LB.length && nums.every(a => a.every((x, k) => !k || x > a[k - 1]))
      && await p.locator('.lgroup .stbar[role=progressbar]').count() === ng && /דק׳/.test(await p.textContent('.lgroup .lgmeta'))
      && await p.getAttribute('#ln-next', 'href') === '#/learn/' + LB[0].id && /השיעור הבא: .+ · כ-\d+ דק׳/.test(await p.textContent('#ln-next')),
      `learn path grouped by topic: ${ng} topics, every lesson once, topic progress + minutes, 'השיעור הבא' → lesson 1`); }
  // v1.21 (Part 2): 'מה האתר מכסה' on the path page and About – numbers equal data/coverage.json, add up to the pool, never claim 100%
  { const CV = await p.evaluate(() => fetch('data/coverage.json').then(r => r.json())), c = await p.getAttribute('#covp', 'data-cls'), v = CV.tot[c];
    const nums = await p.$$eval('#covp .covlist li b', bs => bs.map(b => +b.textContent.split(' ')[0].replace(/[^0-9]/g, '')));
    const tx = await p.textContent('#covp'), want = [v[9], v[10], v[7], v[5], v[0] - v[9] - v[7] - v[5]];
    await go(p, '#/about'); await p.waitForSelector('#covp'); const ab = await p.textContent('#covp');
    ok(await p.locator('.abtools li').count() === 6 && /תרגול יומי/.test(await p.textContent('.abtools')) && /לא תחזית רשמית/.test(await text(p)), "About lists the v1.22 study tools (local only, not an official forecast)");
    ok(['B', 'A'].includes(c) && JSON.stringify(nums) === JSON.stringify(want) && want[0] + want[2] + want[3] + want[4] === v[0] && want[4] === 0
      && tx.includes(v[0].toLocaleString('he-IL')) && tx.includes(CV.est[c + '_est'] + '%') && /אין כאן ערבות ל-100%/.test(tx) && !/מכסה 100%|100% מהחומר/.test(tx) && ab === tx,
      `coverage panel (${c}): ${want.join('/')} of ${v[0]}, estimate ${CV.est[c + '_est']}%, 'no 100% guarantee', same on About`);
    await go(p, '#/learn'); await p.waitForSelector('.lgroup'); }
  // v1.22: summary mode – a global switch on the path page; a lesson then is ONE screen: one line per rule (+ source chips), key diagram, 'לזכור', the quiz;
  // 'I know this' ticks are kept (device + reload), and 'חזרה לפני מבחן' shows the whole topic in one scroll with a filter for what is left
  { const L0 = LB[0]; await p.click('#ln-view [data-view=quick]'); await p.waitForSelector('#ln-view [data-view=quick][aria-pressed=true]');
    const rc = await p.$eval(`.lgroup:has(li[data-id="${L0.id}"]) a[href^="#/learn/recap/"]`, a => a.getAttribute('href'));
    await go(p, '#/learn/' + L0.id); await p.waitForSelector('.sumnote');
    const nli = await p.locator('.lsum .sumrules > li').count(), nch = await p.locator('.lsum .sumrules > li .refs a').count();
    const b = await p.locator('.lsum .knw').first().boundingBox();
    ok(!(await p.locator('.lstep').count()) && nli === L0.rules.length && nch >= nli && await p.locator(`a[href="#/learn/${L0.id}/quiz"]`).count() === 1
      && (!L0.viz.length || await p.locator('.vizs').count() === 1) && (!L0.mnem.length || await p.locator('.mnems li').count() === L0.mnem.length) && b.height >= 44,
      `summary of '${L0.id}': one screen, ${nli} one-line rules with ${nch} source chips, key diagram, 'לזכור', quiz button, ticks ≥44px`);
    await p.click(`label[for="kn-${L0.id}-0"]`); await p.waitForTimeout(150);
    ok(JSON.stringify((await S(p)).kn?.[L0.id]) === '[0]' && /סימנת 1 מתוך/.test(await p.textContent('#sm-cnt')), "'אני יודע' tick saved locally + counted");
    await p.reload(); await p.waitForSelector('.sumnote');
    ok(await p.isChecked(`#kn-${L0.id}-0`), 'summary view and tick survive a reload');
    await axe(p, 'lesson-summary', prof);
    await go(p, rc); await p.waitForSelector('.recapall');
    const nl = await p.locator('.rcl').count(); await p.click('label[for=rc-only]');
    ok(nl >= 2 && /סימנת 1 מתוך/.test(await p.textContent('#rc-cnt')) && await p.isChecked(`#kn-${L0.id}-0`) && !(await p.isVisible(`.rcl li[data-r="0"]:has(#kn-${L0.id}-0)`))
      && await p.isVisible(`.rcl[data-id="${L0.id}"] li[data-r="1"]`), `'חזרה לפני מבחן' (${rc}): ${nl} lesson summaries in one scroll, shared ticks, 'only what is left' filter`);
    await axe(p, 'recap', prof);
    await p.click('label[for=rc-only]'); await p.click(`label[for="kn-${L0.id}-0"]`); await p.waitForTimeout(150);
    ok(!(await S(p)).kn?.[L0.id], 'untick removes it');
    await go(p, '#/learn'); await p.click('#ln-view [data-view=steps]'); await p.waitForSelector('#ln-view [data-view=steps][aria-pressed=true]'); }
  // v1.21: a lesson opens step by step – progress 'שלב 1 מתוך N', back/next ≥44px, focus on the step heading, aria-live, reading time, resume
  { const L0 = LB[0]; await go(p, '#/learn/' + L0.id); await p.waitForSelector('.lstep');
    const N = +(/מתוך (\d+)/.exec(await p.textContent('#st-pos')) || [])[1];
    const nb = await p.locator('.stnav .stnext').boundingBox(), pb = await p.locator('.stnav .stprev').boundingBox();
    ok(/^שלב 1 מתוך \d+$/.test((await p.textContent('#st-pos')).trim()) && N > 1 && await p.getAttribute('.stbar', 'aria-valuenow') === '1' && await p.isDisabled('.stnav .stprev')
      && nb.height >= 44 && pb.height >= 44 && /כ-\d+ דק׳ קריאה · \d+ שלבים/.test(await p.textContent('.rtime')) && await p.locator('#st-live[aria-live="polite"]').count() === 1,
      `steps (${L0.id}): 'שלב 1 מתוך ${N}', progress bar, back disabled, ≥44px buttons (${Math.round(nb.height)}px), reading time, live region`);
    await axe(p, 'lesson-steps', prof);
    // v1.21 (1e): A−/A+ text size – larger body text, remembered after reload, ≥44px buttons, bounded, back to normal
    { const fs = () => p.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.lstep p, .lstep li')).fontSize));
      const f0 = await fs(), bb = await p.locator('#fs-up').boundingBox();
      await p.click('#fs-up'); await p.waitForTimeout(80); const f1 = await fs();
      await p.reload(); await p.waitForSelector('.lstep'); const f2 = await fs(), lv = (await S(p)).profile.fsz;
      for (let k = 0; k < 6; k++) if (!(await p.isDisabled('#fs-up'))) await p.click('#fs-up');
      const top = await p.isDisabled('#fs-up') && /גודל 5 מתוך 5/.test(await p.textContent('#fs-val'));
      const wide = await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
      for (let k = 0; k < 6; k++) if (!(await p.isDisabled('#fs-dn'))) await p.click('#fs-dn');
      const bottom = await p.isDisabled('#fs-dn');
      await p.click('#fs-up'); await p.waitForTimeout(80);
      ok(f1 > f0 * 1.1 && Math.abs(f2 - f1) < 0.5 && lv === 2 && bb.height >= 44 && bb.width >= 44 && top && bottom && wide && Math.abs(await fs() - f0) < 0.5 && (await S(p)).profile.fsz === 1,
        `text size A−/A+: ${f0}px → ${f1}px, kept after reload, 5 levels bounded, no overflow at the largest, back to ${await fs()}px`); }
    await p.click('.stnav .stnext'); await p.waitForTimeout(150);
    ok(/^שלב 2 מתוך/.test((await p.textContent('#st-pos')).trim()) && await p.evaluate(() => document.activeElement?.id) === 'st-h' && /שלב 2 מתוך/.test(await p.textContent('#st-live')),
      'steps: next → step 2, focus moves to the step heading, the change is announced (aria-live)');
    await p.reload(); await p.waitForSelector('.lstep');
    ok(/^שלב 2 מתוך/.test((await p.textContent('#st-pos')).trim()) && await p.locator('.resume').count() === 1
      && (await p.evaluate(id => JSON.parse(localStorage.getItem('theoryIL.pos'))[id].s, L0.id)) === 1, 'steps: the position is remembered on this device (reload → step 2, "continue where you stopped" note)');
    await go(p, '#/learn'); await p.waitForSelector('#ln-cont');
    ok(/להמשיך מאיפה שעצרתי: .+ \(שלב 2 מתוך \d+\)/.test(await p.textContent('#ln-cont')) && (await p.locator('#ln-cont').boundingBox()).height >= 44, "learn path: 'להמשיך מאיפה שעצרתי' names the lesson and step 2");
    await p.click('#ln-cont'); await p.waitForSelector('.lstep');
    ok(/^שלב 2 מתוך/.test((await p.textContent('#st-pos')).trim()), "'continue' opens the lesson at the saved step");
    await p.click('.resume button'); await p.waitForTimeout(100);
    ok(/^שלב 1 מתוך/.test((await p.textContent('#st-pos')).trim()), 'steps: "start over" returns to step 1');
    for (let k = 1; k < N; k++) { await p.click('.stnav .stnext'); await p.waitForTimeout(40); }
    const s = await S(p);
    ok(/^שלב \d+ מתוך/.test(await p.textContent('#st-pos')) && await p.locator('.stnav .stnext').count() === 0 && await p.locator('.lend a.btn.primary').count() === 1 && s.les?.[L0.id]?.[0] > 0,
      'steps: the last step shows the mini-quiz button and marks the lesson read');
    // v1.22: 'בדיקה מהירה' at the end of a part – 3 questions of this lesson, then back to the same step
    if (await p.locator('.partnav [data-part="2"]').count()) { await p.click('.partnav [data-part="2"]'); await p.waitForTimeout(120); await p.click('.stnav .stprev'); await p.waitForTimeout(120);
      const pos = await p.textContent('#st-pos'), qb = await p.locator('.partend .qcgo').boundingBox();
      await p.click('.partend .qcgo'); await p.waitForSelector('.answers .ans'); const qs = [];
      for (let i = 0; i < 3; i++) { qs.push(await curId(p)); await p.click(`.answers .ans[data-i="${correct(qs[i])}"]`); await p.click('.next'); }
      await p.waitForSelector('.result'); const back = await p.getAttribute('.screen a.btn.primary.big', 'href');
      await p.click('.screen a.btn.primary.big'); await p.waitForSelector('.lstep');
      ok(qb && qb.height >= 44 && qs.every(id => L0.quiz.includes(id) || (L0.pbank || []).some(b => b.q === id)) && back === '#/learn/' + L0.id && await p.textContent('#st-pos') === pos,
        `quick check at the end of part 1: 3 of the lesson's questions (${qs}), then back to '${pos}'`); }
    // v1.21 (1c): a long lesson is split into parts of ≤ 5 cards – 'חלק 1 מתוך P', part buttons, 'לחלק 2' at the end of a part
    { const LL = LB.reduce((a, b) => (b.rules.length > a.rules.length ? b : a)); await go(p, '#/learn/' + LL.id + '/peek'); await p.waitForSelector('.lstep');
      if (await p.locator('.resume button').count()) { await p.click('.resume button'); await p.waitForTimeout(80); }
      const P = +(/מתוך (\d+)/.exec(await p.textContent('#st-part').catch(() => '')) || [0, 0])[1];
      const pb2 = await p.locator('.partnav [data-part="2"]').boundingBox().catch(() => null);
      await p.click('.partnav [data-part="2"]'); await p.waitForTimeout(120);
      const in2 = await p.getAttribute('.lstep', 'data-part') === '2' && /^חלק 2 מתוך/.test(await p.textContent('#st-part')) && await p.evaluate(() => document.activeElement?.id) === 'st-h';
      await p.click('.stnav .stprev'); await p.waitForTimeout(120);
      ok(P >= 2 && pb2 && pb2.height >= 44 && in2 && await p.getAttribute('.lstep', 'data-part') === '1' && await p.locator('.lstep .partend').count() === 1 && /לחלק 2/.test(await p.textContent('.stnav .stnext')),
        `parts (${LL.id}, ${LL.rules.length} rules): ${P} parts, part buttons ≥44px, jump to part 2 moves focus, the end of part 1 says so and offers 'לחלק 2'`);
      await axe(p, 'lesson-parts', prof); }
    await go(p, '#/learn/' + L0.id); await p.waitForSelector('.lstep');
    await p.click('.seg [data-view="full"]'); await p.waitForSelector('.lsec');
    ok((await S(p)).profile.lnv === 'full' && await p.getAttribute('.seg [data-view="full"]', 'aria-pressed') === 'true' && await p.locator('.lstep').count() === 0, 'view switch: "הכול בעמוד אחד" shows the whole lesson and is remembered'); }
  await go(p, '#/learn/' + LB[2].id); await p.waitForSelector('.lsec');
  ok((await p.evaluate(() => location.hash)) === '#/learn/' + LB[2].id + '/peek' && /מצב קריאה/.test(await text(p)) && await p.locator('.lend a.btn.primary').count() === 0, 'direct link to a locked lesson opens the read-only preview');
  await go(p, '#/learn/' + LB[2].id + '/quiz'); await p.waitForSelector('.lsec');
  ok((await p.evaluate(() => location.hash)) === '#/learn/' + LB[2].id + '/peek', 'direct link to a locked lesson quiz opens the preview, not the quiz');
  await go(p, '#/learn/' + LB[2].id + '/peek'); await p.waitForSelector('.lsec');
  ok(/מצב קריאה/.test(await text(p)) && await p.locator('.lend a.btn.primary').count() === 0 && await p.locator('.rules li').count() === LB[2].rules.length, 'locked lesson opens read-only from a "learn this" link (no quiz)');
  { const r = await p.evaluate(async () => { const m = await import('./js/learn.js'); const [cov, sg] = await Promise.all(['data/coverage.json', 'data/signs.json'].map(u => fetch(u).then(r => r.json())));
      const a = m.explain(15, 'B', cov, sg), b = Object.keys(cov.q).find(id => cov.q[id][0] === 'f' && !sg.q[id]), x = m.explain(+b, 'B', cov, sg);
      return { a: a && a.kind + ':' + a.lines[0].n, b: x && x.kind, s: x && x.s, ln: x && x.lesson?.id, all: Object.keys(cov.q).length }; });
    ok(r.a === 'sign:433' && r.b === 'rule' && !!r.s && !!r.ln && r.all === QH.size, `why data: sign question → sign 433, taught question → cited rule (${JSON.stringify(r)})`); }
  // v1.13 (review #9 D1): a rule's chip shows the passage that rule pinned (with its PDF page), not the section's first excerpts
  for (const lid of ['alc2', 'speed']) { const L1 = LJ.lessons.find(l => l.id === lid); if (!L1) continue;
    await go(p, '#/learn/' + lid + '/peek'); await p.waitForSelector('.lsec');
    const res = [];
    for (let i = 0; i < L1.rules.length; i++) { const d = p.locator('.rules > li').nth(i).locator('details.lawref').first(); await d.locator('summary').click();
      const qs = await d.locator('blockquote').allInnerTexts(), a = d.locator('.lawbox > a').first(), bb = await a.boundingBox(), href = await a.getAttribute('href');
      const want = L1.rules[i].x.filter(([sid]) => L1.rules[i].s.startsWith(sid)).map(([, e]) => e);
      res.push(JSON.stringify(qs) === JSON.stringify(want) && bb.height >= 44 && (!/\.pdf/.test(href) || /#page=\d+$/.test(href))); }
    ok(res.length && res.every(Boolean), `v1.13: ${lid}: every rule chip shows that rule's own passage first, a ≥44px full-text link, PDF links open at the page (${res.filter(Boolean).length}/${res.length})`); }
  // v1.13 (review #9): a rule whose only source is a bank question is labelled as the bank's answer
  { const L1 = LJ.lessons.find(l => l.id === 'signs'), i = L1 ? L1.rules.findIndex(r => r.s === 'Q:606') : -1;
    if (i >= 0) { await go(p, '#/learn/signs/peek'); await p.waitForSelector('.lsec');
      const tx = await p.locator('.rules > li').nth(i).locator('details.lawref summary').first().innerText();
      ok(tx.includes('תשובת המאגר'), `v1.13: a bank-sourced rule's chip says "תשובת המאגר" (${tx.trim()})`); } }
  { const r = await p.evaluate(async () => { const m = await import('./js/learn.js'); const cov = await fetch('data/coverage.json').then(r => r.json()), sg = await fetch('data/signs.json').then(r => r.json());
      const ids = Object.keys(cov.q).filter(id => cov.q[id][0] === 'f' && !sg.q[id]).slice(0, 200), xs = ids.map(id => m.explain(+id, 'B', cov, sg)).filter(x => x && x.kind === 'rule' && !/^Q:/.test(x.s));
      return { n: xs.length, own: xs.filter(x => (x.x || []).some(([sid]) => x.s.startsWith(sid))).length }; });
    ok(r.n > 50 && r.own === r.n, `v1.13: practice feedback carries the cited rule's own passage (${r.own}/${r.n})`); }
  // v1.10 bank-only lessons: question + answer as published, visible no-explanation label, CC BY attribution, no rules of ours
  { const BKL = LB.filter(l => l.bank), ids = LB.map(l => l.id);
    ok(BKL.length >= 4 && ids.slice(-BKL.length).every(i => i.startsWith('bank_')), `B path ends with ${BKL.length} "מהמאגר הרשמי" lessons`);
    const bv = BKL.find(l => l.id === 'bank_veh'), want = bv.bank.filter(i => QH.get(i)?.t.includes('B'));
    await go(p, '#/learn/bank_veh/peek'); await p.waitForSelector('.bankcard');
    const cards = await p.locator('.bankcard').evaluateAll(es => es.map(e => [+e.dataset.q, e.querySelector('.qtext').textContent, e.querySelector('.ans-ok .at').textContent, [...e.querySelectorAll('.bopts li .at')].map(x => x.textContent)]));
    ok(cards.length === want.length && cards.every(([i, q, a, o]) => q.endsWith(QH.get(i).q) && a === QH.get(i).a[QH.get(i).c] && JSON.stringify(o) === JSON.stringify(QH.get(i).a)), `bank lesson: all ${want.length} B questions shown with the official text, all four official options and the correct one marked`);
    ok(/אין לשאלות האלה הסבר רשמי או מקור חוקי/.test(await p.textContent('.banknote')) && await p.locator('.banktag').count() === cards.length, 'bank lesson: visible "no official explanation or legal source" label on the lesson and every card');
    ok(/data\.gov\.il/.test(await p.getAttribute('a:has-text("CC BY")', 'href')) && await p.locator('.rules, .lbody, .recap, .mnems').count() === 0, 'bank lesson: CC BY attribution link to data.gov.il, no rules/explanation/recap of ours');
    ok(/ספר הלימוד הרשמי/.test(await p.textContent('.bankcard[data-q="1765"] .lawnote')) && await p.locator('.bankcard[data-q="1765"] .lawnote details.lawref').count() === 1, 'Q1765: textbook difference stated with its source');
    const r = await p.evaluate(async () => { const m = await import('./js/learn.js'); const cov = await fetch('data/coverage.json').then(r => r.json());
      return Object.keys(cov.q).filter(id => (cov.q[id][3] === 'S' || cov.q[id][3] === 'X')).map(id => [id, m.explain(+id, 'B', cov, null)?.lesson?.id || '']); });
    const nb = r.filter(([id]) => QH.get(+id).t.includes('B'));
    ok(nb.length > 0 && nb.length === new Set(LB.filter(l => l.bank).flatMap(l => l.bank).filter(i => QH.get(i).t.includes("B"))).size && nb.every(([, l]) => l.startsWith('bank_')), `why box: every B no-source question links to its bank lesson (${nb.filter(([, l]) => l).length}/${nb.length})`);
    await axe(p, 'bank-lesson', prof); }
  // v1.11: B questions a lesson covers only partly – question + official answer as published, the cited unit and the bank-only rest labelled apart
  { const PL = LB.filter(l => (l.pbank || []).some(x => QH.get(x.q)?.t.includes('B'))), all = PL.flatMap(l => l.pbank.filter(x => QH.get(x.q)?.t.includes('B')).map(x => x.q));
    ok(PL.length >= 20 && all.length === new Set(all).size && PL.every(l => l.pbank.every(x => !QH.get(x.q)?.t.includes('B') || l.quiz.includes(x.q))), `partial cards: ${all.length} B questions in ${PL.length} lessons, each in its lesson quiz`);
    const pl = PL.reduce((a, b) => (b.pbank.length > a.pbank.length ? b : a)), want = pl.pbank.filter(x => QH.get(x.q)?.t.includes('B'));
    await go(p, '#/learn/' + pl.id + '/peek'); await p.waitForSelector('.pbcard');
    const cards = await p.locator('.pbcard').evaluateAll(es => es.map(e => [+e.dataset.q, e.querySelector('.qtext').textContent, e.querySelector('.ans-ok .at').textContent, [...e.querySelectorAll('.bopts li .at')].map(x => x.textContent), e.querySelectorAll('.pbpart').length, !!e.querySelector('.pbrest')]));
    ok(cards.length === want.length && cards.every(([i, q, a, o, n, r], k) => i === want[k].q && q.endsWith(QH.get(i).q) && a === QH.get(i).a[QH.get(i).c] && JSON.stringify(o) === JSON.stringify(QH.get(i).a) && n === want[k].u.length && r),
      `partial cards (${pl.id}): ${cards.length} questions with the official text and answer, the cited unit, and a bank-only rest line`);
    ok(/שאלות מהמאגר שהשיעור מכסה רק חלקית/.test(await text(p)) && await p.locator('#ls-pbank ~ .bankattr a[href*="data.gov.il"]').count() === 1 && await p.locator('.pbcard .pbpart.off .lawref').count() >= 1, 'partial cards: section title, CC BY link, official-source part with its citation chip');
    { const sl = LB.find(l => l.id === 'signs'), x = sl.ex[0], v = QH.get(x.q); await go(p, '#/learn/signs/peek'); await p.waitForSelector('.excard .trap');
      const tr = await p.locator('.excard').first().evaluate(e => [e.querySelector('.trapopt')?.textContent, [...e.querySelectorAll('.trap ul.qt q')].map(q => q.textContent), e.querySelectorAll('.trap .lawref, .trap a').length]);
      ok(tr[0] === '«' + v.a[x.tr] + '»' && x.tr !== v.c && tr[1].length === x.qt.length && tr[1][0] === x.qt[0].t && tr[2] >= 1, `worked example Q${x.q}: closest wrong option shown against the cited source's own wording (${tr[1].length} passages)`); }
    const no = LB.find(l => (l.pbank || []).some(x => QH.get(x.q)?.t.includes('B') && x.u.every(u => !u.o)));
    if (no) { const x = no.pbank.find(x => QH.get(x.q)?.t.includes('B') && x.u.every(u => !u.o)); await go(p, '#/learn/' + no.id + '/peek'); await p.waitForSelector('.pbcard');
      ok(/בלי מקור רשמי מצוטט/.test(await p.textContent(`.pbcard[data-q="${x.q}"]`)) && await p.locator(`.pbcard[data-q="${x.q}"] .pbpart.off`).count() === 0, `partial card Q${x.q}: covering unit without an official source is labelled so`); }
    // v1.20 (review #16 N5): the worked example's bank question on a partial card is labelled as the bank question, not listed with the official source
    await go(p, '#/learn/priority/peek'); await p.waitForSelector('.pbcard[data-q="185"]');
    { const c = p.locator('.pbcard[data-q="185"]');
      ok(await c.locator('.pbpart.off span.refs .lawref').filter({ hasText: '183' }).count() === 0 && /שאלת הדוגמה מהמאגר/.test(await c.locator('.exq').first().textContent()) && /183/.test(await c.locator('.exq').first().textContent()),
        'partial card Q185: the example question Q183 is shown apart as the bank question, not among the official sources'); }
    await go(p, '#/learn/' + pl.id + '/peek'); await p.waitForSelector('.pbcard'); await axe(p, 'partial-cards', prof); }
  await go(p, '#/learn/' + LB[0].id); await p.waitForSelector('.lsec');
  ok(await p.getAttribute('.lbody', 'lang') === 'he' && await p.locator('.rules li').count() === LB[0].rules.length, 'lesson: Hebrew body + all rules');
  ok(await p.locator('.rules details.lawref').count() >= LB[0].rules.length, 'every rule carries a law/sign reference');
  await p.click('.rules details.lawref >> nth=0 >> summary');
  ok(await p.isVisible('.rules details.lawref[open] blockquote') && /noopener/.test(await p.getAttribute('.rules details.lawref[open] a', 'rel')), 'law chip opens the cited excerpt + external link');
  ok(await p.locator('.viz svg[aria-hidden="true"]').count() >= 1 && (await p.textContent('.viz .vz-alt')).length > 40, 'diagram is aria-hidden with a text alternative');
  await p.fill('#vz-num', '305'); ok(/חלק 3/.test(await p.textContent('.vz-out')), 'sign-number diagram reacts (305 → part 3)');
  await p.fill('#vz-num', '905'); ok(/חלק 9/.test(await p.textContent('.vz-out')), 'sign-number diagram knows parts 5 and 9 (905 → part 9)');
  await p.waitForSelector('#vz-sd'); await p.fill('#vz-sd', '433'); await p.waitForSelector('.sdict li');
  ok(/433/.test(await p.textContent('.sdict')), 'sign dictionary finds 433');
  await p.click('.recap .flip >> nth=0'); ok(await p.getAttribute('.recap .flip >> nth=0', 'aria-expanded') === 'true' && await p.isVisible('.recap .back >> nth=0'), 'recap card flips (aria-expanded)');
  ok(await p.locator('.gal img').count() > 0 && await p.locator('.excard').count() > 0, 'sign gallery + worked examples with images');
  await axe(p, 'lesson', prof);
  await p.click('.lend a.btn.primary'); await p.waitForSelector('.qcard');
  for (let i = 0; i < 6; i++) { if (!(await p.locator('.qcard').count())) break; const id = await curId(p); await p.click(`.ans[data-i="${correct(id)}"]`); await p.click('.next'); await p.waitForTimeout(80); }
  await p.waitForSelector('.result');
  { const s = await S(p); ok(s.les?.[LB[0].id]?.[1] === 100 && s.les[LB[0].id][0] > 0, `mini-quiz → lesson mastered ${JSON.stringify(s.les?.[LB[0].id])}`); }
  ok(/שלטתם/.test(await text(p)) && await p.locator(`a[href="#/learn/${LB[1].id}"]`).count() === 1, 'summary: mastery + link to the next lesson');
  await p.waitForTimeout(2800);   // perfect score → confetti; let it fall past the text first
  await axe(p, 'lesson-summary', prof);
  await go(p, '#/learn/' + LB[1].id); await p.waitForSelector('.viz');
  const alt0 = await p.textContent('.viz .vz-alt'); await p.click('.viz .vz-ctl .btn.primary');
  ok((await p.textContent('.viz .vz-alt')) !== alt0, 'step diagram: text alternative follows each step');
  const dur = await p.evaluate(() => getComputedStyle(document.querySelector('.vz-car')).transitionDuration);
  ok(opts.reducedMotion === 'reduce' ? dur === '0s' : dur !== '0s', `diagram motion respects prefers-reduced-motion (${dur})`);
  // every B lesson read-only: each diagram renders with a text alternative, and the page passes axe
  const FULLW = [];
  { let bad = [];
    for (const l of LB) { await go(p, '#/learn/' + l.id + '/peek'); await p.waitForSelector('.lsec');
      FULLW.push(await p.evaluate(() => document.querySelector('.screen').innerText.split(/\s+/).filter(Boolean).length));
      const n = await p.locator('.viz').count(), alts = await p.locator('.viz .vz-alt').evaluateAll(es => es.filter(e => e.textContent.trim().length > 10).length);
      if (n !== l.viz.length || alts !== n) bad.push(`${l.id}(${n}/${l.viz.length}/${alts})`);
      const r = await p.evaluate(() => axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] } }));
      if (r.violations.length) bad.push(l.id + ':' + r.violations.map(x => x.id).join(',')); }
    ok(!bad.length, `all ${LB.length} B lessons: diagrams + text alternative + axe clean ${bad.join(' ')}`); }
  // v1.21: every B and A lesson step by step – no rule, diagram, example or bank question lost; words per card measured; axe on each first card
  { const keep = await p.evaluate(() => localStorage.getItem('theoryIL.state'));   // (view 'full' – restored after the walk)
    await go(p, '#/learn/' + LB[0].id); await p.waitForSelector('.lsec'); await p.click('.seg [data-view="steps"]'); await p.waitForSelector('.lstep');
    const LBA = LJ.lessons.filter(l => l.cls.includes('B') || l.cls.includes('A')), bad = [], per = [], nst = [], BIG = [];
    for (const l of LBA) { await go(p, '#/learn/' + l.id + '/peek'); await p.waitForSelector('.lstep');
      const N = +(/מתוך (\d+)/.exec(await p.textContent('#st-pos')) || [0, 1])[1]; nst.push(N);
      if (await p.locator('.resume button').count()) { await p.click('.resume button'); await p.waitForTimeout(40); }
      { const r = await p.evaluate(() => axe.run(document.querySelector('#app'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } })); if (r.violations.length) bad.push(l.id + ':' + r.violations.map(x => x.id).join(',')); }
      const got = { r: 0, v: 0, x: 0, q: 0 };
      for (let k = 0; k < N; k++) {
        const w = await p.evaluate(() => { const e = document.querySelector('.lstep'); return [e.innerText.split(/\s+/).filter(Boolean).length, e.querySelectorAll('.rules > li').length, e.querySelectorAll('.viz').length, e.querySelectorAll('.excard:not(.bankcard)').length, e.querySelectorAll('.qfold').length]; });
        if (w[0] > 150) BIG.push(`${l.id}#${k + 1}=${w[0]}`);
        per.push(w[0]); got.r += w[1]; got.v += w[2]; got.x += w[3]; got.q += w[4];
        if (k < N - 1) { await p.click('.stnav .stnext'); await p.waitForTimeout(30); } }
      const inPool = q => QH.get(q)?.t.includes('B');
      const want = { r: l.rules.length, v: l.viz.length, x: l.ex.length, q: (l.bank || []).filter(inPool).length + (l.pbank || []).filter(x => inPool(x.q)).length };
      if (l.cls.includes('B') && JSON.stringify(got) !== JSON.stringify(want)) bad.push(`${l.id} got ${JSON.stringify(got)} want ${JSON.stringify(want)}`); }
    await p.evaluate(k => localStorage.setItem('theoryIL.state', k), keep); await p.reload(); await p.waitForSelector('h1');   // walking the cards marks open lessons read – undo
    const srt = [...per].sort((a, b) => a - b), med = a => a[Math.floor((a.length - 1) / 2)];
    console.log(`  STATS(${prof}) steps-view words per card: max ${srt[srt.length - 1]}, median ${med(srt)}, cards ${per.length}; steps per lesson: max ${Math.max(...nst)}, median ${med([...nst].sort((a, b) => a - b))}; full-page words: max ${Math.max(...FULLW)}, median ${med([...FULLW].sort((a, b) => a - b))}`);
    ok(!bad.length && srt[srt.length - 1] <= 150 && med(srt) <= 100, `all ${LBA.length} B/A lessons step by step: every rule, diagram, example and bank card is on some card; axe clean; words per card median ${med(srt)} (≤100), max ${srt[srt.length - 1]} (${BIG.join(' ')}) ${bad.slice(0, 4).join(' | ')}`); }
  await go(p, '#/learn'); await p.waitForSelector('.lessons');
  ok(await p.locator('.lessons li[data-i="2"] a').count() === 1, 'reading lesson 1 unlocked lesson 2');
  await go(p, '#/parent'); ok(new RegExp(`שיעורים שנשלטו\\s*1/${LB.length}`).test(await text(p)), 'parent view lists lessons mastered');
  await go(p, '#/stats'); ok(/שיעורים שנשלטו/.test(await text(p)), 'readiness hint mentions lessons');
  // backup code → reset → restore → undo
  await go(p, '#/settings');
  await p.click('#bk-code'); await p.waitForSelector('.codeout textarea');
  const code = await p.inputValue('.codeout textarea'); ok(/^TH1U?-[\w-]+-[0-9a-f]{4}$/.test(code), 'backup code generated');
  ok(!(await META(p)).lastBackup, 'generating a code alone does not count as a backup');
  await p.click('#bk-copy'); await p.waitForTimeout(200);
  ok(!!(await META(p)).lastBackup, 'copying the code counts as a backup');
  const before = JSON.stringify((await S(p)).q);
  await p.click('.card.danger .btn'); await p.waitForSelector('a[href="#/onboard/1"]');
  ok(!(await S(p)).profile, 'reset → welcome');
  await go(p, '#/settings'); await p.fill('#codein', code.slice(0, -1) + (code.endsWith('0') ? '1' : '0'));
  await p.click('#bk-restore'); await p.waitForTimeout(300);
  ok(/לא שלם|פגום/.test(await p.textContent('#toast')), `corrupted code rejected (${await p.textContent('#toast')})`);
  await p.fill('#codein', code); await p.click('#bk-restore'); await p.waitForSelector('.drive');
  ok(JSON.stringify((await S(p)).q) === before, 'restore from code: same progress');
  ok((await S(p)).les?.[LB[0].id]?.[1] === 100, 'restore from code keeps lesson progress');
  ok(Object.keys((await S(p)).fc || {}).length >= 2, 'restore from code keeps sign-flashcard ratings');
  await go(p, '#/settings'); await p.waitForSelector('.card#backup');
  ok(await p.isVisible('#bk-undo'), 'undo restore offered');
  // file export → import (sanitised)
  await p.evaluate(() => { const m = JSON.parse(localStorage.getItem('theoryIL.meta')); delete m.lastBackup; localStorage.setItem('theoryIL.meta', JSON.stringify(m)); });
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#bk-export')]);
  await p.waitForSelector('#bk-confirm'); ok(!(await META(p)).lastBackup, 'download alone does not count as a backup');
  await p.click('#bk-confirm'); ok(!!(await META(p)).lastBackup, 'confirmed download counts as a backup');
  const f = path.join(OUT, 'backup.json'); await dl.saveAs(f);
  const j = JSON.parse(fs.readFileSync(f, 'utf8')); ok(j.app === 'theory-il' && j.state.profile.cls === 'B', `backup file ${dl.suggestedFilename()}`);
  j.state.profile.name = '<img src=x onerror=alert(1)>'; j.state.profile.cls = 'ZZ'; j.state.evil = { a: 1 }; j.state.q['abc'] = [1, 2, 3, 4, 5]; j.state.xp = -5; j.state.fc = { ...j.state.fc, '<b>': [1, 2, 3, 4], 101: [9, 'x', -1, 5] }; j.state.kn = { signs: [0, 2, 'x', 2], 'bad key!': [1] };
  const f2 = path.join(OUT, 'evil.json'); fs.writeFileSync(f2, JSON.stringify(j));
  await p.setInputFiles('#filein', f2); await p.waitForSelector('.drive');
  const ev = await (async () => { const s = await S(p); return { name: s.profile.name, cls: s.profile.cls, evil: 'evil' in s, abc: 'abc' in s.q, xp: s.xp, imgs: await p.evaluate(() => document.querySelectorAll('img[src="x"]').length) }; })();
  ok(!/[<>]/.test(ev.name) && ev.cls === 'B' && !ev.evil && !ev.abc && ev.xp === 0 && !ev.imgs, `sanitised import ${JSON.stringify(ev)}`);
  { const s = await S(p); ok(!('<b>' in s.fc) && JSON.stringify(s.fc['101']) === '[0,0,0,0]' && JSON.stringify(s.kn) === '{"signs":[0,2]}', `sanitised import of flashcards + ticks ${JSON.stringify([s.fc['101'], s.kn])}`); }
  { const before = await S(p), j3 = JSON.parse(fs.readFileSync(f, 'utf8')); j3.state.bm = [1801]; j3.state.xp = 7; j3.state.profile.name = 'אחר';
    const f3 = path.join(OUT, 'merge.json'); fs.writeFileSync(f3, JSON.stringify(j3));
    await go(p, '#/settings'); await p.check('#bk-merge'); await p.setInputFiles('#filein', f3); await p.waitForSelector('.drive');
    const s = await S(p); ok(s.bm.includes(1801) && before.bm.every(x => s.bm.includes(x)) && s.xp === 7 && s.profile.name === before.profile.name && Object.keys(s.q).length >= Object.keys(before.q).length, `restore can merge (bookmarks united, profile kept) ${JSON.stringify({ bm: s.bm, xp: s.xp })}`); }
  // translations + UI language + theme
  await go(p, '#/settings'); await p.selectOption('#sl', 'en'); await p.waitForTimeout(400);
  await go(p, '#/practice/signs'); await p.waitForSelector('.qtext');
  const EN = await p.evaluate(() => fetch('data/q.en.json').then(r => r.json()));
  for (let i = 0; i < 9 && !EN[await curId(p)]; i++) { await p.click('.answers .ans >> nth=0'); await p.click('.next'); await p.waitForSelector('.answers .ans:not([disabled])'); }   // skip questions whose translation failed the gate
  ok((await p.getAttribute('.qtext', 'lang')) === 'en' && (await p.getAttribute('.qtext', 'dir')) === 'ltr', 'English question text, LTR inside RTL UI');
  await p.click('.qtools .chip'); ok((await p.getAttribute('.qtext', 'lang')) === 'he', 'toggle to official Hebrew');
  await go(p, '#/settings'); await p.selectOption('#su', 'en'); await p.waitForTimeout(300);
  ok((await p.getAttribute('html', 'dir')) === 'ltr' && (await p.getAttribute('html', 'lang')) === 'en', 'English UI is LTR');
  await go(p, '#/home'); await axe(p, 'home-en', prof);
  // v1.21: the restored backup keeps the lesson view the profile had (lnv) – switch back to steps if it was 'full'
  await go(p, '#/learn/' + LB[0].id); await p.waitForSelector('.lstep, .lsec');
  if (await p.locator('.lstep').count() === 0) { await p.click('.seg [data-view="steps"]'); await p.waitForSelector('.lstep'); }
  ok(/Hebrew only/.test(await text(p)) && await p.getAttribute('.lbody', 'dir') === 'rtl', 'English UI: lesson flagged Hebrew-only, body stays RTL');
  await axe(p, 'lesson-en', prof);
  await go(p, '#/settings'); await p.selectOption('#su', 'he'); await p.selectOption('#st', 'dark'); await p.waitForTimeout(300);
  await go(p, '#/home'); await axe(p, 'home-dark', prof);
  await go(p, '#/learn/' + LB[1].id); await p.waitForSelector('.lstep'); await axe(p, 'lesson-steps-dark', prof);
  await p.click('[data-view=full]'); await p.waitForSelector('.viz'); await axe(p, 'lesson-dark', prof);
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'lesson page: no horizontal overflow');
  await go(p, '#/exam'); await p.click('.btn.primary.big'); await p.waitForSelector('#timer'); await axe(p, 'exam-dark', prof);
  dialogAnswer = true; await go(p, '#/home');
  // persistence across reload + IndexedDB mirror recovery
  await p.reload(); await p.waitForSelector('.drive'); ok(true, 'progress survives reload');
  await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForSelector('.drive');
  ok(!!(await S(p)).profile, 'recovered from IndexedDB after localStorage loss');
  // offline
  await p.evaluate(() => navigator.serviceWorker.ready); await p.reload(); await p.waitForSelector('.drive');
  await p.waitForFunction(async () => { const c = await caches.open('theory-il-img-v1'); return (await c.keys()).length >= 442; }, null, { timeout: 60000 }).catch(() => {});
  const nImg = await p.evaluate(async () => (await (await caches.open('theory-il-img-v1')).keys()).length);
  ok(nImg >= 442, `all question images precached (${nImg})`);
  await ctx.setOffline(true); await p.reload(); await p.waitForSelector('.drive');
  await go(p, '#/signs/go'); await p.waitForSelector('.qcard .qimg'); await p.waitForFunction(() => document.querySelector('.qcard .qimg').complete);
  ok(await p.evaluate(() => document.querySelector('.qcard .qimg').naturalWidth > 100), 'works offline (shell + images)');
  await go(p, '#/learn/' + LB[0].id); await p.waitForSelector('.lstep, .lsec', { timeout: 5000 }).catch(() => {});
  if (await p.locator('.lstep').count() === 0 && await p.locator('[data-view=steps]').count()) { await p.click('[data-view=steps]'); await p.waitForSelector('.lstep', { timeout: 5000 }).catch(() => {}); }
  const stOff = await p.locator('.lstep').count() === 1 && /\d/.test(await p.textContent('#st-pos').catch(() => ''));
  if (await p.locator('[data-view=full]').count()) await p.click('[data-view=full]');
  await p.waitForSelector('.viz', { timeout: 5000 }).catch(() => {});
  ok(stOff && await p.locator('.viz').count() > 0 && await p.locator('.rules li').count() === LB[0].rules.length, 'lessons + diagrams work offline');
  await ctx.setOffline(false);
  ok(!foreign.length, `no third-party requests ${foreign.slice(0, 3).join(' ')}`);
  ok(!errs.length, `no console/page errors ${errs.slice(0, 3).join(' | ')}`);
  // horizontal overflow check
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'no horizontal overflow');
  await b.close();
}
// Horizontal-overflow sweep: fixed layout viewport (isMobile off, so innerWidth cannot grow with content);
// every screen at 320/360/390 px must have documentElement.scrollWidth <= the fixed width.
async function overflowSweep() {
  console.log('\n== overflow sweep (320/360/390)');
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  for (const W of [320, 360, 390]) {
    const ctx = await b.newContext({ viewport: { width: W, height: 800 }, hasTouch: true, locale: 'he-IL', serviceWorkers: 'block' });
    const p = await ctx.newPage(); p.on('dialog', d => d.accept());
    const over = async () => p.evaluate(W => { const d = document.documentElement; return d.scrollWidth > W + 1 || document.body.scrollWidth > W + 1 ? d.scrollWidth : 0; }, W);
    const bad = [];
    await load(p); if (await over()) bad.push('welcome');
    await p.click('a[href="#/onboard/1"]'); await p.click('label:has(input[value="B"])'); if (await over()) bad.push('onboard1');
    await p.click('.row .btn.primary'); await p.click('a[href="#/onboard/3"]'); if (await over()) bad.push('onboard3');
    await p.click('.row .btn.primary.big'); await p.waitForSelector('.drive');
    const LJ = await p.evaluate(() => fetch('data/lessons.json').then(r => r.json()));
    const routes = ['#/home', '#/learn', '#/practice', '#/practice/mix', '#/review', '#/search', '#/bookmarks', '#/signs', '#/signs/go', '#/stats', '#/parent', '#/about', '#/settings', '#/exam',
      ...LJ.lessons.filter(l => l.cls.includes('B') || l.cls.includes('A')).map(l => '#/learn/' + l.id + '/peek'), '#/learn/recap/signs', '#/learn/recap/junction', '#/learn/recap/road', '#/signs/cards', '#/signs/cards/txt'];
    const tiny = async () => p.evaluate(() => [...document.querySelectorAll('a[href], button, input:not([type=hidden]), select, textarea, summary, [role=button], [tabindex="0"]')].filter(e => {
      const r = e.getBoundingClientRect(), cs = getComputedStyle(e); if (!r.width || !r.height || cs.visibility === 'hidden' || e.closest('[hidden]')) return false;
      const lab = e.closest('label'); if (e.classList.contains('sr') && e.tabIndex < 0) return false;   // the visually-hidden file input is opened by its visible button
      if ((e.type === 'radio') && lab && lab.getBoundingClientRect().height >= 24) return false;   // a radio's tap target is its whole option row
      return r.width < 23.5 || r.height < 23.5; }).map(e => `${e.tagName.toLowerCase()}${e.type ? ':' + e.type : ''}'${(e.textContent || e.getAttribute('aria-label') || '').trim().slice(0, 18)}' ${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)}`));
    const small = [];
    for (const r of routes) { await go(p, r); await p.waitForSelector('h1', { timeout: 5000 }).catch(() => {}); const sw = await over(); if (sw) bad.push(r + '=' + sw); const tt = await tiny(); if (tt.length) small.push(r + ': ' + tt.slice(0, 3).join(', ')); }
    // v1.22: every lesson again in the one-screen summary view
    await go(p, '#/learn'); await p.click('#ln-view [data-view=quick]');
    for (const r of routes.filter(r => r.endsWith('/peek'))) { await go(p, r); await p.waitForSelector('.sumnote', { timeout: 5000 }).catch(() => bad.push(r + ':nosum')); const sw = await over(); if (sw) bad.push(r + ':sum=' + sw); const tt = await tiny(); if (tt.length) small.push(r + ':sum ' + tt.join(',')); }
    await go(p, '#/learn'); await p.click('#ln-view [data-view=steps]');
    // v1.17 (review #13 N9): tap targets – every visible link / control on every screen is at least 24×24 px (WCAG 2.5.8)
    ok(!small.length, `${W}px: every link and control on ${routes.length} screens is a ≥24×24 px tap target ${small.slice(0, 4).join(' | ')}`);
    await go(p, '#/about'); await p.waitForSelector('.tbl.cov td');
    const cv = await p.evaluate(W => { const w = document.querySelector('.tbl.cov').closest('.tblwrap'); const tds = [...document.querySelectorAll('.tbl.cov tr:first-child td')];
      return { hid: w.scrollWidth > w.clientWidth + 1, out: tds.filter(td => { const r = td.getBoundingClientRect(); return r.left < -1 || r.right > W + 1; }).length, n: tds.length,
        lab: tds.every(td => getComputedStyle(td, '::before').content.length > 2), dec: tds.filter(td => /%$/.test(td.textContent)).every(td => /\d\.\d%$/.test(td.textContent)) }; }, W);
    ok(!cv.hid && !cv.out && cv.n === 8 && cv.lab && cv.dec, `${W}px: About coverage table stacked as cards: all 8 columns visible without hidden scroll, labelled, one-decimal % ${JSON.stringify(cv)}`);
    await go(p, '#/exam'); await p.click('.btn.primary.big'); await p.waitForSelector('#timer'); if (await over()) bad.push('exam-running');
    ok(!bad.length, `${W}px: no horizontal overflow on ${routes.length + 5} screens ${bad.slice(0, 5).join(' ')}`);
    await ctx.close();
  }
  await b.close();
}
(async () => {
  if (!process.env.SWEEP_ONLY) {
  await run('mobile', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale: 'he-IL' });
  await run('desktop', { viewport: { width: 1280, height: 860 }, locale: 'he-IL', reducedMotion: 'reduce' });
  }
  await overflowSweep();
  console.log(`\n${passes} passed, ${fails} failed`); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
