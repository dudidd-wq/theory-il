import { h, icon, ring, toast, shuffle, mmss } from './ui.js';
import { t, setUi, uiLang } from './i18n.js';
import * as st from './store.js';
import * as bk from './backup.js';
import * as tts from './tts.js';
import { VERSION } from './version.js';
import { ELIG, lawUrl } from './elig.js';
import { makeLearn, loadLessons, lessonFrac, lessonsFor, masteredCount } from './learn.js';
const { state: S, save, today, CLASSES, LANGS } = st;
const TOPICS = ['vehicle', 'signs', 'safety', 'law'];
const LANG_NAMES = { he: 'עברית', en: 'English', ru: 'Русский', fr: 'Français', es: 'Español' };
const app = () => document.getElementById('app');
let Q = [], byId = new Map(), TR = {}, MAN = null, session = null, exam = null, timer = 0;

// ---------- data ----------
async function getJSON(u, ms = 15000) {   // timeout so a stalled network never leaves the loading screen forever
  const ac = new AbortController(), tm = setTimeout(() => ac.abort(), ms);
  try { const r = await fetch(u, { signal: ac.signal }); if (!r.ok) throw new Error(u); return await r.json(); } finally { clearTimeout(tm); }
}
async function loadData() { [Q, MAN] = await Promise.all([getJSON('data/q.he.json'), getJSON('data/manifest.json'), loadLessons(getJSON)]); byId = new Map(Q.map(p => [p.id, p])); }
async function loadLang(l) { if (l !== 'he' && !TR[l]) { try { TR[l] = await getJSON(`data/q.${l}.json`); } catch { TR[l] = {}; } } }
const prof = () => S().profile;
const cls = () => prof()?.cls || 'B';
function view(id, forceHe = false) {
  const p = byId.get(id), l = prof()?.lang || 'he', tr = !forceHe && l !== 'he' && TR[l]?.[id];
  return tr ? { ...p, q: tr[0], a: tr[1], c: tr[2], lang: l, tr: true } : { ...p, lang: 'he', tr: false };
}
const pool = (c = cls()) => Q.filter(p => p.t.includes(c)).map(p => p.id);
const topicPool = (k, c = cls()) => Q.filter(p => p.k === k && p.t.includes(c)).map(p => p.id);
const signPool = (c = cls()) => Q.filter(p => p.k === 'signs' && p.i && p.t.includes(c)).map(p => p.id);
const frac = ids => ids.length ? ids.filter(st.mastered).length / ids.length : 0;
const mistakes = () => pool().filter(st.inMistakes);
const dueList = () => pool().filter(st.isDue);
function pick(ids, n) {
  const due = shuffle(ids.filter(st.isDue)).slice(0, Math.ceil(n * 0.4));
  const fresh = shuffle(ids.filter(id => !st.info(id)));
  const rest = shuffle(ids.filter(id => st.info(id) && !due.includes(id))).sort((a, b) => st.info(a)[0] - st.info(b)[0]);
  return shuffle([...new Set([...due, ...fresh, ...rest])].slice(0, n));
}
const trOld = l => { const m = MAN?.langs?.[l]?.resourceModified; return m && m < '2021' ? m.slice(0, 4) : ''; };
const dirOf = l => (l === 'he' ? 'rtl' : 'ltr');

// ---------- gamification ----------
const totals = () => Object.values(S().days).reduce((a, d) => [a[0] + d[0], a[1] + d[1]], [0, 0]);
const BADGES = [
  ['first', () => totals()[0] >= 1], ['c50', () => totals()[1] >= 50], ['c500', () => totals()[1] >= 500],
  ['s3', () => st.streak() >= 3], ['s7', () => st.streak() >= 7], ['s30', () => st.streak() >= 30],
  ['signs', () => Q.filter(p => p.k === 'signs' && st.mastered(p.id)).length >= 50],
  ['exam', () => S().ex.length >= 1], ['pass', () => S().ex.some(e => e[2] >= 26)],
  ['pass3', () => S().ex.length >= 3 && S().ex.slice(-3).every(e => e[2] >= 26)],
  ['review', () => !!S().badges.review], ['backup', () => !!bk.getMeta().lastBackup],
];
function checkBadges() {
  const got = [];
  for (const [k, f] of BADGES) if (!S().badges[k] && f()) { S().badges[k] = Date.now(); got.push(k); }
  if (got.length) { save(); toast(t('bd.new', t('bd.' + got[0]))); }
}
/** an estimate only: 15% lessons mastered (when the class has lessons), 50% questions mastered, 35% the last 3 exams */
function readiness() {
  const m = frac(pool()), ex = S().ex.filter(e => e[1] === cls()).slice(-3), hasL = lessonsFor(cls()).length > 0;
  const wl = hasL ? 0.15 : 0, base = wl * lessonFrac(cls()) + 0.5 * m;
  return ex.length ? base + 0.35 * (ex.reduce((a, e) => a + e[2], 0) / ex.length / 30) : base / (wl + 0.5);
}

// ---------- shell ----------
function applyPrefs() {
  const p = prof() || {}; setUi(p.ui || 'he');
  const de = document.documentElement; de.lang = uiLang(); de.dir = dirOf(uiLang());
  de.dataset.theme = p.theme || 'auto'; de.classList.toggle('big', !!p.big);
  document.title = t('app.title');
  document.querySelectorAll('[data-t]').forEach(el => { el.textContent = t(el.dataset.t); });
  const nav = document.getElementById('nav'); nav.setAttribute('aria-label', t('nav.main')); nav.replaceChildren(...[
    ['home', 'home', 'nav.home'], ['learn', 'learn', 'nav.learn'], ['practice', 'book', 'nav.practice'], ['exam', 'exam', 'nav.exam'], ['stats', 'chart', 'nav.stats'], ['settings', 'more', 'nav.more']]
    .map(([r, i, k]) => h('a', { href: '#/' + r, 'data-route': r }, icon(i), h('span', { text: t(k) }))));
  nav.hidden = !p.cls;
}
function markNav(r) { document.querySelectorAll('#nav a').forEach(a => { if (a.dataset.route === r) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); }); }
function screen(title, ...kids) {
  const h1 = h('h1', { tabindex: '-1', text: title });
  app().replaceChildren(h('div', { class: 'screen' }, h1, ...kids));
  requestAnimationFrame(() => h1.focus({ preventScroll: true })); scrollTo(0, 0);
}
const btn = (label, onclick, cls = 'btn', ic, extra = {}) => h('button', { type: 'button', class: cls, onclick, ...extra }, ic && icon(ic), h('span', { text: label }));
const link = (label, href, cls = 'btn', ic) => h('a', { class: cls, href }, ic && icon(ic), h('span', { text: label }));
const clsName = c => `${t('cls.' + c)} (${c === '1' ? '1' : c})`;

// ---------- router ----------
const routes = { welcome, onboard, home, learn: (a, b) => LRN.route(a, b), practice, signs, exam: examIntro, review, bookmarks, search, stats, parent, settings, about };
async function route() {
  stopTimer(); tts.stop();
  const [r, arg, sub] = location.hash.replace(/^#\/?/, '').split('/');
  if (!prof()?.cls && r !== 'onboard' && r !== 'about' && r !== 'settings') return welcome();
  if (prof()?.cls && (r === 'welcome' || r === 'onboard')) { location.hash = '#/home'; return; }
  markNav(r || 'home');
  (routes[r] || home)(arg, sub);
}
const LRN = makeLearn({ screen, btn, link, view, pool, cls, prof, pick, clsName, byId: { has: k => byId.has(k), get: k => byId.get(k) },
  startSession: (...a) => startSession(...a) });
let leaving = false;
addEventListener('hashchange', () => {
  if (exam && !exam.done && !leaving) {
    if (!confirm(t('ex.leave'))) { leaving = true; history.back(); return; }
    exam = null; st.clearExam();
  }
  if (leaving) { leaving = false; return; }   // the history.back() that undid a cancelled navigation
  session = null; route();
});

// ---------- onboarding ----------
function welcome() {
  document.getElementById('nav').hidden = true;
  screen(t('ob.welcome'),
    h('img', { class: 'hero', src: 'img/hero.svg', alt: '', width: 360, height: 170 }),
    h('p', { class: 'lead', text: t('ob.intro') }),
    h('ul', { class: 'points' }, t('ob.points').map(s => h('li', {}, icon('check'), h('span', { text: s })))),
    h('p', { class: 'disc', role: 'note' }, icon('info'), h('span', { text: t('disc.short') })),
    bankNotice(),
    h('div', { class: 'row' }, link(t('ob.start'), '#/onboard/1', 'btn primary big'), link(t('ob.restore'), '#/settings', 'btn ghost')),
    h('p', { class: 'small' }, h('a', { href: '#/about', text: t('set.about') })),
    h('div', { class: 'ui-switch' }, ['he', 'en'].map(l => btn(l === 'he' ? 'עברית' : 'English', () => { draft.ui = l; setUi(l); applyPrefs(); welcome(); }, 'chip', null, { 'aria-pressed': String(uiLang() === l), lang: l }))));
}
const draft = { cls: null, lang: 'he', name: '', ui: 'he' };
/** who may get this licence class – each line links to the cited section of the regulations */
function eligCard(c, head = true) {
  const en = uiLang() !== 'he', ext = (href, text) => h('a', { href, rel: 'noopener noreferrer', target: '_blank', text });
  return h('section', { class: 'card elig', 'aria-label': t('el.title', clsName(c)) }, head && h('h2', { class: 'h3', text: t('el.title', clsName(c)) }),
    h('ul', { class: 'points' }, ELIG[c].map(([he, enT, refs]) => h('li', {}, icon('check'), h('span', {}, h('span', { text: en ? enT + ' ' : he + ' ' }),
      h('span', { class: 'refs small' }, refs.map((r, i) => [i ? ', ' : '', ext(lawUrl(r.match(/^\d+[א-ת]?/)[0]), t('el.ref', r))])))))),
    h('p', { class: 'small muted', text: t('el.note') }));
}
function onboard(step = '1') {
  const n = +step || 1;
  const steps = h('p', { class: 'step', text: t('ob.step', n) });
  if (n === 1) {
    const opts = CLASSES.map(c => h('label', { class: 'opt' + (draft.cls === c ? ' on' : '') },
      h('input', { type: 'radio', name: 'cls', value: c, checked: draft.cls === c, onchange: () => { draft.cls = c; onboard('1'); document.querySelector(`input[value="${c}"]`)?.focus(); } }),
      h('span', { class: 'opt-badge', text: c }), h('span', { class: 'opt-t' }, h('b', { text: t('cls.' + c) }), h('small', { text: t('cls.' + c + 'd') }))));
    screen(t('ob.cls'), steps, h('fieldset', { class: 'opts' }, h('legend', { class: 'sr', text: t('ob.cls') }), opts),
      draft.cls ? eligCard(draft.cls) : null,
      h('p', { class: 'small', text: t('ob.clsHint') }), h('p', { class: 'small muted', text: t('cls.note') }),
      h('div', { class: 'row' }, link(t('ob.back'), '#/welcome', 'btn ghost'), btn(t('ob.next'), () => { location.hash = '#/onboard/2'; }, 'btn primary', null, { disabled: !draft.cls })));
  } else if (n === 2) {
    if (!draft.cls) { location.hash = '#/onboard/1'; return; }
    const opts = LANGS.map(l => h('label', { class: 'opt' + (draft.lang === l ? ' on' : '') },
      h('input', { type: 'radio', name: 'lang', value: l, checked: draft.lang === l, onchange: () => { draft.lang = l; onboard('2'); document.querySelector(`input[value="${l}"]`)?.focus(); } }),
      h('span', { class: 'opt-t', lang: l }, h('b', { text: LANG_NAMES[l] }), h('small', { text: l === 'he' ? '' : `${MAN?.langs?.[l]?.count || ''}` }))));
    screen(t('ob.lang'), steps, h('fieldset', { class: 'opts two' }, h('legend', { class: 'sr', text: t('ob.lang') }), opts),
      h('p', { class: 'small', text: t('ob.langHint') }),
      h('div', { class: 'row' }, link(t('ob.back'), '#/onboard/1', 'btn ghost'), link(t('ob.next'), '#/onboard/3', 'btn primary')));
  } else {
    if (!draft.cls) { location.hash = '#/onboard/1'; return; }
    const inp = h('input', { id: 'nm', type: 'text', maxlength: '20', autocomplete: 'given-name', value: draft.name, oninput: e => { draft.name = e.target.value; } });
    screen(t('ob.name'), steps, h('label', { for: 'nm', class: 'lbl', text: t('set.name') }), inp,
      h('div', { class: 'row' }, link(t('ob.back'), '#/onboard/2', 'btn ghost'), btn(t('ob.go'), finishOnboard, 'btn primary big')));
  }
}
async function finishOnboard() {
  const s = S();
  s.profile = { name: bk.cleanState({ v: 1, profile: { name: draft.name } }).profile.name, cls: draft.cls, lang: draft.lang, ui: draft.ui || uiLang(), theme: 'auto', goal: 20, tts: false, rate: 1, big: false };
  save(); await loadLang(draft.lang); bk.requestPersist(); applyPrefs(); location.hash = '#/home';
}

// ---------- home ----------
function home() {
  const p = prof(), lv = st.level(), d = S().days[today()] || [0, 0], streak = st.streak();
  const due = dueList().length, mist = mistakes().length;
  const kids = [];
  const b = bk.backupDue();
  if (b) kids.push(h('div', { class: 'banner', role: 'status' }, icon('shield'), h('p', { text: b.never ? t('bk.dueNever') : t('bk.due', b.days) }),
    h('div', { class: 'row tight' }, link(t('bk.now'), '#/settings/backup', 'btn small primary'), btn(t('bk.later'), () => { bk.snoozeReminder(); home(); }, 'btn small ghost'))));
  const ex = st.loadExam();
  if (ex) kids.push(h('div', { class: 'banner', role: 'status' }, icon('clock'), h('p', { text: t('home.examOn') }), h('div', { class: 'row tight' }, link(t('home.examGo'), '#/exam', 'btn small primary'))));
  kids.push(h('p', { class: 'sub', text: t('home.cls', clsName(p.cls)) }));
  kids.push(h('section', { class: 'kpis', 'aria-label': t('st.title') },
    h('div', { class: 'kpi', title: t('home.freezeHint') }, icon('flame', 'ic accent'), h('b', { text: streak }), h('span', { text: t('home.streak') }), h('small', { class: 'frz', text: '❄ ' + t('home.freeze', st.freezes()) })),
    h('div', { class: 'kpi' }, icon('star', 'ic accent'), h('b', { text: S().xp }), h('span', { text: t('home.xp') })),
    h('div', { class: 'kpi' }, icon('award', 'ic accent'), h('b', { text: lv.lv }), h('span', { text: t('home.level', '') }),
      h('div', { class: 'bar', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': lv.need, 'aria-valuenow': lv.into, 'aria-label': t('home.level', lv.lv) }, h('i', { style: { width: (100 * lv.into / lv.need) + '%' } }))),
    h('div', { class: 'kpi goal' }, ring(d[0] / p.goal, 56, 6, t('home.goalOf', d[0], p.goal)), h('span', { text: t('home.goalOf', d[0], p.goal) }))));
  const nL = lessonsFor(p.cls).length;
  const tiles = h('section', { class: 'tiles' },
    nL ? tile('#/learn', 'learn', t('home.learn'), t('home.learnD', masteredCount(p.cls), nL), masteredCount(p.cls) < nL ? 'hl' : '') : null,
    tile('#/practice/mix', 'repeat', t('home.quick'), t('home.quickD')),
    tile('#/signs', 'sign', t('home.signs'), t('home.signsD', signPool().length)),
    tile('#/exam', 'exam', t('home.exam'), t('home.examD'), nL && masteredCount(p.cls) < nL ? '' : 'hl'),
    tile('#/review', 'repeat', t('home.review'), due ? t('home.reviewD', due) : (mist ? t('rv.due', 0, mist) : t('home.reviewNone')), due ? 'warn' : ''),
    tile('#/bookmarks', 'star', t('home.bm'), t('home.bmD', S().bm.length)));
  const cols = h('div', { class: 'cols' }, tiles); kids.push(cols);
  if (streak && st.frozeYesterday()) kids.splice(kids.indexOf(cols), 0, h('p', { class: 'small accent', text: t('home.frozen') }));
  // the route ("drive" metaphor): topic stations → exam
  const stops = TOPICS.map(k => { const ids = topicPool(k), f = frac(ids); return { k, f, n: ids.length }; });
  const cur = stops.findIndex(s => s.f < 0.6);
  cols.append(h('section', { class: 'drive', 'aria-labelledby': 'drv' }, h('h2', { id: 'drv', text: t('home.drive') }), h('p', { class: 'small muted', text: t('home.driveHint') }),
    h('ol', { class: 'road' }, stops.map((s, i) => h('li', { class: 'stop' + (s.f >= 0.6 ? ' done' : '') + (i === cur ? ' cur' : '') },
      h('a', { href: '#/practice/' + s.k, 'aria-current': i === cur ? 'step' : null },
        ring(s.f, 52, 6), h('span', { class: 'stop-t' }, h('b', { text: t('topic.' + s.k) }), h('small', { text: t('pr.stats', s.n, Math.round(s.f * 100)) })), i === cur && icon('car', 'ic car')))),
      h('li', { class: 'stop finish' + (cur === -1 ? ' cur' : '') }, h('a', { href: '#/exam' }, h('span', { class: 'flagdot' }, icon('flag')), h('span', { class: 'stop-t' }, h('b', { text: t('home.finish') }), h('small', { text: t('home.examD') })))))));
  kids.push(h('p', { class: 'row tight center' }, link(t('se.title'), '#/search', 'btn ghost small', 'search'), link(t('home.parent'), '#/parent', 'btn ghost small', 'user'), link(t('set.about'), '#/about', 'btn ghost small', 'info')));
  kids.push(h('p', { class: 'disc small', role: 'note', text: t('disc.short') }));
  screen(t('home.hi', p.name ? ', ' + p.name : ''), ...kids);
}
const tile = (href, ic, title, sub, cls = '') => h('a', { class: 'tile ' + cls, href }, icon(ic), h('b', { text: title }), h('small', { text: sub }));

// ---------- practice / signs / review / bookmarks ----------
function practice(k) {
  if (k && (TOPICS.includes(k) || k === 'mix')) return startSession('practice', k === 'mix' ? pick(pool(), 10) : pick(topicPool(k), 10), t('topic.' + k), '#/practice/' + k);
  screen(t('pr.title'), h('p', { class: 'small', text: t('pr.hint') }), h('p', {}, link(t('se.title'), '#/search', 'btn ghost small', 'search')),
    h('div', { class: 'list' }, [...TOPICS, 'mix'].map(k => { const ids = k === 'mix' ? pool() : topicPool(k), f = frac(ids);
      return h('a', { class: 'item', href: '#/practice/' + k }, ring(f, 48, 5), h('span', {}, h('b', { text: t('topic.' + k) }), h('small', { text: t('pr.stats', ids.length, Math.round(f * 100)) })), icon(uiLang() === 'he' ? 'arrowS' : 'arrowE')); })));
}
function signs(go) {
  const ids = signPool();
  if (go === 'go') return startSession('signs', pick(ids, 10), t('sg.title'), '#/signs/go');
  const sample = Q.find(p => p.id === ids[0]);
  screen(t('sg.title'), h('p', { text: t('sg.hint') }), h('p', { class: 'sub', text: t('pr.stats', ids.length, Math.round(frac(ids) * 100)) }),
    sample && h('img', { class: 'qimg', src: 'img/q/' + sample.i, alt: t('q.img', sample.id), loading: 'lazy', width: 320, height: 180 }),
    h('div', { class: 'row' }, link(t('sg.start'), '#/signs/go', 'btn primary big', 'sign')));
}
function review(go) {
  const due = dueList(), all = mistakes();
  if (go === 'go') return startSession('review', shuffle(due).slice(0, 15), t('rv.title'), '#/review');
  if (go === 'all') return startSession('review', shuffle(all).slice(0, 15), t('rv.title'), '#/review');
  const tk = go?.startsWith('all-') && go.slice(4);
  if (TOPICS.includes(tk)) return startSession('review', shuffle(all.filter(id => byId.get(id).k === tk)).slice(0, 15), t('rv.title') + ' · ' + t('topic.' + tk), '#/review');
  const byT = TOPICS.map(k => [k, all.filter(id => byId.get(id).k === k).length]).filter(x => x[1]);
  screen(t('rv.title'), h('p', { class: 'small', text: t('rv.hint') }), h('p', { class: 'sub', text: t('rv.due', due.length, all.length) }),
    !all.length && !due.length ? h('p', { class: 'empty', text: t('rv.empty') }) :
      h('div', { class: 'row' }, due.length ? link(t('rv.start'), '#/review/go', 'btn primary big', 'repeat') : null, all.length ? link(t('rv.early'), '#/review/all', 'btn ghost') : null),
    byT.length ? h('section', {}, h('h2', { text: t('rv.byTopic') }), h('div', { class: 'row tight' }, byT.map(([k, n]) => link(t('rv.chip', t('topic.' + k), n), '#/review/all-' + k, 'chip')))) : null);
}
function bookmarks(go) {
  const ids = S().bm.filter(id => byId.has(id));
  if (go === 'go' && ids.length) return startSession('bm', shuffle(ids).slice(0, 20), t('bm.title'), '#/bookmarks');
  screen(t('bm.title'), !ids.length ? h('p', { class: 'empty', text: t('bm.empty') }) : [
    h('div', { class: 'row' }, link(t('bm.practice'), '#/bookmarks/go', 'btn primary', 'star')),
    h('ul', { class: 'qlist' }, ids.map(id => { const v = view(id); return h('li', {}, h('p', { lang: v.lang, dir: dirOf(v.lang) }, h('small', { class: 'muted', text: t('q.id', id) + ' · ' }), v.q),
      h('p', { class: 'ans-ok', lang: v.lang, dir: dirOf(v.lang) }, icon('check'), h('span', { text: v.a[v.c] })),
      btn(t('bm.remove'), () => { st.toggleBookmark(id); bookmarks(); }, 'btn small ghost')); }))]);
}
function startSession(kind, ids, title, again, extra = {}) {
  if (!ids.length) { location.hash = '#/home'; return; }
  session = { kind, ids, i: 0, ok: 0, xp0: S().xp, wrong: [], title, again, he: false, ...extra };
  renderQ();
}
function qHeader(i, n, title, onquit) {
  return h('div', { class: 'qhead' }, btn(t('q.quit'), onquit, 'iconbtn', 'x', { 'aria-label': t('q.quit') }),
    h('div', { class: 'qprog' }, h('span', { text: title + ' · ' + t('q.of', i + 1, n) }),
      h('div', { class: 'bar', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': n, 'aria-valuenow': i, 'aria-label': t('q.of', i + 1, n) }, h('i', { style: { width: (100 * i / n) + '%' } }))));
}
function qTools(v, s) {
  const id = v.id, bm = st.isBookmarked(id), p = prof();
  const kids = [btn(t('q.bm'), e => { const on = st.toggleBookmark(id); e.currentTarget.setAttribute('aria-pressed', String(on)); e.currentTarget.classList.toggle('on', on); toast(t(on ? 'q.bmOn' : 'q.bmOff')); }, 'iconbtn' + (bm ? ' on' : ''), 'star', { 'aria-pressed': String(bm), 'aria-label': t('q.bm') })];
  if (p.tts && tts.supported()) kids.push(btn(t('q.read'), e => {
    const b = e.currentTarget; if (tts.speaking()) { tts.stop(); return; }
    if (!tts.voiceFor(v.lang)) toast(t('set.ttsNone', LANG_NAMES[v.lang]));
    tts.speak([v.q, ...v.a.map((a, i) => `${i + 1}. ${a}`)].join('\n'), v.lang, p.rate);
  }, 'iconbtn', 'vol', { 'aria-label': t('q.read') }));
  if (p.lang !== 'he' && TR[p.lang]?.[id]) kids.push(btn(s.he ? t('q.showTr') : t('q.showHe'), () => { s.he = !s.he; s.render(); }, 'chip', null, { 'aria-pressed': String(!!s.he) }));
  return h('div', { class: 'qtools' }, kids);
}
function qBody(v) {
  return [h('p', { class: 'qmeta' }, h('span', { class: 'tag', text: t('topic.' + v.k) }), h('span', { class: 'muted', text: t('q.id', v.id) })),
    h('h2', { class: 'qtext', id: 'qt', lang: v.lang, dir: dirOf(v.lang), text: v.q }),
    v.i && h('img', { class: 'qimg', src: 'img/q/' + v.i, alt: t('q.img', v.id), width: 320, height: 180 }),
    v.i && h('p', { class: 'sr', text: t('q.imgSr') }),
    v.tr && h('p', { class: 'small muted', text: t('q.trNote') }),
    v.tr && trOld(v.lang) && h('p', { class: 'small warn-note', text: t('q.trOld', trOld(v.lang)) })];
}
function renderQ() {
  const s = session; if (!s) return;
  if (s.i >= s.ids.length) return summary();
  const id = s.ids[s.i], v = view(id, s.he), order = s.order?.id === id && s.order.lang === v.lang ? s.order.o : shuffle([0, 1, 2, 3]);
  s.order = { id, lang: v.lang, o: order }; s.render = renderQ;
  const fb = h('p', { class: 'fb', role: 'status', 'aria-live': 'polite' });
  const next = btn(s.i + 1 < s.ids.length ? t('q.next') : t('q.finish'), () => { s.i++; s.answered = null; s.order = null; tts.stop(); renderQ(); }, 'btn primary big next', null, { hidden: true });
  const answers = h('div', { class: 'answers', role: 'group', 'aria-labelledby': 'qt' }, order.map((ai, n) => h('button', { type: 'button', class: 'ans', lang: v.lang, dir: dirOf(v.lang), 'data-i': ai, onclick: () => answer(ai) },
    h('span', { class: 'ans-n', text: n + 1 }), h('span', { class: 'ans-t', text: v.a[ai] }))));
  function answer(ai) {
    if (s.answered) return;
    const ok = ai === v.c; s.answered = { ai, ok };
    st.record(id, ok); if (ok) s.ok++; else s.wrong.push(id);
    paint(); checkBadges();
  }
  function paint() {
    if (!s.answered) return;
    answers.querySelectorAll('.ans').forEach(b => { const i = +b.dataset.i; b.disabled = true; b.setAttribute('aria-disabled', 'true');
      if (i === v.c) { b.classList.add('ok'); b.append(icon('check', 'ic mark')); }
      else if (i === s.answered.ai && !s.answered.ok) { b.classList.add('bad'); b.append(icon('x', 'ic mark')); } });
    fb.textContent = s.answered.ok ? t('q.correct') : t('q.wrong') + ' ' + v.a[v.c];
    fb.className = 'fb ' + (s.answered.ok ? 'good' : 'bad');
    next.hidden = false; next.focus();
  }
  screen('', qHeader(s.i, s.ids.length, s.title, () => { if (confirm(t('q.quitAsk'))) { session = null; location.hash = '#/home'; } }),
    h('article', { class: 'qcard' + (v.i ? ' has-img' : '') }, qTools(v, s), ...qBody(v), answers, fb, next));
  app().querySelector('h1').classList.add('sr'); app().querySelector('h1').textContent = s.title;
  if (s.answered) paint();
}
function summary() {
  const s = session, n = s.ids.length;
  if (s.kind === 'review') { S().badges.review ||= Date.now(); save(); }
  const les = s.lesson ? LRN.afterQuiz(s.lesson, s.ok, n) : [];
  checkBadges();
  screen(t('sum.title'), h('div', { class: 'result' }, ring(s.ok / n, 120, 10, t('sum.score', s.ok, n)), h('p', { class: 'big-t', text: t('sum.score', s.ok, n) }), h('p', { class: 'accent', text: t('sum.xp', S().xp - s.xp0) })), ...les,
    h('div', { class: 'row' }, s.wrong.length ? btn(t('sum.mist'), () => startSession('review', s.wrong.slice(), t('rv.title'), '#/review'), 'btn primary', 'repeat') : null,
      btn(t('sum.again'), () => { location.hash = s.again; route(); }, 'btn', 'repeat'), link(t('sum.home'), '#/home', 'btn ghost', 'home')));
}

// ---------- search (question text, answers or bank number) ----------
const norm = s => String(s).toLowerCase().replace(/[\u0591-\u05C7]/g, '').replace(/[״"׳'`.,?!:;()\[\]\-–—/]/g, ' ').replace(/\s+/g, ' ').trim();
let IDX = null, lastQ = '';
function searchIdx() {
  const l = prof()?.lang;
  if (!IDX || IDX.l !== l) IDX = { l, m: new Map(Q.map(p => [p.id, norm([p.q, ...p.a, ...(TR[l]?.[p.id] ? [TR[l][p.id][0], ...TR[l][p.id][1]] : [])].join(' '))])) };
  return IDX.m;
}
function findQ(q) {
  const s = q.trim(); if (/^\d{1,4}$/.test(s)) return byId.has(+s) ? [+s] : [];
  const words = norm(s).split(' ').filter(w => w.length > 1); if (!words.length) return null;
  const idx = searchIdx(), mine = new Set(pool());
  return Q.map(p => p.id).filter(id => { const x = idx.get(id); return words.every(w => x.includes(w)); }).sort((a, b) => mine.has(b) - mine.has(a));
}
function search(go) {
  if (go === 'go') { const ids = findQ(lastQ) || []; return startSession('search', ids.slice(0, 20), t('se.title'), '#/search'); }
  const out = h('div', { class: 'sres', 'aria-live': 'polite' });
  const inp = h('input', { id: 'sq', type: 'search', value: lastQ, maxlength: '60', autocomplete: 'off', enterkeyhint: 'search', 'aria-describedby': 'sqh' });
  const mine = new Set(pool());
  const run = () => {
    lastQ = inp.value; const ids = findQ(lastQ);
    if (ids === null) { out.replaceChildren(); return; }
    out.replaceChildren(...[h('p', { class: 'sub', text: t('se.count', ids.length) }),
      ids.length ? h('div', { class: 'row' }, link(t('se.practice', Math.min(20, ids.length)), '#/search/go', 'btn primary', 'repeat')) : h('p', { class: 'empty', text: t('se.none') }),
      h('ul', { class: 'qlist' }, ids.slice(0, 40).map(id => { const v = view(id), bm = st.isBookmarked(id);
        return h('li', {}, h('p', { lang: v.lang, dir: dirOf(v.lang) }, h('small', { class: 'muted', text: t('q.id', id) + ' · ' + t('topic.' + v.k) + (mine.has(id) ? '' : ' · ' + t('se.other')) + ' · ' }), v.q),
          v.i ? h('img', { class: 'qimg sm', src: 'img/q/' + v.i, alt: t('q.img', id), loading: 'lazy', width: 240, height: 135 }) : null,
          h('p', { class: 'ans-ok', lang: v.lang, dir: dirOf(v.lang) }, icon('check'), h('span', { text: v.a[v.c] })),
          btn(t('q.bm'), e => { const on = st.toggleBookmark(id); e.currentTarget.setAttribute('aria-pressed', String(on)); e.currentTarget.classList.toggle('on', on); }, 'btn small ghost' + (bm ? ' on' : ''), 'star', { 'aria-pressed': String(bm) })); })),
      ids.length > 40 ? h('p', { class: 'small muted', text: t('se.more', ids.length - 40) }) : null].filter(Boolean));
  };
  let tm = 0; inp.addEventListener('input', () => { clearTimeout(tm); tm = setTimeout(run, 180); });
  screen(t('se.title'), h('label', { for: 'sq', class: 'lbl', text: t('se.label') }), inp, h('p', { id: 'sqh', class: 'small muted', text: t('se.hint') }), out);
  run(); inp.focus();
}

// ---------- full exam ----------
const bankNotice = () => h('p', { class: 'notice', role: 'note' }, icon('info'), h('span', { text: t('disc.bank', fmtDate(MAN?.langs?.he?.resourceModified)) }));
const fmtDate = iso => iso ? new Date(iso.slice(0, 10) + 'T12:00:00Z').toLocaleDateString(uiLang() === 'he' ? 'he-IL' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : '2021';
function examIntro(go) {
  const saved = st.loadExam();
  if (saved && !exam) {
    const left = Math.max(0, (saved.end - Date.now()) / 1000), done = Object.keys(saved.ans || {}).length;
    return screen(t('ex.title'), h('div', { class: 'banner', role: 'status' }, icon('clock'),
      h('p', { text: left > 0 ? t('ex.resumeQ', done, mmss(left)) : t('ex.resumeLate', done) }),
      h('div', { class: 'row tight' }, btn(left > 0 ? t('ex.resume') : t('ex.resumeSubmit'), () => resumeExam(saved), 'btn primary'),
        btn(t('ex.discard'), () => { if (confirm(t('ex.discardAsk'))) { st.clearExam(); examIntro(); } }, 'btn ghost'))));
  }
  if (go === 'go') return startExam();
  screen(t('ex.title'), h('p', { class: 'sub', text: clsName(cls()) }),
    h('ul', { class: 'points' }, t('ex.rules').map(r => h('li', {}, icon('check'), h('span', { text: r.replace('{0}', cls()) })))),
    bankNotice(),
    h('p', { class: 'small muted', text: t('ex.note') }),
    h('div', { class: 'row' }, btn(t('ex.start'), () => startExam(), 'btn primary big', 'clock')),
    S().ex.length ? examHistory(5) : null);
}
/** 30 questions, topic mix proportional to the class pool's topic shares (largest remainder), random inside each topic */
function examIds(c = cls(), n = 30) {
  const by = TOPICS.map(k => shuffle(topicPool(k, c))), tot = by.reduce((a, x) => a + x.length, 0);
  const quota = by.map(x => n * x.length / tot), take = quota.map(Math.floor);
  let rest = n - take.reduce((a, x) => a + x, 0);
  quota.map((q, i) => [q - take[i], i]).sort((a, b) => b[0] - a[0]).forEach(([, i]) => { if (rest > 0) { take[i]++; rest--; } });
  return shuffle(by.flatMap((x, i) => x.slice(0, take[i])));
}
function startExam() {
  exam = { ids: examIds(), cls: cls(), ans: {}, orders: {}, i: 0, start: Date.now(), end: Date.now() + 40 * 60e3, done: false, he: false, flags: {} };
  exam.render = renderExam; renderExam(); startTimer();
}
function resumeExam(saved) {
  exam = { ...saved, ids: saved.ids.filter(id => byId.has(id)), ans: saved.ans || {}, orders: saved.orders || {}, flags: saved.flags || {} };
  exam.i = Math.min(Math.max(0, exam.i | 0), exam.ids.length - 1); exam.render = renderExam;
  if (!exam.ids.length) { st.clearExam(); exam = null; return examIntro(); }
  if (Date.now() >= exam.end) { toast(t('ex.timeUp')); return submitExam(); }
  renderExam(); startTimer();
}
function startTimer() {
  stopTimer();
  timer = setInterval(() => {
    const el = document.getElementById('timer'); if (!exam || exam.done) return stopTimer();
    const left = Math.max(0, (exam.end - Date.now()) / 1000);
    if (el) { el.textContent = t('ex.left', mmss(left)); el.classList.toggle('low', left < 300); }
    if (left <= 0) { toast(t('ex.timeUp')); submitExam(); }
  }, 1000);
}
function stopTimer() { if (timer) clearInterval(timer); timer = 0; }
function renderExam() {
  const e = exam, id = e.ids[e.i], v = view(id, e.he), N = e.ids.length;
  const key = id + v.lang; e.orders[key] ||= shuffle([0, 1, 2, 3]);
  st.saveExam(e);
  const picked = e.ans[id]?.lang === v.lang ? e.ans[id].ai : (e.ans[id] ? -2 : -1);
  const left = Math.max(0, (e.end - Date.now()) / 1000);
  const grid = h('details', { class: 'grid' }, h('summary', { text: t('ex.grid') }), h('div', { class: 'gridb' }, e.ids.map((qid, n) =>
    btn(String(n + 1), () => { e.i = n; renderExam(); }, 'gbtn' + (e.ans[qid] ? ' done' : '') + (n === e.i ? ' cur' : ''), null, { 'aria-label': t('q.of', n + 1, N), 'aria-current': n === e.i ? 'true' : null }))));
  const answers = h('div', { class: 'answers', role: 'radiogroup', 'aria-labelledby': 'qt' }, e.orders[key].map((ai, n) =>
    h('button', { type: 'button', role: 'radio', class: 'ans' + (picked === ai ? ' sel' : ''), 'aria-checked': String(picked === ai), 'data-i': ai, lang: v.lang, dir: dirOf(v.lang),
      onclick: () => { e.ans[id] = { ai, lang: v.lang, ok: ai === v.c }; renderExam(); } }, h('span', { class: 'ans-n', text: n + 1 }), h('span', { class: 'ans-t', text: v.a[ai] }))));
  const unanswered = e.ids.filter(q => !e.ans[q]).length;
  screen('', h('div', { class: 'qhead' }, btn(t('q.quit'), () => { if (confirm(t('ex.leave'))) { exam = null; st.clearExam(); stopTimer(); location.hash = '#/home'; } }, 'iconbtn', 'x', { 'aria-label': t('q.quit') }),
      h('div', { class: 'qprog' }, h('span', { text: t('q.of', e.i + 1, N) }), h('div', { class: 'bar', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': N, 'aria-valuenow': N - unanswered, 'aria-label': t('q.answers') }, h('i', { style: { width: (100 * (N - unanswered) / N) + '%' } }))),
      h('span', { id: 'timer', class: 'timer' + (left < 300 ? ' low' : ''), role: 'timer', 'aria-live': 'off', text: t('ex.left', mmss(left)) })),
    h('article', { class: 'qcard' + (v.i ? ' has-img' : '') }, qTools(v, e), ...qBody(v), answers,
      h('div', { class: 'row nav2' }, btn(t('ex.prev'), () => { e.i--; renderExam(); }, 'btn ghost', null, { disabled: e.i === 0 }),
        e.i < N - 1 ? btn(t('q.next'), () => { e.i++; renderExam(); }, 'btn primary') : null,
        btn(t('ex.submit'), () => { if (confirm(unanswered ? t('ex.submitAsk', unanswered) : t('ex.submitOk'))) submitExam(); }, e.i === N - 1 ? 'btn primary' : 'btn', 'flag'))),
    grid);
  app().querySelector('h1').classList.add('sr'); app().querySelector('h1').textContent = t('ex.title');
}
function submitExam() {
  const e = exam; if (!e || e.done) return; e.done = true; stopTimer();
  const secs = Math.round((Math.min(Date.now(), e.end) - e.start) / 1000);
  let score = 0; const wrong = [];
  // unanswered questions count as wrong for the score (as in the real test) but are NOT recorded as mistakes in the SRS
  for (const id of e.ids) { const a = e.ans[id], ok = !!a?.ok; if (ok) score++; else wrong.push(id); if (a) st.record(id, ok); }
  st.clearExam();
  st.addExam(e.cls || cls(), score, secs, prof().lang, wrong);
  const unans = e.ids.filter(id => !e.ans[id]).length;
  const pass = score >= 26;
  screen(pass ? t('ex.pass') : t('ex.fail'), pass ? confetti() : null,
    h('div', { class: 'result ' + (pass ? 'pass' : 'fail') }, ring(score / 30, 140, 12, t('ex.score', score)), h('p', { class: 'big-t', text: t('ex.score', score) }), h('p', { class: 'muted', text: t('ex.time', mmss(secs)) }),
      unans ? h('p', { class: 'small muted', text: t('ex.unans', unans) }) : null),
    h('div', { class: 'row' }, btn(t('ex.again'), () => startExam(), 'btn primary', 'repeat'), wrong.length ? btn(t('sum.mist'), () => { exam = null; startSession('review', wrong, t('rv.title'), '#/review'); }, 'btn', 'repeat') : null, link(t('sum.home'), '#/home', 'btn ghost', 'home')),
    h('h2', { text: t('ex.review') }),
    !wrong.length ? h('p', { text: t('ex.allRight') }) : h('ol', { class: 'qlist' }, wrong.map(id => { const v = view(id), a = e.ans[id], va = a && view(id, a.lang === 'he');
      return h('li', {}, h('p', { lang: v.lang, dir: dirOf(v.lang) }, h('small', { class: 'muted', text: t('q.id', id) + ' · ' }), v.q),
        v.i && h('img', { class: 'qimg sm', src: 'img/q/' + v.i, alt: t('q.img', id), loading: 'lazy', width: 240, height: 135 }),
        h('p', { class: 'ans-bad' }, icon('x'), h('span', { text: a ? t('ex.yours', va.a[a.ai]) : t('ex.none') })),
        h('p', { class: 'ans-ok' }, icon('check'), h('span', { text: t('ex.right', v.a[v.c]) }))); })));
  exam = null; checkBadges();
}
function confetti() {   // CSS-only celebration; with prefers-reduced-motion it is a static burst (see css)
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) navigator.vibrate?.([60, 40, 60]);
  return h('div', { class: 'confetti', 'aria-hidden': 'true' }, Array.from({ length: 28 }, (_, i) => h('i', { style: { '--x': ((i * 37) % 100) + '%', '--d': ((i * 53) % 9) / 10 + 's', '--r': ((i * 71) % 360) + 'deg', '--c': ['var(--accent)', 'var(--ok)', '#f5b301', '#e94d8a', '#3aa0ff'][i % 5] } })));
}
function examHistory(n) {
  const ex = S().ex.slice(-n).reverse();
  return h('section', {}, h('h2', { text: t('st.exams') }), !ex.length ? h('p', { class: 'muted', text: t('st.noEx') }) :
    h('ul', { class: 'exlist' }, ex.map(e => h('li', { class: e[2] >= 26 ? 'pass' : 'fail' }, h('b', { text: `${e[2]}/30` }), h('span', { text: e[2] >= 26 ? t('ex.pass') : t('ex.fail') }),
      h('span', { class: 'muted', text: `${e[1]} · ${new Date(e[0]).toLocaleDateString(uiLang() === 'he' ? 'he-IL' : 'en-GB')} · ${mmss(e[3])}` })))));
}

// ---------- stats / parent ----------
function topicTable() {
  return h('table', { class: 'tbl' }, h('thead', {}, h('tr', {}, [t('st.topic'), t('st.seen'), t('st.acc'), t('st.mast')].map(x => h('th', { scope: 'col', text: x })))),
    h('tbody', {}, TOPICS.map(k => { const ids = topicPool(k), rs = ids.map(st.info).filter(Boolean), seen = rs.reduce((a, r) => a + r[2], 0), right = rs.reduce((a, r) => a + r[3], 0);
      return h('tr', {}, h('th', { scope: 'row', text: t('topic.' + k) }), h('td', { text: `${rs.length}/${ids.length}` }), h('td', { text: seen ? Math.round(100 * right / seen) + '%' : '–' }), h('td', { text: Math.round(100 * frac(ids)) + '%' })); })));
}
function daysChart() {
  const d0 = today(), days = Array.from({ length: 14 }, (_, i) => d0 - 13 + i), max = Math.max(10, ...days.map(d => S().days[d]?.[0] || 0));
  const fmt = d => new Date(d * 864e5).toLocaleDateString(uiLang() === 'he' ? 'he-IL' : 'en-GB', { day: 'numeric', month: 'numeric', timeZone: 'UTC' });
  return h('div', { class: 'chart', role: 'img', 'aria-label': t('st.days') + ': ' + days.map(d => `${fmt(d)} ${S().days[d]?.[0] || 0}`).join(', ') },
    days.map(d => { const v = S().days[d] || [0, 0]; return h('div', { class: 'col', 'aria-hidden': 'true' }, h('i', { style: { height: (100 * v[0] / max) + '%' } }, h('em', { style: { height: v[0] ? (100 * v[1] / v[0]) + '%' : '0' } })), h('small', { text: fmt(d).split(/[./]/)[0] })); }));
}
function stats() {
  const r = readiness(), [ans, ok] = totals();
  screen(t('st.title'), h('div', { class: 'result' }, ring(r, 130, 12, t('st.ready') + ' ' + Math.round(r * 100) + '%'), h('p', { class: 'big-t', text: t('st.ready') }), h('p', { class: 'small muted', text: t('st.readyHint') })),
    h('p', { class: 'sub center', text: `${t('st.answers', ans)} · ${t('st.acc')} ${ans ? Math.round(100 * ok / ans) : 0}% · ${clsName(cls())}` }),
    topicTable(), h('h2', { text: t('st.days') }), daysChart(), examHistory(10),
    h('h2', { text: t('st.badges') }), h('ul', { class: 'badges' }, BADGES.map(([k]) => h('li', { class: S().badges[k] ? 'got' : '' }, icon('award'), h('b', { text: t('bd.' + k) }), h('small', { text: t('bd.' + k + 'D') }), h('span', { class: 'sr', text: S().badges[k] ? '✓' : '–' })))));
}
function parent() {
  const p = prof(), d0 = today(), active = Array.from({ length: 14 }, (_, i) => S().days[d0 - i]).filter(Boolean).length;
  const lastDay = Math.max(0, ...Object.keys(S().days).map(Number)), ex = S().ex.slice(-3).reverse();
  const row = (k, v) => h('div', { class: 'prow' }, h('dt', { text: k }), h('dd', { text: v }));
  const fmt = d => new Date(d * 864e5).toLocaleDateString(uiLang() === 'he' ? 'he-IL' : 'en-GB', { timeZone: 'UTC' });
  screen(t('pa.title'), h('p', { class: 'small', text: t('pa.hint') }),
    h('dl', { class: 'plist' }, row(t('set.name'), p.name || '—'), row(t('set.cls'), clsName(p.cls)), row(t('pa.last'), lastDay ? fmt(lastDay) : t('pa.never')),
      row(t('pa.active'), `${active}/14`), row(t('home.streak'), String(st.streak())), row(t('pa.lessons'), `${masteredCount(p.cls)}/${lessonsFor(p.cls).length}`), row(t('pa.total'), `${Object.keys(S().q).length}/${pool().length}`),
      row(t('pa.open'), String(mistakes().length)), row(t('st.ready'), Math.round(readiness() * 100) + '%'),
      row(t('pa.lastEx'), ex.length ? ex.map(e => `${e[2]}/30 ${e[2] >= 26 ? '✓' : '✗'}`).join(' · ') : t('st.noEx'))),
    topicTable(), h('h2', { text: t('st.days') }), daysChart(),
    h('div', { class: 'row noprint' }, btn(t('pa.print'), () => print(), 'btn', 'print')), h('p', { class: 'disc small', text: t('disc.short') }));
}

// ---------- settings (incl. backup) ----------
async function settings(sec) {
  const p = prof();
  const kids = [];
  if (p) {
    const field = (label, ctl) => h('div', { class: 'field' }, h('label', { for: ctl.id, text: label }), ctl);
    const sel = (id, opts, val, on) => h('select', { id, onchange: e => on(e.target.value) }, opts.map(([v, l]) => h('option', { value: v, selected: v === val, text: l })));
    const upd = (k, v, rerender = true) => { p[k] = v; save(); applyPrefs(); if (rerender) settings(); };
    kids.push(h('section', { class: 'card' }, h('h2', { text: t('set.profile') }),
      field(t('set.name'), h('input', { id: 'sn', type: 'text', maxlength: 20, value: p.name, onchange: e => upd('name', bk.cleanState({ v: 1, profile: { name: e.target.value } }).profile.name, false) })),
      field(t('set.cls'), sel('sc', CLASSES.map(c => [c, clsName(c)]), p.cls, v => upd('cls', v))),
      h('p', { class: 'small muted', text: t('cls.note') }),
      field(t('set.lang'), sel('sl', LANGS.map(l => [l, LANG_NAMES[l]]), p.lang, async v => { await loadLang(v); upd('lang', v); })),
      field(t('set.ui'), sel('su', [['he', 'עברית'], ['en', 'English']], p.ui || 'he', v => upd('ui', v))),
      field(t('set.theme'), sel('st', [['auto', t('set.auto')], ['light', t('set.light')], ['dark', t('set.dark')]], p.theme, v => upd('theme', v))),
      field(t('set.goal'), sel('sg', [10, 20, 30, 50].map(n => [String(n), String(n)]), String(p.goal), v => upd('goal', +v))),
      h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: p.big, onchange: e => upd('big', e.target.checked) }), h('span', { text: t('set.big') }))));
    kids.push(h('section', { class: 'card' }, h('h2', { text: t('set.tts') }),
      h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: p.tts, disabled: !tts.supported(), onchange: e => upd('tts', e.target.checked) }), h('span', { text: t('set.ttsOn') })),
      field(t('set.rate'), sel('sr', [['0.8', '0.8×'], ['1', '1×'], ['1.2', '1.2×']], String(p.rate), v => upd('rate', +v))),
      h('p', { class: 'small muted', text: t('set.ttsNote') })));
  }
  // backup
  const meta = bk.getMeta(), ss = await bk.storageStatus(), af = bk.autoFileState(), undo = await bk.canUndo();
  const out = h('div', { class: 'codeout' });
  const codeIn = h('textarea', { id: 'codein', rows: 3, dir: 'ltr', spellcheck: 'false', autocomplete: 'off' });
  const fileIn = h('input', { type: 'file', accept: '.json,application/json', class: 'sr', id: 'filein', tabindex: '-1', 'aria-label': t('set.import'), onchange: async e => { try { await doRestore(await bk.readFile(e.target.files[0])); } catch (err) { toast(err.message, 5000); } e.target.value = ''; } });
  const fmtT = ts => new Date(ts).toLocaleString(uiLang() === 'he' ? 'he-IL' : 'en-GB', { dateStyle: 'short', timeStyle: 'short' });
  const bsec = h('section', { class: 'card', id: 'backup' }, h('h2', { text: t('set.backup') }), h('p', { class: 'small', text: t('set.bkHint') }),
    h('p', { class: 'sub', text: meta.lastBackup ? t('set.last', fmtT(meta.lastBackup)) : t('set.lastNever') }),
    h('div', { class: 'row' }, p ? btn(t('set.export'), async () => { const r = await bk.exportFile();
      if (r === 'shared') { toast(t('bk.saved')); checkBadges(); }
      else if (r === 'downloaded') out.replaceChildren(h('div', { class: 'banner', role: 'status' }, h('p', { text: t('bk.didSave') }),
        btn(t('bk.didSaveBtn'), () => { bk.confirmBackup('file'); out.replaceChildren(); toast(t('bk.saved')); checkBadges(); }, 'btn small primary', 'check', { id: 'bk-confirm' }))); }, 'btn primary', 'down', { id: 'bk-export' }) : null,
      btn(t('set.import'), () => fileIn.click(), 'btn', 'up'), fileIn),
    p ? h('div', { class: 'row' }, btn(t('set.code'), async () => {
      const code = await bk.makeCode(); const ta = h('textarea', { readonly: true, rows: 4, dir: 'ltr', 'aria-label': t('set.codeLabel'), text: code });
      const copied = () => { bk.confirmBackup('code'); checkBadges(); };
      ta.addEventListener('copy', () => setTimeout(copied, 0));     // a manual copy (long-press / Ctrl+C) also counts
      out.replaceChildren(h('p', { class: 'small', text: t('set.codeHint') }), ta, btn(t('set.copy'), async () => { try { await navigator.clipboard.writeText(code); toast(t('set.copied')); copied(); } catch { ta.select(); toast(t('set.copyManual')); } }, 'btn small', null, { id: 'bk-copy' }));
    }, 'btn', 'key', { id: 'bk-code' })) : null, out,
    h('label', { for: 'codein', class: 'lbl', text: t('set.enter') }), codeIn,
    h('div', { class: 'row' }, btn(t('set.restore'), async () => { try { await doRestore(await bk.readCode(codeIn.value)); } catch (err) { toast(err.message, 5000); } }, 'btn', null, { id: 'bk-restore' })),
    undo ? h('div', { class: 'row' }, btn(t('set.undo'), async () => { if (await bk.undoRestore()) { toast(t('set.undone')); applyPrefs(); settings(); } }, 'btn ghost', 'repeat', { id: 'bk-undo' })) : null,
    h('h3', { text: t('set.autoFile') }),
    !bk.autoFileSupported() ? h('p', { class: 'small muted', text: t('set.autoNo') }) :
      af.state === 'on' ? h('div', {}, h('p', { class: 'small', text: t('set.autoOn', af.name) }), btn(t('set.autoDisable'), async () => { await bk.disableAutoFile(); settings(); }, 'btn small ghost')) :
      af.state === 'needs-permission' ? h('div', {}, h('p', { class: 'small', text: t('set.autoPerm') }), btn(t('set.autoResume'), async () => { await bk.resumeAutoFile(); settings(); }, 'btn small'), btn(t('set.autoDisable'), async () => { await bk.disableAutoFile(); settings(); }, 'btn small ghost')) :
      p ? btn(t('set.autoEnable'), async () => { try { await bk.enableAutoFile(); } catch {} settings(); }, 'btn small') : null,
    h('p', { class: 'small', text: t('set.persist', ss.persisted ? t('set.persistYes') : t('set.persistNo')) }),
    !ss.persisted && p ? btn(t('set.persistAsk'), async () => { await bk.requestPersist(); settings(); }, 'btn small ghost') : null);
  kids.push(bsec);
  if (p) kids.push(h('section', { class: 'card danger' }, h('h2', { text: t('set.danger') }), btn(t('set.reset'), async () => {
    if (!confirm(t('set.resetAsk')) || !confirm(t('set.resetAsk2'))) return;
    st.resetAll(); await bk.afterReset(); session = exam = null; applyPrefs(); location.hash = '#/welcome';
  }, 'btn danger')));
  kids.push(h('p', {}, link(t('set.about'), '#/about', 'btn ghost', 'info')), h('p', { class: 'small muted center', text: t('ab.version', VERSION) }));
  screen(t('set.title'), ...kids);
  if (sec === 'backup') requestAnimationFrame(() => document.getElementById('backup')?.scrollIntoView());
}
async function doRestore(b) {
  if (!confirm(t('set.restoreAsk'))) return;
  await bk.applyBackup(b); if (prof()?.lang) await loadLang(prof().lang);
  applyPrefs(); toast(t('set.restored')); location.hash = prof()?.cls ? '#/home' : '#/welcome'; route();
}

// ---------- about ----------
const CCBY = 'https://creativecommons.org/licenses/by/4.0/';
function about() {
  const he = MAN?.langs?.he || {};
  const ext = (href, text) => h('a', { href, rel: 'noopener noreferrer', target: '_blank', text });
  screen(t('ab.title'), h('p', { class: 'disc', role: 'note' }, icon('info'), h('span', { text: t('ab.disc') })),
    h('p', { class: 'small', text: t('ab.version', VERSION) + ' · ' + t('ab.data', MAN?.version || '–', (he.resourceModified || '').slice(0, 10)) }),
    h('h2', { text: t('ab.src') }), h('p', { text: t('ab.srcText') }),
    h('ul', { class: 'srcs' }, LANGS.filter(l => MAN?.langs?.[l]).map(l => { const m = MAN.langs[l];
      return h('li', {}, h('b', { text: LANG_NAMES[l] + ': ' }), ext(m.url || `https://data.gov.il/he/datasets/ministry_of_transport/${m.dataset}`, m.title || m.dataset), h('span', { class: 'muted', text: ' · ' }), ext(CCBY, m.licenceTitle || 'CC BY'), h('span', { class: 'muted', text: ` · ${m.org || ''} · ${(m.resourceModified || '').slice(0, 10)} · ${m.count}${trOld(l) ? ' · ' + t('ab.oldBank', trOld(l)) : ''} ` })); })),
    h('h2', { text: t('ab.lang') }), h('p', { text: t('ab.langText') }),
    h('h2', { text: t('ab.test') }), h('p', { text: t('ab.testText') }),
    h('h2', { text: t('ab.law') }), h('p', { text: t('ab.lawText') }),
    h('h2', { text: t('ab.learn') }), h('p', { text: t('ab.learnText') }), h('ul', { class: 'srcs' }, h('li', {}, ext('https://he.wikisource.org/w/index.php?oldid=3085628', t('ab.wsTR', 3085628))), h('li', {}, ext('https://he.wikisource.org/w/index.php?oldid=3085764', t('ab.wsTO', 3085764))), h('li', {}, ext('https://www.gov.il/BlobFolder/policy/tamrurim_7924_01_18/he/1694327856_%D7%9C%D7%95%D7%AA_%D7%9D_%D7%9E%D7%A9%D7%95%D7%9C%D7%91_0922.pdf', t('ab.lotam')))),
    h('h2', { text: t('el.all') }), ...CLASSES.map(c => h('div', {}, h('h3', { class: 'h3', text: clsName(c) }), eligCard(c, false))),
    h('h2', { text: t('ab.a11y') }), h('p', { text: t('ab.a11yText', Q.filter(p => p.i).length) }),
    h('h2', { text: t('ab.priv') }), h('p', { text: t('ab.privText') }),
    h('h2', { text: t('ab.links') }), h('ul', { class: 'srcs' },
      h('li', {}, ext('https://data.gov.il/he/datasets/ministry_of_transport/tqhe', 'data.gov.il – מאגר השאלות והתשובות הרשמי (tqhe)')),
      h('li', {}, ext(CCBY, 'Creative Commons Attribution (CC BY) 4.0')),
      h('li', {}, ext('https://data.gov.il/he/terms-of-use', 'data.gov.il – תנאי שימוש')),
      h('li', {}, ext('https://www.gov.il/BlobFolder/policy/tamrurim_7924_01_18/he/1694327856_%D7%9C%D7%95%D7%AA_%D7%9D_%D7%9E%D7%A9%D7%95%D7%9C%D7%91_0922.pdf', 'gov.il – לוח התמרורים (PDF)')),
      h('li', {}, ext('https://www.gov.il/en/service/apply_for_new_driver_drivers_license', 'gov.il – Apply for a new driver licence')),
      h('li', {}, ext('https://www.kolzchut.org.il/he/%D7%9E%D7%91%D7%97%D7%9F_%D7%A0%D7%94%D7%99%D7%92%D7%94_%D7%A2%D7%99%D7%95%D7%A0%D7%99_(%D7%AA%D7%99%D7%90%D7%95%D7%A8%D7%99%D7%94)', 'כל זכות – מבחן נהיגה עיוני (תיאוריה)')),
      h('li', {}, h('span', { text: t('ab.code') + ': ' }), ext('https://github.com/dudidd-wq/theory-il', 'github.com/dudidd-wq/theory-il'))),
    h('p', { class: 'small muted', text: 'Font: Rubik – SIL Open Font License 1.1 (fonts/OFL-Rubik.txt).' }));
}

// ---------- boot ----------
async function boot() {
  applyPrefs();
  app().replaceChildren(h('p', { class: 'loading', role: 'status', text: t('loading') }));
  const rec = await bk.init();
  applyPrefs();
  try { await loadData(); if (prof()?.lang) await loadLang(prof().lang); }
  catch { app().replaceChildren(h('p', { class: 'loading', role: 'alert', text: t('loadErr') }), h('p', { class: 'row center' }, btn(t('retry'), () => location.reload(), 'btn primary'))); return; }
  if (rec === 'restored') toast(t('restored'), 5000);
  route();
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(location.hostname))) {
    navigator.serviceWorker?.register('sw.js').then(reg => {
      if (reg.waiting && navigator.serviceWorker.controller) showUpdate(reg.waiting);     // an update that was already waiting at load
      reg.addEventListener('updatefound', () => { const w = reg.installing; w?.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) showUpdate(w); }); });
    }).catch(() => {});
  }
}
function showUpdate(w) {
  const bar = document.getElementById('update'); bar.replaceChildren(h('span', { text: t('update') }), btn(t('reload'), () => { w.postMessage('skip'); }, 'btn small primary')); bar.hidden = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => location.reload(), { once: true });
}
document.addEventListener('keydown', e => {
  if (e.target.closest('input,textarea,select')) return;
  if (/^[1-4]$/.test(e.key)) { const b = document.querySelectorAll('.answers .ans')[+e.key - 1]; if (b && !b.disabled) { b.click(); } }
});
boot();
