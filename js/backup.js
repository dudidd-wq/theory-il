// Local-only persistence (pattern from english-quest/js/backup.js): IndexedDB mirror, storage.persist(), backup file
// (share sheet / download), backup code, optional auto-save file (File System Access API), reminder, undo.
// NOTHING here talks to a server – there is no fetch/XHR/beacon in this file.
import { snapshot, replaceState, state, onPersist, hasProgress, lostLocal, CLASSES, LANGS, blank } from './store.js';
import { t } from './i18n.js';
export const SCHEMA = 2;   // 2 = app 1.1 (lessons, streak freezes); schema-1 backups are migrated on import
const APP = 'theory-il', META = 'theoryIL.meta', MAX_BYTES = 5e6;

// ---------- tiny IndexedDB key/value ----------
let dbp;
const db = () => dbp ||= new Promise((res, rej) => {
  if (!('indexedDB' in self)) return rej(new Error('no idb'));
  const r = indexedDB.open('theoryIL', 1);
  r.onupgradeneeded = () => r.result.createObjectStore('kv');
  setTimeout(() => rej(new Error('idb timeout')), 2500);              // a stuck IndexedDB never blocks the app start
  r.onsuccess = () => { const d = r.result; d.onversionchange = () => { d.close(); dbp = null; }; res(d); }; r.onerror = () => rej(r.error); r.onblocked = () => rej(new Error('blocked'));
}).catch(e => { dbp = null; throw e; });
const tx = (mode, fn) => db().then(d => new Promise((res, rej) => { const x = d.transaction('kv', mode); const q = fn(x.objectStore('kv')); x.oncomplete = () => res(q?.result); x.onerror = () => rej(x.error); x.onabort = () => rej(x.error); }));
export const idbGet = k => tx('readonly', s => s.get(k)).catch(() => undefined);
const idbSet = (k, v) => tx('readwrite', s => s.put(v, k)).then(() => true).catch(() => false);
const idbDel = k => tx('readwrite', s => s.delete(k)).catch(() => {});

// ---------- meta (last backup time etc.), localStorage + IndexedDB ----------
let meta = (() => { try { return JSON.parse(localStorage.getItem(META)) || {}; } catch { return {}; } })();
export const getMeta = () => meta;
function setMeta(patch) { meta = { ...meta, ...patch }; try { localStorage.setItem(META, JSON.stringify(meta)); } catch {} idbSet('meta', meta); }
const markBackup = kind => setMeta({ lastBackup: Date.now(), lastKind: kind });
/** the reminder is reset only after a backup really left the app: copy succeeded, share completed, or the user confirmed the download */
export const confirmBackup = kind => markBackup(kind);

// ---------- sanitising: imports are data only (JSON.parse + strict whitelist copy; nothing is evaluated) ----------
const int = (x, lo, hi, d) => Number.isInteger(x) && x >= lo && x <= hi ? x : d;
const str = (x, n) => typeof x === 'string' ? x.replace(/[<>&"'`\u0000-\u001f\u202a-\u202e\u2066-\u2069]/g, '').trim().slice(0, n) : '';
const isObj = o => o && typeof o === 'object' && !Array.isArray(o);
const keys = o => Object.keys(o).filter(k => !/^(__proto__|constructor|prototype)$/.test(k));
export function cleanState(raw) {
  if (!isObj(raw) || (raw.v !== 1 && raw.v !== 2)) throw new Error('state');
  const s = blank(), D = 1e6;                  // day numbers are < 1e6 (≈ year 4700)
  const p = raw.profile;
  s.profile = isObj(p) ? {
    name: str(p.name, 20), cls: CLASSES.includes(p.cls) ? p.cls : 'B', lang: LANGS.includes(p.lang) ? p.lang : 'he', ui: p.ui === 'en' ? 'en' : 'he',
    theme: ['auto', 'light', 'dark'].includes(p.theme) ? p.theme : 'auto', goal: int(p.goal, 5, 200, 20),
    tts: p.tts === true, rate: typeof p.rate === 'number' && p.rate >= 0.5 && p.rate <= 1.5 ? p.rate : 1, big: p.big === true,
  } : null;
  if (isObj(raw.q)) { let n = 0; for (const k of keys(raw.q)) { if (++n > 5000) break; const v = raw.q[k], id = +k;
    if (!int(id, 1, 99999, 0) || !Array.isArray(v) || v.length !== 5) continue;
    const r = [int(v[0], 0, 5, 0), int(v[1], 0, D, 0), int(v[2], 0, 1e5, 0), int(v[3], 0, 1e5, 0), int(v[4], 0, D, 0)];
    r[3] = Math.min(r[3], r[2]); s.q[id] = r; } }
  if (Array.isArray(raw.bm)) s.bm = [...new Set(raw.bm.slice(0, 2000).filter(x => int(x, 1, 99999, 0)))];
  if (Array.isArray(raw.ex)) s.ex = raw.ex.slice(-200).filter(Array.isArray).map(e => [int(e[0], 0, 1e13, 0), CLASSES.includes(e[1]) ? e[1] : 'B', int(e[2], 0, 30, 0), int(e[3], 0, 86400, 0), LANGS.includes(e[4]) ? e[4] : 'he', Array.isArray(e[5]) ? e[5].slice(0, 30).filter(x => int(x, 1, 99999, 0)) : []]).filter(e => e[0]);
  if (isObj(raw.days)) { let n = 0; for (const k of keys(raw.days)) { if (++n > 4000) break; const v = raw.days[k]; if (int(+k, 1, D, 0) && Array.isArray(v)) { const a = int(v[0], 0, 1e5, 0); s.days[+k] = [a, Math.min(a, int(v[1], 0, 1e5, 0))]; } } }
  if (isObj(raw.badges)) for (const k of keys(raw.badges)) if (/^[a-z0-9]{1,16}$/.test(k)) s.badges[k] = int(raw.badges[k], 0, 1e13, 0);
  if (isObj(raw.les)) for (const k of keys(raw.les).slice(0, 200)) { const v = raw.les[k]; if (/^[a-z0-9]{1,16}$/.test(k) && Array.isArray(v) && v.length === 3) s.les[k] = [int(v[0], 0, 1e13, 0), int(v[1], 0, 100, 0), int(v[2], 0, 1e5, 0)]; }
  s.fz = int(raw.fz, 0, 2, 0);
  if (Array.isArray(raw.frz)) s.frz = raw.frz.slice(-60).filter(x => int(x, 1, D, 0));
  s.xp = int(Math.round(raw.xp || 0), 0, 1e8, 0); s.created = int(raw.created, 0, 1e13, Date.now());
  return s;
}
/** parse + validate + migrate a backup → clean state, or throws Error(localised message) */
export function parseBackup(text) {
  if (typeof text !== 'string' || !text || text.length > MAX_BYTES) throw new Error(t('bk.errBig'));
  let obj; try { obj = JSON.parse(text); } catch { throw new Error(t('bk.errNot')); }
  if (!isObj(obj) || obj.app !== APP || typeof obj.schema !== 'number') throw new Error(t('bk.errNot'));
  if (obj.schema > SCHEMA) throw new Error(t('bk.errNewer'));
  try { return { state: cleanState(obj.state), savedAt: int(obj.savedAt, 0, 1e13, null) }; } catch { throw new Error(t('bk.errBad')); }
}
const wrap = () => ({ app: APP, schema: SCHEMA, savedAt: Date.now(), state: snapshot() });

// ---------- backup code: deflate-raw + base64url + checksum ----------
const b64 = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000)); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const unb64 = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
const sum = s => { let h = 5381; for (let i = 0; i < s.length; i++) h = (h * 33 + s.charCodeAt(i)) >>> 0; return (h % 0x10000).toString(16).padStart(4, '0'); };
async function pipe(u8, stream) { const r = new Blob([u8]).stream().pipeThrough(stream).getReader(); const parts = []; let n = 0; for (;;) { const { done, value } = await r.read(); if (done) break; n += value.length; if (n > MAX_BYTES) throw new Error('big'); parts.push(value); } const o = new Uint8Array(n); let i = 0; for (const p of parts) { o.set(p, i); i += p.length; } return o; }
export async function makeCode() {
  const w = wrap(), cut = Math.max(...Object.keys(w.state.days).map(Number), 0) - 90;   // the code keeps 90 days of daily history; the file keeps all
  for (const d of Object.keys(w.state.days)) if (+d < cut) delete w.state.days[d];
  const raw = new TextEncoder().encode(JSON.stringify(w));
  let body, tag;
  if ('CompressionStream' in self) { body = b64(await pipe(raw, new CompressionStream('deflate-raw'))); tag = 'TH1'; } else { body = b64(raw); tag = 'TH1U'; }
  return `${tag}-${body}-${sum(body)}`;      // not counted as a backup until it is copied (confirmBackup)
}
export async function readCode(code) {
  const m = /^(TH1U?)-([\w-]+)-([0-9a-f]{4})$/.exec(String(code || '').replace(/\s+/g, ''));
  if (!m) throw new Error(t('bk.errCode'));
  if (sum(m[2]) !== m[3]) throw new Error(t('bk.errCodeSum'));
  let u8; try { u8 = unb64(m[2]); } catch { throw new Error(t('bk.errCodeSum')); }
  if (m[1] === 'TH1') { if (!('DecompressionStream' in self)) throw new Error(t('bk.errOld')); try { u8 = await pipe(u8, new DecompressionStream('deflate-raw')); } catch { throw new Error(t('bk.errCodeSum')); } }
  return parseBackup(new TextDecoder().decode(u8));
}

// ---------- backup file: share sheet on phones, download elsewhere ----------
const stamp = () => new Date().toISOString().slice(0, 10);
export async function exportFile() {
  const text = JSON.stringify(wrap(), null, 1), name = `theory-il-backup-${stamp()}.json`;
  const file = typeof File === 'function' ? new File([text], name, { type: 'application/json' }) : null;
  if (file && navigator.canShare?.({ files: [file] }) && matchMedia('(pointer: coarse)').matches) {
    try { await navigator.share({ files: [file], title: t('app.title') }); markBackup('file'); return 'shared'; }
    catch (e) { if (e?.name === 'AbortError') return 'cancelled'; }
  }
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' })); a.download = name;
  document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  return 'downloaded';                      // no success signal from a download: the app asks the user to confirm
}
export async function readFile(file) {
  if (!file) throw new Error(t('bk.errNoFile'));
  if (file.size > MAX_BYTES) throw new Error(t('bk.errBig'));
  return parseBackup(await file.text());
}

// ---------- restore (keeps an undo copy in IndexedDB) ----------
/** merge two progress states (pure). Per question the record with the later last-answer time wins;
 *  bookmarks, exams, freeze days are unions; per day / lesson the larger counts win; xp, freezes = max.
 *  The current profile (class, language, settings) is kept; the backup's is used only when this device has none. */
export function mergeStates(cur, inc) {
  const a = { ...blank(), ...cur }, b = { ...blank(), ...inc }, o = { ...a };
  o.profile = a.profile || b.profile;
  o.q = { ...a.q }; for (const [id, r] of Object.entries(b.q || {})) { const m = o.q[id]; if (!m || (r?.[4] || 0) > (m?.[4] || 0)) o.q[id] = r; }
  o.bm = [...new Set([...(a.bm || []), ...(b.bm || [])])];
  const ek = e => JSON.stringify(e.slice(0, 4)); const seen = new Set((a.ex || []).map(ek));
  o.ex = [...(a.ex || []), ...(b.ex || []).filter(e => !seen.has(ek(e)))].sort((x, y) => x[0] - y[0]).slice(-200);
  o.days = { ...a.days }; for (const [d, v] of Object.entries(b.days || {})) { const m = o.days[d]; o.days[d] = m ? [Math.max(m[0], v[0]), Math.max(m[1], v[1])] : v; }
  o.badges = { ...b.badges, ...a.badges }; for (const [k, ts] of Object.entries(b.badges || {})) if (a.badges?.[k]) o.badges[k] = Math.min(a.badges[k], ts);
  o.les = { ...a.les }; for (const [id, r] of Object.entries(b.les || {})) { const m = o.les[id];
    o.les[id] = m ? [m[0] && r[0] ? Math.min(m[0], r[0]) : (m[0] || r[0]), Math.max(m[1], r[1]), Math.max(m[2], r[2])] : r; }
  o.xp = Math.max(a.xp || 0, b.xp || 0); o.fz = Math.max(a.fz || 0, b.fz || 0);
  o.frz = [...new Set([...(a.frz || []), ...(b.frz || [])])].sort((x, y) => x - y);
  o.created = Math.min(a.created || Date.now(), b.created || Date.now());
  return o;
}
export async function applyBackup(b, merge = false) { await idbSet('preRestore', wrap()); replaceState(merge ? mergeStates(state(), b.state) : b.state); await mirrorNow(); }
export async function undoRestore() { const w = await idbGet('preRestore'); if (!w) return false; const b = parseBackup(JSON.stringify(w)); replaceState(b.state); await idbDel('preRestore'); await mirrorNow(true); return true; }
export const canUndo = async () => !!(await idbGet('preRestore'));

// ---------- IndexedDB mirror + storage.persist + auto-save file ----------
let fileHandle = null, fileState = 'off', autoT;
export const autoFileSupported = () => 'showSaveFilePicker' in self && !matchMedia('(pointer: coarse)').matches;
export const autoFileState = () => ({ state: fileState, name: fileHandle?.name || meta.autoName || '' });
async function mirrorNow(allowEmpty = false) {   // an empty device never overwrites the mirror (that is what recovery is for)
  if (state().profile || allowEmpty) await idbSet('snapshot', wrap());
}
export const afterReset = () => mirrorNow(true);
async function writeAutoFile(ask = false) {
  if (!fileHandle) return false;
  try {
    let perm = await fileHandle.queryPermission?.({ mode: 'readwrite' }) ?? 'granted';
    if (perm !== 'granted' && ask) perm = await fileHandle.requestPermission({ mode: 'readwrite' });
    if (perm !== 'granted') { fileState = 'needs-permission'; return false; }
    const w = await fileHandle.createWritable(); await w.write(JSON.stringify(wrap(), null, 1)); await w.close();
    fileState = 'on'; markBackup('auto'); return true;
  } catch (e) { fileState = e?.name === 'NotFoundError' ? 'missing' : 'needs-permission'; return false; }
}
export async function enableAutoFile() {
  const h = await showSaveFilePicker({ suggestedName: 'theory-il-autosave.json', types: [{ description: 'Theory IL backup', accept: { 'application/json': ['.json'] } }] });
  fileHandle = h; setMeta({ autoName: h.name });
  await idbSet('fileHandle', h);
  return writeAutoFile(true);
}
export const resumeAutoFile = () => writeAutoFile(true);
export async function disableAutoFile() { fileHandle = null; fileState = 'off'; await idbDel('fileHandle'); setMeta({ autoName: '' }); }
export async function storageStatus() {
  const persisted = await navigator.storage?.persisted?.().catch(() => false);
  return { persisted: !!persisted, mirror: !!(await idbGet('snapshot')) };
}
export async function requestPersist() { try { return !!(await navigator.storage?.persist?.()); } catch { return false; } }

/** on startup: recover from the IndexedDB mirror if localStorage lost the data; returns 'restored' | null */
export async function init() {
  let res = null;
  try {
    if (!Object.keys(meta).length) { const m = await idbGet('meta'); if (isObj(m)) { meta = m; try { localStorage.setItem(META, JSON.stringify(meta)); } catch {} } }
    const mirror = await idbGet('snapshot');
    if (mirror && lostLocal()) { const b = parseBackup(JSON.stringify(mirror)); if (b.state.profile) { replaceState(b.state); res = 'restored'; } }
  } catch {}
  try { const h = await idbGet('fileHandle'); if (h && typeof h.createWritable === 'function') { fileHandle = h; fileState = (await h.queryPermission?.({ mode: 'readwrite' })) === 'granted' ? 'on' : 'needs-permission'; } } catch {}
  onPersist(() => { mirrorNow(); if (fileHandle && fileState === 'on') autoT ||= setTimeout(() => { autoT = 0; writeAutoFile(false); }, 4000); });  // throttled, not debounced
  if (!meta.firstSeen) setMeta({ firstSeen: Date.now() });
  if (state().profile) { mirrorNow(); requestPersist(); }
  return res;
}
/** days since the last backup, or null; the reminder shows after 4 days with progress (snooze 2 days) */
export function backupDue() {
  if (!hasProgress()) return null;
  if (meta.snooze && Date.now() < meta.snooze) return null;
  const since = meta.lastBackup || meta.firstSeen || Date.now(), days = Math.floor((Date.now() - since) / 864e5);
  return days >= 4 ? { days, never: !meta.lastBackup } : null;
}
export const snoozeReminder = () => setMeta({ snooze: Date.now() + 2 * 864e5 });
