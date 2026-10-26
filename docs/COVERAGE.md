# Coverage audit: is every question topic taught by the lessons? (v1.4.0, 2026-10-26)

**Headline (v1.4.0, hand-judged sample of 270):** union **61.5% full / 78.9% full+partial**. **Strict figure** (the sign dictionary is not counted as teaching: a sign question whose only "full" unit is the dictionary counts as partial): **48.5% full / 78.9% full+partial**; per class B 44.6, A 45.1, C1 46.5, C 48.0, D 47.9, 1 43.4 (% full). The fourth review's own strict estimate was about 35–38% full; it used the same definition but the reviewer's own hand labels on a different reading of the units, which judged more questions partial. Both figures are shown so the reader can pick the stricter one.

**How it was measured**
- `tools/coverage.py` breaks every lesson into knowledge units: rules with their cited excerpts, body, recap, examples, mnemonics, the gallery, and the sign dictionary.
- Each of the 1801 bank questions is matched to those units. The match uses char n‑gram TF‑IDF plus answer discrimination, and lessons outside the question's classes are filtered out. The result goes to `data/coverage.json`: status, lessons and units for each question.
- For the manual check, a fixed random sample (seed 20261026) of **270 questions** was judged by hand as full, partial or none. That gives **166–215 questions per class**. The judgements are in `tools/coverage/judged.json`: `before` holds the v1.1 judgements, `after` the deltas after the v1.2, v1.3 and v1.4 fixes. The sample is the same one used for v1.1 and v1.2.
- A sign question counts as covered when its לות״ם sign appears in a lesson's gallery or in the in-app sign dictionary. The dictionary is built from the gov.il sign table.
- Percentages are sample estimates. The 95% Wilson CIs are in `docs/coverage_{before,after}.json`.

**Sources allowed (v1.3.0 and v1.4.0):** official state sources only. That means the law (pinned Wikisource revisions of the Traffic Ordinance and Traffic Regulations), the Ministry of Transport (gov.il / mot.gov.il), and the National Road Safety Authority (its gov.il pages and the March 2026 booklet "כללי בטיחות בדרכים"). Every rule cites a URL plus its section or passage. The 17 gov.il pages are pinned in `tools/official/pages.json` with access date and sha256; see `LICENSE-DATA.md`. No Nevo, theory books, other apps, or general knowledge were used. ask.ralbad.org.il was not used because it is not an approved source.

## Per class (manual sample, % full / % full+partial)

| class | n | before (v1.1) | v1.2 | v1.3 | **v1.4** | v1.4 strict |
|---|---|---|---|---|---|---|
| B | 195 | 23.1 / 38.5 | 51.8 / 67.2 | 61.0 / 77.9 | **61.0 / 77.9** | 44.6 / 77.9 |
| A | 173 | 24.9 / 42.2 | 54.9 / 71.1 | 63.0 / 79.8 | **63.0 / 79.8** | 45.1 / 79.8 |
| C1 | 215 | 21.4 / 36.3 | 49.8 / 65.6 | 60.9 / 78.1 | **61.9 / 79.5** | 46.5 / 79.5 |
| C | 200 | 22.5 / 38.0 | 53.0 / 69.0 | 63.0 / 79.5 | **64.0 / 81.0** | 48.0 / 81.0 |
| D | 192 | 21.4 / 35.9 | 52.1 / 66.7 | 63.5 / 79.7 | **65.1 / 81.2** | 47.9 / 81.2 |
| 1 (tractor) | 166 | 24.1 / 42.2 | 54.2 / 70.5 | 62.0 / 78.9 | **62.0 / 78.9** | 43.4 / 78.9 |
| union of all sampled | 270 | 19.3 / 33.3 | 44.4 / 59.6 | 60.4 / 77.4 | **61.5 / 78.9** | 48.5 / 78.9 |

In the strict column only the full share changes: a dictionary-only sign question moves from full to partial, so full+partial stays the same.

**Weighted per class.** The sample is a simple random draw from the bank, so each class's subsample is already weighted by how often each topic appears in that class's pool. The only reweighting is for signs: the sign share of the class pool is multiplied by sign coverage, and the non-sign share by non-sign coverage. The weighted v1.4 figures are (full / any): B 61.3/78.1, A 63.2/79.8, C1 62.1/79.6, C 64.2/81.1, D 65.2/81.3, 1 62.4/79.1. They differ from the raw figures by less than 1 point.

**Why the union was lower than every class.** In v1.2 the union was 44.4% full while every class was above 49%. Each class's figure includes only that class's own questions, so it is dominated by the 145 questions that all six classes share. Those are taught best: 65.5/82.8 in v1.3. The union also counts every question that belongs to only some classes. 56 of the 270 belong to a single class (mostly D‑only, 24, and 1‑only, 8). In v1.2 those were at about 25% and 12.5% full. Each class contains only its own few of them, but the union contains all of them. v1.3 targeted those class‑only questions, so the union is now in line with the classes.

| questions belonging to | n | v1.4 full / any | v1.3 |
|---|---|---|---|
| 1 class only | 56 | 60.7 / 75.0 | 58.9 / 73.2 (v1.2: 37.5 / 46.4) |
| 2 classes | 29 | 48.3 / 75.9 | 48.3 / 72.4 |
| 3–5 classes | 40 | 57.5 / 72.5 | 51.3 / 67.0 |
| all 6 classes | 145 | 65.5 / 82.8 | 65.5 / 82.8 |

**Class-only questions in the sample** (full / any): A 80/90 (n=10), C 53.8/69.2 (n=13), D 62.5/79.2 (n=24; v1.3: 58.3/75; v1.2: 25/33), 1 37.5/50 (n=8; unchanged – the tractor-mechanics questions have no official source), C1 1/1.

## Per topic (manual sample; % full / % any)

| topic | n | v1.2 | v1.3 | **v1.4** |
|---|---|---|---|---|
| law (חוקי התנועה) | 130 | 46.2 / 58.5 | 72.3 / 84.6 | **74.6 / 87.7** |
| signs (תמרורים) | 57 | 82.5 / 89.5 | 82.5 / 89.5 | **82.5 / 89.5** |
| safety (בטיחות) | 66 | 19.7 / 50.0 | 31.8 / 65.2 | **31.8 / 65.2** |
| vehicle (הכרת הרכב) | 17 | 0 / 5.9 | 5.9 / 29.4 | **5.9 / 29.4** |

## Whole-bank app labels (automatic, all 1801 questions)

The app labels every question in the why‑box. A hand judgement, where one exists, overrides the matcher. The labels are: **f** taught, **a** related rule ("כלל קשור", an automatic match), **w** weak or partial, **n** not taught.

| scope | f | a | f+a | any (f+a+w) | not taught |
|---|---|---|---|---|---|
| whole bank | 27.4 | 7.1 | 34.5 | 51.6 | 48.4 |
| B | 30.8 | 6.1 | 36.9 | 52.8 | 47.2 |
| A | 32.7 | 6.3 | 39.0 | 53.9 | 46.1 |
| C1 | 29.9 | 6.3 | 36.2 | 53.1 | 46.9 |
| C | 31.1 | 6.5 | 37.6 | 54.6 | 45.4 |
| D | 32.2 | 6.1 | 38.3 | 54.1 | 45.9 |
| 1 | 33.6 | 5.7 | 39.3 | 53.8 | 46.2 |

(v1.4; v1.3 whole bank was 26.4 / 6.8 / 33.2 / 50.4 / 49.6.)

For comparison, the v1.2 whole-bank labels were about 29 / 43 / 57 (f+a / any / not taught), per the third review. The app labels sit about 25 points below the hand-judged sample because the automatic matcher is conservative. On the 270-question sample it agrees with the hand labels 71.1% of the time (v1.3: 72.2%): 140 true positives, 52 true negatives, 5 false positives and 73 false negatives. The small drop is because v1.4 hand-judged more questions as taught (e.g. Q324, Q1396) that the matcher does not reach. The four matcher misses named in the fourth review (Q1443, Q1072, Q1515, Q768) now carry hand judgements and show as taught. Nearly all disagreements are questions that a person judges taught but the matcher misses. The app therefore under-claims rather than over-claims.

## Sign coverage

| | sign questions in sample | full | partial |
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
