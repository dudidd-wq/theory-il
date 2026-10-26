// Per-class age / eligibility summary, own wording. Every line cites the section of תקנות התעבורה it comes from
// (Hebrew Wikisource "ספר החוקים הפתוח", pinned revision – see tools/law/revs.json). Only what the cited text says; no fines, no guesses.
export const TR_REV = 3085628;
export const lawUrl = sec => 'https://he.wikisource.org/w/index.php?title=' + encodeURIComponent('תקנות_התעבורה') + '&oldid=' + TR_REV + '#' + encodeURIComponent('סעיף_' + sec);
const TH = ['אפשר להיבחן בתאוריה מגיל 15 וחצי.', 'The theory test can be taken from age 15½.', ['221(ג1)']];
export const ELIG = {
  B: [TH,
    ['שיעורי נהיגה מגיל 16 וחצי; מבחן מעשי (טסט) מגיל 16 ו־9 חודשים.', 'Driving lessons from 16½; the practical test from 16 years 9 months.', ['221(ב)(1)', '221(ג)(1)']]],
  A: [TH,
    ['A2 (עד 125 סמ״ק): לימוד ורישיון מגיל 16; עד גיל 17 – בהסכמה בכתב של הורה או אפוטרופוס.', 'A2 (up to 125 cc): lessons and licence from 16; under 17 – with written consent of a parent or guardian.', ['176', '221(א)(1)(א)', '188(א)']],
    ['A (ללא הגבלת הספק): רק מגיל 21 ואחרי שנה לפחות עם רישיון A1.', 'A (unlimited power): only from 21, after at least one year with an A1 licence.', ['178', '189(ז)']]],
  C1: [['לימוד נהיגה מגיל 17, מבחן מעשי מגיל 17 וחצי, אבל הרישיון ניתן רק מגיל 18.', 'Lessons from 17 and the practical test from 17½, but the licence is issued only from 18.', ['221(ב)(2)', '221(ג)(1)']]],
  C: [['מגיל 19, אחרי שנה לפחות עם רישיון C1, קורס לנהגי רכב כבד ואישור רפואי.', 'From 19, after at least one year with a C1 licence, a heavy-vehicle course and a medical certificate.', ['189(ב)']]],
  D: [['מונית/אוטובוס זעיר (D1) ואוטובוס (D): מגיל 21, אחרי שנתיים עם רישיון B או C1, קורסים לנהגי רכב ציבורי, אישור רפואי ומבחני שפה.', 'Taxi/minibus (D1) and bus (D): from 21, after two years with a B or C1 licence, public-vehicle driver courses, a medical certificate and language tests.', ['184', '185', '189(ד)', '189(ה)']]],
  1: [TH,
    ['לימוד נהיגה בטרקטור מגיל 15; רישיון מגיל 16 (עד 17 – בהסכמת הורה בכתב); לטרקטור צריך גם קורס מאושר.', 'Tractor lessons from 15; licence from 16 (under 17 – written parental consent); a tractor licence also needs an approved course.', ['221(ד)', '188(א)', '189(א)']]],
};
