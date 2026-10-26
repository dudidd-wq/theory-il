# Coverage

**Headline (v1.14.0, whole bank, every question judged; strict figure first, as reviews #9/#10 asked):** of all **1,801** questions, **58.7% strict full** (a sign-dictionary meaning is not counted as teaching; v1.13 + v1.14 strict re-judgements applied, [rejudge_v113_sample.md](../tools/coverage/rejudge_v113_sample.md), [rejudge_v114_sample.md](../tools/coverage/rejudge_v114_sample.md); lesson-body prose never counts), **74.8% full** as judged, **90.1% full or partial**. **Without bank-sourced rules: 74.0% full** (B 79.1%, A 77.1%; see below). **Bank answer contradicts the law ('סתירה בין המאגר לחוק'): 6** (Q13, Q91, Q330, Q333, Q1327, Q1793; neither full nor cited, shown only in a bank lesson next to the law text). **Taught from the official bank only, no official explanation: 145** questions (B 61, A 60, C1 72, C 58, D 68, tractor 65); these are *not* counted as full or partial. **Partial + shown with the official bank answer: B 202 of 202 partial (15.9% of B), A 197 of 197 (17.1% of A)**; whole bank 228 of 276 partial (every partial question that belongs to B or A); these stay *partial* and are not counted as full. Classes B and A: every question that has an official state source is taught (fully or partly); the rest are listed with the search done in [NO_SOURCE_B_A.md](NO_SOURCE_B_A.md).

**v1.9 re-judgement (review #6):** a bank picture shown with its own bank answer (a sign-gallery tile) no longer counts as teaching. 54 questions that were full only via a gallery tile are now full only via the official sign-table meaning of their sign (so they count as partial under *strict*); 36 more were re-judged by hand in `tools/coverage/rejudge_v19.txt` (applied last by `compile_verdicts.py`, one-line reason each): 16 re-based on a cited rule (3 new textbook rules: ABS keeps steering, p.140; traffic-light phase order, p.71–72; flashing green, p.72), 5 on the sign table, 11 downgraded to partial (e.g. Q93, Q983, Q1580) and 4 to untaught (Q520, Q1307 for B/A; Q1257, Q1435 for C/D). Disclosure (v1.9 figures; superseded by the v1.10 bank-sourced section below): some lesson worked examples and 25 rules (14 used by B/A questions) are sourced from a bank question itself (`Q:<id>` in their source); 42 full verdicts rest only on a worked example built on that same question or on a rule sourced from it; the worked examples were kept after a hand check that their explanation states the rule and cites the law or an official page, while the `Q:<id>`-sourced rules are bank-derived and are disclosed here rather than counted as independent official sources.

**v1.10 – questions with no official source (bank-only lessons):** each of the questions (144 in v1.10.0; 141 since v1.11.0, see below) for which no official explanation or legal source was found is now shown, before it is practised, in a "מהמאגר הרשמי" lesson (tools/bank_lessons.py; 7 topic lessons at the end of each class path: law, picture scenes, vehicle, driving technique, motorcycle, heavy vehicles, tractor). Each lesson shows only the question and its correct answer exactly as published in the official data.gov.il bank (CC BY), with a visible label that there is no official explanation or legal source, and no explanation or rule written by us. One note is added where the official textbook differs from the bank (Q1765, textbook p.134 [index 133]: "כך שתהיה בגובה מרכז הגולגולת"). These questions stay in the "no official source" column and are reported separately in the "taught from the official bank only" column; they never count as full or partial. Counting change: a question taught only in a lesson not shown to a class (e.g. a heavy-vehicle rule for a C1/D question) used to be counted as "no official source" for that class; it is now counted as "source exists" (C 62→60, D 72→67, tractor 65→64 no-source).

**v1.10 – bank-sourced rules (review #7):** some lesson rules cited only a bank question (`Q:id`) as their source. Where the pinned law or the official textbook states the same answer, the rule now cites that instead (11 rules: stopping distance ×3, blind spot ×2, load fastening TR 85(א)(4), reversing buzzer TR 359א, warning triangle TR 70, class 1 TR 179, tractor trailer TR 39ו, steep descent textbook; judged in `tools/coverage/rebase_v110.txt`). The remaining rules with only a bank source (signs shape ×2, bus age 21, pupils, tractor ×3, load weight, motorcycle ×4, reaction distance) still teach **18** full verdicts in the whole bank (B 4, A 11), including some that rest on a rule sourced from a *different* bank question (e.g. Q812, Q1478, Q1600, Q1604, Q1606). They are kept in the headline, which is why the **full % without bank-sourced rules** column is reported next to it: the same judgement with every unit whose only source is a bank question removed (v1.9.0 before re-basing, per review #7: whole bank 73.7%, B 79.2%, A 76.9%).

**v1.11 – partly taught B/A questions shown with the official bank answer:** every question that belongs to class B or A and is judged *partial* (213 in the whole bank: B 195, A 180) is now shown in its topic lesson (48 lessons), in a section "שאלות מהמאגר שהשיעור מכסה רק חלקית", before the lesson quiz, which now includes it (tools/partial_bank.py). Each card shows the official question and correct answer exactly as published in the data.gov.il bank (CC BY), then, labelled apart, the existing lesson unit the verdict points to with its own citation ("partly explained in the lesson, from an official source"), and a separate line that the rest of the answer comes from the official bank only. No new text was written: every string is the bank's or an existing lesson unit's. The host lesson is the first verdict unit's lesson that is shown to all of the question's B/A classes. In 15 cards the covering unit cites no official source of its own (13 lesson-text paragraphs, 1 gallery tile, 1 rule sourced from a bank question); those are labelled "partly covered in the lesson, but with no cited official source". Verdicts are unchanged: all 213 remain *partial* (whole bank 75.8% full, 90.3% full or partial). For other classes the same cards appear when the host lesson is in their path (C1 188 of 202 partial, C 154 of 176, D 154 of 180, tractor 150 of 151); partial questions of those classes that are not B/A are not shown in this way.

**v1.12 – new official sources (approved by Dudi, 2026-10-26):** Ministry of Education traffic-education booklets for upper secondary, topics 7 (two-wheelers), 13 (alcohol), 17 (special conditions) and 21 (road accidents), and the Road Accident Victims Compensation Law s.1 (Wikisource oldid 2968550), are pinned in `tools/official/pages.json` with sha256 (prose and tables only; practice questions are rejected by the pin script). 9 new paraphrased rules, each verified against the pinned quote, were appended to moto3, alc2, winter2 and accident. **Full:** Q1661 (both brakes together; rear brake alone can skid), Q1653 (at night the details for "reading" the road are not visible), Q302 (beer is an alcoholic drink, one standard drink), Q1006 (flooded road: slowly in the lowest gear), Q1723 (definition of a road accident: MoE topic 21 + the law's exclusion of intentional acts – only the combination). **Partial** (shown with the official bank answer): Q1596, 1599, 1655, 1657, 1615, 1616. All 11 left `NO_SOURCE_B_A` and the bank-only lessons (141 → 130). **Q281 and Q92 are not cited:** the bank answer may be outdated vs current law (TR 47(ה)(6) is marked deleted and TR 172א cancelled in the pinned text); they stay listed as no-source with that note. An earlier note that MoE topics 2, 4, 5, 7 and 14 return 404 was wrong and is corrected.

**v1.13 – re-judged after review #9 (strict):** Q13 is now *'סתירה בין המאגר לחוק'* (the bank answer 1,500 kg contradicts TR 1's 1,800 kg): neither full nor cited, shown only in a bank lesson next to the law text. Q1297, Q994 and Q935 are *partial* (the cited unit states only part of the answer); Q1021 and Q1688 had only a related rule and are now bank-only (no official explanation). Q22, Q34, Q1029 and Q1773 got their own official rule (TR 83ב(א), TR 1 "רחוב משולב", MoE topics 18 and 17). A strict re-sample of 64 other *full* B/A verdicts (seed 913, [rejudge_v113_sample.md](../tools/coverage/rejudge_v113_sample.md)) kept 52 and downgraded 12 to partial (19%). Because the unsampled full verdicts may hold similar over-generous ones, the **strict** figure is the headline. 15 *full* verdicts rested only on uncited lesson-body prose: 8 now point to the cited rule that decides them, 5 are partial, and Q1199 and Q1759 (class D) are bank-only. Before → after (whole bank): full 76.1% → 75.0%, strict 59.9% → 58.8%, full or partial 90.9% → 90.7%, without bank-sourced 75.1% → 74.1%, bank-only 130 → 135 (incl. the 1 conflict). Rules whose only source is a bank question (e.g. signs Q606/Q477, bus Q1726) are labelled "תשובת המאגר" in their chip.

**v1.11 – re-judged after review #8:** Q978 (picture: red + yellow) is now *full* – sign table 702 ("היכון לנסיעה עם התחלף האור", unit signs#d702) and the textbook light sequence (lights2#r5); Q985 (picture: tanker not keeping right) and Q1464 (C/C1: what affects a loaded truck's stability in a curve) are now *partial* (lanes#r9 keep right; skid2#r8 centre of gravity and lanes#r2 speed for the curve radius). None of the three had been counted as taught before. No-source questions: 144 → 141 (B/A 77 → 75). Three C/C1 citations were corrected to the unit that teaches the answer (1506 → heavy2#r24, 1322 → heavy2#r22, 1393 → heavy2#r17); their verdicts were already *full*.

Definitions:
- **full**: a lesson rule, example, recap or the sign dictionary teaches the answer.
- **strict**: as full, but the sign dictionary alone does not count as teaching (such a question counts as partial).
- **full or partial**: at least part of the answer is taught.
- **no official source**: the pinned law (Wikisource TR oldid 3085628, TO oldid 3085764), the cached gov.il / mot.gov.il pages including the sign table, rsa.org.il, the RSA/MoT textbook, the MoE traffic-education curriculum and (from v1.7.0) the Ministry of Environmental Protection carbon-monoxide page approved by Dudi were searched and no passage supports the answer. These are left unexplained on purpose; nothing is written from general knowledge.

Method: `tools/coverage/verdicts.txt` holds one verdict per question (hand judgement, or the v1.4 sample judgement where one exists). `tools/coverage/compile_verdicts.py` checks that each cited rule still exists and shares keywords with the question; `tools/coverage.py` writes `data/coverage_full.json` (verdict, mapped rule id and one-line reason per question, plus every total below). The old 270-question sample is kept only as a working set; its figures are no longer the headline. The fifth review's independent estimate (full 44.6 / strict 31.7 / any 59.0) was made on v1.4.0, before the v1.5 lessons; the v1.4 whole-bank figure from the same verdicts was about 42.4 / 29.5 / 54.2, in line with it.

## Per licence class (each class's own pool)

| | questions | full % | strict full % | full or partial % | untaught, source exists | untaught, no official source | of these: taught from the official bank only, no official explanation | partial (counted as partial) | of these: shown in a lesson with the official bank answer | full % without bank-sourced rules |
|---|---|---|---|---|---|---|---|---|---|---|
| whole bank | 1801 | 74.8 | 58.7 | 90.1 | 33 | 139 | 145 | 276 | 228 | 74.0 |
| B private car | 1272 | 79.3 | 58.6 | 95.2 | 0 | 57 | 61 | 202 | 202 | 79.1 |
| A motorcycle | 1155 | 77.7 | 55.4 | 94.8 | 0 | 60 | 60 | 197 | 197 | 77.1 |
| C1 truck ≤12 t | 1385 | 77.5 | 58.1 | 92.6 | 30 | 69 | 72 | 210 | 196 | 77.3 |
| C heavy truck | 1314 | 78.8 | 58.4 | 93.0 | 34 | 57 | 58 | 187 | 166 | 78.4 |
| D bus | 1316 | 79.4 | 58.2 | 94.1 | 10 | 67 | 68 | 193 | 167 | 79.0 |
| 1 tractor | 1127 | 79.7 | 56.8 | 94.1 | 2 | 64 | 65 | 162 | 161 | 79.1 |

## Class-only questions (questions that belong to that class alone)

| | questions | full % | strict full % | full or partial % | untaught, source exists | untaught, no official source | of these: taught from the official bank only, no official explanation | partial (counted as partial) | of these: shown in a lesson with the official bank answer | full % without bank-sourced rules |
|---|---|---|---|---|---|---|---|---|---|---|
| B private car | 9 | 55.6 | 55.6 | 77.8 | 0 | 1 | 2 | 2 | 2 | 55.6 |
| A motorcycle | 88 | 54.5 | 54.5 | 84.1 | 0 | 14 | 14 | 26 | 26 | 48.9 |
| C1 truck ≤12 t | 1 | 100.0 | 100.0 | 100.0 | 0 | 0 | 0 | 0 | 0 | 100.0 |
| C heavy truck | 73 | 79.5 | 79.5 | 89.0 | 1 | 6 | 7 | 7 | 0 | 76.7 |
| D bus | 190 | 72.6 | 63.2 | 86.3 | 1 | 24 | 25 | 26 | 0 | 71.6 |
| 1 tractor | 43 | 39.5 | 39.5 | 41.9 | 0 | 25 | 25 | 1 | 0 | 32.6 |

## Per topic (whole bank)

| | questions | full % | strict full % | full or partial % | untaught, source exists | untaught, no official source | of these: taught from the official bank only, no official explanation | partial (counted as partial) | of these: shown in a lesson with the official bank answer | full % without bank-sourced rules |
|---|---|---|---|---|---|---|---|---|---|---|
| law | 901 | 77.6 | 77.4 | 91.2 | 31 | 42 | 48 | 123 | 81 | 77.0 |
| signs | 390 | 92.3 | 18.5 | 98.5 | 1 | 5 | 5 | 24 | 24 | 91.8 |
| safety | 400 | 57.0 | 57.0 | 82.2 | 1 | 70 | 70 | 101 | 95 | 55.0 |
| vehicle | 110 | 54.5 | 54.5 | 80.0 | 0 | 22 | 22 | 28 | 28 | 54.5 |

## Recommendation on classes

No class is removed. Suggested labels: **tractor (1)** partial – its 43 class-only questions are 39.5% full and 25 of them have no official state source (tractor operation and mechanics). **Motorcycle (A)** partial – class-only 56.8% full, 21 without an official source. B, C1, C and D are at or above the bank average.

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
- **Q13** (v1.13): the bank answer is 1,500 kg; the pinned TR 1 says 1,800 kg. Status 'סתירה בין המאגר לחוק' – not counted as full or partial, not cited; the bank lesson shows a note that quotes both.

## v1.4 changes (fourth review)
- **D-only and tractor material:** 10 bus rules (TR 361/482, 408(א), 483א, 83(ג)–(ה), 432א, 1 "רכב מדברי", 418, 324/330 brake terms), taxi rules (TR 506, 281(ב), 266, 501, 511), tractor age 16 (TR 188(א)) and indicators (TR 344(א)); TR 159(ג) (use the retarder on a dangerous descent) in bus and heavy2.
- **Legal wording:** vehicle R3 now paraphrases TR 316 as an equipment-condition rule; vehicle R13 (TR 97(א)) quotes the rule first and marks the conclusion as following from it; heavy2 R0 limits 2.60 m to living and horse trailers and controlled refrigerated bodies (313(א)(1)(ב)); taxi R6 adds 281(ב); taxi R8 keeps "למעט בנסיעה בקו שירות"; 313(ב) rear overhang added.
- **Taxi lesson:** two memory aids and three bank examples (Q1157, Q1221, Q614).
- **heavy2 size diagram:** three views – all lengths side by side, width and the three height limits, rear overhang (60% / 63% / 70% ≤ 3.60 m).
- **gov.il quotes** are marked "ללא ניקוד" in the source chip and in About.
- **Sources:** unchanged rule – official state sources only. ask.ralbad.org.il was not used (not an approved source); non-state tractor pages found by search were not used either.
