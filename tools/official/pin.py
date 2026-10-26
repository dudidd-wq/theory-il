#!/usr/bin/env python3
"""Pin the official road-safety pages (National Road Safety Authority on gov.il, and its March 2026
booklet) that lessons cite as OFF:<id>.
- Full page text is kept only in tools/official/cache/ (gitignored): gov.il terms of use allow fair use
  ("שימוש הוגן", reasonable quotation with the source named), not republishing whole pages.
- tools/official/pages.json (committed) records per page: url, publisher, dates, access date, sha256 of the
  cached text, archive status and the short quotes the lessons may cite. Every quote is verified to occur
  in the cached text (whitespace/punctuation-insensitive: PDF text has RTL punctuation quirks).
usage: pin.py            rebuild pages.json from the cache (fails if a quote is missing)
       pin.py --verify   only verify pages.json against the cache"""
import json, os, re, sys, hashlib
HERE = os.path.dirname(os.path.abspath(__file__)); CACHE = os.path.join(HERE, 'cache')
ACCESSED = '2026-10-26'
ARCHIVE = 'web.archive.org lookup rate-limited (HTTP 429) on 2026-10-26; pinned by sha256 of the text as fetched'
PUB = 'הרשות הלאומית לבטיחות בדרכים, חטיבת חינוך והסברה (gov.il)'
G = 'https://www.gov.il/he/'
BOOK_URL = 'https://www.gov.il/BlobFolder/reports/safety_rules_book/he/publications_safety_rules_book.pdf'
# The official driving-theory textbook of the RSA and the Ministry of Transport ("נוהגים אחרת – נוהגים נכון", 2017;
# landing page https://www.gov.il/he/pages/driving_textbook). Cached as textbook.pdf; textbook.txt is
# `pdftotext -f N -l N` per page with bidi control marks removed, pages joined by \f. Its quotes live in
# textbook_quotes.txt (one per line; written by sync_textbook_quotes.py from the lessons that cite OFF:textbook).
# Quotes may come only from the explanatory text – never from the book's embedded sample exam questions.
TEXTBOOK_URL = 'https://www.gov.il/BlobFolder/reports/driving_textbook/he/publications_2017_nohagim_aheret_nohagim_nachon.pdf'
TEXTBOOK_PUB = 'הרשות הלאומית לבטיחות בדרכים ומשרד התחבורה (gov.il)'
PDFS = {'book': ('book.pdf', '03.2026'), 'textbook': ('textbook.pdf', '2017'), 'edu_s18': ('edu_s18.pdf', '12.2019'),
        'edu_s07': ('edu_s07.pdf', '09.2019'), 'edu_s13': ('edu_s13.pdf', '12.2019'), 'edu_s17': ('edu_s17.pdf', '12.2019'),
        'edu_s21': ('edu_s21.pdf', '12.2019')}  # v1.12: dates from the PDF CreationDate metadata
# Ministry of Education, high-school traffic-education curriculum (an official state textbook), topic 18
# "הפעלת הרכב בבטחה". Cached as edu_s18.pdf; edu_s18.txt is per-page `pdftotext` with bidi marks removed, pages
# joined by \f. Its practice-question blocks ('שאלות (ל)תרגול לקראת מבחן בתיאוריה' up to the 'תשובות לשאלות'
# line, possibly spanning pages) are excluded: only the explanatory prose is citable.
EDU18_URL = 'https://meyda.education.gov.il/files/Curriculum/high-school/download/traffic-s18-operating-safely.pdf'
KIDS_PUB = 'המשרד להגנת הסביבה – סבבה, מאגר מידע סביבתי (kids.gov.il)'
# kids_co: Ministry of Environmental Protection page on carbon monoxide, approved as an official source by Dudi on 2026-10-26 (15:05 UTC+2).
EDU = 'https://meyda.education.gov.il/files/Curriculum/high-school/download/traffic-'
# v1.12 (approved by Dudi, 2026-10-26 18:20 UTC+2): topics 7, 13, 17 and 21 of the same curriculum; same caching method
# (sha256 of the PDFs checked against /workspace/official_sources_candidates/SHA256SUMS.txt). Prose and tables only.
# pitzuim: Compensation for Road Accident Victims Law 1975, section 1, Wikisource revision 2968550 (16.12.2025);
# cached as pitzuim.body = the revision's wikitext from the MediaWiki API JSON (its sha256 kept as src_sha256).
PITZ_URL = 'https://he.wikisource.org/w/index.php?title=%D7%97%D7%95%D7%A7_%D7%A4%D7%99%D7%A6%D7%95%D7%99%D7%99%D7%9D_%D7%9C%D7%A0%D7%A4%D7%92%D7%A2%D7%99_%D7%AA%D7%90%D7%95%D7%A0%D7%95%D7%AA_%D7%93%D7%A8%D7%9B%D7%99%D7%9D&oldid=2968550'
PITZ_PUB = 'חוק פיצויים לנפגעי תאונות דרכים, תשל״ה–1975 – נוסח ויקיטקסט, גרסה 2968550'
PITZ_SRC_SHA = '8fdd952b285622e1209cd0cae17007106c7e6f75414f13c2011e1ff7b69d77bb'
EDU_PUB = 'משרד החינוך – תוכנית הלימודים בחינוך תעבורתי לחטיבה העליונה (meyda.education.gov.il)'
def edu_prose(raw):
    """The edu PDF text with its practice-question blocks blanked (page breaks kept). TOC lines (dot leaders) skipped."""
    out, i = raw, 0
    for m in list(re.finditer(r'שאלות (?:ל)?תרגול לקראת מבחן (?:ב|ה)תיאוריה[^\n]*', raw))[::-1]:
        if '....' in m.group(0): continue
        e = re.compile(r'תשובות לשאלות[^\n]*').search(raw, m.end())
        k = e.end() if e else len(raw)
        out = out[:m.start()] + re.sub(r'[^\f]', ' ', out[m.start():k]) + out[k:]
    return out
def textbook_quotes():
    f = os.path.join(HERE, 'textbook_quotes.txt')
    return [l.strip() for l in open(f, encoding='utf-8') if l.strip()] if os.path.exists(f) else []
def quiz_spans(page):
    """Sample-exam blocks ('שאלות לדוגמה ממבחן ...' up to the 'תשובות' line) – not citable as rules."""
    out, i = [], 0
    while True:
        j = page.find('שאלות לדוגמה ממבחן', i)
        if j < 0: return out
        m = re.compile(r'\n\s*תשובות[^\n]*\n').search(page, j)
        k = m.end() if m else len(page); out.append(page[j:k]); i = k

def norm(s):
    s = re.sub(r'[\u0591-\u05C7]', '', s)
    return re.sub(r'[\s״׳"\'`“”„‘’\-–—־.,;:!?()\[\]/…]+', '', s)

# id: (url, title, file, quotes). Dates come from the page header ('תאריך פרסום' / 'תאריך עדכון').
P = {
 'drunk': (G + 'Departments/General/drunk_driving', 'נהיגה תחת השפעת אלכוהול', 'drunk', [
  'שתיית אלכוהול משפיעה על טווח רחב של כישורי נהיגה: הקשב של הנהג, תנועת העיניים של הנהג, עמידותו לסנוור, התפיסה החזותית שלו, זמן התגובה שלו, יכולתו לכוון את הרכב (באמצעות ההגה), תהליך עיבוד המידע ועוד.',
  'אלכוהול משפיע מהטיפה הראשונה. כל כמות של אלכוהול פוגמת ביכולות הנהיגה: בריכוז הדרוש לנהיגה, בקואורדינציה, בתפקודי הראייה, בחלוקת קשב בין כמה משימות, ביכולת לעצור נכון, ביכולת לשמור על המהירות בהתאם לחוק ולתנאי הדרך וביכולת לשמור על נסיעה בנתיב.',
  'שתיית קפה, שטיפת פנים ואפילו מקלחת קרה אינם עוזרים.',
  'לפני יציאה לבילוי קובעים נהג תורן שאינו שותה, שיהיה אחראי על הנהיגה ויבטיח את החזרה הביתה בשלום.']),
 'fatigue': (G + 'Departments/General/fatigue_while_driving', 'עייפות בנהיגה', 'fatigue', [
  'הירדמות בזמן נהיגה מתרחשת ללא התראה מוקדמת, ולכן היא מסוכנת כל כך.',
  'מומלץ לא לנהוג בשעות מועדות לעייפות (לדוגמה, חצות עד 6 בבוקר), שבהן השעון הביולוגי מכוון על מצב שינה, אחרי ארוחה כבדה, אחרי פעילות גופנית מאומצת, או לאחר צריכת תרופות הגורמות לעייפות.',
  'חשוב להיות ערניים לכל סימן המעיד על עייפות, כגון פיהוקים, מצמוצים, מעבר לא מכוון בין נתיבים, או עלייה לא מכוונת על פס ההרעדה שבצד הכביש.',
  'אם חשים עייפות או שהעיניים נעצמות, עוצרים להתרענן במקום מוסדר ובטוח, אך לא בשול הדרך. שותים קפה או משקה מרענן (ללא אלכוהול!) ונחים כרבע שעה לפחות, עד שהקפה מתחיל להשפיע.',
  'חלון פתוח ורדיו פועל אינם עוזרים להפיג את העייפות.',
  'לפני שיוצאים לנסיעה ארוכה מתכננים את מסלול הנסיעה ואת מקומות המנוחה בדרך. אם ערים שעות רבות, כדאי להימנע מנהיגה.',
  'חשוב לזכור, שהדבר יעזור לשמור על ערנות לפרק זמן קצר בלבד.',
  'אם אחרי כל הצעדים האלה עדיין חשים עייפות – נותנים לנהג אחר לנהוג במקומכם. אם עייפים – לא נוהגים.']),
 'tires': (G + 'Departments/General/tires_safety', 'בטיחות צמיגים', 'tires', [
  'גם ללחץ האוויר בצמיגים חשיבות מכרעת: הוא משפיע על יציבות הרכב, על יכולת הביצועים שלו, על בטיחות הנסיעה, על מרחק הבלימה ועל בלאי הצמיגים ותדירות החלפתם.',
  'בודקים היטב את תאריך ייצור הצמיג. לא מתקינים צמיגים שחלפו 6 שנים ממועד ייצורם.',
  'בודקים אחת לשבועיים את מצב הצמיגים, כולל הצמיג הרזרבי. חשוב לוודא שאין בגלגל חתכים, בקיעים, יובש, עיוותים, נפיחויות או עצמים זרים, ושהחריצים שבצמיגים לא נשחקו.',
  'על גבי הצמיג מוטבעים סימנים שעוזרים לבדוק את מידת התאמתו לרכב ואת תקינותו.',
  'מכיילים (מכוונים) את מכונת הניפוח בתחנת הדלק ללחץ הרצוי בהתאם להוראות יצרן הרכב.']),
 'winter': (G + 'Departments/General/safe_winter_rules', 'נהיגה בטוחה בחורף', 'winter', [
  'חשוב לבדוק במיוחד את תקינות ההגה, הבלמים, המגבים, מתזי המים והפנסים ואת מערכות החימום והפשרת האדים.',
  'בתנאי ערפל מאטים ומדליקים גם את פנסי הערפל. לא לשכוח לכבותם ביציאה מתנאי הערפל.',
  'שימוש באורות גבוהים אינו יעיל בערפל, כיוון שהוא גורם להחזר אור.',
  'נהיגה ברכב עם חימום פועל וחלונות סגורים עלולה לפגום בערנות הנהג ובריכוזו.',
  'בגשם הראשון הכביש חלק במיוחד - נוהגים במשנה זהירות.',
  'בתנאי ראות לקויים בשל גשם או ערפל וכן כשהכביש חלק - נוהגים לאט יותר, בהתאם לתנאי הדרך.',
  'בחורף, כשהכביש חלק והראות לקויה - עקיפה מסוכנת יותר.']),
 'summer': (G + 'Departments/General/safe_summer_rules', 'נהיגה בטוחה בקיץ', 'summer', [
  'כשהכביש לוהט, חיכוך הצמיגים עם הכביש גבוה יותר ועלול להשפיע על יכולת הבלימה ועל שחיקת הצמיג, ואף להוביל לפנצ\'ר.',
  'נמנעים מנהיגה ברכב בכפכפים או בסנדלים שיכולים להשתחרר מכף הרגל.']),
 'shoulders': (G + 'Departments/General/road_shoulders', 'עצירה בשול הדרך', 'road_shoulders', [
  'שול הדרך הוא השטח הסמוך לשפת הכביש, שאין לצידו מדרכה, עד לרוחב של 4 מטרים',
  'שול הדרך מיועד לעצירה במקרה חירום שאינו מאפשר את המשך הנסיעה.',
  'מדליקים אורות חירום מהבהבים', 'לובשים אפוד זוהר', 'מציבים משולש אזהרה מאחורי הרכב',
  'עומדים בצד הימני של הדרך מעבר למעקה הבטיחות']),
 'distance': (G + 'Departments/General/safety_rules_distance', 'שמירת מרחק', 'distance', [
  'שומרים על מרחק של 2 שניות לפחות מהרכב הנמצא מלפנים.',
  'בתנאי מזג אוויר קיצוניים (סערה, ערפל, סופות חול, אובך) לוקחים מקדם ביטחון ושומרים על מרחק גדול יותר מהרכב שלפניכם.',
  'גם כשהתנועה איטית שומרים על מרחק מהרכב שמלפנים ולא נצמדים אליו.']),
 'speed': (G + 'Departments/General/speed', 'מהירות', 'speed', [
  'מהירות מופרזת מגבירה את הסיכון להתרחשותה של תאונת דרכים, שכן היא מגבילה את יכולתו של הנהג להגיב כראוי למתרחש בכביש, וכן מגבירה את חומרת הפציעה במקרה של תאונה.',
  'בעיר נוסעים במהירות המאפשרת לעצור באופן פתאומי.',
  'נוהגים לאט יותר בקרבת בתי ספר, גני שעשועים ושכונות מגורים.']),
 'belts': (G + 'Departments/General/safety_rules_seatbelts', 'חגורות בטיחות', 'seatbelts', [
  'חגירת חגורה מורידה את הסיכוי להיהרג בתאונה ב-45% ואת הסיכוי לפציעה חמורה ב-50%.',
  'חגירת חגורה מקטינה פי 30 את הסיכוי להיזרק מהרכב בעת תאונה.',
  'החגורה האלכסונית תמוקם במרכז הכתף, וחגורת האגן תמוקם במקביל לאגן הירכיים (ולא על הבטן).',
  'חגורה רפויה עלולה לגרום חבלה בבטן ובצלעות בעת תאונה.']),
 'systems': (G + 'departments/general/safety_systems_rules', 'מערכות בטיחות ברכב', 'systems', [
  'מערכת זו נועדה לבקרת יציבות ולמניעת אובדן שליטה כתוצאה מהחלקה או מכניסה לסיבוב במהירות גבוהה.',
  'מונעת מצב של נעילת גלגלים במקרה של בלימה חזקה.',
  'לוחצים לחיצה חזקה ורצופה על הבלם.',
  'לא "מפמפמים" ולא מרפים מדוושת הבלם - גם כשמורגשות רעידות חזקות בדוושה.']),
 'emergency': (G + 'departments/guides/emergency_situation_driving', 'מצבי חירום בנהיגה', 'emergency', [
  'מטפלים בכלי הרכב על פי הוראות היצרן - במרבית הרכבים יש לעשות זאת אחת לשנה או מדי 15,000 ק"מ (המוקדם מבין השניים).',
  'בדיקת מפלס הנוזלים בכלי הרכב (שמן מנוע, שמן גיר, מים במצנן ונוזלים הידראוליים).',
  'בדיקת המגבים והחלפתם במידת הצורך.',
  'צריכת דלק חריגה.', 'הידלקות נוריות אזהרה.']),
 'truck': (G + 'Departments/General/truck_drivers_background', 'נהגי משאיות', 'truck', [
  'מקפידים על העמסה וריתום נכונים.',
  'מחלקים את המטען לאורך משטח ההטענה לפי מרכז הכובד שלו (מטען כבד יהיה בקדמת משטח ההטענה, וכך הלאה).',
  'בודקים את תקינות ריתום המטען בתדירות גבוהה במהלך הנסיעה.',
  'נמנעים מפניות חדות, מהאצות ומבלימות חזקות.',
  'עושים שימוש רב במראות – הן מסייעות לראות את משתמשי הדרך האחרים.']),
 'bus': (G + 'departments/general/bus_drivers_rules', 'נהגי אוטובוסים', 'bus', [
  'לפני כל נסיעה מוודאים את תקינות האוטובוס: צמיגים, בלמים, אורות.',
  'יש להביא בחשבון את השטחים המתים, לרבות קורה ימנית וחזית האוטובוס',
  'מורידים את הנוסעים קרוב ככל האפשר לשפת המדרכה',
  'כשעייפים לא נוהגים! מקפידים על שעות עבודה ומנוחה בהתאם לחוק.']),
 'elderly': (G + 'departments/general/elderly_drivers', 'נהגים מבוגרים', 'elderly', [
  'דואגים להתאים למידותיכם את גובה ההגה, הכיסא, המשענת והמראות.',
  'אם נוטלים תרופות באופן קבוע, חשוב לבדוק האם מופיעה על האריזה אזהרה, כי השימוש בתרופה עלול לפגום בכושר הנהיגה.']),
 'distraction': (G + 'Departments/General/distraction_while_driving', 'היסח דעת בנהיגה', 'distraction', [
  'היסח דעת עקב שימוש בטלפון נייד מעלה את הסיכון לתאונה פי 10.',
  'לא נוגעים בטלפון הנייד במהלך הנהיגה.']),
 # the booklet: same RSA guidance in one PDF, with the sections whose web pages are accordions (emergency, motorcycles)
 'book': (BOOK_URL, 'כללי בטיחות בדרכים (חוברת, מרץ 2026)', 'book', [
  'איבוד בלמים הוא מצב שבו בלמי הרכב אינם מתפקדים כנדרש, והנהג אינו מצליח להאט/לעצור את נסיעתו.',
  'מאטים את כלי הרכב בעזרת תיבת ההילוכים - מורידים הילוך.',
  'משתמשים בבלם היד (הנד ברקס) ומרימים אותו לאט לאט.',
  'לא לוחצים על הבלמים בצורה רציפה לאורך זמן, שכן הדבר יגרום לחימום יתר של הבלמים ולשריפתם.',
  'מעבירים את ידית ההילוכים לסרק (ניוטרל).',
  'אוחזים היטב בהגה ושומרים על נסיעה בקו ישר.',
  'מאטים ככל האפשר בעזרת הבלמים ותיבת ההילוכים.',
  'עדיף לנסוע על הג\'אנט של הגלגל (החישוק שעליו מולבש הצמיג), גם במחיר הרס הצמיג ולא לעצור על הכביש.',
  'מנסים להשתלב ככל האפשר בימין הדרך, עם עדיפות לשול הדרך.',
  'משתמשים באמצעי מיגון מתאימים ומיטביים: קסדה שלמה ותקנית, מעיל וכפפות (גם בקיץ), משקפי מגן כשמזג האוויר מתאים לכך (לא בגשם) ונעלי רכיבה ייעודיות.',
  'שומרים על שדה ראייה מספק ומוודאים שגם הנהגים רואים אתכם: לא עוקפים מימין, מדליקים אורות בכל נסיעה, מתמקמים "חכם" בנתיב הנסיעה.',
  'רכיבה במהירות מופרזת מגבירה באופן ניכר את הסיכון לאיבוד השליטה על האופנוע.',
  'נזהרים מהחלקה: מאטים בעיקולים ובפניות ונמנעים ככל האפשר מבלימות חירום חדות, בעיקר על סימוני הצבע שעל הכביש.',
  'הגשם מקשה על הראות וגורם להחלקה, הרוח משפיעה על יציבות האופנוע, והשמש עלולה לסנוור.',
  'נזהרים ממפגעים שונים בכביש: עלים יבשים, חצץ, זכוכיות, כתמי שמן ומי ממטרות.',
  'שומרים על מרחק מהרכבים שמסביב כדי להבטיח בלימה בטוחה והתחמקות במקרה הצורך.',
  'מסייעים לנהגים אחרים לראות אתכם: מדליקים אורות, לא עוקפים מימין, לא "מזגזגים" בין הנתיבים, ובמידת האפשר יוצרים קשר עין עם הנהגים.',
  'מקפידים על מהירות נסיעה התואמת את החוק ואת תנאי הדרך (שדה ראייה, מזג אוויר ומצב הכביש).',
  'בהתקרבות לצומת וביציאה מצומת מאטים, מתמקמים בנתיב כך ששדה הראייה רחב יותר ושנהגים אחרים יכולים להבחין בכם, מוודאים שהצומת פנוי ומצייתים לרמזורים ולתמרורים.']),
 'kids_co': ('https://kids.gov.il/sababa/sababa_pool/pages/4451', 'מה מזהם את האוויר? (מאגר מידע סביבתי – זיהום אוויר)', 'kids_co', [
  'פחמן חד-חמצני הוא גז חסר צבע וריח, הנוצר בעיקר משרפת דלק עם כמות בלתי מספקת של חמצן (שרפה לא שלמה) במנועים של כלי רכב.',
  'הוא חודר דרך הריאות למערכת הדם ופוגע בהובלת החמצן בגוף.',
  'חשיפה לכמויות קטנות של פחמן חד-חמצני גורמת לסחרחורות, לבחילות, לכאבי ראש, לפגיעה בערנות ועוד.',
  'חשיפה לכמויות גדולות, שיכולה להתרחש באזורים סגורים, עלולה לגרום להרעלה חריפה - לאובדן הכרה ואף למוות מחנק.',
  'כיוון שגז זה חסר צבע, חסר ריח וחסר טעם - אנו עלולים לא לחוש בו']),
}
P['edu18'] = (EDU18_URL, 'חינוך תעבורתי, נושא 18: הפעלת הרכב בבטחה', 'edu_s18', [
  'החיכוך נוצר בין הדסקית לרפידת הבלם ברכב בעת לחיצה על דוושת הבלם',
  'לחיצה תכופה על הבלמים עלולה להביא להתחממותם ולהיחלשות משמעותית עד אובדן כושר הבלימה',
  'במצב כזה על הנהג לעצור את נסיעתו! רק לאחר שהבלמים יתקררו אפשר לבדוק בנסיעה איטית את חזרת כושר הבלימה',
  'כיצד יזהה הנהג התחממות של הבלמים? הסימנים הם: חולשה בעוצמת הבלימה, ריח של חומר חרוך, רעש בזמן בלימה',
  'לאחר נסיעה בשלולית יש לנהוג באיטיות וללחוץ כמה פעמים על דוושת הבלם כדי שחום החיכוך ייבש את משטחי הרפידות והדסקיות',
  'את לחץ האוויר יש לבדוק כשהצמיגים קרים (לפני נסיעה) ולנפח לפי הוראות יצרן הרכב',
  'מידע על לחץ האוויר ניתן למצוא בספר הרכב או במדבקה הצמודה לרכב',
  'לחץ אוויר נמוך מקשה על הצמיג להתגלגל בחופשיות על פני הכביש ומשפיע מאוד על',
  'צריכת הדלק וזיהום האוויר (עלייה בצריכה',
  'חום הצמיג בנסיעה (בקיצוניות – סכנת פיצוץ לצמיג)',
  'לוח מחוונים שמשמש לבקרה על המערכות השונות ומאפשר קבלת מידע',
  'להפעיל את מתג ההצתה (בלי התנעה) ולסקור את לוח המחוונים',
  'כאשר נדלקת נורה בצבע אדום במהלך הנסיעה עוצרים מיד, ולא ממשיכים בנסיעה',
  'כאשר נדלקת נורה בצבע כתום במהלך הנסיעה פונים לתיקון התקלה בהקדם',
  'מערכת ABS היא מערכת בטיחות המונעת את נעילת הגלגלים בזמן בלימה',
  'בזמן כניסתה של המערכת לפעולה יישמעו נקישות ויורגש רטט בדוושת הבלם',
  'בעת לחיצה חזקה וממושכת על דוושת הבלם', 'ננעלים גלגלי הרכב הקדמיים המשמשים את מערכת ההיגוי',
 ])
P['edu07'] = (EDU + 's07-two-wheeled.pdf', 'חינוך תעבורתי, נושא 7: רכב דו-גלגלי', 'edu_s07', [
  'בלימת חירום עם בלם אחורי בלבד', 'סחרור האופנוע', 'בלימה בשני הבלמים', 'בו-בזמן',
  'דבר זה בולט במיוחד בחשכה, כשפרטים רבים היכולים לעזור לרוכב "לקרוא" את הדרך אינם נראים',
  'בלמים – בדקו את הבלם הקדמי והאחורי, כל אחד בנפרד. ודאו שכל בלם עוצר את האופנוע',
  'קסדה תקנית אינה מגבילה את ראות הרוכב, היא מאפשרת שדה ראייה מספיק',
  'ללא שריטות', 'משקף את תמונת הדרך ללא הסתרות או עיוותים', 'מאפשר לאוויר לזרום דרכו, כדי למנוע הצטברות אדים',
  'היגוי בעזרת הטיית הגוף'])
P['edu13'] = (EDU + 's13-alcohol-and-driving.pdf', 'חינוך תעבורתי, נושא 13: אלכוהול ונהיגה', 'edu_s13', [
  'לאחר שתיית מנה אחת של משקה אלכוהולי (פחית בירה, חצי כוס יין או כוסית משקה חריף) יש להמתין כשעתיים',
  'מנת משקה שווה לפחית בירה, כ-1/2 כוס יין, או כוסית משקה חריף'])
P['edu17'] = (EDU + 's17-special-conditions.pdf', 'חינוך תעבורתי, נושא 17: נהיגה בתנאים מיוחדים', 'edu_s17', [
  'שלולית וכביש מוצף מסוכנים בשל הסיכוי לאובדן שליטה על הרכב',
  'חשוב לנסוע לאט בהילוך הנמוך ביותר, וללחוץ על דוושת הדלק ללא הפוגה על מנת שהרכב לא יכבה',
  'נהיגה בגשם הראשון לאחר תקופת הקיץ מסוכנת במיוחד', 'בתקופת הקיץ מצטברים על פני הכביש לכלוך ושומנים'])
P['edu21'] = (EDU + 's21-accident.pdf', 'חינוך תעבורתי, נושא 21: תאונת דרכים', 'edu_s21', [
  'תאונת דרכים היא "מאורע שבו נגרם לאדם נזק גוף או נזק לרכוש עקב שימוש ברכב למטרות תחבורה"'])
P['pitzuim'] = (PITZ_URL, 'חוק פיצויים לנפגעי תאונות דרכים, סעיף 1 (הגדרות)', 'pitzuim', [
  'ואולם לא יראו כתאונת דרכים מאורע שאירע כתוצאה ממעשה שנעשה במתכוון כדי לגרום נזק לגופו או לרכושו של אותו אדם'])
P['textbook'] = (TEXTBOOK_URL, 'נוהגים אחרת – נוהגים נכון: ספר הלימוד הרשמי לתיאוריה', 'textbook', textbook_quotes())
TERMS = {'url': G + 'pages/gov_terms_of_use', 'title': 'תנאי שימוש באתר gov.il', 'file': 'terms', 'quotes': [
  'שימוש הוגן כולל ציטוט סביר מתוך החומר המוגן',
  'המצטט כאמור חייב לציין את המקור']}

def dates(name):
    f = os.path.join(CACHE, name + '.txt')
    if not os.path.exists(f): return None, None
    t = open(f).read(4000)
    p = re.search(r'תאריך פרסום: (\d\d\.\d\d\.\d{4})', t); u = re.search(r'תאריך עדכון: (\d\d\.\d\d\.\d{4})', t)
    return p and p.group(1), u and u.group(1)

def build(verify_only=False):
    errs, out = [], {}
    old = json.load(open(os.path.join(HERE, 'pages.json'))) if verify_only else {}
    for pid, (url, title, f, qs) in list(P.items()) + [('terms', (TERMS['url'], TERMS['title'], TERMS['file'], TERMS['quotes']))]:
        fn = os.path.join(CACHE, f + ('.txt' if f in PDFS else '.body'))
        if not os.path.exists(fn): errs.append(f'{pid}: no cached text {fn}'); continue
        raw = open(fn, encoding='utf-8').read(); nt = norm(raw)
        pages = raw.split('\f')
        rec = {'url': url, 'title': title, 'publisher': {'terms': 'מערך הדיגיטל הלאומי (gov.il)', 'textbook': TEXTBOOK_PUB, 'edu18': EDU_PUB, 'edu07': EDU_PUB, 'edu13': EDU_PUB, 'edu17': EDU_PUB, 'edu21': EDU_PUB,
               'kids_co': KIDS_PUB, 'pitzuim': PITZ_PUB}.get(pid, PUB),
               'accessed': ACCESSED, 'sha256': hashlib.sha256(raw.encode()).hexdigest(), 'archive': ARCHIVE, 'quotes': []}
        if f in PDFS:
            rec['pdf_sha256'] = hashlib.sha256(open(os.path.join(CACHE, PDFS[f][0]), 'rb').read()).hexdigest()
            rec['published'] = PDFS[f][1]
        elif pid == 'pitzuim':
            rec['published'], rec['revid'], rec['archive'] = '16.12.2025', 2968550, 'Wikisource permanent revision (oldid)'
            rec['src_sha256'] = PITZ_SRC_SHA
        else:
            rec['published'], rec['updated'] = dates(f)
        for q in qs:
            if norm(q) not in nt: errs.append(f'{pid}: quote not in cache: {q[:60]}'); continue
            e = {'t': q}
            if f == 'textbook':
                def prose(pg):
                    for z in quiz_spans(pg): pg = pg.replace(z, '')
                    return pg
                if not any(norm(q) in norm(prose(pg)) for pg in pages):
                    errs.append(f'{pid}: quote only in a sample-exam block: {q[:60]}'); continue
            if f.startswith('edu_'):
                if not any(norm(q) in norm(pg) for pg in edu_prose(raw).split('\f')):
                    errs.append(f'{pid}: quote only in a practice-question block: {q[:60]}'); continue
            if f in PDFS: e['p'] = next(i + 1 for i, pg in enumerate(pages) if norm(q) in norm(pg)) if any(norm(q) in norm(pg) for pg in pages) else None
            rec['quotes'].append(e)
        out[pid] = rec
    if verify_only:
        for k, v in old.items():
            if out.get(k, {}).get('sha256') != v['sha256']: errs.append(f'{k}: sha256 differs from pinned')
    if errs: sys.exit('\n'.join('ERROR ' + e for e in errs))
    if not verify_only:
        json.dump(out, open(os.path.join(HERE, 'pages.json'), 'w'), ensure_ascii=False, indent=1)
    print('ok', len(out), 'pages', sum(len(v['quotes']) for v in out.values()), 'quotes')

if __name__ == '__main__': build('--verify' in sys.argv)
