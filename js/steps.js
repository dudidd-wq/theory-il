// v1.21: lesson steps ('כרטיסים'), parts and topic groups – pure functions (no DOM), shared by the app and tools/test/steps_stats.mjs.
// A step holds at most MAX_R rules and about MAX_W visible words; the cited passages stay in their collapsed chips (not counted until opened).
export const MAX_W = 120, MAX_R = 5, MAX_Q = 6, PART_STEPS = 5, WPM = 120, VIZ_W = 45;
// visible words of each visualisation (its title, controls and the 'תיאור מילולי' text), measured in the browser (v1.21)
export const VIZ_WC = {"signs":127,"signdict":31,"priority":41,"speed":65,"gap":53,"overtake":41,"crosswalk":29,"parking":55,"lamps":42,"rail":83,"kids":39,"blind":46,"newdrv":45,"moto":43,"tractor":46,"hands":37,"duty":60,"bac":86,"accident":43,"dims":88,"roadparts":37,"brakes":45,"blowout":41,"startcar":55,"stopdist":48,"leftturn":45,"motojx":41};
const vw = vs => (vs || []).reduce((a, v) => a + (VIZ_WC[v] || VIZ_W), 0);
export const wc = s => String(s || '').split(/\s+/).filter(Boolean).length;
/** a rule's one-line statement and the rest (shown under 'למה?'); only split at a real sentence end, never inside a number */
export function firstLine(t) {
  const m = /^([\s\S]{12,}?[^\d\s][.!?])\s+(\S[\s\S]*)$/.exec(t || '');
  if (m && wc(m[1]) >= 4 && wc(m[2]) >= 3) return [m[1], m[2]];
  // a long rule written as one sentence with ';' parts: its first part is the statement
  const k = wc(t) > 30 ? /^([^;]{20,}?;)\s+(\S[\s\S]*)$/.exec(t) : null;
  return k && wc(k[1]) >= 4 && wc(k[2]) >= 3 ? [k[1], k[2]] : [t || '', ''];
}
/** our explanatory paragraphs, long ones broken at sentence ends into short paragraphs (≤ ~40 words) */
export function paras(body) {
  const out = [];
  for (const p of body || []) {
    if (wc(p) <= 45) { out.push(p); continue; }
    let cur = '';
    for (const s of p.split(/(?<=[^\d\s][.!?])\s+/)) { if (cur && wc(cur) + wc(s) > 40) { out.push(cur); cur = s; } else cur = cur ? cur + ' ' + s : s; }
    if (cur) out.push(cur);
  }
  return out;
}
// the rule a diagram illustrates: the first rule whose statement uses the diagram's subject words (else the first rule step)
const VIZ_RX = { signs: /חלק \d|מספר|בלוח/, signdict: /תמרור|לוח/, priority: /זכות קדימה|צומת|לתת/, speed: /מהירות|קמ"ש/, gap: /רווח|שניות|מרחק/,
  overtake: /עקיפ|לעקוף|עוקף/, crosswalk: /מעבר חצי|הולכ/, parking: /חני|לחנות|עציר|לעצור/, lamps: /פנס|אורות|אור /, rail: /מסיל|רכבת/,
  kids: /ילד|חגור|מושב/, blind: /מרא|שטח מת|שטחים מתים/, newdrv: /נהג חדש|מלווה/, moto: /אופנוע|קסדה/, motojx: /אופנוע|דו-גלגלי/, tractor: /טרקטור/,
  hands: /איתות|אות |צופר/, duty: /חוב|רישיון|מסמ|שוטר/, bac: /אלכוהול|בדם|נשיפ/, accident: /תאונ|נפגע/, dims: /גובה|רוחב|אורך/,
  roadparts: /שול|נתיב|כביש|שטח הפרדה/, brakes: /בלם|בלימ/, blowout: /תקר|צמיג|התפוצ/, startcar: /התנע|מנוע|דוושת|בלם היד/,
  stopdist: /עצירה|בלימה|מרחק/, leftturn: /שמאלה|פנייה|פונים/ };
export function vizAt(l) {
  const at = {};
  for (const v of l.viz || []) { const rx = VIZ_RX[v], i = rx ? (l.rules || []).findIndex(r => rx.test(r.t)) : -1; at[v] = i >= 0 ? i : 0; }
  return at;
}
const labs = (lab, s, also) => [s, ...(also || [])].filter(Boolean).reduce((a, x) => a + wc(lab(x)), 0);
/** the steps of a lesson. view: 'steps' (everything, step by step) | 'quick' (rules + diagrams + recap only).
 *  o: { lab: source id → chip label, q: id → question, pb: [{v,u}], bank: [question], gal: [question] } (already filtered to the class) */
export function buildSteps(l, view, o) {
  const lab = o.lab || (() => ''), Q = o.q || (() => null), steps = [], quick = view === 'quick';
  const opts = v => v ? wc(v.q) + v.a.reduce((a, x) => a + wc(x), 0) + 4 : 0;
  const pack = (k, items) => {   // greedy: a new step when the next item would pass MAX_W words or MAX_R rules
    let cur = null;
    for (const it of items) {
      if (!cur || (cur.w + it.w > MAX_W && cur.items.length) || (it.r != null && cur.items.filter(x => x.r != null).length >= MAX_R) || (it.q && cur.items.length >= MAX_Q)) { cur = { k, items: [], w: 0 }; steps.push(cur); }
      cur.items.push(it); cur.w += it.w;
    }
  };
  // bank questions (bank-only lessons, partly covered questions) are folded: the question first, the official card on tap
  if (o.bank) pack('bank', o.bank.map(v => ({ q: v.id, w: wc(v.q) + 4 })));
  else {
    if (!quick && (l.body || []).length) pack('intro', paras(l.body).map(p => ({ p, w: wc(p) })));
    const at = vizAt(l), byR = {};
    for (const [v, i] of Object.entries(at)) (byR[i] ||= []).push(v);
    // two heavy visualisations on one rule would overfill a card: the extra one moves to the next rule
    const nR = (l.rules || []).length;
    for (let i = 0; i < nR - 1; i++) while ((byR[i] || []).length > 1 && vw(byR[i]) > MAX_W - 20) (byR[i + 1] ||= []).unshift(byR[i].pop());
    pack('rules', (l.rules || []).map((r, i) => { const [a, b] = firstLine(r.t);
      return { r: i, viz: byR[i] || [], w: wc(a) + (b ? 2 : 0) + labs(lab, r.s, r.also) + vw(byR[i]) }; }));
    if (!(l.rules || []).length && (l.viz || []).length) pack('rules', [{ viz: l.viz, w: vw(l.viz) }]);
    if (!quick) {
      const gal = o.gal || [];
      for (let i = 0; i < gal.length; i += 4) pack('gal', [{ g: gal.slice(i, i + 4).map(v => v.id), w: gal.slice(i, i + 4).reduce((a, v) => a + wc(v.a[v.c]) + 4, 0) }]);
      pack('ex', (l.ex || []).map((x, i) => ({ x: i, w: opts(Q(x.q)) + labs(lab, x.s, x.also) + 8 })));
      if ((l.mnem || []).length) pack('mnem', l.mnem.map((m, i) => ({ m: i, w: wc(m.t) + wc(m.n) + labs(lab, m.s, m.also) })));
      pack('pb', (o.pb || []).map(({ v }, i) => ({ q: v.id, w: wc(v.q) + 4 + (i ? 0 : 50) })));
    }
  }
  if ((l.recap || []).length) pack('recap', l.recap.map((r, i) => ({ c: i, w: wc(r.f) + 2 })));
  if (!steps.length) steps.push({ k: 'intro', items: [], w: 0 });
  return steps;
}
/** long lessons are split into parts (sub-lessons) of at most PART_STEPS steps, sizes balanced; returns the first step of each part */
export function partStarts(n) {
  if (n <= PART_STEPS + 1) return [0];
  const P = Math.ceil(n / PART_STEPS), base = Math.floor(n / P), extra = n % P, out = [];
  for (let i = 0, s = 0; i < P; i++) { out.push(s); s += base + (i < extra ? 1 : 0); }
  return out;
}
export const partOf = (starts, i) => starts.reduce((a, s, k) => (i >= s ? k : a), 0);
export const minutes = w => Math.max(1, Math.round(w / WPM));
// learning-path topics (our grouping; a lesson keeps its id, order and unlock rule)
export const GROUPS = [
  ['signs', ['signs', 'signs2', 'signs3', 'lights', 'lights2', 'night2']],
  ['junction', ['priority', 'yield2', 'junction2', 'turns', 'signal']],
  ['road', ['speed', 'distance', 'gap2', 'overtake', 'overtake2', 'roads2', 'lanes', 'roadparts', 'shoulder2', 'defensive', 'rules3', 'rules4', 'law3']],
  ['people', ['peds', 'peds2', 'rail', 'rail2', 'safety', 'safety2', 'blind']],
  ['park', ['parking', 'parking2', 'parking3']],
  ['driver', ['sober', 'alc2', 'newdrv', 'licence2']],
  ['law', ['terms', 'terms2', 'duty', 'docs', 'docs2', 'law2', 'law4', 'accident']],
  ['car', ['cockpit', 'moveoff', 'downhill', 'vehicle', 'brakes3', 'equip', 'maint2', 'skid2', 'emerg2', 'winter2']],
  ['special', ['moto', 'moto2', 'moto3', 'quad', 'heavy', 'heavy2', 'cargo', 'cargo2', 'bus', 'taxi', 'busline', 'taxi2', 'tractor', 'tractor2']],
];
export const groupOf = id => (id.startsWith('bank_') ? 'bank' : (GROUPS.find(([, ids]) => ids.includes(id)) || ['more'])[0]);
/** lessons grouped by topic, groups in the order of their first lesson, lessons in path order */
export function grouped(ls) {
  const m = new Map();
  ls.forEach((l, i) => { const g = groupOf(l.id); if (!m.has(g)) m.set(g, []); m.get(g).push(i); });
  return [...m.entries()];
}
