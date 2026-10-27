// Learning phase: short lessons per licence class → mini-quiz → practice → exam.
// Lesson text is our own wording (data/lessons.json, built and checked by tools/lessons.py);
// every rule links to the excerpt of the law / sign table / bank question it comes from (data/sources.json).
import { h, icon, ring, toast } from './ui.js';
import { t, uiLang } from './i18n.js';
import * as st from './store.js';
import * as tts from './tts.js';
import { VIZ } from './viz.js';
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
      ext(pg ? x.url + '#page=' + pg[1] : x.url, x.kind === 'Q' ? t('ln.bank') : t('ln.full'))));
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
    kids.push(he(h('p', {}, h('b', { text: t('ln.why') + ' ' }), x.lines.map((s, i) => h('span', { text: (i ? ' · ' : '') + t('why.sign', s.n) + ' ' + (s.t.length > 220 ? s.t.slice(0, 220) + '…' : s.t) })))));
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
  if (x.lesson) kids.push(h('p', { class: 'row tight' }, h('a', { href: lessonHref(x.lesson, c), class: ok ? 'btn small ghost' : 'btn small primary', 'data-learn': x.lesson.id },
    icon('book'), h('span', { text: t(ok ? 'why.related' : 'why.learn', x.lesson.title) }))));
  return h('div', { class: 'why' + (ok ? '' : ' bad') }, ...kids);
}

export function makeLearn(ctx) {
  const { screen, btn, link, byId, view, pool, cls, prof, pick, startSession, clsName } = ctx;
  const he = node => { node.lang = 'he'; node.dir = 'rtl'; return node; };
  function path() {
    const c = cls(), ls = lessonsFor(c);
    if (!ls.length) return screen(t('ln.title'), h('p', { class: 'empty', text: t('ln.noData') }));
    const done = masteredCount(c), sts = ls.map(l => status(l, ls)), cur = sts.findIndex(s => !s.mastered);
    screen(t('ln.title'), h('p', { class: 'sub', text: clsName(c) + ' · ' + t('ln.count', ls.length, done) }),
      h('p', { class: 'small', text: t('ln.hint') }),
      uiLang() !== 'he' ? h('p', { class: 'notice', role: 'note' }, icon('info'), h('span', { text: t('ln.heOnly') })) : null,
      h('ol', { class: 'steps3', 'aria-label': t('ln.path') }, ['ln.step1', 'ln.step2', 'ln.step3'].map((k, i) => h('li', { class: i === 0 ? 'on' : '' }, h('b', { text: i + 1 }), h('span', { text: t(k) })))),
      h('ol', { class: 'lessons' }, ls.map((l, i) => { const s = sts[i];
        const state = !s.unlocked ? t('ln.locked') : s.mastered ? t('ln.mastered') + ' · ' + t('ln.best', s.best) : s.read ? t('ln.read') + (s.tries ? ' · ' + t('ln.best', s.best) : '') : t('ln.new');
        const inner = [h('span', { class: 'lnum' + (s.mastered ? ' ok' : ''), 'aria-hidden': 'true' }, s.mastered ? icon('check') : !s.unlocked ? icon('key') : String(i + 1)),
          h('span', { class: 'lt' }, he(h('b', { text: l.title })), he(h('small', { text: l.sub })), h('small', { class: 'lst', text: state }))];
        return h('li', { class: (s.unlocked ? '' : 'locked') + (i === cur ? ' cur' : '') },
          s.unlocked ? h('a', { href: '#/learn/' + l.id, 'aria-current': i === cur ? 'step' : null }, inner) : h('div', { 'aria-disabled': 'true' }, inner)); })),
      cur === -1 ? h('p', { class: 'banner', role: 'status' }, icon('award'), h('span', { text: t('ln.allDone') })) : null,
      h('div', { class: 'row' }, link(t('nav.practice'), '#/practice', 'btn', 'book'), link(t('nav.exam'), '#/exam', 'btn', 'exam')),
      h('p', { class: 'small muted', text: t('ln.own') }));
  }
  function lesson(id, sub) {
    const c = cls(), ls = lessonsFor(c), own = ls.find(x => x.id === id), l = own || (sub === 'peek' ? anyLesson(id) : null);
    if (!l) { location.hash = own === undefined && anyLesson(id) ? '#/learn/' + id + '/peek' : '#/learn'; return; }
    const s = own ? status(l, ls) : { unlocked: false };
    // v1.10: a direct link to a locked lesson (or its quiz) opens it read-only instead of bouncing to the path
    if (!s.unlocked && sub !== 'peek') { location.replace('#/learn/' + l.id + '/peek'); return; }
    const peek = !s.unlocked;
    const mine = new Set(pool()), qids = l.quiz.filter(q => mine.has(q) && byId.has(q));
    if (sub === 'quiz') { st.markRead(l.id); return startSession('lesson', pick(qids, QUIZ_N), l.title, `#/learn/${l.id}/quiz`, { lesson: l.id }); }
    const i = ls.indexOf(l), nxt = own ? ls[i + 1] : null;
    const pb = (l.pbank || []).filter(p => mine.has(p.q) && byId.has(p.q)).map(p => ({ v: byId.get(p.q), u: p.u }));
    const bank = l.bank ? l.bank.filter(q => mine.has(q) && byId.has(q)).map(q => byId.get(q)) : null;
    const speakText = bank ? [l.title, ...bank.map(v => v.q + '\n' + v.a[v.c])].join('\n')
      : [l.title, ...l.body, ...l.rules.map(r => r.t), ...l.mnem.map(m => m.t)].join('\n');
    const listen = tts.supported() ? btn(t('ln.listen'), e => {
      if (tts.speaking()) { tts.stop(); e.currentTarget.setAttribute('aria-pressed', 'false'); return; }
      if (!tts.voiceFor('he')) toast(t('set.ttsNone', 'עברית'));
      const b = e.currentTarget; b.setAttribute('aria-pressed', 'true');
      tts.speak(speakText, 'he', prof()?.rate || 1, () => b.setAttribute('aria-pressed', 'false'));
    }, 'btn small', 'vol', { 'aria-pressed': 'false' }) : null;
    const sec = (key, ...kids) => h('section', { class: 'lsec', 'aria-labelledby': 'ls-' + key }, h('h2', { id: 'ls-' + key, text: t('ln.' + key) }), ...kids);
    // v1.11 (review #8): all four official options in the published order, the official correct one marked (text + icon, not colour only)
    const opts = v => he(h('ol', { class: 'bopts', 'aria-label': t('ln.opts') }, v.a.map((a, k) => h('li', { class: k === v.c ? 'ans-ok' : 'ans-no' },
      k === v.c ? icon('check') : h('span', { class: 'ic', 'aria-hidden': 'true', text: '·' }), h('span', { class: 'at', text: a }),
      k === v.c ? h('small', { class: 'okb', text: t('ln.okb') }) : null))));
    const qimg = q => q.i ? h('img', { class: 'qimg', src: 'img/q/' + q.i, alt: t('q.img', q.id), loading: 'lazy', width: 320, height: 180 }) : null;
    const kids = [
      h('p', { class: 'row tight' }, link(t('ln.back'), '#/learn', 'btn small ghost', uiLang() === 'he' ? 'arrowE' : 'arrowS'), listen,
        h('span', { class: 'small muted', text: s.mastered ? t('ln.mastered') + ' · ' + t('ln.best', s.best) : s.read ? t('ln.read') : t('ln.new') })),
      peek ? h('p', { class: 'notice', role: 'note' }, icon('key'), h('span', { text: t('ln.peek') })) : null,
      he(h('p', { class: 'sub', text: l.sub })),
      uiLang() !== 'he' ? h('p', { class: 'notice', role: 'note' }, icon('info'), h('span', { text: t('ln.heOnly') })) : null,
      // v1.10 bank-only lesson: official question + correct answer exactly as published, a visible no-explanation label, CC BY attribution
      bank ? he(h('p', { class: 'notice banknote', role: 'note' }, icon('info'), h('span', { text: t('ln.bankNote') }))) : null,
      bank ? h('p', { class: 'small bankattr' }, ext(BANK_URL, t('ln.bankAttr'))) : null,
      bank ? sec('bank', h('div', { class: 'exs' }, bank.map(v => { const n = L?.notes?.[v.id];
        return h('article', { class: 'excard bankcard', 'data-q': v.id }, qimg(v), he(h('p', { class: 'qtext sm' }, h('small', { class: 'muted', text: t('ln.q', v.id) + ' · ' }), v.q)),
          opts(v),
          h('p', { class: 'small muted banktag', text: t('ln.bankTag') }),
          n ? he(h('div', { class: 'notice lawnote', role: 'note' }, icon('info'), h('div', {}, h('p', {}, h('b', { text: t(n.k === 'tb' ? 'why.tb' : 'why.law') + ' ' }), n.law),
            n.s ? h('p', { class: 'refs' }, ref(n.s, n.x)) : null))) : null); }))) : null,
      l.body.length ? sec('explain', he(h('div', { class: 'lbody' }, l.body.map(p => h('p', { text: p }))))) : null,
      l.viz.length ? h('div', { class: 'vizs' }, l.viz.filter(v => VIZ[v]).map(v => he(VIZ[v]({ lesson: l.id, cls: c })))) : null,
      l.rules.length ? sec('rules', he(h('ol', { class: 'rules' }, l.rules.map(r => h('li', {}, h('span', { text: r.t }), refs(r.s, r.also, r.x)))))) : null,
      l.gal.length ? sec('gal', h('ul', { class: 'gal' }, l.gal.filter(q => byId.has(q)).map(q => { const v = byId.get(q);
        return h('li', {}, h('img', { src: 'img/q/' + v.i, alt: t('q.img', q), loading: 'lazy', width: 160, height: 90 }), he(h('span', { text: v.a[v.c] })), ref('Q:' + q)); }))) : null,
      l.ex.length ? sec('ex', h('div', { class: 'exs' }, l.ex.filter(x => byId.has(x.q)).map(x => { const v = byId.get(x.q);
        return h('article', { class: 'excard' }, qimg(v), he(h('p', { class: 'qtext sm' }, h('small', { class: 'muted', text: t('ln.q', v.id) + ' · ' }), v.q)),
          opts(v),
          // v1.11 (review #8 item 2): walk through the closest wrong option against the cited source's own wording – no written text
          x.tr != null && v.a[x.tr] ? h('div', { class: 'trap' }, he(h('p', {}, h('b', { text: t('ln.trap') + ' ' }), h('span', { class: 'trapopt', text: '«' + v.a[x.tr] + '»' }))),
            (x.qt || []).length ? h('div', {}, h('p', {}, h('b', { text: t('ln.trapSrc') })), he(h('ul', { class: 'qt' }, x.qt.map(p => h('li', {}, h('q', { text: p.t.length > 320 ? p.t.slice(0, 320) + '…' : p.t }), ' ', ref(p.s)))))) : null,
            h('p', { class: 'muted sm', text: t('ln.trapNote') })) : null,
          he(h('p', {}, h('b', { text: t('ln.why') + ' ' }), x.t)), h('p', { class: 'refs' }, ref(x.s, x.x), ...(x.also || []).map(a => ref(a, x.x)), ref('Q:' + x.q))); }))) : null,
      // v1.11: B/A questions this lesson covers only partly – official question + answer as published, the covering unit with
      // its own citation, and a separate label that the rest comes from the bank alone (still 'partial' in the coverage figures)
      pb.length ? sec('pbank', he(h('p', { class: 'notice banknote', role: 'note' }, icon('info'), h('span', { text: t('ln.pbankNote') }))),
        h('p', { class: 'small bankattr' }, ext(BANK_URL, t('ln.bankAttr'))),
        h('div', { class: 'exs' }, pb.map(({ v, u }) => h('article', { class: 'excard bankcard pbcard', 'data-q': v.id }, qimg(v),
          he(h('p', { class: 'qtext sm' }, h('small', { class: 'muted', text: t('ln.q', v.id) + ' · ' }), v.q)),
          opts(v),
          h('p', { class: 'small muted banktag', text: t('ln.bankTag') }),
          ...u.map(x => h('div', { class: 'pbpart' + (x.o ? ' off' : '') }, h('p', { class: 'small' }, h('b', { text: t(x.o ? 'ln.pbOff' : 'ln.pbNoOff') })),
            x.t ? he(h('p', { class: 'sm', text: x.t })) : h('p', { class: 'small muted', text: t('ln.pbGal') }),
            x.url ? h('p', { class: 'refs' }, ext(x.url, t('why.signSrc', x.n))) : x.s ? refs(x.s, x.also || [], x.x) : null)),
          h('p', { class: 'small pbrest', text: t('ln.pbRest') }),
          L?.notes?.[v.id] ? he(h('div', { class: 'notice lawnote', role: 'note' }, icon('info'), h('div', {}, h('p', {}, h('b', { text: t(L.notes[v.id].k === 'tb' ? 'why.tb' : 'why.law') + ' ' }), L.notes[v.id].law),
            L.notes[v.id].s ? h('p', { class: 'refs' }, ref(L.notes[v.id].s, L.notes[v.id].x)) : null))) : null)))) : null,
      l.mnem.length ? sec('mnem', he(h('ul', { class: 'mnems' }, l.mnem.map(m => h('li', {}, h('b', { text: m.t }), m.n ? h('small', { text: m.n }) : null, refs(m.s, m.also || [], m.x)))))) : null,
      l.recap.length ? sec('recap', h('ul', { class: 'recap' }, l.recap.map((r, n) => { const back = he(h('p', { class: 'back', id: `rc-${n}`, hidden: true }, h('span', { text: r.b }), ref(r.s, r.x)));
        const b = h('button', { type: 'button', class: 'flip', 'aria-expanded': 'false', 'aria-controls': `rc-${n}`, onclick: () => { const o = b.getAttribute('aria-expanded') !== 'true'; b.setAttribute('aria-expanded', String(o)); back.hidden = !o; } },
          he(h('span', { text: r.f })), h('small', { class: 'muted', text: t('ln.flip') }));
        return h('li', {}, b, back); }))) : null,
      h('div', { class: 'row lend' },
        qids.length && !peek ? link(t('ln.quiz', Math.min(QUIZ_N, qids.length)), `#/learn/${l.id}/quiz`, 'btn primary big', 'exam') : null,
        !s.read && !peek ? btn(t('ln.markRead'), e => { st.markRead(l.id); e.currentTarget.replaceWith(h('span', { class: 'small accent', role: 'status', text: t('ln.isRead') })); }, 'btn', 'check') : null,
        nxt ? link(t('ln.next', nxt.title), '#/learn/' + nxt.id, 'btn ghost') : null),
      bank ? null : h('p', { class: 'small muted', text: t('ln.own') }),
    ];
    screen(l.title, ...kids.filter(Boolean));
    const h1 = document.querySelector('#app h1'); if (h1) { h1.lang = 'he'; h1.dir = 'rtl'; }
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
