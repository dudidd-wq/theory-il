# Coverage audit: is every question topic taught by the lessons? (v1.3.0, 2026-10-26)

**How it was measured**
- `tools/coverage.py` breaks every lesson into knowledge units: rules with their cited excerpts, body, recap, examples, mnemonics, the gallery, and the sign dictionary.
- Each of the 1801 bank questions is matched to those units. The match uses char n‑gram TF‑IDF plus answer discrimination, and lessons outside the question's classes are filtered out. The result goes to `data/coverage.json`: status, lessons and units for each question.
- For the manual check, a fixed random sample (seed 20261026) of **270 questions** was judged by hand as full, partial or none. That gives **166–215 questions per class**. The judgements are in `tools/coverage/judged.json`: `before` holds the v1.1 judgements, `after` the deltas after the v1.2 and v1.3 fixes. The sample is the same one used for v1.1 and v1.2.
- A sign question counts as covered when its לות״ם sign appears in a lesson's gallery or in the in-app sign dictionary. The dictionary is built from the gov.il sign table.
- Percentages are sample estimates. The 95% Wilson CIs are in `docs/coverage_{before,after}.json`.

**Sources allowed (v1.3.0):** official state sources only. That means the law (pinned Wikisource revisions of the Traffic Ordinance and Traffic Regulations), the Ministry of Transport (gov.il / mot.gov.il), and the National Road Safety Authority (its gov.il pages and the March 2026 booklet "כללי בטיחות בדרכים"). Every rule cites a URL plus its section or passage. The 17 gov.il pages are pinned in `tools/official/pages.json` with access date and sha256; see `LICENSE-DATA.md`. No Nevo, theory books, other apps, or general knowledge were used. ask.ralbad.org.il was not used because it is not an approved source.

## Per class (manual sample, % full / % full+partial)

| class | n | before (v1.1) | v1.2 | **v1.3** |
|---|---|---|---|---|
| B | 195 | 23.1 / 38.5 | 51.8 / 67.2 | **61.0 / 77.9** |
| A | 173 | 24.9 / 42.2 | 54.9 / 71.1 | **63.0 / 79.8** |
| C1 | 215 | 21.4 / 36.3 | 49.8 / 65.6 | **60.9 / 78.1** |
| C | 200 | 22.5 / 38.0 | 53.0 / 69.0 | **63.0 / 79.5** |
| D | 192 | 21.4 / 35.9 | 52.1 / 66.7 | **63.5 / 79.7** |
| 1 (tractor) | 166 | 24.1 / 42.2 | 54.2 / 70.5 | **62.0 / 78.9** |
| union of all sampled | 270 | 19.3 / 33.3 | 44.4 / 59.6 | **60.4 / 77.4** |

**Weighted per class.** The sample is a simple random draw from the bank, so each class's subsample is already weighted by how often each topic appears in that class's pool. The only reweighting is for signs: the sign share of the class pool is multiplied by sign coverage, and the non-sign share by non-sign coverage. The weighted figures are (full / any): B 61.3/78.1, A 63.2/79.8, C1 61.2/78.3, C 63.2/79.6, D 63.7/79.8, 1 62.4/79.1. They differ from the raw figures by less than 1 point.

**Why the union was lower than every class.** In v1.2 the union was 44.4% full while every class was above 49%. Each class's figure includes only that class's own questions, so it is dominated by the 145 questions that all six classes share. Those are taught best: 65.5/82.8 in v1.3. The union also counts every question that belongs to only some classes. 56 of the 270 belong to a single class (mostly D‑only, 24, and 1‑only, 8). In v1.2 those were at about 25% and 12.5% full. Each class contains only its own few of them, but the union contains all of them. v1.3 targeted those class‑only questions, so the union is now in line with the classes.

| questions belonging to | n | v1.3 full / any |
|---|---|---|
| 1 class only | 56 | 58.9 / 73.2 (v1.2: 37.5 / 46.4) |
| 2 classes | 29 | 48.3 / 72.4 |
| 3–5 classes | 40 | 51.3 / 67.0 |
| all 6 classes | 145 | 65.5 / 82.8 |

**Class-only questions in the sample** (full / any): A 80/90 (n=10), C 53.8/69.2 (n=13), D 58.3/75 (n=24; v1.2: 25/33), 1 37.5/50 (n=8; v1.2: 12.5/25), C1 1/1.

## Per topic (manual sample; % full / % any)

| topic | n | v1.2 | **v1.3** |
|---|---|---|---|
| law (חוקי התנועה) | 130 | 46.2 / 58.5 | **72.3 / 84.6** |
| signs (תמרורים) | 57 | 82.5 / 89.5 | **82.5 / 89.5** |
| safety (בטיחות) | 66 | 19.7 / 50.0 | **31.8 / 65.2** |
| vehicle (הכרת הרכב) | 17 | 0 / 5.9 | **5.9 / 29.4** |

## Whole-bank app labels (automatic, all 1801 questions)

The app labels every question in the why‑box. A hand judgement, where one exists, overrides the matcher. The labels are: **f** taught, **a** related rule ("כלל קשור", an automatic match), **w** weak or partial, **n** not taught.

| scope | f | a | f+a | any (f+a+w) | not taught |
|---|---|---|---|---|---|
| whole bank | 26.4 | 6.8 | 33.2 | 50.4 | 49.6 |
| B | 30.6 | 6.1 | 36.7 | 52.6 | 47.4 |
| A | 32.6 | 6.4 | 39.0 | 53.8 | 46.2 |
| C1 | 29.4 | 6.2 | 35.6 | 52.4 | 47.6 |
| C | 30.5 | 6.4 | 36.9 | 53.9 | 46.1 |
| D | 31.1 | 5.8 | 36.9 | 52.9 | 47.1 |
| 1 | 33.2 | 5.9 | 39.0 | 53.5 | 46.5 |

For comparison, the v1.2 whole-bank labels were about 29 / 43 / 57 (f+a / any / not taught), per the third review. The app labels sit about 25 points below the hand-judged sample because the automatic matcher is conservative. On the 270-question sample it agrees with the hand labels 72.2% of the time: 139 true positives, 56 true negatives, 5 false positives and 70 false negatives. Nearly all disagreements are questions that a person judges taught but the matcher misses. The app therefore under-claims rather than over-claims.

## Sign coverage

| | sign questions in sample | full | partial |
|---|---|---|---|
| before | 57 | 12 | 12 |
| v1.2 / v1.3 | 57 | 47 | 4 |

- `data/signs.json` holds all 276 table entries in parts 1–9.
- In v1.3, 109 garbled sign meanings, extracted from the gov.il PDF, were cleaned by `tools/signs_tidy.py`. The fixes were hyphen glue, split words and stray brackets. The why‑box still cuts very long meanings at 220 characters.

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
- `node tools/test/e2e.js`: 218 checks, including axe (all impacts) on every B lesson, and that every lesson's diagrams have alt text.

## What is still not taught, and why
These topics stay uncovered because no passage was found in the approved official sources. Nothing was written from general knowledge.

- **Tractor:**
  - PTO (1098)
  - differential lock (1103)
  - spark arrester (1107; "קולט גצים" does not appear in the law)
  - front-axle levelling (1085)
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
  - bus interior mirror (1214)
- **Heavy vehicles:**
  - semi-trailer cab clearance (1354)
  - trailer safety chains (1357)
  - brake test after coupling (1461)
  - coupling procedure (1469)
  - concrete mixer (1770)
  - "rear overhang" dimension number (1637)
  - when to use the retarder (324, 1396)
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
