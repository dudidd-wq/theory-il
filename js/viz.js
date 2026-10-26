// Small interactive diagrams for the lessons. Own drawings, plain SVG + CSS, no libraries, no network.
// Every number shown comes from the rule cited next to it (see data/lessons.json / sources.json).
// The diagram itself is aria-hidden; the caption under it is the text alternative and is updated on every step.
// Movement uses CSS transitions only, which the global prefers-reduced-motion rule turns off (steps then jump).
import { h } from './ui.js';
const S = (tag, a, ...k) => h('svg:' + tag, a, ...k);
const svg = (vb, ...k) => S('svg', { viewBox: vb, class: 'vz-svg', 'aria-hidden': 'true', focusable: 'false' }, ...k);
const chip = (label, on, onclick) => h('button', { type: 'button', class: 'chip', 'aria-pressed': String(on), onclick, text: label });
const vbtn = (label, onclick, cls = 'btn small') => h('button', { type: 'button', class: cls, onclick, text: label });
function fig(title, src, draw) {
  const alt = h('p', { class: 'vz-alt', 'aria-live': 'polite' }), stage = h('div', { class: 'vz-stage' }), ctl = h('div', { class: 'vz-ctl' });
  const f = h('figure', { class: 'viz', role: 'group', 'aria-label': title }, h('h3', { class: 'h3', text: title }), stage, ctl,
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
    const show = () => { const s = SC[sc].steps[i]; place(me, s[0]); place(other, s[1]); say(`${SC[sc].intro} צעד ${i + 1} מתוך ${SC[sc].steps.length}: ${s[2]}`); next.disabled = i >= SC[sc].steps.length - 1; };
    const chips = Object.keys(SC).map(k => chip(SC[k].label, k === sc, () => { sc = k; i = 0; chips.forEach((c, j) => c.setAttribute('aria-pressed', String(Object.keys(SC)[j] === k))); show(); }));
    const next = vbtn('הצעד הבא', () => { i++; show(); }, 'btn small primary');
    ctl.append(h('div', { class: 'row tight' }, chips), h('div', { class: 'row tight' }, next, vbtn('מההתחלה', () => { i = 0; show(); })));
    show();
  });
}

// ---------- sign families (LTP parts, Q:606, Q:477) ----------
const PARTS = [[101, 152, 'חלק 1 – תמרורי אזהרה והתראה'], [201, 231, 'חלק 2 – תמרורי הוריה'], [301, 310, 'חלק 3 – תמרורי זכות קדימה'], [401, 441, 'חלק 4 – תמרורי איסורים והגבלות'],
  [601, 637, 'חלק 6 – תמרורי מודיעין והדרכה'], [701, 729, 'חלק 7 – רמזורים ובקרת נתיבים'], [801, 821, 'חלק 8 – סימון על פני הדרך']];
function signs() {
  return fig('המספר מגלה את המשפחה', 'לפי לוח התמרורים (gov.il) ושאלות 606, 477 במאגר', ({ stage, ctl, say }) => {
    const tri = S('path', { class: 'vz-shape', d: 'M60 20 L100 90 L20 90 Z' }), circ = S('circle', { class: 'vz-shape', cx: 200, cy: 58, r: 36 });
    stage.append(svg('0 0 280 120', tri, circ, txt(60, 112, 'אזהרה – בדרך כלל'), txt(200, 112, 'הוריה או איסור – בדרך כלל')));
    const inp = h('input', { id: 'vz-num', type: 'number', inputmode: 'numeric', min: 100, max: 999, value: 135 });
    const out = h('p', { class: 'vz-out', 'aria-live': 'polite' });
    const run = () => { const n = +inp.value, p = PARTS.find(([a, b]) => n >= a && n <= b);
      out.textContent = p ? `${n}: ${p[2]} (מספרים ${p[0]} עד ${p[1]})` : `${n || '?'}: לא בטווחים שבשיעור הזה – בודקים בלוח התמרורים.`; };
    inp.addEventListener('input', run);
    ctl.append(h('label', { for: 'vz-num', class: 'lbl', text: 'הקלידו מספר תמרור:' }), inp, out); run();
    say('משולש שקודקודו למעלה הוא בדרך כלל תמרור אזהרה. עיגול הוא בדרך כלל תמרור הוריה או איסור. הספרה הראשונה במספר התמרור אומרת לאיזה חלק בלוח הוא שייך: ' + PARTS.map(p => `${p[0]} עד ${p[1]} – ${p[2].split('– ')[1]}`).join('; ') + '.');
  });
}

// ---------- speed table explorer (TR 54(א), 54(ב)) ----------
const ROADS = [['city', 'דרך עירונית'], ['rural', 'דרך שאינה עירונית'], ['div', 'שאינה עירונית, עם שטח הפרדה בנוי'], ['fwy', 'דרך מהירה']];
const VEH = [['car', 'רכב מנועי רגיל', [50, 80, 90, 110]], ['bus', 'אוטובוס (לא זעיר)', [50, 80, 90, 100]], ['heavy', 'רכב מסחרי מעל 12,000 ק"ג', [50, 80, 80, 80]], ['slow', 'רכב איטי וטרקטור', [40, 40, 40, 0]]];
function speed() {
  return fig('כמה מותר כאן?', 'לפי תקנה 54(א) ו־54(ב) – כשאין תמרור מהירות אחר', ({ stage, ctl, say }) => {
    const num = txt(70, 79, '', 'vz-num huge'), cap = txt(195, 72, '', 'vz-t mid');
    stage.append(svg('0 0 280 130', S('circle', { class: 'vz-shape', cx: 70, cy: 66, r: 48 }), num, cap));
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
    const show = () => { const s = ST[i]; place(me, s[0]); place(other, s[1]); ped.style.transform = `translate(${s[2][0]}px,${s[2][1]}px)`; say(`צעד ${i + 1} מתוך ${ST.length}: ${s[3]}`); next.disabled = i >= ST.length - 1; };
    const next = vbtn('הצעד הבא', () => { i++; show(); }, 'btn small primary');
    ctl.append(h('div', { class: 'row tight' }, next, vbtn('מההתחלה', () => { i = 0; show(); }))); show();
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
function blind() {
  return fig('השטח המת: מי לא נראה במראה?', 'לפי שאלות 800 ו־733 במאגר ותקנה 40(א); גודל השטחים באיור להמחשה בלבד', ({ stage, ctl, say }) => {
    const zones = S('g', {}), me = S('g', { class: 'vz-car me' }), rider = S('g', { class: 'vz-car other' }, S('rect', { x: -4, y: -9, width: 8, height: 18, rx: 3 }));
    stage.append(svg('0 0 200 220', road(30, 0, 140, 220), line(76, 0, 76, 220, 'vz-mark dash'), line(124, 0, 124, 220, 'vz-mark dash'), S('g', { transform: 'translate(100 110)' }, zones, me), rider));
    const r = h('input', { id: 'vz-pos', type: 'range', min: 0, max: 100, value: 70, 'aria-label': 'מיקום הרוכב בנתיב הימני' });
    let k = 'car';
    const run = () => { const [name, w, l, zs] = BL[k];
      me.replaceChildren(S('rect', { x: -w / 2, y: -l / 2, width: w, height: l, rx: 4 }));
      zones.replaceChildren(...zs.map(([x, y, ww, hh]) => S('rect', { class: 'vz-zone', x, y, width: ww, height: hh })));
      const y = 215 - +r.value * 2.1; rider.style.transform = `translate(148px,${y}px)`;
      const ry = y - 110, inZ = zs.some(([x, zy, ww, hh]) => 48 >= x && 48 <= x + ww && ry >= zy && ry <= zy + hh);
      rider.classList.toggle('hid', inZ);
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

export const VIZ = { priority, signs, speed, gap, overtake, crosswalk, parking, rail, blind, moto };
