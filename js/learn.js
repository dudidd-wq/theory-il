// Learning phase: short lessons per licence class → mini-quiz → practice → exam.
// Lesson text is our own wording (data/lessons.json, built and checked by tools/lessons.py);
// every rule links to the excerpt of the law / sign table / bank question it comes from (data/sources.json).
import { h, icon, ring, toast } from './ui.js';
import { t, uiLang } from './i18n.js';
import * as st from './store.js';
import * as tts from './tts.js';
import { VIZ } from './viz.js';
import { buildSteps, minutes, firstLine, partStarts, partOf, grouped } from './steps.js';
let L = null, SRC = {};
export const QUIZ_N = 6, MASTER_PCT = 80;
export async function loadLessons(getJSON) {
  try { const [a, b] = await Promise.all([getJSON('data/lessons.json'), getJSON('data/sources.json')]); L = a; SRC = b; } catch { L = null; }
}
export const lessonsFor = c => (L?.lessons || []).filter(l => l.cls.includes(c));
// v1.15 (review #11 F1): a question of another class reached via search still finds its lesson (opened read-only)
const anyLesson = lid => (L?.lessons || []).find(l => l.id === lid) || null;
export const byLessonId = id => (L?.lessons || []).find(l => l.id === id);
export function status(l, list) {
  const r = st.lesson(l.id) || [0, 0, 0], i = list.indexOf(l);
  return { read: !!r[0], best: r[1], tries: r[2], mastered: r[1] >= MASTER_PCT, unlocked: i <= 0 || !!st.lesson(list[i - 1].id)?.[0] };
}
export const lessonFrac = c => { const ls = lessonsFor(c); return ls.length ? ls.filter(l => status(l, ls).mastered).length / ls.length : 0; };
export const masteredCount = c => lessonsFor(c).filter(l => (st.lesson(l.id)?.[1] || 0) >= MASTER_PCT).length;

const ext = (href, text) => h('a', { href, rel: 'noopener noreferrer', target: '_blank', text });
const srcKey = s => (SRC[s] ? s : s.replace(/\(.*$/, ''));
/** a law / sign-table / bank reference: a collapsible chip with the cited excerpt and a link to the full text */
export function ref(s, own, cited) {
  const k = srcKey(s), x = SRC[k];
  // v1.13 (review #9 D1): the passage this item itself pinned comes first; without one, only the sign table / bank keep their own entry
  const mine = (own || []).filter(([sid]) => sid === k).map(([, e]) => e);
  const shown = mine.length ? mine : (x?.kind === 'LT' || x?.kind === 'LTP' ? (x.ex || []).slice(0, 1) : []);
  const pg = x && /\.pdf$/i.test(x.url) && /\(עמ׳ (\d+)\)$/.exec(shown[0] || '');
  if (!x) return h('span', { class: 'lawref', text: s });
  // v1.13 (review #9): a rule whose only source is a bank question says so – it is the bank's answer, not an official explanation
  const label = (cited && x.kind === 'Q' ? t('ln.bankAns') + ' – ' : '') + x.label + s.slice(k.length);
  return h('details', { class: 'lawref' }, h('summary', {}, icon('book'), h('span', { text: label })),
    h('div', { class: 'lawbox' }, h('p', { class: 'small muted', text: x.doc + (x.title ? ' – ' + x.title : '') + (x.rev ? ` (ויקיטקסט, גרסה ${x.rev})` : '') + (x.accessed ? ` (${t('ln.accessed', x.accessed)}${x.pub ? ', ' + t('ln.updated', x.pub) : ''})` : '') + (x.kind === 'OFF' ? ' · ' + t('ln.noNiqqud') : '') }),
      ...shown.map(e => h('blockquote', { text: e })),
      ext(pg ? x.url + '#page=' + pg[1] : x.url, x.kind === 'Q' ? t('ln.bank') : t('ln.full')),
      x.flaky ? h('p', { class: 'small muted flaky', text: t('ln.flaky') }) : null));
}
const refs = (s, also = [], own) => h('span', { class: 'refs' }, [s, ...also].map(a => ref(a, own, true)));

/** why-box data for a bank question: the lesson rule (or sign-table entry) that teaches it.
 *  cov = data/coverage.json, sg = data/signs.json; returns null when nothing in the lessons covers it */
const BANK_URL = 'https://data.gov.il/he/datasets/ministry_of_transport/tqhe';
const CLASS_URL = { _: 'https://www.gov.il/he/service/apply_for_new_driver_drivers_license',
  C: 'https://www.gov.il/he/Departments/General/truck_drivers_background', D: 'https://www.gov.il/he/departments/general/bus_drivers_rules' };
export function explain(id, c, cov, sg) {
  const ls = lessonsFor(c), mine = new Map(ls.map(l => [l.id, l]));
  const lessonOf = lid => mine.get(lid) || anyLesson(lid);
  const nums = sg?.q?.[id];
  if (nums?.length && nums.every(n => sg.e?.[n])) {
    return { kind: 'sign', lines: nums.map(n => ({ n, t: sg.e[n] })), url: sg.src?.url, lesson: lessonOf('signs'), note: L?.notes?.[id] || null };
  }
  const note = L?.notes?.[id] || null;   // the bank's answer differs from (or is narrower than) the current law text
  const e = cov?.q?.[id]; if (!e) return note ? { kind: 'none', lesson: null, note } : null;
  const [stt, lids, units] = e;
  // no official source: point to the bank-only lesson that shows the question and answer as published (no explanation)
  // v1.13: 'X' = the bank answer contradicts the pinned law (status 'סתירה בין המאגר לחוק'): bank lesson + the law note
  if (stt === 'n') return { kind: 'none', lesson: e[3] === 'S' || e[3] === 'X' ? ls.find(l => l.bank?.includes(id)) || null : null, note, nosrc: e[3] === 'S', conflict: e[3] === 'X' };   // nearest-by-words lessons are often unrelated: no link, just say so
  for (const u of units || []) {
    const m = /^([\w]+)#([rxbc])(\d+)$/.exec(u); if (!m) continue;
    const l = lessonOf(m[1]); if (!l) continue;
    const i = +m[3];
    const r = m[2] === 'r' ? l.rules[i] && { t: l.rules[i].t, s: l.rules[i].s, x: l.rules[i].x, also: l.rules[i].also }
      : m[2] === 'x' ? l.ex[i] && { t: l.ex[i].t, s: l.ex[i].s, x: l.ex[i].x, also: l.ex[i].also }
      : m[2] === 'c' ? l.recap[i] && { t: l.recap[i].f + ' ' + l.recap[i].b, s: l.recap[i].s, x: l.recap[i].x }
      : l.body[i] && { t: l.body[i], s: null };
    // only explicit links / hand-judged matches ('f') are shown as the answer's reason; word-overlap matches ('a', 'w') as a related rule
    if (r) return { kind: stt === 'f' ? 'rule' : 'part', t: r.t, s: r.s, x: r.x, also: r.also, lesson: l, note };
  }
  return { kind: 'none', lesson: null, note };
}
/** link target for a lesson: locked lessons open in read-only "peek" mode */
export function lessonHref(l, c) { const ls = lessonsFor(c); return '#/learn/' + l.id + (ls.includes(l) && status(l, ls).unlocked ? '' : '/peek'); }
/** the why box shown under the feedback line */
export function whyBox(x, ok, c) {
  if (!x) return null;
  const he = n => { n.lang = 'he'; n.dir = 'rtl'; return n; };
  const kids = [];
  if (x.kind === 'sign') {
    kids.push(he(h('p', {}, h('b', { text: t('ln.why') + ' ' }), x.lines.map((s, i) => h('span', { class: 'sgent' }, h('span', { text: (i ? ' · ' : '') + t('why.sign', s.n) + ' ' }),
      // v1.20 (review #16 N1): the whole entry is shown – never cut – and each table column ('כוחו יפה:', 'מיועד ל:') on its own line,
      // so the column that carries the answer (e.g. sign 626 'עד לצומת הקרוב', Q584) is always visible
      ...s.t.split(' · ').map((col, j) => h('span', { class: j ? 'sgcol' : '', text: col })))))));
    kids.push(h('p', { class: 'refs' }, ...x.lines.map(s => SRC['LT:' + s.n] ? ref('LT:' + s.n) : ext(x.url, t('why.signSrc', s.n)))));
  } else if (x.kind === 'rule' || x.kind === 'part') {
    kids.push(he(h('p', {}, h('b', { text: t(x.kind === 'rule' ? 'ln.why' : 'why.part') + ' ' }), x.t)));
    if (x.s) kids.push(h('p', { class: 'refs' }, refs(x.s, x.also || [], x.x)));
  } else {
    // nothing in the lessons covers it yet: say so and point to the official sources (or say plainly that none exists)
    kids.push(h('p', { class: 'small muted', text: t(x.conflict ? 'why.conflict' : x.nosrc ? 'why.nosrc' : 'why.none') }));
    kids.push(h('p', { class: 'refs small' }, ext(BANK_URL, t('why.bank')), h('span', { class: 'muted', text: ' · ' }), ext(CLASS_URL[c] || CLASS_URL._, t('why.classPage'))));
  }
  if (x.note) kids.push(he(h('div', { class: 'notice lawnote', role: 'note' }, icon('info'), h('div', {},
    h('p', {}, h('b', { text: t('why.exam') + ' ' }), x.note.exam), h('p', {}, h('b', { text: t(x.note.k === 'tb' ? 'why.tb' : 'why.law') + ' ' }), x.note.law),
    x.note.s ? h('p', { class: 'refs' }, ref(x.note.s, x.note.x)) : null))));
  // v1.20.1 (review #17 #5): a lesson that only shows the bank's question and answer (no explanation) is not called 'learn this'
  if (x.lesson) kids.push(h('p', { class: 'row tight' }, h('a', { href: lessonHref(x.lesson, c), class: ok ? 'btn small ghost' : 'btn small primary', 'data-learn': x.lesson.id },
    icon('book'), h('span', { text: t(ok ? 'why.related' : x.kind === 'none' ? 'why.bankLesson' : 'why.learn', x.lesson.title) }))));
  return h('div', { class: 'why' + (ok ? '' : ' bad') }, ...kids);
}

export function makeLearn(ctx) {
  const { screen, btn, link, byId, view, pool, cls, prof, pick, startSession, clsName, setPref } = ctx;
  const he = node => { node.lang = 'he'; node.dir = 'rtl'; return node; };
  function path() {
    const c = cls(), ls = lessonsFor(c);
    if (!ls.length) return screen(t('ln.title'), h('p', { class: 'empty', text: t('ln.noData') }));
    const done = masteredCount(c), sts = ls.map(l => status(l, ls)), cur = sts.findIndex(s => !s.mastered);
    // v1.21 (1d): minutes and parts per lesson (step view), a 'next lesson' / 'continue where I stopped' card, lessons grouped by topic
    const info = ls.map(l => { const sp = stepsOf(l, c, 'steps'); return { n: sp.length, min: minutes(sp.reduce((a, x) => a + x.w, 0)), parts: partStarts(sp.length).length }; });
    const totalMin = info.reduce((a, x) => a + x.min, 0);
    const lastId = st.lastLesson(), li = ls.findIndex(l => l.id === lastId), lp = li >= 0 ? st.lpos(lastId) || {} : {};
    const going = li >= 0 && sts[li].unlocked && (+lp.s || 0) > 0 && (+lp.s || 0) < info[li].n - 1;
    const nextI = cur >= 0 && sts[cur].unlocked ? cur : sts.findIndex(s => s.unlocked && !s.read);
    const nextCard = h('div', { class: 'card nextcard' },
      going ? h('p', {}, h('a', { class: 'btn primary big', href: '#/learn/' + ls[li].id, id: 'ln-cont' }, icon('repeat'),
        he(h('span', { text: t('ln.cont', ls[li].title, (+lp.s || 0) + 1, info[li].n) })))) : null,
      nextI >= 0 && !(going && nextI === li) ? h('p', {}, h('a', { class: 'btn ' + (going ? '' : 'primary big'), href: '#/learn/' + ls[nextI].id, id: 'ln-next' }, icon('book'),
        he(h('span', { text: t('ln.nextL', ls[nextI].title, info[nextI].min) })))) : null,
      h('p', { class: 'small muted', text: t('ln.totalMin', ls.length, totalMin) }));
    const item = i => { const l = ls[i], s = sts[i], x = info[i];
      const state = !s.unlocked ? t('ln.locked') : s.mastered ? t('ln.mastered') + ' · ' + t('ln.best', s.best) : s.read ? t('ln.read') + (s.tries ? ' · ' + t('ln.best', s.best) : '') : t('ln.new');
      const inner = [h('span', { class: 'lnum' + (s.mastered ? ' ok' : ''), 'aria-hidden': 'true' }, s.mastered ? icon('check') : !s.unlocked ? icon('key') : String(i + 1)),
        h('span', { class: 'lt' }, he(h('b', { text: l.title })), he(h('small', { text: l.sub })),
          h('small', { class: 'lst', text: state + ' · ' + t('ln.minN', x.min) + (x.parts > 1 ? ' · ' + t('st.nParts', x.parts) : '') }))];
      return h('li', { class: (s.unlocked ? '' : 'locked') + (i === cur ? ' cur' : ''), 'data-i': String(i + 1), 'data-id': l.id },
        s.unlocked ? h('a', { href: '#/learn/' + l.id, 'aria-current': i === cur ? 'step' : null }, inner)
          : h('div', { 'aria-disabled': 'true' }, inner)); };
    const groups = grouped(ls).map(([g, is]) => { const m = is.filter(i => sts[i].mastered).length, r = is.filter(i => sts[i].read).length, mins = is.reduce((a, i) => a + info[i].min, 0);
      return h('section', { class: 'lgroup', 'aria-labelledby': 'lg-' + g, 'data-group': g },
        h('h2', { class: 'h3', id: 'lg-' + g, text: t('lg.' + g) }),
        h('p', { class: 'small muted lgmeta', id: 'lgm-' + g, text: t('ln.grpMeta', is.length, r, m, mins) }),
        h('div', { class: 'stbar lgbar', role: 'progressbar', 'aria-labelledby': 'lg-' + g, 'aria-describedby': 'lgm-' + g, 'aria-valuemin': '0', 'aria-valuemax': String(is.length), 'aria-valuenow': String(r) },
          h('span', { class: 'stfill', style: { width: (100 * r / is.length) + '%' } })),
        h('ol', { class: 'lessons' }, is.map(item))); });
    screen(t('ln.title'), h('p', { class: 'sub', text: clsName(c) + ' · ' + t('ln.count', ls.length, done) }),
      h('p', { class: 'small', text: t('ln.hint') }),
      uiLang() !== 'he' ? h('p', { class: 'notice', role: 'note' }, icon('info'), h('span', { text: t('ln.heOnly') })) : null,
      nextCard,
      h('ol', { class: 'steps3', 'aria-label': t('ln.path') }, ['ln.step1', 'ln.step2', 'ln.step3'].map((k, i) => h('li', { class: i === 0 ? 'on' : '' }, h('b', { text: i + 1 }), h('span', { text: t(k) })))),
      h('p', { class: 'small muted', text: t('ln.grpHint') }),
      ...groups,
      cur === -1 ? h('p', { class: 'banner', role: 'status' }, icon('award'), h('span', { text: t('ln.allDone') })) : null,
      h('div', { class: 'row' }, link(t('nav.practice'), '#/practice', 'btn', 'book'), link(t('nav.exam'), '#/exam', 'btn', 'exam')),
      h('p', { class: 'small muted', text: t('ln.own') }));
  }
  // v1.21: three ways to read a lesson – 'steps' (default: short cards, ≤ ~120 words and ≤ 5 rules each, progress, back/next,
  // position remembered on this device), 'quick' (each rule's one-line statement + diagrams + recap) and 'full' (the whole lesson on one page)
  const VIEWS = ['steps', 'quick', 'full'];
  const lview = () => (VIEWS.includes(prof()?.lnv) ? prof().lnv : 'steps');
  const labOf = s => { const x = SRC[srcKey(s)]; return x ? x.label + s.slice(srcKey(s).length) : s; };
  function lessonData(l, c) {
    const mine = new Set(pool());
    return { mine, qids: l.quiz.filter(q => mine.has(q) && byId.has(q)),
      pb: (l.pbank || []).filter(p => mine.has(p.q) && byId.has(p.q)).map(p => ({ v: byId.get(p.q), u: p.u })),
      bank: l.bank ? l.bank.filter(q => mine.has(q) && byId.has(q)).map(q => byId.get(q)) : null,
      gal: (l.gal || []).filter(q => byId.has(q)).map(q => byId.get(q)) };
  }
  /** the steps of a lesson for this class and view (also used by the path page for minutes) */
  function stepsOf(l, c, v = lview()) { const d = lessonData(l, c); return buildSteps(l, v, { lab: labOf, q: q => byId.get(q), pb: d.pb, bank: d.bank, gal: d.gal }); }
  const lessonMin = (l, c) => minutes(stepsOf(l, c, 'steps').reduce((a, s) => a + s.w, 0));
  function lesson(id, sub) {
    const c = cls(), ls = lessonsFor(c), own = ls.find(x => x.id === id), l = own || (sub === 'peek' ? anyLesson(id) : null);
    if (!l) { location.hash = own === undefined && anyLesson(id) ? '#/learn/' + id + '/peek' : '#/learn'; return; }
    const s = own ? status(l, ls) : { unlocked: false };
    // v1.10: a direct link to a locked lesson (or its quiz) opens it read-only instead of bouncing to the path
    if (!s.unlocked && sub !== 'peek') { location.replace('#/learn/' + l.id + '/peek'); return; }
    const peek = !s.unlocked;
    const { qids, pb, bank, gal } = lessonData(l, c);
    if (sub === 'quiz') { st.markRead(l.id); return startSession('lesson', pick(qids, QUIZ_N), l.title, `#/learn/${l.id}/quiz`, { lesson: l.id }); }
    const i = ls.indexOf(l), nxt = own ? ls[i + 1] : null, vw = lview();
    const listen = tts.supported() ? btn(t('ln.listen'), e => {
      if (tts.speaking()) { tts.stop(); e.currentTarget.setAttribute('aria-pressed', 'false'); return; }
      if (!tts.voiceFor('he')) toast(t('set.ttsNone', 'עברית'));
      const b = e.currentTarget; b.setAttribute('aria-pressed', 'true');
      // the steps views read the card on screen; the full view reads the whole lesson
      const cur = document.querySelector('.lstep');
      const speakText = cur ? [l.title, cur.innerText].join('\n') : bank ? [l.title, ...bank.map(v => v.q + '\n' + v.a[v.c])].join('\n')
        : [l.title, ...l.body, ...l.rules.map(r => r.t), ...l.mnem.map(m => m.t)].join('\n');
      tts.speak(speakText, 'he', prof()?.rate || 1, () => b.setAttribute('aria-pressed', 'false'));
    }, 'btn small', 'vol', { 'aria-pressed': 'false' }) : null;
    const sec = (key, ...kids) => h('section', { class: 'lsec', 'aria-labelledby': 'ls-' + key }, h('h2', { id: 'ls-' + key, text: t('ln.' + key) }), ...kids);
    // v1.11 (review #8): all four official options in the published order, the official correct one marked (text + icon, not colour only)
    const opts = v => he(h('ol', { class: 'bopts', 'aria-label': t('ln.opts') }, v.a.map((a, k) => h('li', { class: k === v.c ? 'ans-ok' : 'ans-no' },
      k === v.c ? icon('check') : h('span', { class: 'ic', 'aria-hidden': 'true', text: '·' }), h('span', { class: 'at', text: a }),
      k === v.c ? h('small', { class: 'okb', text: t('ln.okb') }) : null))));
    const qimg = q => q.i ? h('img', { class: 'qimg', src: 'img/q/' + q.i, alt: t('q.img', q.id), loading: 'lazy', width: 320, height: 180 }) : null;
    const lawNote = n => n ? he(h('div', { class: 'notice lawnote', role: 'note' }, icon('info'), h('div', {}, h('p', {}, h('b', { text: t(n.k === 'tb' ? 'why.tb' : 'why.law') + ' ' }), n.law),
      n.s ? h('p', { class: 'refs' }, ref(n.s, n.x)) : null))) : null;
    const bankCard = v => h('article', { class: 'excard bankcard', 'data-q': v.id }, qimg(v), he(h('p', { class: 'qtext sm' }, h('small', { class: 'muted', text: t('ln.q', v.id) + ' · ' }), v.q)),
      opts(v), h('p', { class: 'small muted banktag', text: t('ln.bankTag') }), lawNote(L?.notes?.[v.id]));
    const vizNode = v => (VIZ[v] ? he(VIZ[v]({ lesson: l.id, cls: c })) : null);
    // v1.21 (1b): in the step and summary views a rule shows its one-line statement first; the rest of our wording opens under 'למה?'.
    // The citation chips stay visible; the quoted official passage is in the chip, word for word.
    const ruleLi = (r, n, split) => { const [a, b] = split ? firstLine(r.t) : [r.t, ''];
      return h('li', { value: n + 1 }, h('span', { class: b ? 'rt1' : null, text: a }),
        b ? h('details', { class: 'rmore' }, h('summary', { text: t('st.why') }), he(h('p', { text: b }))) : null, refs(r.s, r.also, r.x)); };
    const galList = qs => h('ul', { class: 'gal' }, qs.map(v => h('li', {}, h('img', { src: 'img/q/' + v.i, alt: t('q.img', v.id), loading: 'lazy', width: 160, height: 90 }), he(h('span', { text: v.a[v.c] })), ref('Q:' + v.id))));
    const exCard = (x, fold) => { const v = byId.get(x.q);
      // v1.11 (review #8 item 2): walk through the closest wrong option against the cited source's own wording – no written text
      const trap = x.tr != null && v.a[x.tr] ? h('div', { class: 'trap' }, he(h('p', {}, h('b', { text: t('ln.trap') + ' ' }), h('span', { class: 'trapopt', text: '«' + v.a[x.tr] + '»' }))),
        (x.qt || []).length ? h('div', {}, h('p', {}, h('b', { text: t('ln.trapSrc') })), he(h('ul', { class: 'qt' }, x.qt.map(p => h('li', {}, h('q', { text: p.t.length > 320 ? p.t.slice(0, 320) + '…' : p.t }), ' ', ref(p.s)))))) : null,
        h('p', { class: 'muted sm', text: t('ln.trapNote') })) : null;
      return h('article', { class: 'excard' }, qimg(v), he(h('p', { class: 'qtext sm' }, h('small', { class: 'muted', text: t('ln.q', v.id) + ' · ' }), v.q)), opts(v),
        trap && fold ? h('details', { class: 'trapd' }, h('summary', { text: t('st.trap') }), trap) : trap,
        fold ? h('details', { class: 'rmore exwhy' }, h('summary', { text: t('st.exWhy') }), he(h('p', { text: x.t })))
          : he(h('p', {}, h('b', { text: t('ln.why') + ' ' }), x.t)), h('p', { class: 'refs' }, ref(x.s, x.x), ...(x.also || []).map(a => ref(a, x.x)), ref('Q:' + x.q))); };
    // v1.11: B/A questions this lesson covers only partly – official question + answer as published, the covering unit with
    // its own citation, and a separate label that the rest comes from the bank alone (still 'partial' in the coverage figures)
    const pbNote = () => [he(h('p', { class: 'notice banknote', role: 'note' }, icon('info'), h('span', { text: t('ln.pbankNote') }))), h('p', { class: 'small bankattr' }, ext(BANK_URL, t('ln.bankAttr')))];
    const pbCard = ({ v, u }) => h('article', { class: 'excard bankcard pbcard', 'data-q': v.id }, qimg(v),
      he(h('p', { class: 'qtext sm' }, h('small', { class: 'muted', text: t('ln.q', v.id) + ' · ' }), v.q)),
      opts(v), h('p', { class: 'small muted banktag', text: t('ln.bankTag') }),
      ...u.map(x => h('div', { class: 'pbpart' + (x.o ? ' off' : '') }, h('p', { class: 'small' }, h('b', { text: t(x.o ? 'ln.pbOff' : 'ln.pbNoOff') })),
        x.t ? he(h('p', { class: 'sm', text: x.t })) : h('p', { class: 'small muted', text: t('ln.pbGal') }),
        x.url ? h('p', { class: 'refs' }, ext(x.url, t('why.signSrc', x.n))) : x.s ? refs(x.s, (x.also || []).filter(a => !(x.o && a.startsWith('Q:'))), x.x) : null,
        // v1.20 (review #16 N5): the worked example's own bank question is not a source – shown apart, labelled as the bank question
        ...(x.s && x.o ? (x.also || []).filter(a => a.startsWith('Q:')) : []).map(a => h('p', { class: 'small refs exq' }, h('span', { class: 'muted', text: t('ln.pbExQ') + ' ' }), ref(a, x.x))))),
      h('p', { class: 'small pbrest', text: t('ln.pbRest') }), lawNote(L?.notes?.[v.id]));
    const mnemList = ms => he(h('ul', { class: 'mnems' }, ms.map(m => h('li', {}, h('b', { text: m.t }), m.n ? h('small', { text: m.n }) : null, refs(m.s, m.also || [], m.x)))));
    const recapList = ns => h('ul', { class: 'recap' }, ns.map(n => { const r = l.recap[n], back = he(h('p', { class: 'back', id: `rc-${n}`, hidden: true }, h('span', { text: r.b }), ref(r.s, r.x)));
      const b = h('button', { type: 'button', class: 'flip', 'aria-expanded': 'false', 'aria-controls': `rc-${n}`, onclick: () => { const o = b.getAttribute('aria-expanded') !== 'true'; b.setAttribute('aria-expanded', String(o)); back.hidden = !o; } },
        he(h('span', { text: r.f })), h('small', { class: 'muted', text: t('ln.flip') }));
      return h('li', {}, b, back); }));
    const stateTxt = () => (s.mastered ? t('ln.mastered') + ' · ' + t('ln.best', s.best) : s.read || st.lesson(l.id)?.[0] ? t('ln.read') : t('ln.new'));
    const viewSw = h('div', { class: 'seg', role: 'group', 'aria-label': t('st.view') }, VIEWS.map(v => h('button', { type: 'button', class: 'btn small' + (v === vw ? ' on' : ''), 'aria-pressed': String(v === vw), 'data-view': v,
      onclick: () => { if (v !== vw) { setPref('lnv', v); lesson(id, sub); } } }, h('span', { text: t('st.v.' + v) }))));
    const head = [
      h('p', { class: 'row tight' }, link(t('ln.back'), '#/learn', 'btn small ghost', uiLang() === 'he' ? 'arrowE' : 'arrowS'), listen,
        h('span', { class: 'small muted lstate', text: stateTxt() })),
      h('div', { class: 'row tight ltools' }, viewSw),
      peek ? h('p', { class: 'notice', role: 'note' }, icon('key'), h('span', { text: t('ln.peek') })) : null,
      he(h('p', { class: 'sub', text: l.sub })),
      uiLang() !== 'he' ? h('p', { class: 'notice', role: 'note' }, icon('info'), h('span', { text: t('ln.heOnly') })) : null,
      // v1.10 bank-only lesson: official question + correct answer exactly as published, a visible no-explanation label, CC BY attribution
      bank ? he(h('p', { class: 'notice banknote', role: 'note' }, icon('info'), h('span', { text: t('ln.bankNote') }))) : null,
      bank ? h('p', { class: 'small bankattr' }, ext(BANK_URL, t('ln.bankAttr'))) : null];
    const end = () => h('div', { class: 'row lend' },
      qids.length && !peek ? link(t('ln.quiz', Math.min(QUIZ_N, qids.length)), `#/learn/${l.id}/quiz`, 'btn primary big', 'exam') : null,
      !st.lesson(l.id)?.[0] && !peek ? btn(t('ln.markRead'), e => { st.markRead(l.id); e.currentTarget.replaceWith(h('span', { class: 'small accent', role: 'status', text: t('ln.isRead') })); }, 'btn', 'check') : null,
      nxt ? link(t('ln.next', nxt.title), '#/learn/' + nxt.id, 'btn ghost') : null);
    if (vw === 'full') {
      screen(l.title, ...[...head,
        bank ? sec('bank', h('div', { class: 'exs' }, bank.map(bankCard))) : null,
        l.body.length ? sec('explain', he(h('div', { class: 'lbody' }, l.body.map(p => h('p', { text: p }))))) : null,
        l.viz.length ? h('div', { class: 'vizs' }, l.viz.map(vizNode)) : null,
        l.rules.length ? sec('rules', he(h('ol', { class: 'rules' }, l.rules.map((r, i) => ruleLi(r, i, false))))) : null,
        gal.length ? sec('gal', galList(gal)) : null,
        l.ex.length ? sec('ex', h('div', { class: 'exs' }, l.ex.filter(x => byId.has(x.q)).map(x => exCard(x, false)))) : null,
        pb.length ? sec('pbank', ...pbNote(), h('div', { class: 'exs' }, pb.map(pbCard))) : null,
        l.mnem.length ? sec('mnem', mnemList(l.mnem)) : null,
        l.recap.length ? sec('recap', recapList(l.recap.map((_, n) => n))) : null,
        end(), bank ? null : h('p', { class: 'small muted', text: t('ln.own') })].filter(Boolean));
    } else stepsScreen();
    const h1 = document.querySelector('#app h1'); if (h1) { h1.lang = 'he'; h1.dir = 'rtl'; }
    function stepsScreen() {
      const steps = stepsOf(l, c, vw), N = steps.length, words = steps.reduce((a, x) => a + x.w, 0);
      const pbFirst = steps.findIndex(x => x.k === 'pb');
      const title = (x, n) => { const rs = x.items.filter(it => it.r != null);
        const same = steps.slice(0, n).filter(y => y.k === x.k).length;
        return x.k === 'rules' && rs.length ? t('st.rulesN', rs[0].r + 1, rs[rs.length - 1].r + 1) : t({ intro: 'ln.explain', gal: 'ln.gal', ex: 'ln.ex', mnem: 'ln.mnem', pb: 'ln.pbank', bank: 'ln.bank', recap: 'ln.recap', rules: 'ln.rules' }[x.k]) + (same ? ' – ' + t('st.cont') : ''); };
      const body = (x, n) => {
        const out = [];
        if (x.k === 'intro') out.push(he(h('div', { class: 'lbody' }, x.items.map(it => h('p', { text: it.p })))));
        if (x.k === 'rules') { let ol = null;
          for (const it of x.items) {
            for (const v of it.viz || []) { const z = vizNode(v); if (z) { out.push(h('div', { class: 'vizs', 'data-viz': v }, z)); ol = null; } }
            if (it.r == null) continue;
            if (!ol) { ol = he(h('ol', { class: 'rules', start: it.r + 1 })); out.push(ol); }
            ol.append(ruleLi(l.rules[it.r], it.r, true));
          } }
        if (x.k === 'gal') out.push(galList(x.items.flatMap(it => it.g.map(q => byId.get(q)))));
        if (x.k === 'ex') out.push(h('div', { class: 'exs' }, x.items.map(it => exCard(l.ex[it.x], true))));
        if (x.k === 'mnem') out.push(mnemList(x.items.map(it => l.mnem[it.m])));
        // the bank's questions are folded: read the question, think, open for the official answer (and, for partly covered ones, what the lesson explains)
        const fold = (v, card) => h('details', { class: 'qfold', 'data-q': v.id }, he(h('summary', {}, h('small', { class: 'muted', text: t('ln.q', v.id) + ' · ' }), h('span', { text: v.q }), h('small', { class: 'muted qopen', text: ' ' + t('st.open') }))), card);
        if (x.k === 'pb') { if (n === pbFirst) out.push(...pbNote()); out.push(h('div', { class: 'qfolds' }, x.items.map(it => { const p = pb.find(y => y.v.id === it.q); return fold(p.v, pbCard(p)); }))); }
        if (x.k === 'bank') out.push(h('div', { class: 'qfolds' }, x.items.map(it => { const v = byId.get(it.q); return fold(v, bankCard(v)); })));
        if (x.k === 'recap') out.push(recapList(x.items.map(it => it.c)));
        return out;
      };
      const saved = st.lpos(l.id) || {}, key = vw === 'quick' ? 'q' : 's';
      // v1.21 (1c): a long lesson is split into parts (sub-lessons) of ≤ 5 cards; the lesson id, its quiz and its rules stay one lesson
      const starts = partStarts(N), P = starts.length, pm = /^p(\d+)$/.exec(sub || '');
      let idx = pm && starts[+pm[1] - 1] != null ? starts[+pm[1] - 1] : Math.min(N - 1, Math.max(0, +saved[key] || 0));
      const resumed = idx > 0 && !pm;
      const partEl = P > 1 ? h('div', { class: 'stparts' }) : null;
      const pos = h('p', { class: 'stpos', id: 'st-pos' }), fill = h('span', { class: 'stfill' });
      const bar = h('div', { class: 'stbar', role: 'progressbar', 'aria-labelledby': 'st-pos', 'aria-valuemin': '1' }, fill);
      const live = h('p', { class: 'sr-only', 'aria-live': 'polite', id: 'st-live' });
      const box = h('div', { class: 'lsteps' }), nav = h('div', { class: 'stnav' });
      const note = resumed ? h('p', { class: 'notice resume', role: 'note' }, icon('repeat'), h('span', { text: t('st.resumed') + ' ' }),
        btn(t('st.restart'), () => { note.remove(); go(0, true); }, 'btn small ghost')) : null;
      function go(n, user) {
        idx = n; st.setLpos(l.id, { [key]: n, ['m' + key]: Math.max(n, +saved['m' + key] || 0) }); saved['m' + key] = Math.max(n, +saved['m' + key] || 0);
        const x = steps[n], k = partOf(starts, n), kEnd = (starts[k + 1] ?? N) - 1;
        const partTxt = P > 1 ? t('st.part', k + 1, P) + ' · ' : '';
        if (partEl) partEl.replaceChildren(h('p', { class: 'stpart', id: 'st-part', text: t('st.part', k + 1, P) + ' · ' + t('st.partSteps', starts[k] + 1, kEnd + 1) }),
          h('div', { class: 'seg partnav', role: 'group', 'aria-label': t('st.parts') }, starts.map((s0, j) => h('button', { type: 'button', class: 'btn small' + (j === k ? ' on' : ''),
            'aria-pressed': String(j === k), 'data-part': String(j + 1), onclick: () => { if (j !== k) go(s0, true); } }, h('span', { text: t('st.partN', j + 1) })))));
        pos.textContent = t('st.pos', n + 1, N); bar.setAttribute('aria-valuemax', String(N)); bar.setAttribute('aria-valuenow', String(n + 1));
        fill.style.width = (100 * (n + 1) / N) + '%';
        const h2 = h('h2', { id: 'st-h', tabindex: '-1', text: title(x, n) });
        const last = n === N - 1;
        if (last && !peek && !st.lesson(l.id)?.[0]) { st.markRead(l.id); const se = document.querySelector('.lstate'); if (se) se.textContent = t('ln.read'); }
        const partEnd = P > 1 && n === kEnd && !last ? h('p', { class: 'notice partend', role: 'note' }, icon('check'), h('span', { text: t('st.partDone', k + 1, P) })) : null;
        box.replaceChildren(h('section', { class: 'lstep', 'data-k': x.k, 'data-step': String(n), 'data-part': String(k + 1), 'aria-labelledby': 'st-h' }, h2, ...body(x, n), partEnd));
        nav.replaceChildren(
          btn(t('st.prev'), () => go(n - 1, true), 'btn stprev', uiLang() === 'he' ? 'arrowE' : 'arrowS', { disabled: n === 0 }),
          last ? h('span', { class: 'small accent', role: 'status', text: peek ? t('st.endPeek') : t('st.end') })
            : btn(partEnd ? t('st.nextPart', k + 2) : t('st.next'), () => go(n + 1, true), 'btn primary stnext', uiLang() === 'he' ? 'arrowS' : 'arrowE'));
        endBox.replaceChildren(...(last ? [end()] : []));
        if (user) { live.textContent = partTxt + t('st.pos', n + 1, N) + ': ' + title(x, n); requestAnimationFrame(() => { h2.focus({ preventScroll: true }); bar.scrollIntoView({ block: 'start' }); }); }
      }
      const endBox = h('div', { class: 'lendbox' });
      screen(l.title, ...[...head,
        h('p', { class: 'small muted rtime' }, icon('clock'), h('span', { text: t('st.time', minutes(words), N) + (P > 1 ? ' · ' + t('st.nParts', P) : '') })),
        partEl,
        note, h('div', { class: 'stprog' }, pos, bar), live, box, nav, endBox,
        bank ? null : h('p', { class: 'small muted', text: t('ln.own') })].filter(Boolean));
      go(idx, false);
    }
  }
  /** extra block on the session summary after a lesson quiz */
  function afterQuiz(id, ok, n) {
    const pct = Math.round(100 * ok / n); st.lessonQuiz(id, pct);
    const ls = lessonsFor(cls()), l = ls.find(x => x.id === id), nxt = ls[ls.indexOf(l) + 1], pass = pct >= MASTER_PCT;
    return [h('p', { class: pass ? 'banner ok' : 'banner', role: 'status' }, icon(pass ? 'award' : 'info'), h('span', { text: pass ? t('ln.passed', pct) : t('ln.notYet', pct) })),
      h('div', { class: 'row' }, link(t('ln.toLesson'), '#/learn/' + id, 'btn'), nxt ? link(t('ln.next', nxt.title), '#/learn/' + nxt.id, pass ? 'btn primary' : 'btn ghost') : link(t('ln.title'), '#/learn', 'btn ghost'))];
  }
  return { route: (id, sub) => (id ? lesson(id, sub) : path()), afterQuiz };
}
