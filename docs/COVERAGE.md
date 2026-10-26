# Coverage audit: is every question topic taught by the lessons? (v1.2.0, 2026-10-26)

**How it was measured**
- `tools/coverage.py` breaks every lesson into knowledge units: rules with their cited excerpts, body, recap, examples, mnemonics, the gallery, and the sign dictionary.
- Each of the 1801 bank questions is matched to those units. The match uses char n‑gram TF‑IDF plus answer discrimination, and lessons outside the question's classes are filtered out. The result goes to `data/coverage.json`: status, lessons and units for each question.
- For the manual check, a fixed random sample (seed 20261026) of **270 questions** was judged by hand as full, partial or none. That gives **166–215 questions per class**. The judgements are in `tools/coverage/judged.json`: `before` holds the v1.1 judgements, `after` the deltas after the v1.2 fixes.
- A sign question counts as covered when its לות״ם sign appears in a lesson's gallery or in the in-app sign dictionary. The dictionary is built from the gov.il sign table.
- Percentages are sample estimates. The 95% Wilson CIs are in `docs/coverage_{before,after}.json`.
- The automatic matcher agrees with the manual labels on 77.4% of the sample. This number is inflated by the sign rule.

## Per class (manual sample, % full / % full+partial)

| class | n | before (v1.1) | after (v1.2) |
|---|---|---|---|
| B | 195 | 23.1 / 38.5 | **51.8 / 67.2** |
| A | 173 | 24.9 / 42.2 | **54.9 / 71.1** |
| C1 | 215 | 21.4 / 36.3 | **49.8 / 65.6** |
| C | 200 | 22.5 / 38.0 | **53.0 / 69.0** |
| D | 192 | 21.4 / 35.9 | **52.1 / 66.7** |
| 1 (tractor) | 166 | 24.1 / 42.2 | **54.2 / 70.5** |
| all sampled | 270 | 19.3 / 33.3 | **44.4 / 59.6** |

## Per topic (after; % full / % any)

| topic | n | full | any |
|---|---|---|---|
| law (חוקי התנועה) | 130 | 46.2 | 58.5 |
| signs (תמרורים) | 57 | 82.5 | 89.5 |
| safety (בטיחות) | 66 | 19.7 | 50.0 |
| vehicle (הכרת הרכב) | 17 | 0 | 5.9 |

## Sign coverage

| | sign questions in sample | full | partial |
|---|---|---|---|
| before | 57 | 12 | 12 |
| after | 57 | 47 | 4 |

- `data/signs.json` holds all 276 table entries in parts 1–9. The explorer now includes parts 5 and 9.
- About 73 sign questions are not linked to a sign number. Their answers name the sign only by picture, so they rely on the gallery and dictionary search.
- The sign meanings in the dictionary are extracted from the gov.il PDF and are sometimes messy, so the explanation box cuts them at 220 characters.

## Build checks
- `python3 tools/coverage.py` exits 1 if any question is not mapped to a lesson.
- `python3 tools/test/data_test.py` checks:
  - every question is mapped
  - the units exist
  - quiz ids and classes are valid
  - every rule, example and recap has a known source
  - sources are only TR/TO (pinned Wikisource), LT/LTP (gov.il) or Q
  - the sign table has 276 entries in parts 1–9, and the explorer ranges match it
  - the eligibility citations exist in TR
  - the review‑2 content fixes are present
  - SW version and data precache are correct

## What is still not taught, and why (examples from the sample)
These topics stay uncovered because no citable source was found within the allowed sources: pinned Wikisource law text, the gov.il sign table, and official gov.il, Ministry of Transport or MDA pages. Nothing was written from general knowledge.

**Vehicle mechanics and maintenance**
- Example questions: 845, 1031, 1039, 1062, 1077, 1079, 1081, 1288, 1290, 1708
- Tractor PTO, differential and spark arrester: 1098, 1103, 1107
- Why uncovered: there is no law text and no official public page that explains these.

**Alcohol physiology** (301, 313, 319)
- The law only sets the limits. Those are already taught in the `sober` lesson, from TO 64ב and TR 169א.

**Fatigue** (1550, partial)

**Defensive driving and vehicle dynamics**
- Examples: 746, 838, 840, 848, 868, 1476, 1481, 1612, 1701
- These are "safe driving" textbook material with no law source.

**Professional licensing details that live in other laws or regulations not pinned here**
- Taxi meter and tariffs: 1157, 1167, 1168, 1180
- Tachograph and rest hours: 1451, 1482
- Commercial-vehicle definitions in the Transport Services Law: 1457
- Container and trailer technical rules: 1326, 1354, 1357, 1419

**Headlight failure at night** (998, 1133, 1680)
- No explicit section was found in the pinned text.

**Some new‑driver renewal questions** (270, 398, 1685, 1686)
- These rest on TO 12א provisions about renewal and conviction that are not yet a lesson rule.
- There are few new‑driver quiz questions for classes A and 1.

**Remaining sign questions** (e.g. 362, 406, 1731 "which sign follows sign X")
- These need sign‑sequence knowledge that is not in the table text.

## Contradictions found (reported, not "fixed" by the app)
- **Q1192** (are rear taxi passengers exempt from belts in town?): the bank's answer is "כן". In the pinned TR 83ב, (א) requires all passengers to be belted. (ג) only lets a taxi driver carry unbelted passengers if a sign is posted, and it has no urban exemption.
- **Q40** ("רכב נוסעים פרטי" definition): the bank uses a pre‑M1 wording and is outdated against TR 1. The lesson teaches the law text and flags the difference.
