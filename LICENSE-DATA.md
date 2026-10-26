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
| נוהגים אחרת – נוהגים נכון: ספר הלימוד הרשמי לתיאוריה (2017) | הרשות הלאומית לבטיחות בדרכים ומשרד התחבורה (gov.il) | [PDF](https://www.gov.il/BlobFolder/reports/driving_textbook/he/publications_2017_nohagim_aheret_nohagim_nachon.pdf) (landing page [driving_textbook](https://www.gov.il/he/pages/driving_textbook)) | 2026-10-26 | `7ea6a255ec79…` (PDF) |
| חינוך תעבורתי, נושא 18: הפעלת הרכב בבטחה (12.2019) | משרד החינוך – תוכנית הלימודים בחינוך תעבורתי (meyda.education.gov.il) | [traffic-s18-operating-safely.pdf](https://meyda.education.gov.il/files/Curriculum/high-school/download/traffic-s18-operating-safely.pdf) | 2026-10-26 | `3a72a445481a…` |
| חינוך תעבורתי, נושא 7: רכב דו-גלגלי (09.2019) | משרד החינוך – תוכנית הלימודים בחינוך תעבורתי (meyda.education.gov.il) | [traffic-s07-two-wheeled.pdf](https://meyda.education.gov.il/files/Curriculum/high-school/download/traffic-s07-two-wheeled.pdf) | 2026-10-26 | `451b096b02b7…` |
| חינוך תעבורתי, נושא 13: אלכוהול ונהיגה (12.2019) | משרד החינוך – תוכנית הלימודים בחינוך תעבורתי (meyda.education.gov.il) | [traffic-s13-alcohol-and-driving.pdf](https://meyda.education.gov.il/files/Curriculum/high-school/download/traffic-s13-alcohol-and-driving.pdf) | 2026-10-26 | `0eb7fd97701d…` |
| חינוך תעבורתי, נושא 17: נהיגה בתנאים מיוחדים (12.2019) | משרד החינוך – תוכנית הלימודים בחינוך תעבורתי (meyda.education.gov.il) | [traffic-s17-special-conditions.pdf](https://meyda.education.gov.il/files/Curriculum/high-school/download/traffic-s17-special-conditions.pdf) | 2026-10-26 | `2133b06d3409…` |
| חינוך תעבורתי, נושא 21: תאונת דרכים (12.2019) | משרד החינוך – תוכנית הלימודים בחינוך תעבורתי (meyda.education.gov.il) | [traffic-s21-accident.pdf](https://meyda.education.gov.il/files/Curriculum/high-school/download/traffic-s21-accident.pdf) | 2026-10-26 | `83eed7a0b591…` |
| חוק פיצויים לנפגעי תאונות דרכים, סעיף 1 (הגדרות) (16.12.2025) | ויקיטקסט – נוסח החוק, גרסה קבועה | [oldid=2968550](https://he.wikisource.org/w/index.php?title=%D7%97%D7%95%D7%A7_%D7%A4%D7%99%D7%A6%D7%95%D7%99%D7%99%D7%9D_%D7%9C%D7%A0%D7%A4%D7%92%D7%A2%D7%99_%D7%AA%D7%90%D7%95%D7%A0%D7%95%D7%AA_%D7%93%D7%A8%D7%9B%D7%99%D7%9D&oldid=2968550) | 2026-10-26 | `5d29f42ee0cc…` |
| מה מזהם את האוויר? (מאגר מידע סביבתי) | המשרד להגנת הסביבה – סבבה (kids.gov.il) | [sababa_pool/pages/4451](https://kids.gov.il/sababa/sababa_pool/pages/4451) | 2026-10-26 | `2d5bc0efeda8…` |

**Reuse terms (gov.il).** The gov.il terms of use ([תנאי שימוש באתר gov.il](https://www.gov.il/he/pages/gov_terms_of_use), published 25.10.2022,
updated 25.06.2026, accessed 2026-10-26, sha256 `b189cb45d196…`) say, under "זכויות יוצרים":
copyright in government publications on the site belongs to the State of Israel; "המשתמש רשאי לעשות 'שימוש הוגן' בחומר המוגן … שימוש הוגן כולל ציטוט סביר מתוך החומר המוגן";
"המצטט כאמור חייב לציין את המקור"; no distortion or change of the material; and copying, publishing or making derivative works
needs the ministry's prior written consent. These pages are **not** CC BY (unlike the data.gov.il question banks).

How this app complies: lesson text is our own wording; from these pages we keep only short verbatim excerpts (the cited passage,
shown with its source title, publisher, URL and access date) and never copy page text, pictures or layout. The question banks stay under CC BY
(data.gov.il), and legislation stays free of copyright (§6). If the ministry objects to any excerpt we will remove it.

### The official textbook "נוהגים אחרת – נוהגים נכון" (`OFF:textbook`)

- **Its own copyright notice (p. 3):** "אין לשכפל, להעתיק, לצלם, להקליט, לתרגם, לאחסן במאגר מידע, לשדר או לקלוט … כל חלק שהוא מהחומר שבספר הדרכה זה, אלא ברשות מפורשת בכתב ומראש מהרשות הלאומית לבטיחות בדרכים." (no copying without prior written permission of the National Road Safety Authority).
- **How the site uses it:** every rule is our own paraphrase, labelled with the book's name and page. Short unaltered phrases are kept as the cited excerpt (to verify the rule and show the source). The book, its pictures and its layout are not hosted or copied; the PDF is cached only in the gitignored `tools/official/cache/`. Quotes from the book's sample-exam questions are never used.
- **Counts (v1.13.0, computed at build time into `data/coverage.json` `tb`):** 182 of the 811 lesson rules cite it; 330 excerpts from 96 of its 170 pages; 2,751 words in total (at most 20 per excerpt), about 6.0 % of the book's ~45,600 words. (The v1.9.0 text said 173 rules / 312 excerpts / 95 pages; the real v1.9.0 figures were 176 / 316 / 96, per review #7.) Every excerpt is checked verbatim against the pinned text at build time.
- **Basis:** reasonable quotation with the source named and without change ("fair use", Copyright Act 2007 §19, as the gov.il terms allow). Because the book asks for written permission and the total number of excerpts is substantial, this is a judgement call, not a certainty (details: `docs/TEXTBOOK_LICENCE.md`; not legal advice).
- **Permission status:** written permission from the National Road Safety Authority **has not been requested and has not been obtained**. If the Authority objects, the excerpts will be removed.

### Ministry of Education traffic-education topic 18 (`OFF:edu18`)

- 10 lesson rules, 15 short excerpts. Used as prose only (its practice questions are never cited).
- **Own terms:** the PDF carries no copyright or licence notice (checked 2026-10-26). Ministry of Education portal pages show "© כל הזכויות שמורות למשרד החינוך". We did not find a separate terms-of-use page that governs meyda.education.gov.il files, so none is pinned. We treat it like the gov.il pages: State copyright, short quotation with the source named, no change.

### Ministry of Education traffic-education topics 7, 13, 17, 21 (`OFF:edu07`, `OFF:edu13`, `OFF:edu17`, `OFF:edu21`) – since v1.12.0

- Approved by Dudi on 2026-10-26 (18:20 UTC+2). Same curriculum, same terms and same treatment as topic 18: prose and tables only, never their practice questions (the pin script blanks the 'שאלות (ל)תרגול לקראת מבחן התיאוריה / בתיאוריה' blocks and rejects a quote found only there).
- PDF sha256 checked against the candidates' SHA256SUMS before pinning; `pages.json` keeps `pdf_sha256`, the text sha256 and the page of every quote.
- 9 lesson rules (moto3 ×6, alc2, winter2, accident).

### Road Accident Victims Compensation Law, 1975, section 1 (`OFF:pitzuim`) – since v1.12.0

- Pinned like the Transport Regulations and the Traffic Ordinance: a permanent Wikisource revision (oldid 2968550, 16.12.2025); the MediaWiki API JSON sha256 `8fdd952b285622e1…` is kept as `src_sha256`. One short quote (the "not an intentional act" exclusion of the definition of a road accident), used only together with MoE topic 21 for Q1723.

### kids.gov.il "סבבה" environmental information pool (`OFF:kids_co`)

- 1 lesson rule, 3 short excerpts.
- **Own terms:** [תנאי שימוש במידע באתר המשרד להגנת הסביבה](https://kids.gov.il/sababa/sababa_pool/terms.html) (read 2026-10-26; a direct download returned HTTP 403, so the page is not pinned by sha256). It says copyright belongs to the State of Israel; "המשתמש רשאי לעשות 'שימוש הוגן' בחומר המוגן … שימוש הוגן כולל ציטוט סביר מתוך החומר המוגן. המצטט כאמור חייב לציין את המקור"; no change or distortion; copying or republishing needs prior written consent. The footer reads "© כל הזכויות במאגר מידע סביבתי שמורות למשרד להגנת הסביבה". Same approach: short excerpts with the source named.

## Licences of the repository contents

- **Code** (`js/`, `tools/`, `sw.js`, HTML/CSS): MIT (`LICENSE`). The MIT licence covers only the code written for this project.
- **Question banks and their images** (`data/q*.json`, `img/q/`): © Ministry of Transport and Road Safety, CC BY (see above). Not MIT.
- **Wikisource excerpts** (the law-text excerpts in `data/sources.json`, kinds TR/TO): the legislation itself has no copyright (§6), but the Wikisource transcription is **CC BY-SA 4.0** (https://creativecommons.org/licenses/by-sa/4.0/) and **stays CC BY-SA** when this repository is reused, even though the repo is MIT. Attribution: he.wikisource.org contributors, revisions 3085628 (TR) and 3085764 (TO).
- **Excerpts from official pages and booklets** (kind `OFF`, including the textbook, edu18 and kids.gov.il): not CC BY and not MIT; quoted under fair use / reasonable quotation subject to each publisher's terms above. Reusers must make their own fair-use assessment.

**CC BY version caveat.** data.gov.il marks the banks "Creative Commons Attribution" (`cc-by`) without stating a version. We link CC BY 4.0, the current version, and follow its attribution and change-notice terms; the portal does not say which version it intends.


Lesson diagrams (`js/viz.js`) are drawn locally in SVG; their numbers come only from the cited sections. Fines and penalty points are not shown (no citable source was recorded).
Wikisource may lag recent amendments – always check the current official text.

This project is **not an official product** and is not endorsed by the Ministry. Verify against official sources.
