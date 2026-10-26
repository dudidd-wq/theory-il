# Coverage

**Headline (v1.5.0, whole bank, every question judged):** of all **1,801** questions, **59.3% full**, **46.4% strict full**, **74.0% full or partial**.

Definitions:
- **full**: a lesson rule, example, recap or the sign dictionary teaches the answer.
- **strict**: as full, but the sign dictionary alone does not count as teaching (such a question counts as partial).
- **full or partial**: at least part of the answer is taught.
- **no official source**: the pinned law (Wikisource TR oldid 3085628, TO oldid 3085764), the cached gov.il / mot.gov.il pages including the sign table, and rsa.org.il were searched and no passage supports the answer. These are left unexplained on purpose; nothing is written from general knowledge.

Method: `tools/coverage/verdicts.txt` holds one verdict per question (hand judgement, or the v1.4 sample judgement where one exists). `tools/coverage/compile_verdicts.py` checks that each cited rule still exists and shares keywords with the question; `tools/coverage.py` writes `data/coverage_full.json` (verdict, mapped rule id and one-line reason per question, plus every total below). The old 270-question sample is kept only as a working set; its figures are no longer the headline. The fifth review's independent estimate (full 44.6 / strict 31.7 / any 59.0) was made on v1.4.0, before the v1.5 lessons; the v1.4 whole-bank figure from the same verdicts was about 42.4 / 29.5 / 54.2, in line with it.

## Per licence class (each class's own pool)

| | questions | full % | strict full % | full or partial % | untaught, source exists | untaught, no official source |
|---|---|---|---|---|---|---|
| whole bank | 1801 | 59.3 | 46.4 | 74.0 | 140 | 328 |
| B private car | 1272 | 56.5 | 40.2 | 71.1 | 106 | 262 |
| A motorcycle | 1155 | 59.3 | 41.7 | 74.6 | 81 | 212 |
| C1 truck ≤12 t | 1385 | 56.9 | 41.7 | 71.4 | 135 | 261 |
| C heavy truck | 1314 | 61.3 | 45.4 | 75.5 | 119 | 203 |
| D bus | 1316 | 62.7 | 45.8 | 76.9 | 89 | 215 |
| 1 tractor | 1127 | 59.7 | 41.6 | 73.8 | 87 | 208 |

## Class-only questions (questions that belong to that class alone)

| | questions | full % | strict full % | full or partial % | untaught, source exists | untaught, no official source |
|---|---|---|---|---|---|---|
| B private car | 9 | 33.3 | 33.3 | 55.6 | 1 | 3 |
| A motorcycle | 88 | 51.1 | 51.1 | 67.0 | 1 | 28 |
| C1 truck ≤12 t | 1 | 100.0 | 100.0 | 100.0 | 0 | 0 |
| C heavy truck | 73 | 79.5 | 79.5 | 90.4 | 1 | 6 |
| D bus | 190 | 74.7 | 65.3 | 88.4 | 1 | 21 |
| 1 tractor | 43 | 39.5 | 39.5 | 41.9 | 0 | 25 |

## Per topic (whole bank)

| | questions | full % | strict full % | full or partial % | untaught, source exists | untaught, no official source |
|---|---|---|---|---|---|---|
| law | 901 | 67.3 | 67.3 | 83.6 | 108 | 40 |
| signs | 390 | 91.3 | 31.5 | 94.4 | 19 | 3 |
| safety | 400 | 22.8 | 22.8 | 44.2 | 10 | 213 |
| vehicle | 110 | 13.6 | 13.6 | 31.8 | 3 | 72 |

## Recommendation on classes

No class is removed. Suggested labels: **tractor (1)** partial – its 43 class-only questions are 39.5% full and 25 of them have no official state source (tractor operation and mechanics). **Motorcycle (A)** partial – class-only 51.1% full, 28 without an official source. B, C1, C and D are at or above the bank average.

## Sign coverage

| | sign questions in the v1.2 sample | full | partial |
|---|---|---|---|
| before | 57 | 12 | 12 |
| v1.2 / v1.3 | 57 | 47 | 4 |

- `data/signs.json` holds all 276 table entries in parts 1–9.
- In v1.3, 109 garbled sign meanings, extracted from the gov.il PDF, were cleaned by `tools/signs_tidy.py`. The fixes were hyphen glue, split words and stray brackets. The why‑box still cuts very long meanings at 220 characters. In v1.4 every entry whose table cell marks the end of the title (".", ":" or "!") is shown as "title – meaning" (e.g. 623 "כביש ללא מוצא – בכביש שלפניך", 701 "אור אדום – עצור! …"); about 50 cells have no such mark and are shown as before. No word of the table was changed.

## Build checks
- `python3 tools/coverage.py` exits 1 if any question is not mapped to a lesson.
- `python3 tools/test/data_test.py` checks:
  - every question is mapped, and the units exist
  - quiz ids and classes are valid
  - every rule, example and recap has a known source, and every rule's check passage is a verbatim substring of the pinned law or the pinned official page
  - the sign table, the explorer ranges and the tidied sign texts
  - the review fixes are present
  - the gov.il terms of use are linked in About and quoted in LICENSE-DATA.md
  - the SW version and data precache are correct
- `node tools/test/e2e.js`: 218+ checks, including axe (all impacts) on every B lesson, and that every lesson's diagrams have alt text.

## What is still not taught, and why
These topics stay uncovered because no passage was found in the approved official sources. Nothing was written from general knowledge.

- **Tractor:**
  - PTO (1098)
  - differential lock (1103)
  - spark arrester (1107; "קולט גצים" does not appear in the law)
  - front-axle levelling (1085)
  - v1.4 review list, checked against the law and the pinned gov.il pages; no official passage found: 1100, 1102, 1092, 1104, 1106, 1088, 1095 (tractor operation and mechanics). Taught in v1.4: 334 (minimum age 16, TR 188(א)) and 1109 (TR 344(א)).
- **Vehicle mechanics:**
  - clutch (1062)
  - engine overheating (1079)
  - bulbs and fuses (1019)
  - broken headlight lens (1023)
  - exhaust leak (1039)
  - seat-back angle (1012)
  - jack safety (1077)
  - tyre grooves (1708; the pinned RSA tyre page covers pressure and wear limits but not this answer)
  - fuel economy (765, 1059, 1290)
  - engine in a closed space (1061)
  - motorcycle foot brake failure (1629)
- **Vehicle dynamics and defensive driving:**
  - centrifugal force (845, 1481)
  - sand on the road (1476)
  - braking onto the shoulder (838)
  - mountain roads (840)
  - looking far ahead (868)
  - keeping right as an escape route (746)
  - gear choice (873)
  - after driving through flood water (1417)
  - picture scenarios (919, 948, 977)
- **Taxi and bus:**
  - taxi tariffs (1167)
  - meter seal (1168)
  - taxi driver smoking (1239; TR 461 covers bus passengers only)
  - taxi licence suspension (1250)
  - tour-guide condition for a רכב סיור (620, partial)
  - bus parking on the sidewalk (1127)
  - 1160 (taxi; no passage in the pinned law or gov.il pages)
  - air-tank fill time for the brakes (1565; TR 324/330 define the brake systems but give no fill time)
  - taught in v1.4 (were open in v1.3 or in the fourth review): bus interior mirror 1214 (TR 361, 482), 1145, 1221, 1280, 613, 1229, 1341, 1137; brake terms 1377 and 1676 are now in the bus lesson too
- **Heavy vehicles:**
  - semi-trailer cab clearance (1354)
  - trailer safety chains (1357)
  - brake test after coupling (1461)
  - coupling procedure (1469)
  - concrete mixer (1770)
  - "rear overhang" dimension number (1637): v1.4 teaches the TR 313(ב) definition and limits, but the answer is a number on a drawing, so it is judged partial
  - when to use the retarder (324, 1396): taught in v1.4 (TR 159(ג))
  - which vehicles may not overtake an overtaking vehicle (1447; TR 47(ח) does not name vehicle types)
  - Transport Services Law definition (1457; that law is not pinned)
- **Other law:**
  - owner liability (290)
  - reporting a change in health (337)
  - security vehicle behind you (767)
  - LPG parking (273)
  - definition of a road accident (1723; it lives in a law that is not pinned)
- **Signs:**
  - which sign follows sign X (362, 406, 1731)
  - EV charging and battery-swap signs ס‑130/131 (1801, 1802; not in the pinned sign table)
  - two picture-only sign questions (446, 467)
- **Junction lane diagrams** (114–116): these are picture-based, and TR 36(ד) is taught but the specific lane answer depends on the drawing.

## Bank vs law differences (reported, not "fixed" by the app)
The bank text is never changed. Where it differs from the pinned law, the why‑box shows a note that quotes both.

- **Q1192** (are rear taxi passengers exempt from seat belts in town?): the bank's answer is "כן". The pinned TR 83ב(א) requires every passenger to be belted. TR 83ב(ג) only permits a taxi driver to carry passengers who do not wear a belt, and only with a posted sign; it gives no urban exemption. The app keeps the bank answer and shows a "בנק מול החוק" note.
- **Q40** ("רכב נוסעים פרטי" definition): the content is consistent; only the wording differs. The bank uses the older wording, and TR 1 / TR 271א now define it through the M1 category. The lesson teaches the law text, and the note explains that the difference is in wording, not in substance.
- **Q592:** checked in the third review. The mapping is correct, and a note was added.
- **Q1667** (A2 power): the bank says 14.6 hp, and TR 176 gives 14.916 hp (11 kW). A note is shown.

## v1.4 changes (fourth review)
- **D-only and tractor material:** 10 bus rules (TR 361/482, 408(א), 483א, 83(ג)–(ה), 432א, 1 "רכב מדברי", 418, 324/330 brake terms), taxi rules (TR 506, 281(ב), 266, 501, 511), tractor age 16 (TR 188(א)) and indicators (TR 344(א)); TR 159(ג) (use the retarder on a dangerous descent) in bus and heavy2.
- **Legal wording:** vehicle R3 now paraphrases TR 316 as an equipment-condition rule; vehicle R13 (TR 97(א)) quotes the rule first and marks the conclusion as following from it; heavy2 R0 limits 2.60 m to living and horse trailers and controlled refrigerated bodies (313(א)(1)(ב)); taxi R6 adds 281(ב); taxi R8 keeps "למעט בנסיעה בקו שירות"; 313(ב) rear overhang added.
- **Taxi lesson:** two memory aids and three bank examples (Q1157, Q1221, Q614).
- **heavy2 size diagram:** three views – all lengths side by side, width and the three height limits, rear overhang (60% / 63% / 70% ≤ 3.60 m).
- **gov.il quotes** are marked "ללא ניקוד" in the source chip and in About.
- **Sources:** unchanged rule – official state sources only. ask.ralbad.org.il was not used (not an approved source); non-state tractor pages found by search were not used either.
