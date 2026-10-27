// Small interactive diagrams for the lessons. Own drawings, plain SVG + CSS, no libraries, no network.
// Every number shown comes from the rule cited next to it (see data/lessons.json / sources.json).
// The diagram itself is aria-hidden; the caption under it is the text alternative and is updated on every step.
// Movement uses CSS transitions only, which the global prefers-reduced-motion rule turns off (steps then jump).
import { h, icon } from './ui.js';
import * as st from './store.js';
const S = (tag, a, ...k) => h('svg:' + tag, a, ...k);
const svg = (vb, ...k) => S('svg', { viewBox: vb, class: 'vz-svg', 'aria-hidden': 'true', focusable: 'false' }, ...k);
const chip = (label, on, onclick) => h('button', { type: 'button', class: 'chip', 'aria-pressed': String(on), onclick, text: label });
const vbtn = (label, onclick, cls = 'btn small') => h('button', { type: 'button', class: cls, onclick, text: label });
function fig(title, src, draw) {
  const alt = h('p', { class: 'vz-alt', 'aria-live': 'polite' }), stage = h('div', { class: 'vz-stage' }), ctl = h('div', { class: 'vz-ctl' });
  const f = h('figure', { class: 'viz', 'aria-label': title }, h('h3', { class: 'h3', text: title }), stage, ctl,
    h('figcaption', {}, h('span', { class: 'small muted', text: 'תיאור מילולי: ' }), alt, h('span', { class: 'small muted', text: src })));
  draw({ stage, ctl, say: s => { alt.textContent = s; } });
  return f;
}
// a car seen from above, centred on (0,0), pointing up; moved with CSS transform so it can glide
function car(cls = '', w = 14, l = 26) {
  return S('g', { class: 'vz-car ' + cls }, S('rect', { x: -w / 2, y: -l / 2, width: w, height: l, rx: 4 }), S('rect', { class: 'vz-glass', x: -w / 2 + 2, y: -l / 2 + 5, width: w - 4, height: 5, rx: 1.5 }));
}
const place = (g, [x, y, r = 0]) => { g.style.transform = `translate(${x}px,${y}px) rotate(${r}deg)`; };
const road = (x, y, w, hh) => S('rect', { class: 'vz-road', x, y, width: w, height: hh });
const line = (x1, y1, x2, y2, cls = 'vz-mark') => S('line', { x1, y1, x2, y2, class: cls });
const txt = (x, y, s, cls = 'vz-t') => S('text', { x, y, class: cls, 'text-anchor': 'middle' }, s);

// ---------- intersection priority (TR 64(א)(1), 64(א)(2)) ----------
function priority() {
  return fig('מי עובר ראשון בצומת בלי תמרור?', 'לפי תקנה 64(א)(1) ו־64(א)(2)', ({ stage, ctl, say }) => {
    const me = car('me'), other = car('other');
    stage.append(svg('0 0 320 200', road(0, 70, 320, 60), road(130, 0, 60, 200), line(0, 100, 130, 100), line(190, 100, 320, 100), line(160, 0, 160, 70), line(160, 130, 160, 200), other, me));
    const SC = {
      right: { label: 'רכב מגיע מימין', intro: 'אתה נוסע צפונה. רכב אחר מגיע מימינך. אין תמרור ואין רמזור.',
        steps: [[[175, 150, 0], [215, 85, -90], 'שני הרכבים ממתינים בכניסה לצומת.'], [[175, 150, 0], [20, 85, -90], 'הרכב שבא מימינך עובר ראשון.'], [[175, 12, 0], [20, 85, -90], 'עכשיו הצומת פנוי ואתה ממשיך.']] },
      left: { label: 'אתה פונה שמאלה', intro: 'אתה רוצה לפנות שמאלה. רכב מגיע ממול וממשיך ישר.',
        steps: [[[175, 150, 0], [145, 45, 180], 'אתה בכניסה לצומת עם איתות שמאלה; הרכב ממול מתקרב.'], [[175, 150, 0], [145, 190, 180], 'הרכב שממול עובר ראשון – מי שפונה שמאלה ממתין לו.'], [[165, 95, -45], [145, 190, 180], 'הדרך פנויה ואתה מתחיל לפנות.'], [[20, 85, -90], [145, 190, 180], 'סיימת את הפנייה שמאלה.']] },
    };
    let sc = 'right', i = 0;
    const show = () => { const s = SC[sc].steps[i]; place(me, s[0]); place(other, s[1]); say(`${SC[sc].intro} צעד ${i + 1} מתוך ${SC[sc].steps.length}: ${s[2]}`); next.disabled = i >= SC[sc].steps.length - 1; if (next.disabled && document.activeElement === next) again.focus(); };
    const chips = Object.keys(SC).map(k => chip(SC[k].label, k === sc, () => { sc = k; i = 0; chips.forEach((c, j) => c.setAttribute('aria-pressed', String(Object.keys(SC)[j] === k))); show(); }));
    const next = vbtn('הצעד הבא', () => { i++; show(); }, 'btn small primary');
    const again = vbtn('מההתחלה', () => { i = 0; show(); });
    ctl.append(h('div', { class: 'row tight' }, chips), h('div', { class: 'row tight' }, next, again));
    show();
  });
}

// ---------- sign families (LTP parts, Q:606, Q:477) ----------
// ranges as in the part headings of the 2022 consolidated table; parts 1 and 6 have entries past the heading range (153, 638–640)
export const PARTS = [[101, 153, 'חלק 1 – תמרורי אזהרה והתראה'], [201, 231, 'חלק 2 – תמרורי הוריה'], [301, 310, 'חלק 3 – תמרורי זכות קדימה'], [401, 441, 'חלק 4 – תמרורי איסורים והגבלות'],
  [501, 516, 'חלק 5 – תמרורי תחבורה ציבורית'], [601, 640, 'חלק 6 – תמרורי מודיעין והדרכה'], [701, 729, 'חלק 7 – רמזורים ובקרת נתיבים'], [801, 821, 'חלק 8 – סימון על פני הדרך'],
  [901, 935, 'חלק 9 – תמרורים באתר עבודה']];
// v1.22.1: no typing of sign numbers anywhere – choose a family (tile with a real picture from that part), then tap a sign picture
const FAMIMG = { 3: 'tq_pic_3310.webp' };   // part 3: the bank picture of 302 + 301 (question 310)
const FAMREP = ['135', '205', '302', '402', '501', '602', '701', '803', '901'];   // one picture per part, all from the bank pictures in data/signs.json
// shape/colour hints only where the official bank states them (question numbers shown with the hint)
const FAMWHY = { 1: ['צורתם של תמרורי אזהרה היא בדרך כלל משולש שקודקודו כלפי מעלה.', 606], 2: ['תמרור שצורתו עיגול הוא בדרך כלל תמרור הוריה או איסור.', 477],
  3: ['ל"עצור" ול"תן זכות קדימה" צורה מיוחדת – כדי להבליטם, להבחין בהם ולפרש אותם נכון גם בראות גרועה.', 310], 4: ['תמרור שצורתו עיגול הוא בדרך כלל תמרור הוריה או איסור.', 477],
  8: ['סימון על הכביש שנעשה לפי החוק נחשב תמיד לתמרור.', 1772], 9: ['תמרורים או סימון בצבע כתום מסמנים אתר של עבודה בדרך.', 691] };
let SGP = null;
const loadSG = () => (SGP ||= fetch('data/signs.json').then(r => { if (!r.ok) throw 0; return r.json(); }).catch(e => { SGP = null; throw e; }));
const pn = n => parseInt(n, 10);
const partOf = n => PARTS.findIndex(([a, b]) => pn(n) >= a && pn(n) <= b);
const famName = i => PARTS[i][2].split('– ')[1];
const meanOf = (D, n) => D.e[n].split(' · ');
const famWhy = i => FAMWHY[i + 1] ? h('p', { class: 'small sgwhy' }, h('span', { text: FAMWHY[i + 1][0] + ' ' }), h('span', { class: 'muted', text: `(שאלה ${FAMWHY[i + 1][1]} במאגר)` })) : null;
const byPic = D => (x, y) => (!!D.img[y] - !!D.img[x]) || pn(x) - pn(y) || (x < y ? -1 : 1);
// family tiles + sign grid + an info panel that opens right after the tapped sign
function signBrowser(D, pfx, say) {
  const info = h('div', { class: 'sginfo', id: pfx + '-info', role: 'region', 'aria-label': 'פירוש התמרור' });
  const grid = h('div', { class: 'sgwrap', id: pfx + '-grid' }), infoLi = h('li', { class: 'sginfo-li' }, info);
  const show = (n, btn) => {
    const [m, ...more] = meanOf(D, n), i = partOf(n);
    info.replaceChildren(D.img[n] ? h('img', { src: 'img/q/' + D.img[n], alt: '', width: 192, height: 108 }) : null,
      h('p', { class: 'sgmean' }, h('b', { text: m }), more.length ? h('span', { class: 'small', text: ' · ' + more.join(' · ') }) : null),
      i >= 0 ? h('p', { class: 'small', text: PARTS[i][2] }) : null, i >= 0 ? famWhy(i) : null,
      h('p', { class: 'row tight' }, h('a', { class: 'chip', href: D.src.url, target: '_blank', rel: 'noopener', text: 'המקור: לוח התמרורים (gov.il)' }), h('small', { class: 'muted sgno', text: 'תמרור ' + n })));
    grid.querySelectorAll('.sgt[aria-expanded]').forEach(b => b.setAttribute('aria-expanded', String(b === btn)));
    btn?.closest('li')?.after(infoLi);
    say(`${m}${i >= 0 ? ' – ' + PARTS[i][2] : ''}.${i >= 0 && FAMWHY[i + 1] ? ' ' + FAMWHY[i + 1][0] : ''}`);
  };
  const list = (nums, cap) => {
    const tiles = nums.map(n => h('li', {}, h('button', { type: 'button', class: 'sgt', 'data-n': n, 'aria-expanded': 'false', 'aria-controls': pfx + '-info', onclick: e => show(n, e.currentTarget) },
      D.img[n] ? h('img', { src: 'img/q/' + D.img[n], alt: '', width: 96, height: 54, loading: 'lazy' }) : null,
      h('span', { class: D.img[n] ? 'sr-only' : 'sgtxt', text: meanOf(D, n)[0] }))));
    info.replaceChildren(); infoLi.remove();
    grid.replaceChildren(cap ? h('p', { class: 'small', text: cap }) : null, nums.length ? h('ul', { class: 'sgrid' }, tiles) : null);
  };
  const btns = PARTS.map((p, i) => h('button', { type: 'button', class: 'famt', 'data-part': i + 1, 'aria-pressed': 'false', onclick: () => fam(i) },
    (FAMIMG[i + 1] || D.img[FAMREP[i]]) ? h('img', { src: 'img/q/' + (FAMIMG[i + 1] || D.img[FAMREP[i]]), alt: '', width: 96, height: 54, loading: 'lazy' }) : null, h('span', { text: famName(i) })));
  function fam(i) {
    btns.forEach((b, j) => b.setAttribute('aria-pressed', String(j === i)));
    const ns = Object.keys(D.e).filter(n => partOf(n) === i).sort(byPic(D));
    list(ns, `${famName(i)}: ${ns.length} תמרורים. הקישו על תמרור כדי לראות מה פירושו.`);
    const w = famWhy(i); if (w) grid.prepend(w);
    say(`נבחרה המשפחה ${famName(i)} (${ns.length} תמרורים).${FAMWHY[i + 1] ? ' ' + FAMWHY[i + 1][0] : ''} הקישו על תמונה של תמרור כדי לראות את פירושו.`);
  }
  const unpress = () => btns.forEach(b => b.setAttribute('aria-pressed', 'false'));
  const tiles = h('div', { class: 'famgrid', role: 'group', 'aria-label': 'בחרו משפחת תמרורים' }, btns);
  return { tiles, grid, fam, list, unpress };
}
function signs() {
  return fig('משפחות התמרורים', 'לפי לוח התמרורים (gov.il); הצורות לפי שאלות 606, 477, 310, 1772 ו־691 במאגר', ({ stage, ctl, say }) => {
    const tri = S('path', { class: 'vz-shape', d: 'M60 20 L100 90 L20 90 Z' }), circ = S('circle', { class: 'vz-shape', cx: 200, cy: 58, r: 36 });
    stage.append(svg('0 0 280 120', tri, circ, txt(60, 112, 'אזהרה – בדרך כלל'), txt(200, 112, 'הוריה או איסור – בדרך כלל')));
    const intro = 'משולש שקודקודו למעלה הוא בדרך כלל תמרור אזהרה. עיגול הוא בדרך כלל תמרור הוריה או איסור. בחרו משפחה, ואז הקישו על תמונה של תמרור – אין צורך לדעת מספרים.';
    say('טוען את לוח התמרורים…');
    loadSG().then(D => { const B = signBrowser(D, 'sf', say); ctl.append(h('p', { class: 'lbl', text: 'בחרו משפחה:' }), B.tiles, B.grid); say(intro); },
      () => say(intro + ' (לא הצלחנו לטעון את התמונות. נסו שוב כשיש חיבור.)'));
  });
}

// ---------- speed table explorer (TR 54(א), 54(ב)) ----------
const ROADS = [['city', 'דרך עירונית'], ['rural', 'דרך שאינה עירונית'], ['div', 'שאינה עירונית, עם שטח הפרדה בנוי'], ['fwy', 'דרך מהירה']];
const VEH = [['car', 'רכב מנועי רגיל', [50, 80, 90, 110]], ['bus', 'אוטובוס (לא זעיר)', [50, 80, 90, 100]], ['heavy', 'רכב מסחרי מעל 12,000 ק"ג', [50, 80, 80, 80]], ['slow', 'רכב איטי וטרקטור', [40, 40, 40, 0]]];
function speed() {
  return fig('כמה מותר כאן?', 'לפי תקנה 54(א) ו־54(ב) – כשאין תמרור מהירות אחר', ({ stage, ctl, say }) => {
    const num = txt(70, 79, '', 'vz-num huge onsign'), cap = txt(195, 72, '', 'vz-t mid');
    stage.append(svg('0 0 280 130', S('circle', { class: 'vz-ring', cx: 70, cy: 66, r: 46 }), num, cap));
    const sel = (id, opts) => h('select', { id, onchange: run }, opts.map(([v, l]) => h('option', { value: v, text: l })));
    const sv = sel('vz-veh', VEH), sr = sel('vz-road', ROADS);
    const shared = h('input', { type: 'checkbox', id: 'vz-shared', onchange: run });
    function run() {
      const v = VEH.find(x => x[0] === sv.value), ri = ROADS.findIndex(x => x[0] === sr.value), n = shared.checked ? 30 : v[2][ri];
      num.textContent = n ? String(n) : '✕'; cap.textContent = n ? 'קמ"ש לכל היותר' : 'אסור לנסוע כאן';
      say(shared.checked ? 'ברחוב משולב או באזור מיתון תנועה: עד 30 קמ"ש (תקנה 54(ב)).' : n ? `${v[1]} ב${ROADS[ri][1]}: עד ${n} קמ"ש (תקנה 54(א)).` : `${v[1]}: אסור לנסוע בדרך מהירה (תקנה 54(א)).`);
    }
    ctl.append(h('div', { class: 'field' }, h('label', { for: 'vz-veh', text: 'סוג הרכב' }), sv), h('div', { class: 'field' }, h('label', { for: 'vz-road', text: 'סוג הדרך' }), sr),
      h('label', { class: 'check' }, shared, h('span', { text: 'רחוב משולב / אזור מיתון תנועה' })));
    run();
  });
}

// ---------- 1-second gap slider (TR 49(ב)) ----------
function gap() {
  return fig('שנייה אחת – כמה מטרים זה?', 'לפי תקנה 49(ב); מרחק תגובה ובלימה – שאלות 811, 809 במאגר', ({ stage, ctl, say }) => {
    const back = car('me'), front = car('other'), span = S('line', { class: 'vz-span' }), lab = txt(0, 30, '');
    stage.append(svg('0 0 320 110', road(0, 45, 320, 40), S('line', { class: 'vz-mark moving', x1: 0, y1: 65, x2: 320, y2: 65 }), span, lab, back, front));
    const r = h('input', { id: 'vz-v', type: 'range', min: 20, max: 120, step: 10, value: 90 });
    const out = h('output', { for: 'vz-v', class: 'vz-out' });
    const run = () => { const v = +r.value, m = v / 3.6, px = 30 + m * 7, x0 = 40;
      place(back, [x0, 65, 90]); place(front, [x0 + px, 65, 90]);
      span.setAttribute('x1', x0 + 14); span.setAttribute('x2', x0 + px - 14); span.setAttribute('y1', 38); span.setAttribute('y2', 38);
      lab.setAttribute('x', x0 + px / 2); lab.textContent = `${Math.round(m)} מ'`; out.textContent = `${v} קמ"ש`;
      say(`במהירות ${v} קמ"ש הרכב עובר כ־${Math.round(m)} מטר בשנייה (${v} חלקי 3.6). זה הרווח המינימלי לפי החוק – שנייה אחת. מרחק העצירה (תגובה + בלימה) גדול יותר וגדל עם המהירות.`); };
    r.addEventListener('input', run);
    ctl.append(h('label', { for: 'vz-v', class: 'lbl', text: 'מהירות:' }), h('div', { class: 'row tight' }, r, out)); run();
  });
}

// ---------- overtaking and the centre line (TR 47(ד), 47(ה)(5)) ----------
function overtake() {
  return fig('מותר לעקוף כאן?', 'לפי תקנה 47(ד) ו־47(ה)(5)', ({ stage, ctl, say }) => {
    const marks = S('g', {}), path = S('path', { class: 'vz-path', d: 'M50 150 C110 150 110 85 170 85 S230 150 290 150' }), me = car('me'), slow = car('other'), mark = txt(160, 46, '', 'vz-num huge');
    place(me, [50, 150, 90]); place(slow, [170, 150, 90]);
    stage.append(svg('0 0 320 180', road(0, 60, 320, 115), marks, path, slow, me, mark));
    const M = {
      dash: ['קו קטעים', 'קו קטעים באמצע: מותר לעקוף משמאל אם הדרך פנויה מספיק כדי לסיים בבטחה.', true],
      solid: ['קו רצוף', 'קו הפרדה רצוף: אסור לחצות אותו – אין עקיפה.', false],
      mineDash: ['קטעים בצד שלך', 'קו רצוף ולידו, בצד שלך (מימינו), קו קטעים: מותר לחצות, אם הדרך פנויה.', true],
      theirDash: ['רצוף בצד שלך', 'קו רצוף בצד שלך וקו הקטעים בצד הנגדי: אסור לך לחצות.', false],
    };
    const draw = k => { marks.replaceChildren(...(k === 'dash' ? [line(0, 117, 320, 117, 'vz-mark dash')] : k === 'solid' ? [line(0, 117, 320, 117, 'vz-mark')] :
      k === 'mineDash' ? [line(0, 114, 320, 114, 'vz-mark'), line(0, 121, 320, 121, 'vz-mark dash')] : [line(0, 114, 320, 114, 'vz-mark dash'), line(0, 121, 320, 121, 'vz-mark')]));
      const ok = M[k][2]; path.classList.toggle('bad', !ok); mark.textContent = ok ? '✓' : '✕'; mark.classList.toggle('bad', !ok);
      say(`אתה נוסע ימינה בנתיב התחתון, מאחורי רכב איטי. ${M[k][1]}`); };
    const keys = Object.keys(M), chips = keys.map(k => chip(M[k][0], k === 'dash', () => { chips.forEach((c, j) => c.setAttribute('aria-pressed', String(keys[j] === k))); draw(k); }));
    ctl.append(h('div', { class: 'row tight' }, chips)); draw('dash');
  });
}

// ---------- the hidden pedestrian (TR 67(א2), 67(א)) ----------
function crosswalk() {
  return fig('הרכב בנתיב השני עצר לפני המעבר', 'לפי תקנה 67(א2) ו־67(א)', ({ stage, ctl, say }) => {
    const zebra = S('g', {}, ...Array.from({ length: 6 }, (_, i) => S('rect', { class: 'vz-zebra', x: 232, y: 44 + i * 18, width: 22, height: 10 })));
    const other = car('other'), me = car('me'), ped = S('g', { class: 'vz-ped' }, S('circle', { r: 6 }));
    stage.append(svg('0 0 320 160', road(0, 40, 320, 110), line(0, 95, 320, 95, 'vz-mark dash'), zebra, ped, other, me));
    const ST = [[[60, 122, 90], [90, 67, 90], [243, 30], 'אתה בנתיב הימני. הרכב בנתיב השמאלי מאט לקראת מעבר החצייה.'],
      [[130, 122, 90], [205, 67, 90], [243, 30], 'הרכב בנתיב השמאלי עצר לפני המעבר. ייתכן שהוא מסתיר הולך רגל – לכן גם אתה מאט ועוצר.'],
      [[205, 122, 90], [205, 67, 90], [243, 88], 'אתה עומד לפני המעבר. הולך רגל יוצא מאחורי הרכב שעצר וחוצה.'],
      [[205, 122, 90], [205, 67, 90], [243, 150], 'הולך הרגל סיים לחצות בבטחה. רק עכשיו ממשיכים.']];
    let i = 0;
    const show = () => { const s = ST[i]; place(me, s[0]); place(other, s[1]); ped.style.transform = `translate(${s[2][0]}px,${s[2][1]}px)`; say(`צעד ${i + 1} מתוך ${ST.length}: ${s[3]}`); next.disabled = i >= ST.length - 1; if (next.disabled && document.activeElement === next) again.focus(); };
    const next = vbtn('הצעד הבא', () => { i++; show(); }, 'btn small primary'), again = vbtn('מההתחלה', () => { i = 0; show(); });
    ctl.append(h('div', { class: 'row tight' }, next, again)); show();
  });
}

// ---------- no-stopping distances (TR 72(א)) ----------
const PK = [['junction', 'צומת', 12, 12, 'בתוך הצומת ו־12 מטר ממנו', '72(א)(3)'], ['zebra', 'מעבר חצייה', 12, 0, 'על המעבר ו־12 מטר לפניו', '72(א)(6)'],
  ['rail', 'מסילת ברזל', 20, 20, 'מ־20 מטר לפני המפגש ועד 20 מטר אחריו', '72(א)(8)'], ['bus', 'תחנת אוטובוס בלי סימון', 20, 20, '20 מטר לפני התמרור ו־20 מטר אחריו', '72(א)(12)'],
  ['bridge', 'גשר או מנהרה', 50, 50, 'עליהם ו־50 מטר לפניהם ואחריהם', '72(א)(11)']];
function parking() {
  return fig('איפה אסור לעצור ולהעמיד רכב?', 'לפי תקנה 72(א) – הסעיף מופיע ליד כל מקום', ({ stage, ctl, say }) => {
    const zone = S('rect', { class: 'vz-zone', y: 40, height: 40 }), obj = S('rect', { class: 'vz-obj', x: 154, y: 30, width: 12, height: 60 }), l1 = txt(0, 104, ''), l2 = txt(0, 104, '');
    stage.append(svg('0 0 320 120', road(0, 40, 320, 40), line(0, 82, 320, 82, 'vz-kerb'), zone, obj, l1, l2, S('path', { class: 'vz-arrow', d: 'M20 60 h30 m-6 -5 l6 5 l-6 5' })));
    const run = k => { const p = PK.find(x => x[0] === k), sc = 2.4, b = p[2] * sc, a = p[3] * sc;
      zone.setAttribute('x', 154 - b); zone.setAttribute('width', b + 12 + a);
      l1.setAttribute('x', 154 - b / 2); l1.textContent = p[2] + " מ'"; l2.setAttribute('x', 166 + a / 2); l2.textContent = p[3] ? p[3] + " מ'" : '';
      say(`${p[1]}: אסור לעצור ולהעמיד רכב ${p[4]} (תקנה ${p[5]}). הכיוון: התנועה נוסעת משמאל לימין באיור; האורך באיור לפי קנה מידה.`); };
    const chips = PK.map(p => chip(p[1], p[0] === 'junction', () => { chips.forEach((c, j) => c.setAttribute('aria-pressed', String(PK[j][0] === p[0]))); run(p[0]); }));
    ctl.append(h('div', { class: 'row tight' }, chips)); run('junction');
  });
}

// ---------- railway crossing distances (TR 56(א), 117(ב), 72(א)(8), LT 130–132) ----------
function rail() {
  return fig('מתקרבים למפגש מסילת ברזל', 'לפי תקנות 56(א), 117(ב), 72(א)(8) ותמרורים 130, 131 ו־132', ({ stage, ctl, say }) => {
    const g = S('g', {});
    stage.append(svg('0 0 320 120', road(0, 40, 320, 40), S('rect', { class: 'vz-rail', x: 286, y: 30, width: 4, height: 60 }), S('rect', { class: 'vz-rail', x: 302, y: 30, width: 4, height: 60 }), g));
    const V = {
      near: ['קרוב למסילה', () => { const sc = 9, at = m => 286 - m * sc; return [line(at(4), 36, at(4), 84, 'vz-stop'), txt(at(4), 100, "4 מ' – עצירה"), S('rect', { class: 'vz-zone', x: at(20) < 0 ? 0 : at(20), y: 40, width: 286 - Math.max(0, at(20)), height: 6 }), txt(196, 116, "20 מ' – אסור לעצור ולחנות", 'vz-t sm'),
        S('circle', { class: 'vz-pedc', cx: at(6), cy: 30, r: 5 }), txt(at(6), 20, "6 מ' – הולך רגל", 'vz-t sm')]; },
        'רכב שצריך לעצור עוצר לפני קו העצירה או המחסום, ואם אין – לפחות 4 מטר לפני הפס הקרוב (תקנה 56(א)). הולך רגל לא מתקרב יותר מ־6 מטר לפס הקרוב כשאין מחסום (תקנה 117(ב)). אסור לעצור ולחנות 20 מטר לפני המפגש ו־20 אחריו (תקנה 72(א)(8)). המרחקים באיור לפי קנה מידה.'],
      far: ['תמרורי האזהרה', () => { const at = m => 286 - m * 0.9; return [130, 131, 132].map((n, i) => [S('rect', { class: 'vz-obj', x: at(300 - i * 100) - 3, y: 16, width: 6, height: 20 }), txt(at(300 - i * 100), 100, `${n}: ~${300 - i * 100} מ'`, 'vz-t sm')]).flat(); },
        'שלושה תמרורי אזהרה לפני מפגש מסילת ברזל: 130 בכ־300 מטר, 131 בכ־200 מטר ו־132 בכ־100 מטר לפני המפגש. מהאזהרה ועד אחרי המפגש – אסור לעקוף.'],
    };
    const run = k => { g.replaceChildren(...V[k][1]()); say(V[k][2]); };
    const keys = Object.keys(V), chips = keys.map(k => chip(V[k][0], k === 'near', () => { chips.forEach((c, j) => c.setAttribute('aria-pressed', String(keys[j] === k))); run(k); }));
    ctl.append(h('div', { class: 'row tight' }, chips)); run('near');
  });
}

// ---------- blind spots (Q:800, Q:733, TR 40(א)) – zones illustrative, no measurements ----------
const BL = {
  car: ['רכב פרטי', 14, 26, [[-60, 0, 50, 36], [10, 0, 50, 36]]],
  truck: ['משאית או אוטובוס', 22, 70, [[-60, -10, 46, 60], [14, -40, 50, 110], [-11, -72, 22, 36], [-11, 35, 22, 40]]],
  moto: ['אופנוע', 7, 18, [[-55, 2, 48, 28], [7, 2, 48, 28]]],
};
function blind(ctx = {}) {
  return fig('השטח המת: מי לא נראה במראה?', 'לפי שאלות 800 ו־733 במאגר ותקנה 40(א); גודל השטחים באיור להמחשה בלבד', ({ stage, ctl, say }) => {
    const zones = S('g', {}), me = S('g', { class: 'vz-car me' }), rider = S('g', { class: 'vz-car other' }, S('rect', { x: -4, y: -9, width: 8, height: 18, rx: 3 }));
    stage.append(svg('0 0 200 220', road(30, 0, 140, 220), line(76, 0, 76, 220, 'vz-mark dash'), line(124, 0, 124, 220, 'vz-mark dash'), S('g', { transform: 'translate(100 110)' }, zones, me), rider));
    const r = h('input', { id: 'vz-pos', type: 'range', min: 0, max: 100, value: 70, 'aria-label': 'מיקום הרוכב בנתיב הימני' });
    let k = ctx.lesson === 'moto' || (ctx.lesson === 'blind' && ctx.cls === 'A') ? 'moto' : ['heavy', 'bus'].includes(ctx.lesson) || (ctx.lesson === 'blind' && ['C1', 'C', 'D'].includes(ctx.cls)) ? 'truck' : 'car';
    const run = () => { const [name, w, l, zs] = BL[k];
      me.replaceChildren(S('rect', { x: -w / 2, y: -l / 2, width: w, height: l, rx: 4 }));
      zones.replaceChildren(...zs.map(([x, y, ww, hh]) => S('rect', { class: 'vz-zone', x, y, width: ww, height: hh })));
      const y = 215 - +r.value * 2.1; rider.style.transform = `translate(148px,${y}px)`;
      const ry = y - 110, inZ = zs.some(([x, zy, ww, hh]) => 48 >= x && 48 <= x + ww && ry >= zy && ry <= zy + hh);
      rider.classList.toggle('hid', inZ);
      r.setAttribute('aria-valuetext', `הרוכב ${ry > l / 2 ? 'מאחוריך' : ry < -l / 2 ? 'לפניך' : 'לצידך'}${inZ ? ', בשטח המת' : ', נראה'}`);
      say(`אתה ב${name} בנתיב האמצעי. רוכב בנתיב הימני ${ry > l / 2 ? 'מאחוריך' : ry < -l / 2 ? 'לפניך' : 'לצידך'}. ${inZ ? 'הוא בשטח המת – לא תראה אותו במראה. לפני סטייה או פנייה מסובבים את הראש ובודקים.' : 'כרגע אפשר לראות אותו – במראה או ישירות.'}`); };
    const keys = Object.keys(BL), chips = keys.map(x => chip(BL[x][0], x === k, () => { k = x; chips.forEach((c, j) => c.setAttribute('aria-pressed', String(keys[j] === x))); run(); }));
    r.addEventListener('input', run);
    ctl.append(h('div', { class: 'row tight' }, chips), h('label', { for: 'vz-pos', class: 'lbl', text: 'הזיזו את הרוכב:' }), r); run();
  });
}

// ---------- motorcycle: the oily lane centre (Q:1603, Q:1605) ----------
function moto() {
  return fig('איפה הכביש חלקלק?', 'לפי שאלות 1603 ו־1605 במאגר', ({ stage, ctl, say }) => {
    const patch = S('ellipse', { class: 'vz-oil', cx: 160, cy: 60, rx: 22, ry: 12 }), path = S('path', { class: 'vz-path', d: 'M160 200 L160 0' });
    stage.append(svg('0 0 320 200', road(90, 0, 140, 200), line(90, 0, 90, 200, 'vz-kerb'), line(230, 0, 230, 200, 'vz-mark'), S('rect', { class: 'vz-center', x: 145, y: 0, width: 30, height: 200 }), patch, path,
      S('g', { class: 'vz-car me', transform: 'translate(160 170)' }, S('rect', { x: -4, y: -10, width: 8, height: 20, rx: 3 }))));
    const on = h('input', { type: 'checkbox', id: 'vz-oil', checked: true });
    const run = () => { patch.style.display = path.style.display = on.checked ? '' : 'none';
      say('אמצע הנתיב (הפס הכהה באיור) הוא האזור המלוכלך והשמנוני ביותר בכביש, כי שם מטפטף שמן מכלי רכב. ' + (on.checked ? 'יש כתם שמנוני לפניך: עוברים אותו בקו ישר, בלי להאיץ ובלי לבלום.' : '')); };
    on.addEventListener('change', run);
    ctl.append(h('label', { class: 'check' }, on, h('span', { text: 'להראות כתם שמנוני לפניי' }))); run();
  });
}

// ---------- sign dictionary: every entry of the 2022 table (data/signs.json, built by tools/signs_build.py) ----------
// signs met in my own practice: questions I answered wrong + flashcards I rated "not yet" (local data only)
function mineSigns(D) {
  const out = new Set(), q = st.state().q || {}, fc = st.state().fc || {};
  for (const [id, r] of Object.entries(q)) if (r[2] > r[3]) (D.q[id] || []).forEach(n => D.e[n] && out.add(n));
  for (const [n, r] of Object.entries(fc)) if (r[2] > r[3] && r[0] < st.MASTER_BOX && D.e[n]) out.add(n);
  return [...out].sort(byPic(D));
}
function signdict() {
  return fig('מילון התמרורים', 'לפי לוח התמרורים (gov.il, נוסח משולב 2022); התמונות מתוך מאגר השאלות', ({ stage, ctl, say }) => {
    const inp = h('input', { id: 'vz-sd', type: 'search', placeholder: 'חפשו לפי מילה, למשל חנייה', autocomplete: 'off', enterkeyhint: 'search' });
    stage.append(h('label', { for: 'vz-sd', class: 'lbl', text: 'חיפוש לפי מילה (לא חובה):' }), inp);
    say('טוען את לוח התמרורים…');
    loadSG().then(D => {
      const B = signBrowser(D, 'sd', say), mine = mineSigns(D), all = Object.entries(D.e);
      const mineBtn = mine.length ? h('button', { type: 'button', class: 'btn small', id: 'sd-mine', onclick: () => { B.unpress(); B.list(mine, `תמרורים שנתקלתי בהם בתרגול: ${mine.length} (מתשובות שטעיתי בהן ומכרטיסיות שסימנתי "עוד לא").`); say(`${mine.length} תמרורים מהתרגול שלך. הקישו על תמונה כדי לראות את פירושו.`); } },
        icon('flag'), h('span', { text: `תמרורים שנתקלתי בהם בתרגול (${mine.length})` }))
        : h('p', { class: 'small muted', id: 'sd-mine-empty', text: 'כאן יופיעו תמרורים מתשובות שטעית בהן ומכרטיסיות שסימנת "עוד לא".' });
      const browse = h('div', { class: 'sdbrowse' }, h('p', { class: 'lbl', text: 'או בחרו משפחה:' }), B.tiles, h('div', { class: 'row tight' }, mineBtn));
      ctl.append(browse, B.grid);
      const idle = `יש בלוח ${all.length} תמרורים. בחרו משפחה ואז הקישו על תמונה, או חפשו לפי מילה.`;
      const run = () => {
        const q = inp.value.trim();
        if (!q) { browse.hidden = false; B.list([], ''); B.unpress(); return say(idle); }
        browse.hidden = true;
        const hits = (/^\d+$/.test(q) ? all.filter(([n]) => n.startsWith(q)) : all.filter(([, t]) => t.includes(q))).map(([n]) => n).sort(byPic(D)).slice(0, 24);
        B.list(hits, hits.length ? '' : 'לא נמצא תמרור מתאים. נסו מילה אחרת, או מחקו את החיפוש כדי לבחור משפחה.');
        say(hits.length ? `נמצאו ${hits.length} תמרורים. הקישו על תמרור כדי לראות את פירושו.` : 'לא נמצא תמרור מתאים.');
      };
      inp.addEventListener('input', run); run();
    }, () => say('לא הצלחנו לטעון את המילון. נסו שוב כשיש חיבור.'));
  });
}


// ---------- step-through flows: one box per step, the caption is the text alternative ----------
// steps: [short label in the box, full caption]; every caption restates a rule of the lesson it sits in (source line under it)
function flow(title, src, steps, intro = '') {
  return () => fig(title, src, ({ stage, ctl, say }) => {
    const n = steps.length, W = 300, bw = Math.min(84, (W - 10) / Math.min(n, 4) - 8), per = Math.min(n, 4), rows = Math.ceil(n / per);
    const boxes = steps.map(([lab], i) => { const r = Math.floor(i / per), c = i % per, x = W - 8 - (c + 1) * (bw + 8) + 4, y = 10 + r * 62;
      // RTL: step 1 on the right
      return S('g', { class: 'vz-step' }, S('rect', { x, y, width: bw, height: 46, rx: 8 }), txt(x + bw / 2, y + 18, String(i + 1), 'vz-num'),
        ...lab.split('\n').map((ln, j) => txt(x + bw / 2, y + 31 + j * 10, ln, 'vz-t sm'))); });
    stage.append(svg(`0 0 ${W} ${10 + rows * 62}`, ...boxes));
    let i = 0;
    const show = () => { boxes.forEach((b, j) => b.classList.toggle('on', j === i)); say((intro ? intro + ' ' : '') + `שלב ${i + 1} מתוך ${n}: ${steps[i][1]}`); next.disabled = i >= n - 1; if (next.disabled && document.activeElement === next) again.focus(); };
    const next = vbtn('השלב הבא', () => { i++; show(); }, 'btn small primary'), again = vbtn('מההתחלה', () => { i = 0; show(); });
    ctl.append(h('div', { class: 'row tight' }, next, again)); show();
  });
}
const duty = flow('לפני שמתניעים: נהג, רכב, נוסעים', 'לפי תקנות 25, 26, 27, 79–82 ופקודת התעבורה 10', [
  ['נהג\nכשיר', 'הנהג כשיר: לא בהשפעת אלכוהול או סמים, לא עייף עד סכנה, ובמצב גופני ונפשי שמאפשר נהיגה בטוחה (תקנה 26).'],
  ['רישיון\nמתאים', 'רישיון נהיגה תקף לסוג הרכב, ונוהגים לפי התנאים שבו – למשל משקפיים (פקודת התעבורה 10, תקנה 30).'],
  ['בקיא\nברכב', 'מכירים את הרכב ויודעים להפעיל אותו (תקנה 25).'],
  ['רכב\nתקין', 'הרכב תקין ובשליטה מלאה (27(א), (ג)); המנוע נקי ותקין – בלי עשן מעל הרגיל ובלי דליפת שמן (316), ולא נוהגים ברכב שציודו ואביזריו אינם לפי התקנות (27(ב)).'],
  ['נוסעים\nבפנים', 'כל הגוף של הנוסעים בתוך הרכב והדלתות סגורות; ליד הנהג – אדם אחד לכל היותר (תקנות 79, 82(א)).'],
  ['עלייה\nוירידה', 'עולים ויורדים רק כשהרכב עומד, מהצד הימני; פותחים דלת רק אחרי שבודקים שאין סכנה (תקנות 80, 81).']]);
const newdrv = flow('ציר הזמן של נהג חדש', 'לפי פקודת התעבורה 12א, 12א1, 12א2', [
  ['0–3\nחודשים', 'שלושת החודשים הראשונים: נוהגים רק כשמלווה יושב לידך (סעיף 12א1(ד)(1); לא באופנוע ובטרקטור).'],
  ['3–6\nחודשים', 'שלושת החודשים הבאים: מלווה חובה בלילה, בין 21:00 ל־6:00 (סעיף 12א1(ד)(2)).'],
  ['עד גיל\n21', 'אחרי הליווי ועד גיל 21: לא יותר משני נוסעים, אלא כשמלווה יושב לידך (סעיף 12א2).'],
  ['שנתיים', 'שנתיים מיום הרישיון אתה "נהג חדש" (סעיף 12א(א)). הורשעת בתקופה הזו בעבירה מהתוספת השלישית? התקופה מוארכת בשנתיים, ובתנאי שתעבור בהצלחה את הבחינות שקבע השר (סעיף 12א(ד)).']]);
const accident = flow('תאונה עם נפגע: מה עושים, לפי הסדר', 'לפי תקנה 144(א)', [
  ['עוצרים', 'עוצרים מיד, ולא מזיזים את הרכב – אלא כדי להגיש עזרה או באישור שוטר (144(א)(1)).'],
  ['עוזרים', 'מונעים נזק נוסף, מגישים עזרה ראשונה לפי ההכשרה, מזעיקים הצלה וממתינים ליד הנפגע (144(א)(2)).'],
  ['מוסרים\nפרטים', 'מוסרים שם ומען, מספר רישיון נהיגה, מספר רישום הרכב ושם בעליו (144(א)(3)).'],
  ['מודיעים', 'מודיעים מיד לתחנת המשטרה הקרובה (144(א)(4)).']]);
const brakes = flow('הבלמים לא עובדים: מה עושים', 'לפי חוברת "כללי בטיחות בדרכים" של הרשות הלאומית לבטיחות בדרכים (מרץ 2026), עמ׳ 43', [
  ['מורידים\nהילוך', 'מאטים בעזרת תיבת ההילוכים – מורידים הילוך.'],
  ['בלם\nיד', 'משתמשים בבלם היד ומרימים אותו לאט לאט.'],
  ['לא בלימה\nרציפה', 'לא לוחצים על הבלמים ברציפות לאורך זמן – זה מחמם אותם עד שריפה.']]);
const blowout = flow('צמיג התפוצץ בנסיעה', 'לפי חוברת "כללי בטיחות בדרכים" של הרשות הלאומית לבטיחות בדרכים (מרץ 2026), עמ׳ 44–45', [
  ['אוחזים\nבהגה', 'אוחזים היטב בהגה ושומרים על נסיעה בקו ישר.'],
  ['מאטים', 'מאטים ככל האפשר בעזרת הבלמים ותיבת ההילוכים.'],
  ['לימין', 'משתלבים בימין הדרך, ועדיף בשול – גם אם צריך לנסוע על החישוק ולהרוס את הצמיג, ולא לעצור על הכביש.']]);
const motojx = flow('באופנוע: מתקרבים לצומת', 'לפי חוברת "כללי בטיחות בדרכים" של הרשות הלאומית לבטיחות בדרכים (מרץ 2026), עמ׳ 31', [
  ['מאטים', 'בהתקרבות לצומת וביציאה ממנו – מאטים.'],
  ['מתמקמים', 'מתמקמים בנתיב כך ששדה הראייה רחב יותר ושנהגים אחרים יכולים להבחין בכם.'],
  ['מוודאים\nפנוי', 'מוודאים שהצומת פנוי.'],
  ['מצייתים', 'מצייתים לרמזורים ולתמרורים.']]);
const lamps = flow('מתי הפנסים דולקים?', 'לפי תקנות 97 ו־99(א)', [
  ['זמן\nתאורה', 'בזמן תאורה (בלילה): פנסי חזית ופנסים אחוריים דולקים ולוחית הזיהוי האחורית מוארת (97(א)).'],
  ['נובמבר–\nמרס', '1 בנובמבר עד 31 במרס, בדרך שאינה עירונית: פנסים דולקים גם ביום; מונית, אוטובוס ורכב מסחרי מעל 14,999 ק"ג – בכל דרך (97(ג)).'],
  ['מנהרה', 'מנהרה עם תמרור "מנהרה הדלק אורות": פנסים דולקים (97(ה)).'],
  ['אופנוע', 'אופנוע: תמיד עם פנסי חזית או פנסי נסיעת יום (97(ב)).'],
  ['רכב\nממול', 'רכב בא ממולך, עוצרים, או האור הגבוה מאיר את גב הרכב שלפניך: מעמעמים (99(א)).']]);
const hands = flow('איתות ביד', 'לפי תקנות 59(ב), 60 ו־61', [
  ['מחוון\nתקול', 'מחוון הכיוון או אור הבלימה התקלקלו? מאותתים ביד (59(ב)).'],
  ['שמאלה', 'פנייה או סטייה שמאלה (או יציאה מימין הכביש): זרוע שמאל אופקית מחוץ לחלון (60(א)).'],
  ['ימינה', 'פנייה או סטייה ימינה: מניעים את כף היד והזרוע השמאלית במעגל, בכיוון השעון (60(ב)).'],
  ['עצירה', 'עצירה או האטה: מנענעים את הזרוע השמאלית למעלה ולמטה, כף היד כלפי מטה (60(ג)).'],
  ['מי\nשלפניך', 'הרכב שלפניך איתת? מאטים, ואם צריך עוצרים, כדי שיפנה, יסטה או יעצור בלי הפרעה (61).']]);
const load = flow('לפני שיוצאים עם מטען', 'לפי תקנות 85(א) ו־88', [
  ['מחוזק', 'המטען מחוזק כך שלא יישמט ולא יתרופף, והמשקל לא עולה על המותר ברישיון (85(א)).'],
  ['בולט?', 'לא בולט מהדפנות לצדדים, ולא יותר ממטר אחד מעבר לחזית או לגב הרכב (85(א)(1)).'],
  ['גובה', 'גובה מרבי מפני הדרך לפי המשקל הכולל: עד 1,500 ק"ג – 2.50 מ׳; עד 3,500 – 3.00; עד 8,000 – 3.50; מעל – 4.00 (85(א)(2)(א)).'],
  ['לא\nמסתיר', 'לא חוסם את שדה הראייה ולא מסתיר פנסים, לוחיות זיהוי ומחווני כיוון (85(א)(2)).'],
  ['משולש', 'בולט מלפנים או מאחור? מסמנים במשולש בקצה – בכל שעה, גם בעמידה ובחנייה (88).']]);
const kids = flow('ילד ברכב: איזה מושב?', 'לפי תקנה 83א', [
  ['עד\nשנה', 'עד גיל שנה: גב מושב הבטיחות מופנה לחזית הרכב (83א(ג)).'],
  ['עד 3', 'עד גיל 3: רק במושב בטיחות שמתאים לגובהו ולמשקלו (83א(ב)(1)).'],
  ['3 עד 8', 'מגיל 3 ועד 8: מושב בטיחות או מושב מגביה (83א(ב)(2)).'],
  ['כרית\nאוויר', 'לא מושיבים ילד במושב בטיחות או מגביה מול כרית אוויר פעילה (83א(ד)).']]);
const taxi = flow('נוסע עולה למונית: נסיעה מיוחדת', 'לפי תקנות 501, 503, 510, 511', [
  ['"פנוי"\nמואר', 'מונית פנויה להסעת נוסעים בנסיעה מיוחדת: המונה במצב "פנוי" כשהוא מואר (511).'],
  ['לא\nמסרבים', 'מסיעים כל נוסע שמוכן לשלם, ולא מסרבים בלי סיבה סבירה – כולל חשש לביטחונך – להסיע נוסע ומטענו (501).'],
  ['מפעילים\nמונה', 'מפעילים את המונה עם העמדת המונית לרשות הנוסע, ומפסיקים בסיום הנסיעה (510(א)).'],
  ['הדרך\nהקצרה', 'נוסעים בדרך הקצרה ביותר האפשרית בנסיבות, ולא שוהים בדרך יותר מהדרוש (503(א)).'],
  ['בלי נוסע\nנוסף', 'לא מעלים נוסע נוסף על המזמין ומלוויו, אלא אם המזמין ביקש (501(ג)).']]);
const tractor = flow('טרקטור בדרך', 'לפי תקנות 38, 54, 359א', [
  ['עד 40\nקמ"ש', 'טרקטור, רכב איטי ומכונה ניידת נוסעים לכל היותר 40 קמ"ש (54(א)).'],
  ['לא בדרך\nמהירה', 'דרך מהירה סגורה בפני טרקטור (54(א)).'],
  ['צד\nימין', 'טרקטור ורכב איטי נוסעים בכביש בצד ימין (38(א)).'],
  ['מדרכה –\nרק חצייה', 'על מדרכה או שביל עוברים רק כדי לחצות אותם בכניסה לחצרים או ביציאה מהם (38(א)).'],
  ['זמזם\nלאחור', 'בטרקטור מותקן זמזם שפועל אוטומטית עם ההילוך האחורי (359א(א)).']]);
// ---------- alcohol limits (TR 169א, TO 64ב(א)(3א)) ----------
function bac() {
  return fig('כמה אלכוהול מותר בנשיפה?', 'לפי תקנה 169א ופקודת התעבורה 64ב(א)(3א)', ({ stage, ctl, say }) => {
    const G = [['רוב הנהגים', 240], ['נהג חדש, צעיר מ־24, רכב ציבורי, רכב משא מעל 3,500 ק"ג', 50]];
    const bars = G.map(([lab, v], i) => S('g', {}, S('rect', { class: 'vz-span', x: 290 - v, y: 18 + i * 44, width: v, height: 22 }), txt(290 - v - 22, 34 + i * 44, String(v), 'vz-num'), txt(160, 54 + i * 44, lab, 'vz-t sm')));
    stage.append(svg('0 0 300 110', ...bars));
    say('הסף הכללי הוא 240 מיקרוגרם אלכוהול בליטר אוויר נשוף (או 50 מיליגרם ב־100 מ"ל דם). לנהג חדש, לנהג שטרם מלאו לו 24, לנהג רכב ציבורי ולנהג רכב מסחרי או רכב עבודה מעל 3,500 ק"ג – 50 מיקרוגרם בליטר אוויר נשוף (או 10 מיליגרם ב־100 מ"ל דם). הרשות לבטיחות בדרכים: אלכוהול משפיע מהטיפה הראשונה, וקפה או מקלחת קרה לא עוזרים.');
  });
}
// ---------- vehicle dimensions (TR 313(א)–(ב)): three views – lengths, width and height, rear overhang ----------
function dims() {
  return fig('כמה גדול מותר?', 'לפי תקנה 313(א) ו־(ב)', ({ stage, ctl, say }) => {
    const LEN = [['גרור', 12, '313(א)(3)(ה)'], ['רכב מסחרי', 12, '313(א)(3)(א)'], ['אוטובוס 2 סרנים', 13.5, '313(א)(3)(ב)'], ['אוטובוס 3+ סרנים', 15, '313(א)(3)(ב1)'],
      ['מורכב, תא מעל המנוע', 16.5, '313(א)(3)(ד)(1)'], ['מורכב, תא מאחורי המנוע', 17.6, '313(א)(3)(ד)(2)'], ['רכב מחובר', 18.75, '313(א)(3)(ו)'], ['אוטובוס מפרקי', 18.75, '313(א)(3)(ג)']];
    const k = 13, R = 292, f2 = m => m.toFixed(2);
    const views = {
      len: ['אורך', () => svg('0 0 300 ' + (12 + LEN.length * 20), ...LEN.map(([n, m], i) => S('g', {},
          S('rect', { class: 'vz-span', x: R - m * k, y: 8 + i * 20, width: m * k, height: 15, rx: 3 }),
          txt(R - m * k / 2, 19 + i * 20, n, 'vz-t sm'), txt(R - m * k - 16, 19 + i * 20, f2(m), 'vz-t sm')))),
        'אורך כולל מרבי: גרור ורכב מסחרי – 12.00 מטר; אוטובוס בעל שני סרנים – 13.50, יותר משני סרנים – 15.00; רכב מורכב (תומך ונתמך) עם תא נהג מעל המנוע – 16.50, מאחורי המנוע – 17.60; רכב מחובר (רכב מנועי וגרור) ואוטובוס מפרקי – 18.75 (313(א)(3)).'],
      wh: ['רוחב וגובה', () => { const q = 26, base = 132, col = [['עד 1,500 ק"ג', 2.5], ['1,500–3,500 ק"ג', 3], ['מעל 3,500 ק"ג ואוטובוס', 4]];
          return svg('0 0 300 172', line(6, base, 294, base, 'vz-kerb'), ...col.map(([n, hgt], i) => { const x = 240 - i * 90, w = 2.55 * q;
            return S('g', {}, S('rect', { class: 'vz-span', x: x - w / 2, y: base - hgt * q, width: w, height: hgt * q, rx: 3 }),
              txt(x, base - hgt * q - 4, 'גובה ' + f2(hgt), 'vz-num'), txt(x, base + 12, n, 'vz-t sm'), txt(x, base - 8, 'רוחב 2.55', 'vz-t sm')); }),
            txt(150, 166, '2.60 – רק גרור לינה, גרור סוסים ומרכב קירור למזון', 'vz-t sm')); },
        'רוחב כולל מרבי 2.55 מטר; 2.60 רק לגרור O1/O2 שנרשם כגרור לינה למגורים או כגרור להובלת סוסים, ולרכב עם מרכב קירור מבוקר להובלת מזון (313(א)(1)). גובה כולל מרבי לפי המשקל הכולל המותר: עד 1,500 ק"ג – 2.50; עד 3,500 – 3.00; מעל 3,500 ק"ג ובאוטובוס – 4.00 (313(א)(2)).'],
      oh: ['שלוחה אחורית', () => { const wb = 150, front = 250, rear = front - wb, row = (y, p, lab, cap) => { const end = rear - wb * p; return S('g', {},
            S('rect', { class: 'vz-obj', x: end, y, width: front + 30 - end, height: 24, rx: 4 }),
            S('rect', { class: 'vz-zone', x: end, y, width: rear - end, height: 24 }),
            S('circle', { cx: front, cy: y + 26, r: 7, class: 'vz-obj' }), S('circle', { cx: rear, cy: y + 26, r: 7, class: 'vz-obj' }),
            line(rear, y - 7, front, y - 7, 'vz-span'), line(end, y - 7, rear - 3, y - 7, 'vz-span'),
            line(rear, y - 14, rear, y + 34, 'vz-kerb'), line(front, y - 14, front, y + 34, 'vz-kerb'),
            txt((rear + front) / 2, y - 12, 'רוחק הסרנים = 100%', 'vz-t sm'), txt((end + rear) / 2, y - 12, lab, 'vz-num'), txt(150, y + 50, cap, 'vz-t sm')); };
          return svg('0 0 300 170', row(24, 0.6, '60%', 'רכב – עד 60% (רכב אשפה בדחס – 63%)'), row(106, 0.7, '70%', 'אוטובוס – עד 70%, ולא יותר מ־3.60 מ׳')); },
        'שלוחה אחורית היא המרחק מהסרן האחורי עד הנקודה האחורית ביותר של הרכב. היא לא תעלה על 60% מרוחק הסרנים; ברכב אשפה בדחס – 63%; באוטובוס – 70%, ולא יותר מ־3.60 מטר (313(ב)).'] };
    const keys = Object.keys(views), box = h('div', {});
    stage.append(box);
    const run = v => { box.replaceChildren(views[v][1]()); say(views[v][2]); chips.forEach((c, j) => c.setAttribute('aria-pressed', String(keys[j] === v))); };
    const chips = keys.map(v => chip(views[v][0], v === 'len', () => run(v)));
    ctl.append(h('div', { class: 'row tight' }, chips)); run('len');
  });
}


// ---------- road parts (TO 1 "דרך"; TR 1 "כביש", "נתיב", "שטח הפרדה", "שול הדרך") ----------
const RP = [['road', 'דרך', [[0, 320]], 'דרך – כל השטח הפתוח שיש לציבור זכות לעבור בו: הכבישים, שטח ההפרדה והשוליים (פקודת התעבורה 1).'],
  ['cw', 'כביש', [[30, 145], [175, 290]], 'כביש – החלק שמיועד לתנועת כלי רכב, בלי השוליים. כאן יש שני כבישים, אחד מכל צד של שטח ההפרדה (תקנה 1).'],
  ['lane', 'נתיב', [[30, 87]], 'נתיב – חלק מרוחב הכביש שמספיק לטור אחד של כלי רכב, מסומן או לא. כל כביש כאן מחולק לשני נתיבים (תקנה 1).'],
  ['sep', 'שטח הפרדה', [[145, 175]], 'שטח הפרדה – אי תנועה, גינה, סימון או שטח לא סלול שמחלקים את הדרך לאורכה (תקנה 1).'],
  ['sh', 'שול', [[0, 30], [290, 320]], 'שול הדרך – השטח שליד שפת הכביש כשאין לידו מדרכה, עד רוחב של 4 מטרים (תקנה 1).']];
function roadparts() {
  return fig('חלקי הדרך – לחצו על חלק', 'לפי פקודת התעבורה 1 ותקנה 1', ({ stage, ctl, say }) => {
    const hl = S('g', {});
    stage.append(svg('0 0 320 150', S('rect', { class: 'vz-obj', x: 0, y: 10, width: 30, height: 130, opacity: .35 }), S('rect', { class: 'vz-obj', x: 290, y: 10, width: 30, height: 130, opacity: .35 }),
      road(30, 10, 115, 130), road(175, 10, 115, 130), S('rect', { class: 'vz-zone', x: 145, y: 10, width: 30, height: 130, opacity: .5 }),
      line(87, 10, 87, 140, 'vz-mark dash'), line(232, 10, 232, 140, 'vz-mark dash'), hl));
    const run = k => { const p = RP.find(x => x[0] === k); hl.replaceChildren(...p[2].map(([a, b]) => S('rect', { class: 'vz-hl', x: a + 1, y: 8, width: b - a - 2, height: 134, rx: 4, fill: 'none', 'stroke-width': 3, stroke: 'currentColor' })));
      say(p[3]); };
    const chips = RP.map(p => chip(p[1], p[0] === 'road', () => { chips.forEach((c, j) => c.setAttribute('aria-pressed', String(RP[j][0] === p[0]))); run(p[0]); }));
    ctl.append(h('div', { class: 'row tight' }, chips)); run('road');
  });
}

const TB = 'לפי ספר הלימוד הרשמי "נוהגים אחרת – נוהגים נכון" (הרשות הלאומית לבטיחות בדרכים ומשרד התחבורה)';
const startcar = flow('לפני שמתניעים', TB + ', עמ׳ 16, 20', [
  ['בלם\nרגל', 'מיד אחרי הכניסה לרכב לוחצים על בלם הרגל – עוד לפני כיוון הכיסא.'],
  ['בלם יד\nמשוך', 'בודקים שבלם היד משוך, כדי שהרכב לא יזוז.'],
  ['N או P', 'ידית ההילוכים במצב סרק (N) ברכב ידני, ובמצב P או N ברכב אוטומטי. ברכב ידני לוחצים גם על המצמד.'],
  ['מתניעים', 'מסובבים את המפתח לשלב הקפיצי, ומרפים מיד כשהמנוע מתניע – כדי לא לפגוע במתנע.']]);
const stopdist = flow('מרחק העצירה', TB + ', עמ׳ 22–23', [
  ['רואים\nסכנה', 'הנהג מבחין בסכנה. מכאן מתחיל מרחק העצירה.'],
  ['מרחק\nתגובה', 'מרחק התגובה: מה שהרכב עובר עד שהנהג מגיב. עייפות, אלכוהול, סמים ותרופות מאריכים אותו.'],
  ['מרחק\nבלימה', 'מרחק הבלימה: מהלחיצה על הבלם ועד שהרכב נעצר. תלוי בצמיגים ובמצב הכביש.'],
  ['50 / 100', 'ב־50 קמ"ש מרחק העצירה כ־24 מטר; ב־100 קמ"ש כ־77 מטר. מהירות כפולה – מרחק עצירה בערך משולש.']]);
const leftturn = flow('פנייה שמאלה: מאיפה ולאן', TB + ', עמ׳ 48', [
  ['מחד־סטרי', 'יוצאים מכביש חד־סטרי מצד שמאל של הכביש.'],
  ['מדו־סטרי', 'יוצאים מכביש דו־סטרי קרוב ככל האפשר לאמצע הכביש; אם יש שני נתיבים או יותר – מהנתיב השמאלי ביותר בכיוון הנסיעה.'],
  ['לחד־סטרי', 'נכנסים לכביש חד־סטרי לנתיב השמאלי ביותר.'],
  ['לדו־סטרי', 'נכנסים לכביש דו־סטרי עם נתיב אחד בכל כיוון בקשת רחבה לצדו הימני; אם יש שני נתיבים או יותר בכיוון – לנתיב השמאלי ביותר. סימון בכביש גובר על כל אלה.']]);

export const VIZ = { roadparts, leftturn, startcar, stopdist, priority, signs, speed, gap, overtake, crosswalk, parking, rail, blind, moto, signdict, duty, newdrv, accident, brakes, blowout, bac, dims, motojx, lamps, hands, load, kids, taxi, tractor };
