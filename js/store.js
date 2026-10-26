// Local-only state. localStorage is the fast copy; backup.js mirrors every change into IndexedDB.
// Nothing here talks to a server.
const KEY = 'theoryIL.state';
export const CLASSES = ['B', 'A', 'C1', 'C', 'D', '1'];
export const LANGS = ['he', 'en', 'ru', 'fr', 'es'];
export const today = (t = Date.now()) => Math.floor((t - new Date(t).getTimezoneOffset() * 6e4) / 864e5);
export const blank = () => ({ v: 1, profile: null, q: {}, bm: [], ex: [], xp: 0, days: {}, badges: {}, created: Date.now() });
let S = load(), listeners = [], saveT;
function load() { try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.v === 1) return { ...blank(), ...s }; } catch {} return blank(); }
export const state = () => S;
export const hasProgress = () => !!S.profile && (S.xp > 0 || Object.keys(S.q).length > 0);
export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {}
  clearTimeout(saveT); saveT = setTimeout(() => listeners.forEach(f => { try { f(); } catch {} }), 300);  // debounced mirror / auto-file
}
export const onPersist = f => listeners.push(f);
export const snapshot = () => JSON.parse(JSON.stringify(S));
export function replaceState(s) { S = { ...blank(), ...s }; try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} listeners.forEach(f => { try { f(); } catch {} }); }
export const lostLocal = () => { try { return !localStorage.getItem(KEY); } catch { return true; } };
export function resetAll() { S = blank(); try { localStorage.removeItem(KEY); } catch {} }

// ---------- progress, spaced repetition (Leitner boxes 0–5) ----------
const GAP = [0, 1, 3, 7, 16, 35];             // days until the next review per box
export const MASTER_BOX = 3;
export function record(id, ok) {
  const d = today(), r = S.q[id] || [0, d, 0, 0, d];
  let [box, , seen, right] = r;
  seen++; if (ok) { right++; box = Math.min(5, box + 1); } else box = 0;
  S.q[id] = [box, d + GAP[box], seen, right, d];
  const day = S.days[d] || [0, 0]; day[0]++; if (ok) day[1]++; S.days[d] = day;
  S.xp += ok ? 10 : 2;
  save();
}
export const info = id => S.q[id];
export const inMistakes = id => { const r = S.q[id]; return !!r && r[2] > r[3] && r[0] < MASTER_BOX; };   // answered wrong at least once and not yet re-mastered
export const isDue = id => inMistakes(id) && S.q[id][1] <= today();
export const wasWrong = id => { const r = S.q[id]; return !!r && r[2] > r[3]; };
export const mastered = id => { const r = S.q[id]; return !!r && r[0] >= MASTER_BOX; };
export function toggleBookmark(id) { const i = S.bm.indexOf(id); if (i >= 0) S.bm.splice(i, 1); else S.bm.unshift(id); S.bm = S.bm.slice(0, 2000); save(); return i < 0; }
export const isBookmarked = id => S.bm.includes(id);
export function addExam(cls, score, secs, lang, wrongIds) { S.ex.push([Date.now(), cls, score, secs, lang, wrongIds.slice(0, 30)]); S.ex = S.ex.slice(-200); S.xp += score >= 26 ? 100 : 30; save(); }
export function streak() {
  let d = today(), n = 0;
  if (!S.days[d]) d--;                         // today not played yet – the streak is still alive until midnight
  while (S.days[d]) { n++; d--; }
  return n;
}
export const level = () => { const xp = S.xp; let lv = 1, need = 200, base = 0; while (xp >= base + need) { base += need; lv++; need = Math.round(need * 1.25); } return { lv, into: xp - base, need }; };
