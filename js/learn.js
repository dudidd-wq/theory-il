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
export function ref(s) {
  const k = srcKey(s), x = SRC[k];
  if (!x) return h('span', { class: 'lawref', text: s });
  const label = x.label + s.slice(k.length);
  return h('details', { class: 'lawref' }, h('summary', {}, icon('book'), h('span', { text: label })),
    h('div', { class: 'lawbox' }, h('p', { class: 'small muted', text: x.doc + (x.title ? ' – ' + x.title : '') + (x.rev ? ` (ויקיטקסט, גרסה ${x.rev})` : '') + (x.accessed ? ` (${t('ln.accessed', x.accessed)}${x.pub ? ', ' + t('ln.updated', x.pub) : ''})` : '') + (x.kind === 'OFF' ? ' · ' + t('ln.noNiqqud') : '') }),
      ...(x.ex || []).slice(0, 4).map(e => h('blockquote', { text: e })),
      ext(x.url, x.kind === 'Q' ? t('ln.bank') : t('ln.full'))));
}
const refs = (s, also = []) => h('span', { class: 'refs' }, [s, ...also].map(ref));

/** why-box data for a bank question: the lesson rule (or sign-table entry) that teaches it.
 *  cov = data/coverage.json, sg = data/signs.json; returns null when nothing in the lessons covers it */
export function explain(id, c, cov, sg) {
  const ls = lessonsFor(c), mine = new Map(ls.map(l => [l.id, l]));
  const lessonOf = lid => mine.get(lid) || null;
  const nums = sg?.q?.[id];
  if (nums?.length && nums.every(n => sg.e?.[n])) {
    return { kind: 'sign', lines: nums.map(n => ({ n, t: sg.e[n] })), url: sg.src?.url, lesson: lessonOf('signs'), note: L?.notes?.[id] || null };
  }
  const note = L?.notes?.[id] || null;   // the bank's answer differs from (or is narrower than) the current law text
  const e = cov?.q?.[id]; if (!e) return note ? { kind: 'none', lesson: null, note } : null;
  const [stt, lids, units] = e;
  if (stt === 'n') return { kind: 'none', lesson: null, note };   // nearest-by-words lessons are often unrelated: no link, just say so
  for (const u of units || []) {
    const m = /^([\w]+)#([rxbc])(\d+)$/.exec(u); if (!m) continue;
    const l = lessonOf(m[1]); if (!l) continue;
    const i = +m[3];
    const r = m[2] === 'r' ? l.rules[i] && { t: l.rules[i].t, s: l.rules[i].s }
      : m[2] === 'x' ? l.ex[i] && { t: l.ex[i].t, s: l.ex[i].s }
      : m[2] === 'c' ? l.recap[i] && { t: l.recap[i].f + ' ' + l.recap[i].b, s: l.recap[i].s }
      : l.body[i] && { t: l.body[i], s: null };
    // only explicit links / hand-judged matches ('f') are shown as the answer's reason; word-overlap matches ('a', 'w') as a related rule
    if (r) return { kind: stt === 'f' ? 'rule' : 'part', t: r.t, s: r.s, lesson: l, note };
  }
  return { kind: 'none', lesson: null, note };
}
/** link target for a lesson: locked lessons open in read-only "peek" mode */
export function lessonHref(l, c) { const ls = lessonsFor(c); return '#/learn/' + l.id + (status(l, ls).unlocked ? '' : '/peek'); }
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
    if (x.s) kids.push(h('p', { class: 'refs' }, ref(x.s)));
  } else kids.push(h('p', { class: 'small muted', text: t('why.none') }));
  if (x.note) kids.push(he(h('div', { class: 'notice lawnote', role: 'note' }, icon('info'), h('div', {},
    h('p', {}, h('b', { text: t('why.exam') + ' ' }), x.note.exam), h('p', {}, h('b', { text: t('why.law') + ' ' }), x.note.law),
    x.note.s ? h('p', { class: 'refs' }, ref(x.note.s)) : null))));
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
    const c = cls(), ls = lessonsFor(c), l = ls.find(x => x.id === id);
    if (!l) { location.hash = '#/learn'; return; }
    const s = status(l, ls);
    if (!s.unlocked && sub !== 'peek') { toast(t('ln.locked')); location.hash = '#/learn'; return; }
    const peek = !s.unlocked;
    const mine = new Set(pool()), qids = l.quiz.filter(q => mine.has(q) && byId.has(q));
    if (sub === 'quiz') { st.markRead(l.id); return startSession('lesson', pick(qids, QUIZ_N), l.title, `#/learn/${l.id}/quiz`, { lesson: l.id }); }
    const i = ls.indexOf(l), nxt = ls[i + 1];
    const speakText = [l.title, ...l.body, ...l.rules.map(r => r.t), ...l.mnem.map(m => m.t)].join('\n');
    const listen = tts.supported() ? btn(t('ln.listen'), e => {
      if (tts.speaking()) { tts.stop(); e.currentTarget.setAttribute('aria-pressed', 'false'); return; }
      if (!tts.voiceFor('he')) toast(t('set.ttsNone', 'עברית'));
      const b = e.currentTarget; b.setAttribute('aria-pressed', 'true');
      tts.speak(speakText, 'he', prof()?.rate || 1, () => b.setAttribute('aria-pressed', 'false'));
    }, 'btn small', 'vol', { 'aria-pressed': 'false' }) : null;
    const sec = (key, ...kids) => h('section', { class: 'lsec', 'aria-labelledby': 'ls-' + key }, h('h2', { id: 'ls-' + key, text: t('ln.' + key) }), ...kids);
    const qimg = q => q.i ? h('img', { class: 'qimg', src: 'img/q/' + q.i, alt: t('q.img', q.id), loading: 'lazy', width: 320, height: 180 }) : null;
    const kids = [
      h('p', { class: 'row tight' }, link(t('ln.back'), '#/learn', 'btn small ghost', uiLang() === 'he' ? 'arrowE' : 'arrowS'), listen,
        h('span', { class: 'small muted', text: s.mastered ? t('ln.mastered') + ' · ' + t('ln.best', s.best) : s.read ? t('ln.read') : t('ln.new') })),
      peek ? h('p', { class: 'notice', role: 'note' }, icon('key'), h('span', { text: t('ln.peek') })) : null,
      he(h('p', { class: 'sub', text: l.sub })),
      uiLang() !== 'he' ? h('p', { class: 'notice', role: 'note' }, icon('info'), h('span', { text: t('ln.heOnly') })) : null,
      sec('explain', he(h('div', { class: 'lbody' }, l.body.map(p => h('p', { text: p }))))),
      l.viz.length ? h('div', { class: 'vizs' }, l.viz.filter(v => VIZ[v]).map(v => he(VIZ[v]({ lesson: l.id, cls: c })))) : null,
      sec('rules', he(h('ol', { class: 'rules' }, l.rules.map(r => h('li', {}, h('span', { text: r.t }), refs(r.s, r.also)))))),
      l.gal.length ? sec('gal', h('ul', { class: 'gal' }, l.gal.filter(q => byId.has(q)).map(q => { const v = byId.get(q);
        return h('li', {}, h('img', { src: 'img/q/' + v.i, alt: t('q.img', q), loading: 'lazy', width: 160, height: 90 }), he(h('span', { text: v.a[v.c] })), ref('Q:' + q)); }))) : null,
      l.ex.length ? sec('ex', h('div', { class: 'exs' }, l.ex.filter(x => byId.has(x.q)).map(x => { const v = byId.get(x.q);
        return h('article', { class: 'excard' }, qimg(v), he(h('p', { class: 'qtext sm' }, h('small', { class: 'muted', text: t('ln.q', v.id) + ' · ' }), v.q)),
          he(h('p', { class: 'ans-ok' }, icon('check'), h('span', { text: v.a[v.c] }))),
          he(h('p', {}, h('b', { text: t('ln.why') + ' ' }), x.t)), h('p', { class: 'refs' }, ref(x.s), ref('Q:' + x.q))); }))) : null,
      l.mnem.length ? sec('mnem', he(h('ul', { class: 'mnems' }, l.mnem.map(m => h('li', {}, h('b', { text: m.t }), m.n ? h('small', { text: m.n }) : null, ref(m.s)))))) : null,
      l.recap.length ? sec('recap', h('ul', { class: 'recap' }, l.recap.map((r, n) => { const back = he(h('p', { class: 'back', id: `rc-${n}`, hidden: true }, h('span', { text: r.b }), ref(r.s)));
        const b = h('button', { type: 'button', class: 'flip', 'aria-expanded': 'false', 'aria-controls': `rc-${n}`, onclick: () => { const o = b.getAttribute('aria-expanded') !== 'true'; b.setAttribute('aria-expanded', String(o)); back.hidden = !o; } },
          he(h('span', { text: r.f })), h('small', { class: 'muted', text: t('ln.flip') }));
        return h('li', {}, b, back); }))) : null,
      h('div', { class: 'row lend' },
        qids.length && !peek ? link(t('ln.quiz', Math.min(QUIZ_N, qids.length)), `#/learn/${l.id}/quiz`, 'btn primary big', 'exam') : null,
        !s.read && !peek ? btn(t('ln.markRead'), e => { st.markRead(l.id); e.currentTarget.replaceWith(h('span', { class: 'small accent', role: 'status', text: t('ln.isRead') })); }, 'btn', 'check') : null,
        nxt ? link(t('ln.next', nxt.title), '#/learn/' + nxt.id, 'btn ghost') : null),
      h('p', { class: 'small muted', text: t('ln.own') }),
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
