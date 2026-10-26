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
  await p.goto(BASE); await p.waitForSelector('h1');
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
  await axe(p, 'home', prof);
  // practice: answer 10, first wrong on purpose
  await go(p, '#/practice/mix'); await p.waitForSelector('.answers .ans');
  for (let i = 0; i < 10; i++) {
    const c = correct(await curId(p));
    if (i === 0) await p.click('.iconbtn[aria-pressed]');            // bookmark the first question
    const sel = i < 3 ? `.answers .ans:not([data-i="${c}"])` : `.answers .ans[data-i="${c}"]`;
    await p.click(sel);
    if (i === 0) { ok(await p.isVisible('.ans.ok') && await p.isVisible('.ans.bad'), 'wrong answer: shows correct + wrong'); await axe(p, 'question-answered', prof); }
    if (i === 0) { const k = await p.evaluate(async id => { const m = await import('./js/learn.js'); const [cov, sg] = await Promise.all(['data/coverage.json', 'data/signs.json'].map(u => fetch(u).then(r => r.json()))); return m.explain(id, 'B', cov, sg)?.kind; }, await curId(p));
      ok(await p.isVisible('.why') && await p.locator('.why a.btn.primary[data-learn]').count() === (k === 'none' ? 0 : 1), `wrong answer: why box + "learn this" lesson link when taught (${k})`);
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
  // search by text and by number
  await go(p, '#/search'); await p.waitForSelector('#sq'); await p.fill('#sq', 'חגורת בטיחות'); await p.waitForTimeout(400);
  const nRes = +((await text(p)).match(/(\d+) תוצאות/) || [0, 0])[1];
  ok(nRes > 3 && (await p.locator('.sres .qlist li').count()) === Math.min(40, nRes) && !/null/.test(await p.textContent('.sres')), `search by text (${nRes})`);
  await axe(p, 'search', prof);
  await p.fill('#sq', '1535'); await p.waitForTimeout(400);
  ok(/1 תוצאות/.test(await text(p)) && /1535/.test(await p.textContent('.sres .qlist li')), 'search by question number');
  await p.click('a[href="#/search/go"]'); await p.waitForSelector('.answers .ans'); ok((await curId(p)) === 1535, 'practise search results');
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
  ok(/לא כולל תיאור מילולי/.test(await text(p)) && (await p.locator('.elig').count()) === 6, 'about: picture-question accessibility note + eligibility for all 6 classes');
  ok(/כל המאגר/.test(await text(p)) && (await p.locator('table.tbl tbody tr').count()) >= 7 && !/kolzchut/.test(await p.content()), 'about: whole-bank coverage table for all classes, no Kol Zchut link');
  // learning stage: path → lesson (law chips, diagram + text alternative, recap) → mini-quiz → mastery → unlock
  const LJ = await p.evaluate(() => fetch('data/lessons.json').then(r => r.json())), LB = LJ.lessons.filter(l => l.cls.includes('B'));
  await go(p, '#/learn'); await p.waitForSelector('.lessons');
  ok(await p.locator('.lessons li').count() === LB.length && await p.locator('.lessons li:nth-child(1) a').count() === 1 && await p.locator('.lessons li:nth-child(2) [aria-disabled="true"]').count() === 1, `learn path: ${LB.length} lessons for B, only the first open`);
  await axe(p, 'learn-path', prof);
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
  // v1.10 bank-only lessons: question + answer as published, visible no-explanation label, CC BY attribution, no rules of ours
  { const BKL = LB.filter(l => l.bank), ids = LB.map(l => l.id);
    ok(BKL.length >= 4 && ids.slice(-BKL.length).every(i => i.startsWith('bank_')), `B path ends with ${BKL.length} "מהמאגר הרשמי" lessons`);
    const bv = BKL.find(l => l.id === 'bank_veh'), want = bv.bank.filter(i => QH.get(i)?.t.includes('B'));
    await go(p, '#/learn/bank_veh/peek'); await p.waitForSelector('.bankcard');
    const cards = await p.locator('.bankcard').evaluateAll(es => es.map(e => [+e.dataset.q, e.querySelector('.qtext').textContent, e.querySelector('.ans-ok .at').textContent, [...e.querySelectorAll('.opts li .at')].map(x => x.textContent)]));
    ok(cards.length === want.length && cards.every(([i, q, a, o]) => q.endsWith(QH.get(i).q) && a === QH.get(i).a[QH.get(i).c] && JSON.stringify(o) === JSON.stringify(QH.get(i).a)), `bank lesson: all ${want.length} B questions shown with the official text, all four official options and the correct one marked`);
    ok(/אין לשאלות האלה הסבר רשמי או מקור חוקי/.test(await p.textContent('.banknote')) && await p.locator('.banktag').count() === cards.length, 'bank lesson: visible "no official explanation or legal source" label on the lesson and every card');
    ok(/data\.gov\.il/.test(await p.getAttribute('a:has-text("CC BY")', 'href')) && await p.locator('.rules, .lbody, .recap, .mnems').count() === 0, 'bank lesson: CC BY attribution link to data.gov.il, no rules/explanation/recap of ours');
    ok(/ספר הלימוד הרשמי/.test(await p.textContent('.bankcard[data-q="1765"] .lawnote')) && await p.locator('.bankcard[data-q="1765"] .lawnote details.lawref').count() === 1, 'Q1765: textbook difference stated with its source');
    const r = await p.evaluate(async () => { const m = await import('./js/learn.js'); const cov = await fetch('data/coverage.json').then(r => r.json());
      return Object.keys(cov.q).filter(id => cov.q[id][3] === 'S').map(id => [id, m.explain(+id, 'B', cov, null)?.lesson?.id || '']); });
    const nb = r.filter(([id]) => QH.get(+id).t.includes('B'));
    ok(nb.length > 0 && nb.length === new Set(LB.filter(l => l.bank).flatMap(l => l.bank).filter(i => QH.get(i).t.includes("B"))).size && nb.every(([, l]) => l.startsWith('bank_')), `why box: every B no-source question links to its bank lesson (${nb.filter(([, l]) => l).length}/${nb.length})`);
    await axe(p, 'bank-lesson', prof); }
  // v1.11: B questions a lesson covers only partly – question + official answer as published, the cited unit and the bank-only rest labelled apart
  { const PL = LB.filter(l => (l.pbank || []).some(x => QH.get(x.q)?.t.includes('B'))), all = PL.flatMap(l => l.pbank.filter(x => QH.get(x.q)?.t.includes('B')).map(x => x.q));
    ok(PL.length >= 20 && all.length === new Set(all).size && PL.every(l => l.pbank.every(x => !QH.get(x.q)?.t.includes('B') || l.quiz.includes(x.q))), `partial cards: ${all.length} B questions in ${PL.length} lessons, each in its lesson quiz`);
    const pl = PL.reduce((a, b) => (b.pbank.length > a.pbank.length ? b : a)), want = pl.pbank.filter(x => QH.get(x.q)?.t.includes('B'));
    await go(p, '#/learn/' + pl.id + '/peek'); await p.waitForSelector('.pbcard');
    const cards = await p.locator('.pbcard').evaluateAll(es => es.map(e => [+e.dataset.q, e.querySelector('.qtext').textContent, e.querySelector('.ans-ok .at').textContent, [...e.querySelectorAll('.opts li .at')].map(x => x.textContent), e.querySelectorAll('.pbpart').length, !!e.querySelector('.pbrest')]));
    ok(cards.length === want.length && cards.every(([i, q, a, o, n, r], k) => i === want[k].q && q.endsWith(QH.get(i).q) && a === QH.get(i).a[QH.get(i).c] && JSON.stringify(o) === JSON.stringify(QH.get(i).a) && n === want[k].u.length && r),
      `partial cards (${pl.id}): ${cards.length} questions with the official text and answer, the cited unit, and a bank-only rest line`);
    ok(/שאלות מהמאגר שהשיעור מכסה רק חלקית/.test(await text(p)) && await p.locator('#ls-pbank ~ .bankattr a[href*="data.gov.il"]').count() === 1 && await p.locator('.pbcard .pbpart.off .lawref').count() >= 1, 'partial cards: section title, CC BY link, official-source part with its citation chip');
    const no = LB.find(l => (l.pbank || []).some(x => QH.get(x.q)?.t.includes('B') && x.u.every(u => !u.o)));
    if (no) { const x = no.pbank.find(x => QH.get(x.q)?.t.includes('B') && x.u.every(u => !u.o)); await go(p, '#/learn/' + no.id + '/peek'); await p.waitForSelector('.pbcard');
      ok(/בלי מקור רשמי מצוטט/.test(await p.textContent(`.pbcard[data-q="${x.q}"]`)) && await p.locator(`.pbcard[data-q="${x.q}"] .pbpart.off`).count() === 0, `partial card Q${x.q}: covering unit without an official source is labelled so`); }
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
  { let bad = [];
    for (const l of LB) { await go(p, '#/learn/' + l.id + '/peek'); await p.waitForSelector('.lsec');
      const n = await p.locator('.viz').count(), alts = await p.locator('.viz .vz-alt').evaluateAll(es => es.filter(e => e.textContent.trim().length > 10).length);
      if (n !== l.viz.length || alts !== n) bad.push(`${l.id}(${n}/${l.viz.length}/${alts})`);
      const r = await p.evaluate(() => axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] } }));
      if (r.violations.length) bad.push(l.id + ':' + r.violations.map(x => x.id).join(',')); }
    ok(!bad.length, `all ${LB.length} B lessons: diagrams + text alternative + axe clean ${bad.join(' ')}`); }
  await go(p, '#/learn'); await p.waitForSelector('.lessons');
  ok(await p.locator('.lessons li:nth-child(2) a').count() === 1, 'reading lesson 1 unlocked lesson 2');
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
  await go(p, '#/settings'); await p.waitForSelector('.card#backup');
  ok(await p.isVisible('#bk-undo'), 'undo restore offered');
  // file export → import (sanitised)
  await p.evaluate(() => { const m = JSON.parse(localStorage.getItem('theoryIL.meta')); delete m.lastBackup; localStorage.setItem('theoryIL.meta', JSON.stringify(m)); });
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#bk-export')]);
  await p.waitForSelector('#bk-confirm'); ok(!(await META(p)).lastBackup, 'download alone does not count as a backup');
  await p.click('#bk-confirm'); ok(!!(await META(p)).lastBackup, 'confirmed download counts as a backup');
  const f = path.join(OUT, 'backup.json'); await dl.saveAs(f);
  const j = JSON.parse(fs.readFileSync(f, 'utf8')); ok(j.app === 'theory-il' && j.state.profile.cls === 'B', `backup file ${dl.suggestedFilename()}`);
  j.state.profile.name = '<img src=x onerror=alert(1)>'; j.state.profile.cls = 'ZZ'; j.state.evil = { a: 1 }; j.state.q['abc'] = [1, 2, 3, 4, 5]; j.state.xp = -5;
  const f2 = path.join(OUT, 'evil.json'); fs.writeFileSync(f2, JSON.stringify(j));
  await p.setInputFiles('#filein', f2); await p.waitForSelector('.drive');
  const ev = await (async () => { const s = await S(p); return { name: s.profile.name, cls: s.profile.cls, evil: 'evil' in s, abc: 'abc' in s.q, xp: s.xp, imgs: await p.evaluate(() => document.querySelectorAll('img[src="x"]').length) }; })();
  ok(!/[<>]/.test(ev.name) && ev.cls === 'B' && !ev.evil && !ev.abc && ev.xp === 0 && !ev.imgs, `sanitised import ${JSON.stringify(ev)}`);
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
  await go(p, '#/learn/' + LB[0].id); await p.waitForSelector('.lsec');
  ok(/Hebrew only/.test(await text(p)) && await p.getAttribute('.lbody', 'dir') === 'rtl', 'English UI: lesson flagged Hebrew-only, body stays RTL');
  await axe(p, 'lesson-en', prof);
  await go(p, '#/settings'); await p.selectOption('#su', 'he'); await p.selectOption('#st', 'dark'); await p.waitForTimeout(300);
  await go(p, '#/home'); await axe(p, 'home-dark', prof);
  await go(p, '#/learn/' + LB[1].id); await p.waitForSelector('.viz'); await axe(p, 'lesson-dark', prof);
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
  await go(p, '#/learn/' + LB[0].id); await p.waitForSelector('.viz', { timeout: 5000 }).catch(() => {});
  ok(await p.locator('.viz').count() > 0 && await p.locator('.rules li').count() === LB[0].rules.length, 'lessons + diagrams work offline');
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
    await p.goto(BASE); await p.waitForSelector('h1'); if (await over()) bad.push('welcome');
    await p.click('a[href="#/onboard/1"]'); await p.click('label:has(input[value="B"])'); if (await over()) bad.push('onboard1');
    await p.click('.row .btn.primary'); await p.click('a[href="#/onboard/3"]'); if (await over()) bad.push('onboard3');
    await p.click('.row .btn.primary.big'); await p.waitForSelector('.drive');
    const LJ = await p.evaluate(() => fetch('data/lessons.json').then(r => r.json()));
    const routes = ['#/home', '#/learn', '#/practice', '#/practice/mix', '#/review', '#/search', '#/bookmarks', '#/signs', '#/signs/go', '#/stats', '#/parent', '#/about', '#/settings', '#/exam',
      ...LJ.lessons.filter(l => l.cls.includes('B') || l.cls.includes('A')).map(l => '#/learn/' + l.id + '/peek')];
    for (const r of routes) { await go(p, r); await p.waitForSelector('h1', { timeout: 5000 }).catch(() => {}); const sw = await over(); if (sw) bad.push(r + '=' + sw); }
    await go(p, '#/exam'); await p.click('.btn.primary.big'); await p.waitForSelector('#timer'); if (await over()) bad.push('exam-running');
    ok(!bad.length, `${W}px: no horizontal overflow on ${routes.length + 5} screens ${bad.slice(0, 5).join(' ')}`);
    await ctx.close();
  }
  await b.close();
}
(async () => {
  await run('mobile', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale: 'he-IL' });
  await run('desktop', { viewport: { width: 1280, height: 860 }, locale: 'he-IL', reducedMotion: 'reduce' });
  await overflowSweep();
  console.log(`\n${passes} passed, ${fails} failed`); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
