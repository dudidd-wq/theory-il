# Data licence and attribution

Questions, answers and images in `data/` and `img/q/` come from the official theory-test question banks published by
**משרד התחבורה והבטיחות בדרכים (Ministry of Transport and Road Safety, Israel)** on the Israeli government open-data portal data.gov.il,
under the **Creative Commons Attribution (CC BY)** licence – data.gov.il labels the datasets “Creative Commons Attribution” (licence id `cc-by`) without a version;
the current version is https://creativecommons.org/licenses/by/4.0/ . Portal terms: https://data.gov.il/he/terms-of-use .
Dataset pages use the portal's current address pattern `https://data.gov.il/he/datasets/ministry_of_transport/<dataset>` (checked in a real browser on 2026-10-26).

| Language | Dataset | Title | Licence | Resource last modified | Questions used |
|---|---|---|---|---|---|
| he | [tqhe](https://data.gov.il/he/datasets/ministry_of_transport/tqhe) | מאגר השאלות והתשובות הרשמי למבחן נהיגה עיוני ממוחשב | Creative Commons Attribution | 2021-12-05 | 1801 |
| en | [tqen](https://data.gov.il/he/datasets/ministry_of_transport/tqen) | The complete pool of questions and answers for the computerized driving theory test | Creative Commons Attribution | 2021-12-13 | 1712 |
| ru | [tqru](https://data.gov.il/he/datasets/ministry_of_transport/tqru) | Вопросы и ответы квалификационного экзамена на знание Правил Дорожного Движения | Creative Commons Attribution | 2019-09-05 | 1640 |
| fr | [tqfr](https://data.gov.il/he/datasets/ministry_of_transport/tqfr) | Questions et réponses de l'examen de conduite théorique informatisé | Creative Commons Attribution | 2021-12-13 | 1748 |
| es | [tqes](https://data.gov.il/he/datasets/ministry_of_transport/tqes) | Banco de preguntas del examen teórico a tomarse en el Ministerio de Transporte para y renovar licencias de conducción | Creative Commons Attribution | 2019-09-05 | 1731 |

Changes made (see `tools/build.py`): HTML markup removed from question/answer text, encoding errors fixed, vehicle-class tags normalised
(a Cyrillic «В» in the source is read as class B), images downloaded, resized to 640 px and converted to WebP. Wording and question numbers are unchanged.
Translated banks are matched to the Hebrew bank by question number and image; the Hebrew bank is authoritative.
A consistency gate drops translations whose numbers or text length don't match the Hebrew question (details in `tools/build.log`),
so the "Questions used" column for translations is lower than 1801. The ru and es banks were last updated in 2019 and may be older than the Hebrew bank.
Excluded: Hebrew question 574 (its image is broken in the source).

Not included because the open-data licence is marked *other-open* (not CC BY): the Arabic bank and the A3 (e-bike/e-scooter) bank.

## Lessons (שלב הלימוד) – sources

Lesson explanations, recaps and mnemonics in `data/lessons.json` are **our own wording** (not copied from books or apps).
Every rule shown in a lesson cites a recorded source (`data/sources.json`, with the exact excerpt that the build checks against):

| Source | Edition used | Licence / status |
|---|---|---|
| תקנות התעבורה, התשכ"א–1961 | [Wikisource revision 3085628](https://he.wikisource.org/w/index.php?oldid=3085628) | Legislation – no copyright (Israeli Copyright Act 2007, §6); Wikisource transcription CC BY-SA |
| פקודת התעבורה [נוסח חדש] | [Wikisource revision 3085764](https://he.wikisource.org/w/index.php?oldid=3085764) | as above |
| לוח התמרורים (הודעת התעבורה (קביעת תמרורים), התשע"א–2010, נוסח משולב 09/2022) | [gov.il PDF](https://www.gov.il/BlobFolder/policy/tamrurim_7924_01_18/he/1694327856_%D7%9C%D7%95%D7%AA_%D7%9D_%D7%9E%D7%A9%D7%95%D7%9C%D7%91_0922.pdf) (sha256 7cdd8369…) | Official publication (§6) |
| MOT / RSA pages on gov.il (kind `OFF`) | see the next section | gov.il terms: fair use / reasonable quotation with source; not CC BY |
| Question-bank items used as sign images, worked examples and mini-quizzes | tqhe (above) | CC BY |

## Official MOT / National Road Safety Authority pages (added in v1.3.0)

Rules marked with the source kind `OFF` cite these pages. Each was fetched once on the access date, its text pinned by sha256
(`tools/official/pages.json`; the build re-checks every quoted passage against the pinned text). An archive.org copy was not made:
the archive lookup was rate-limited (HTTP 429), and Save Page Now was deliberately not triggered.

| Page | Publisher | URL | Accessed | sha256 (of text) |
|---|---|---|---|---|
| נהיגה תחת השפעת אלכוהול | הרשות הלאומית לבטיחות בדרכים, חטיבת חינוך והסברה (gov.il) | [drunk_driving](https://www.gov.il/he/Departments/General/drunk_driving) | 2026-10-26 | `0718e9453248…` |
| עייפות בנהיגה | הרשות הלאומית לבטיחות בדרכים, חטיבת חינוך והסברה (gov.il) | [fatigue_while_driving](https://www.gov.il/he/Departments/General/fatigue_while_driving) | 2026-10-26 | `d15f6e01bbdc…` |
| בטיחות צמיגים | הרשות הלאומית לבטיחות בדרכים, חטיבת חינוך והסברה (gov.il) | [tires_safety](https://www.gov.il/he/Departments/General/tires_safety) | 2026-10-26 | `78af82d298f6…` |
| נהיגה בטוחה בחורף | הרשות הלאומית לבטיחות בדרכים, חטיבת חינוך והסברה (gov.il) | [safe_winter_rules](https://www.gov.il/he/Departments/General/safe_winter_rules) | 2026-10-26 | `b4d604ca7059…` |
| נהיגה בטוחה בקיץ | הרשות הלאומית לבטיחות בדרכים, חטיבת חינוך והסברה (gov.il) | [safe_summer_rules](https://www.gov.il/he/Departments/General/safe_summer_rules) | 2026-10-26 | `7a3d46b03355…` |
| עצירה בשול הדרך | הרשות הלאומית לבטיחות בדרכים, חטיבת חינוך והסברה (gov.il) | [road_shoulders](https://www.gov.il/he/Departments/General/road_shoulders) | 2026-10-26 | `3c460e7d0795…` |
| שמירת מרחק | הרשות הלאומית לבטיחות בדרכים, חטיבת חינוך והסברה (gov.il) | [safety_rules_distance](https://www.gov.il/he/Departments/General/safety_rules_distance) | 2026-10-26 | `4f6607b799de…` |
| מהירות | הרשות הלאומית לבטיחות בדרכים, חטיבת חינוך והסברה (gov.il) | [speed](https://www.gov.il/he/Departments/General/speed) | 2026-10-26 | `0d6ae7204828…` |
| חגורות בטיחות | הרשות הלאומית לבטיחות בדרכים, חטיבת חינוך והסברה (gov.il) | [safety_rules_seatbelts](https://www.gov.il/he/Departments/General/safety_rules_seatbelts) | 2026-10-26 | `28d5693f7e9a…` |
| מערכות בטיחות ברכב | הרשות הלאומית לבטיחות בדרכים, חטיבת חינוך והסברה (gov.il) | [safety_systems_rules](https://www.gov.il/he/departments/general/safety_systems_rules) | 2026-10-26 | `f31b4f882330…` |
| מצבי חירום בנהיגה | הרשות הלאומית לבטיחות בדרכים, חטיבת חינוך והסברה (gov.il) | [emergency_situation_driving](https://www.gov.il/he/departments/guides/emergency_situation_driving) | 2026-10-26 | `8b67d527e33e…` |
| נהגי משאיות | הרשות הלאומית לבטיחות בדרכים, חטיבת חינוך והסברה (gov.il) | [truck_drivers_background](https://www.gov.il/he/Departments/General/truck_drivers_background) | 2026-10-26 | `08932ac2e14d…` |
| נהגי אוטובוסים | הרשות הלאומית לבטיחות בדרכים, חטיבת חינוך והסברה (gov.il) | [bus_drivers_rules](https://www.gov.il/he/departments/general/bus_drivers_rules) | 2026-10-26 | `642ea5ee16bf…` |
| נהגים מבוגרים | הרשות הלאומית לבטיחות בדרכים, חטיבת חינוך והסברה (gov.il) | [elderly_drivers](https://www.gov.il/he/departments/general/elderly_drivers) | 2026-10-26 | `998773eb0068…` |
| היסח דעת בנהיגה | הרשות הלאומית לבטיחות בדרכים, חטיבת חינוך והסברה (gov.il) | [distraction_while_driving](https://www.gov.il/he/Departments/General/distraction_while_driving) | 2026-10-26 | `95ae9d62b411…` |
| כללי בטיחות בדרכים (חוברת, מרץ 2026) | הרשות הלאומית לבטיחות בדרכים, חטיבת חינוך והסברה (gov.il) | [publications_safety_rules_book.pdf](https://www.gov.il/BlobFolder/reports/safety_rules_book/he/publications_safety_rules_book.pdf) | 2026-10-26 | `282189364e7a…` |

**Reuse terms (gov.il).** The gov.il terms of use ([תנאי שימוש באתר gov.il](https://www.gov.il/he/pages/gov_terms_of_use), published 25.10.2022,
updated 25.06.2026, accessed 2026-10-26, sha256 `b189cb45d196…`) say, under "זכויות יוצרים":
copyright in government publications on the site belongs to the State of Israel; "המשתמש רשאי לעשות 'שימוש הוגן' בחומר המוגן … שימוש הוגן כולל ציטוט סביר מתוך החומר המוגן";
"המצטט כאמור חייב לציין את המקור"; no distortion or change of the material; and copying, publishing or making derivative works
needs the ministry's prior written consent. These pages are **not** CC BY (unlike the data.gov.il question banks).

How this app complies: lesson text is our own wording; from these pages we keep only short verbatim excerpts (the cited passage,
shown with its source title, publisher, URL and access date) and never copy page text, pictures or layout. The question banks stay under CC BY
(data.gov.il), and legislation stays free of copyright (§6). If the ministry objects to any excerpt we will remove it.

Lesson diagrams (`js/viz.js`) are drawn locally in SVG; their numbers come only from the cited sections. Fines and penalty points are not shown (no citable source was recorded).
Wikisource may lag recent amendments – always check the current official text.

This project is **not an official product** and is not endorsed by the Ministry. Verify against official sources.
