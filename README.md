# תאוריה לנהיגה – theory-il

אפליקציית תרגול (PWA) למבחן התאוריה בישראל, על בסיס **מאגר השאלות הרשמי** שמפרסם משרד התחבורה והבטיחות בדרכים ב-data.gov.il ברישיון **CC BY**.

> **לא מוצר רשמי** של משרד התחבורה. יש לאמת מול המקורות הרשמיים.

**אתר:** https://dudidd-wq.github.io/theory-il/

## מה יש
- בחירת סוג רישיון בפתיחה: B, A (A/A1/A2), C1, C, D (כולל מוניות ותחבורה ציבורית לפי תיוג המאגר), טרקטור (1)
- **שלב לימוד**: מסלול שיעורים לכל סוג רישיון (לימוד → תרגול → מוכנות למבחן) – הסבר בניסוח שלנו, כללים עם הפניה לסעיף בחוק/בלוח התמרורים, גלריית תמרורים, דוגמאות, תרשימים אינטראקטיביים (SVG מקומי), כרטיסי חזרה, הקראה, ומבחנון מהמאגר (שליטה ≥80%)
- תרגול לפי נושא, מאמן תמרורים, מבחן מלא (30 שאלות, 40 דקות, עוברים ב-26), חזרה על טעויות (Leitner), שמורים, סטטיסטיקה
- מסלול "נסיעה", רצף ימים, נקודות, שלבים ותגים
- תצוגת הורה/מלווה לקריאה בלבד
- שאלות בעברית (רשמי) + אנגלית, רוסית, צרפתית, ספרדית (מאגרי CC BY תואמים לפי מספר שאלה); ממשק בעברית/אנגלית
- הקראה עם קול הדפדפן (Web Speech) – ללא שירות חיצוני
- נתונים מקומיים בלבד: localStorage + IndexedDB, storage.persist, קובץ גיבוי, קוד גיבוי, שמירה אוטומטית לקובץ (File System Access), תזכורת גיבוי, ביטול שחזור, ייבוא עם סינון קפדני
- עובד בלי אינטרנט; אין שרת, אין מעקב, אין בקשות לצד שלישי; גופן מקומי

## לא כלול (בכוונה)
- מאגר בערבית ומאגר A3 (אופניים/קורקינט חשמליים): הרישיון במאגר הפתוח מסומן other-open – לא נכללו עד הבהרה
- הסברים והפניות לחוק: אין מקור פתוח ומתועד לכל שאלה – לא הומצאו

## נתונים
`python3 tools/fetch.py && python3 tools/build.py` – ראו [LICENSE-DATA.md](LICENSE-DATA.md).

## פיתוח
- `python3 tools/bump.py` בכל שינוי (גרסה ב-js/version.js וב-sw.js)
- בדיקות: `python3 -m http.server 8787 --bind 127.0.0.1` ואז `node tools/test/e2e.js` (Playwright, נייד+מחשב, axe-core)

## רישיונות
- קוד: MIT (LICENSE)
- שאלות ותמונות: © משרד התחבורה והבטיחות בדרכים, CC BY – ראו LICENSE-DATA.md
- גופן Rubik: SIL OFL 1.1 (fonts/OFL-Rubik.txt)

## Rebuilding the data

The raw official banks (`data/raw/tq*.json`) and the parsed law text (`tools/law/law.json`) are not committed, so they are not served on the site. To regenerate them: `python3 tools/fetch.py && python3 tools/build.py` (the sha256 of each raw file is recorded in `data/raw/meta.json`), and `cd tools/law && python3 fetch.py && python3 parse.py` (pinned Wikisource revision ids in `revs.json`).
