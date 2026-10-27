// v1.21: words per screen and steps per lesson, before (one page) and after (steps), for the B and A lessons.
// node tools/test/steps_stats.mjs [--json]   (estimates from js/steps.js; the e2e test measures the rendered cards)
import { readFileSync } from 'node:fs';
import { buildSteps, partStarts, wc, minutes, MAX_W } from '../../js/steps.js';
const L = JSON.parse(readFileSync('data/lessons.json')), SRC = JSON.parse(readFileSync('data/sources.json'));
const Q = new Map(JSON.parse(readFileSync('data/q.he.json')).map(q => [q.id, q]));
const lab = s => { const k = SRC[s] ? s : s.replace(/\(.*$/, ''); return SRC[k] ? SRC[k].label : s; };
const med = a => { const b = [...a].sort((x, y) => x - y); return b.length ? b[Math.floor((b.length - 1) / 2)] : 0; };
const out = {};
for (const c of ['B', 'A']) {
  const pool = new Set([...Q.values()].filter(q => q.t.includes(c)).map(q => q.id));
  const rows = L.lessons.filter(l => l.cls.includes(c)).map(l => {
    const o = { lab, q: id => Q.get(id), pb: (l.pbank || []).filter(p => pool.has(p.q)).map(p => ({ v: Q.get(p.q), u: p.u })),
      bank: l.bank ? l.bank.filter(q => pool.has(q)).map(q => Q.get(q)) : null, gal: (l.gal || []).filter(q => Q.has(q)).map(q => Q.get(q)) };
    const st = buildSteps(l, 'steps', o), qk = buildSteps(l, 'quick', o), all = st.reduce((a, s) => a + s.w, 0);
    return { id: l.id, before: wc((l.body || []).join(' ')) + (l.rules || []).reduce((a, r) => a + wc(r.t), 0), page: all, steps: st.length, parts: partStarts(st.length).length,
      maxStep: Math.max(...st.map(s => s.w)), quick: qk.length, min: minutes(all), over: st.filter(s => s.w > MAX_W && s.items.length > 1).length };
  });
  out[c] = { lessons: rows.length, before_max: Math.max(...rows.map(r => r.page)), before_med: med(rows.map(r => r.page)),
    after_max: Math.max(...rows.map(r => r.maxStep)), after_med: med(rows.flatMap(r => r.maxStep)), steps_max: Math.max(...rows.map(r => r.steps)),
    steps_med: med(rows.map(r => r.steps)), split: rows.filter(r => r.parts > 1).map(r => `${r.id}:${r.parts}`), over: rows.filter(r => r.over).map(r => r.id), rows };
}
if (process.argv.includes('--json')) console.log(JSON.stringify(out));
else for (const [c, o] of Object.entries(out)) { const { rows, ...x } = o; console.log(c, JSON.stringify(x)); console.log('  biggest:', rows.sort((a, b) => b.maxStep - a.maxStep).slice(0, 6).map(r => `${r.id} ${r.maxStep}w/${r.steps}st`).join(', ')); }
