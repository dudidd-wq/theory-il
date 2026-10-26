// Small DOM helpers. Everything is built with createElement/textContent – no innerHTML with data anywhere.
const NS = 'http://www.w3.org/2000/svg';
export function h(tag, props, ...kids) {
  const svg = tag.startsWith('svg:'), el = svg ? document.createElementNS(NS, tag.slice(4)) : document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'text') el.textContent = v;
    else if (k === 'style') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of kids.flat(9)) if (c != null && c !== false) el.append(c instanceof Node ? c : String(c));
  return el;
}
const P = {   // 24×24 line icons (own drawings)
  home: 'M3 11l9-7 9 7M5 10v10h5v-6h4v6h5V10',
  learn: 'M2 9l10-5 10 5-10 5zM6 11v5c3 2.5 9 2.5 12 0v-5M22 9v6',
  book: 'M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2zM4 21V5M8 7h7',
  exam: 'M9 4h6v3H9zM7 5H5v16h14V5h-2M8 12l2 2 4-4M8 17h8',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  more: 'M4 7h16M4 12h16M4 17h16',
  flame: 'M12 3c1 4 5 5 5 10a5 5 0 01-10 0c0-3 2-4 2-7 1.5 1 2.5 2.5 3 4 .5-2 0-5 0-7z',
  star: 'M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z',
  vol: 'M4 9v6h4l5 4V5L8 9zM16 9a4 4 0 010 6M18.5 6.5a8 8 0 010 11',
  stop: 'M7 7h10v10H7z',
  check: 'M5 12l5 5 9-10', x: 'M6 6l12 12M18 6L6 18',
  sign: 'M12 3l10 17H2zM12 10v4M12 17v.5',
  repeat: 'M4 12a8 8 0 0114-5l2 2M20 4v5h-5M20 12a8 8 0 01-14 5l-2-2M4 20v-5h5',
  car: 'M3 16v-4l2-5h14l2 5v4M3 16h18M3 16v2h3v-2M18 16v2h3v-2M7 13h.5M16.5 13h.5',
  gear: 'M12 9a3 3 0 100 6 3 3 0 000-6zM19 12l2-1-1-3-2 .3-1.3-1.3L17 5l-3-1-1 2h-2L10 4 7 5l.3 2L6 8.3 4 8 3 11l2 1v0l-2 1 1 3 2-.3 1.3 1.3L7 19l3 1 1-2h2l1 2 3-1-.3-2 1.3-1.3 2 .3 1-3z',
  user: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0',
  search: 'M11 18a7 7 0 100-14 7 7 0 000 14zM16.5 16.5L21 21',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z',
  info: 'M12 8v.5M12 11v6M12 3a9 9 0 100 18 9 9 0 000-18z',
  down: 'M12 4v11M7 10l5 5 5-5M5 20h14', up: 'M12 20V9M7 14l5-5 5 5M5 4h14',
  key: 'M8 14a4 4 0 110-8 4 4 0 010 8zM11 10h10M18 10v3M21 10v4',
  flag: 'M5 21V4M5 4h11l-2 4 2 4H5',
  clock: 'M12 7v5l3 2M12 3a9 9 0 100 18 9 9 0 000-18z',
  arrowS: 'M15 6l-6 6 6 6', arrowE: 'M9 6l6 6-6 6',
  print: 'M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z',
  award: 'M12 14a5 5 0 100-10 5 5 0 000 10zM8.5 13L7 21l5-3 5 3-1.5-8',
};
export function icon(n, cls = 'ic') {
  return h('svg:svg', { viewBox: '0 0 24 24', class: cls, 'aria-hidden': 'true', focusable: 'false' }, h('svg:path', { d: P[n] || '' }));
}
export function ring(frac, size = 64, stroke = 7, label = '') {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, f = Math.max(0, Math.min(1, frac || 0));
  return h('div', { class: 'ring', role: 'img', 'aria-label': label || `${Math.round(f * 100)}%`, style: { width: size + 'px', height: size + 'px' } },
    h('svg:svg', { viewBox: `0 0 ${size} ${size}`, 'aria-hidden': 'true' },
      h('svg:circle', { cx: size / 2, cy: size / 2, r, class: 'ring-bg', 'stroke-width': stroke, fill: 'none' }),
      h('svg:circle', { cx: size / 2, cy: size / 2, r, class: 'ring-fg', 'stroke-width': stroke, fill: 'none', 'stroke-dasharray': `${c * f} ${c}`, transform: `rotate(-90 ${size / 2} ${size / 2})`, 'stroke-linecap': 'round' })),
    h('span', { class: 'ring-t', 'aria-hidden': 'true', text: `${Math.round(f * 100)}%` }));
}
let toastT;
export function toast(msg, ms = 3200) {
  const el = document.getElementById('toast'); if (!el) return;
  el.textContent = msg; el.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), ms);
}
export const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
export const mmss = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
