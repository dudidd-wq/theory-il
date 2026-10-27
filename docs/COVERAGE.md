# Coverage

**Headline (v1.20.0, whole bank, every question judged; strict figure first, as reviews #9–#16 asked):** of all **1,801** questions, **56.9% strict full** (a sign-dictionary meaning is not counted as teaching; v1.13–v1.16 strict re-judgements applied, [rejudge_v113_sample.md](../tools/coverage/rejudge_v113_sample.md), [rejudge_v114_sample.md](../tools/coverage/rejudge_v114_sample.md), [rejudge_v115_sample.md](../tools/coverage/rejudge_v115_sample.md), [rejudge_v116_sample.md](../tools/coverage/rejudge_v116_sample.md); lesson-body prose never counts), **72.8% full** as judged, **89.3% full or partial**. **Class B: 56.8% strict full; 77.3% full as judged is an upper bound – estimated ≈73.0% (71.1–74.3%) after the strict re-samples (23 of 168 downgraded, 13.7%, applied to the 402 B full verdicts never checked strictly).** Review #12's own estimate was ≈74% (72–76%). **Without bank-sourced rules: 72.8% full** (B 77.3%, A 75.6%; see below). **Bank answer contradicts the law ('סתירה בין המאגר לחוק'): 6** (Q13, Q91, Q330, Q333, Q1327, Q1793; neither full nor cited, shown only in a bank lesson next to the law text). **Taught from the official bank only, no official explanation: 161** questions (B 64, A 71, C1 75, C 62, D 72, tractor 71); these are *not* counted as full or partial. **Partial + shown with the official bank answer: B 225 of 225 partial (17.7% of B), A 211 of 211 (18.3% of A)**; whole bank 296 of 296 partial (every partial question that belongs to B or A); these stay *partial* and are not counted as full. Classes B and A: every question that has an official state source is taught (fully or partly); the rest are listed with the search done in [NO_SOURCE_B_A.md](NO_SOURCE_B_A.md).

**v1.9 re-judgement (review #6):** a bank picture shown with its own bank answer (a sign-gallery tile) no longer counts as teaching. 54 questions that were full only via a gallery tile are now full only via the official sign-table meaning of their sign (so they count as partial under *strict*); 36 more were re-judged by hand in `tools/coverage/rejudge_v19.txt` (applied last by `compile_verdicts.py`, one-line reason each): 16 re-based on a cited rule (3 new textbook rules: ABS keeps steering, p.140; traffic-light phase order, p.71–72; flashing green, p.72), 5 on the sign table, 11 downgraded to partial (e.g. Q93, Q983, Q1580) and 4 to untaught (Q520, Q1307 for B/A; Q1257, Q1435 for C/D). Disclosure (v1.9 figures; superseded by the v1.10 bank-sourced section below): some lesson worked examples and 25 rules (14 used by B/A questions) are sourced from a bank question itself (`Q:<id>` in their source); 42 full verdicts rest only on a worked example built on that same question or on a rule sourced from it; the worked examples were kept after a hand check that their explanation states the rule and cites the law or an official page, while the `Q:<id>`-sourced rules are bank-derived and are disclosed here rather than counted as independent official sources.

**v1.10 – questions with no official source (bank-only lessons):** each of the questions (144 in v1.10.0; 141 since v1.11.0, see below) for which no official explanation or legal source was found is now shown, before it is practised, in a "מהמאגר הרשמי" lesson (tools/bank_lessons.py; 7 topic lessons at the end of each class path: law, picture scenes, vehicle, driving technique, motorcycle, heavy vehicles, tractor). Each lesson shows only the question and its correct answer exactly as published in the official data.gov.il bank (CC BY), with a visible label that there is no official explanation or legal source, and no explanation or rule written by us. One note is added where the official textbook differs from the bank (Q1765, textbook p.134 [index 133]: "כך שתהיה בגובה מרכז הגולגולת"). These questions stay in the "no official source" column and are reported separately in the "taught from the official bank only" column; they never count as full or partial. Counting change: a question taught only in a lesson not shown to a class (e.g. a heavy-vehicle rule for a C1/D question) used to be counted as "no official source" for that class; it is now counted as "source exists" (C 62→60, D 72→67, tractor 65→64 no-source).

**v1.10 – bank-sourced rules (review #7):** some lesson rules cited only a bank question (`Q:id`) as their source. Where the pinned law or the official textbook states the same answer, the rule now cites that instead (11 rules: stopping distance ×3, blind spot ×2, load fastening TR 85(א)(4), reversing buzzer TR 359א, warning triangle TR 70, class 1 TR 179, tractor trailer TR 39ו, steep descent textbook; judged in `tools/coverage/rebase_v110.txt`). The remaining rules with only a bank source (signs shape ×2, bus age 21, pupils, tractor ×3, load weight, motorcycle ×4, reaction distance) still teach **18** full verdicts in the whole bank (B 4, A 11), including some that rest on a rule sourced from a *different* bank question (e.g. Q812, Q1478, Q1600, Q1604, Q1606). They are kept in the headline, which is why the **full % without bank-sourced rules** column is reported next to it: the same judgement with every unit whose only source is a bank question removed (v1.9.0 before re-basing, per review #7: whole bank 73.7%, B 79.2%, A 76.9%).

**v1.11 – partly taught B/A questions shown with the official bank answer:** every question that belongs to class B or A and is judged *partial* (213 in the whole bank: B 195, A 180) is now shown in its topic lesson (48 lessons), in a section "שאלות מהמאגר שהשיעור מכסה רק חלקית", before the lesson quiz, which now includes it (tools/partial_bank.py). Each card shows the official question and correct answer exactly as published in the data.gov.il bank (CC BY), then, labelled apart, the existing lesson unit the verdict points to with its own citation ("partly explained in the lesson, from an official source"), and a separate line that the rest of the answer comes from the official bank only. No new text was written: every string is the bank's or an existing lesson unit's. The host lesson is the first verdict unit's lesson that is shown to all of the question's B/A classes. In 15 cards the covering unit cites no official source of its own (13 lesson-text paragraphs, 1 gallery tile, 1 rule sourced from a bank question); those are labelled "partly covered in the lesson, but with no cited official source". Verdicts are unchanged: all 213 remain *partial* (whole bank 75.8% full, 90.3% full or partial). For other classes the same cards appear when the host lesson is in their path (C1 188 of 202 partial, C 154 of 176, D 154 of 180, tractor 150 of 151); partial questions of those classes that are not B/A are not shown in this way.

**v1.12 – new official sources (approved by Dudi, 2026-10-26):** Ministry of Education traffic-education booklets for upper secondary, topics 7 (two-wheelers), 13 (alcohol), 17 (special conditions) and 21 (road accidents), and the Road Accident Victims Compensation Law s.1 (Wikisource oldid 2968550), are pinned in `tools/official/pages.json` with sha256 (prose and tables only; practice questions are rejected by the pin script). 9 new paraphrased rules, each verified against the pinned quote, were appended to moto3, alc2, winter2 and accident. **Full:** Q1661 (both brakes together; rear brake alone can skid), Q1653 (at night the details for "reading" the road are not visible), Q302 (beer is an alcoholic drink, one standard drink), Q1006 (flooded road: slowly in the lowest gear), Q1723 (definition of a road accident: MoE topic 21 + the law's exclusion of intentional acts – only the combination). **Partial** (shown with the official bank answer): Q1596, 1599, 1655, 1657, 1615, 1616. All 11 left `NO_SOURCE_B_A` and the bank-only lessons (141 → 130). **Q281 and Q92 are not cited:** the bank answer may be outdated vs current law (TR 47(ה)(6) is marked deleted and TR 172א cancelled in the pinned text); they stay listed as no-source with that note. An earlier note that MoE topics 2, 4, 5, 7 and 14 return 404 was wrong and is corrected.

**v1.13 – re-judged after review #9 (strict):** Q13 is now *'סתירה בין המאגר לחוק'* (the bank answer 1,500 kg contradicts TR 1's 1,800 kg): neither full nor cited, shown only in a bank lesson next to the law text. Q1297, Q994 and Q935 are *partial* (the cited unit states only part of the answer); Q1021 and Q1688 had only a related rule and are now bank-only (no official explanation). Q22, Q34, Q1029 and Q1773 got their own official rule (TR 83ב(א), TR 1 "רחוב משולב", MoE topics 18 and 17). A strict re-sample of 64 other *full* B/A verdicts (seed 913, [rejudge_v113_sample.md](../tools/coverage/rejudge_v113_sample.md)) kept 52 and downgraded 12 to partial (19%). Because the unsampled full verdicts may hold similar over-generous ones, the **strict** figure is the headline. 15 *full* verdicts rested only on uncited lesson-body prose: 8 now point to the cited rule that decides them, 5 are partial, and Q1199 and Q1759 (class D) are bank-only. Before → after (whole bank): full 76.1% → 75.0%, strict 59.9% → 58.8%, full or partial 90.9% → 90.7%, without bank-sourced 75.1% → 74.1%, bank-only 130 → 135 (incl. the 1 conflict). Rules whose only source is a bank question (e.g. signs Q606/Q477, bus Q1726) are labelled "תשובת המאגר" in their chip.

**v1.14 – re-judged after review #10 (strict):** uncited lesson-body prose no longer counts at all (19 questions re-judged: Q768 full via TR 58; 12 stay partial on cited rules; Q199 and Q1774 got their own official rule (TR 71, TR 107(ד)); Q257, Q964, Q1064, Q1631 untaught, no official source found; Q1327 conflict). Bank-vs-law conflicts 1 → 6: Q333 (bank 17 years vs TO s.12 16 years 9 months) and, from a scan of every note saying the bank differs, Q91, Q330, Q1327, Q1793 (see below). Inflation fixes: Q467, Q654, Q644 full→partial; Q993 re-pointed to brakes3#r11; Q611 untaught; Q1558 and Q1058 now rest on their own textbook passage (p.149, p.127). A second strict re-sample of 66 other full B/A verdicts (seed 1014, [rejudge_v114_sample.md](../tools/coverage/rejudge_v114_sample.md)) kept 59 and downgraded 6 to partial (9%); the unsampled full verdicts may still hold a similar share, so the **strict** figure stays the headline. Before → after (whole bank): strict 58.8% → 58.7%, full 75.0% → 74.8%, full or partial 90.7% → 90.1%, without bank-sourced 74.1% → 74.0%, bank-only 135 → 145 (incl. the 6 conflicts); B full 79.4% → 79.3% (strict 58.6%), A 78.1% → 77.7% (strict 55.7% → 55.4%). Chips: the TR 54 speed table is shown row by row (each number next to its road type); truncated chips carry the clause they teach; textbook chips shorter than 45 characters 77/327 → 27/343 (all whole list items); no wikitext residue; a test checks that every number a rule states appears in its displayed passage.

**v1.16 – re-judged after review #12 (strict):** the reviewer's items: Q819 → partial; Q812 full via the textbook's reaction-distance definition (moveoff#r9, p.22); Q1796 and Q1595 stay full only because their example now shows TR 120(א) "משני צדי האופנוע"; Q1509 and Q904 → partial; Q1112 → partial (the bank-only "engine revs" claim was removed from tractor#r8); Q1489 re-based to the textbook (p.96). A fourth strict re-sample of **84** other full B/A verdicts (seed 1216, pool 506, all earlier samples excluded; [rejudge_v116_sample.md](../tools/coverage/rejudge_v116_sample.md)) downgraded **12** to partial (14.3%, Wilson 95% 8.4–23.3%) and kept 4 only after their chip was extended. Pooled with v1.15 (23 of 168, 13.7%) and applied to the 397 class-B full verdicts never checked strictly ([strict_checked.txt](../tools/coverage/strict_checked.txt)), class B is estimated at ≈72.7% (70.8–74.1%) – the same sentence is shown on the About page. Alcohol (Q309): the rule now states the law first (TR 169א; TO 64ב(א)(3א): 50 µg per litre of breath / 10 mg per 100 ml of blood for new and young drivers) and shows the textbook's "בכל ריכוז שהוא" (p.147) attributed, as the textbook's simplification; a scan of the other textbook number/absolute claims against the law found no further contradiction. Tyre pressure: the official sources themselves differ (textbook p.126 "פעם בשבוע לפחות"; p.150 and the gov.il tyres page "אחת לשבועיים"); both rules now say so and cite both. Weak chips extended or trimmed (turns#r7, speed#r7, cockpit#r9, tractor#r8, maint2#r2, rail2#r2, signs3#r4, turns#r5, skid2#r0, distance#r2, sign-list residue in signs3#r12/#r13).

**v1.17 – re-judged after review #13 (strict, claims checked against their passage):** text that went beyond its cited source was removed: roads2#r22 "וגם בזמן עקיפה אין לעבור אותה" (not in TR 54); yield2#r0 "slows down and lets him merge only if he began to exit" → Q888 partial; yield2#r4's uncited example → Q955 untaught (no official source); the "braking force or inertia" gloss → Q843 partial. duty#r1 now quotes TR 23 "שוטר שהזדהה בתעודת מינוי" → Q61 full. A new stricter test checks every clause of every cited rule against its own passages and the full cited section (≥34% of its content words, with Hebrew prefix/suffix stems); it found more uncited additions, trimmed in turns#r1 (cyclist example → Q879, Q725 partial), law4#r5 ("at the annual test" → Q1046 partial), signs3#r0/r2, maint2#r8, moto3#r10, roads2#r4; law3#r3, brakes3#r5 and sober#r17 got the missing quote. The 30 remaining low-overlap rules (headings, section-number glosses, close paraphrase) were re-read and are listed with a reason in data_test. alc2#r4 was checked against TO 47 and now also states the police officer's 30/60/90-day administrative disqualification. Net: whole bank full 73.1% → 72.8%, class B 77.0% → 76.7%, strict B 56.3% → 56.0%.

**v1.20 – re-judged after review #16 (why box, quote lengths, lesson practice, sign labels):** the 'למה?' box no longer cuts a sign's value at 220 characters – the 'כוחו יפה' column is always shown (25 cut signs → 0; Q584 sign 626, Q532 sign 501); the About claim 'up to 20 words per quote' was false (76 of 349 longer, max 49) and is replaced by figures computed from the data (350 quotes, median 13, 274 ≤ 20, max 49) and tested; each lesson's practice set now holds only questions mapped to a rule taught in that lesson (134 dangling → 0; licence2 102 questions with 100 dangling → 12 with 0; 1,569 → 1,559 questions practised in some lesson; Q1333 no longer practised untaught); Q1790 → alc2#r1 (partial), Q1014 → full on safety2#r7, Q1509 full → partial, Q1780 stays partial, Q1009 → full on a new textbook rule safety2#r11 (p. 134; a B question cannot be 'none – untaught' while the textbook states it); sober#m0 now shows the (א) chapeau 'נהג חדש'; split words in the sign dictionary fixed after a full scan (514 'לצומת', 722 'מעבר'); law notes '1(,)500' etc. → '1,500' (9 sections); 47 of 52 sign-table chips now label column 4 'כוחו יפה' (was 2; 4 signs 701/705/723/724 quote no such column); on partial cards the worked example's own bank question is shown apart as 'שאלת הדוגמה מהמאגר (לא מקור רשמי)' (16 units). Figures: whole bank full 72.5% / strict 56.5% / any 89.2% (unchanged); partial 302 → 301; class B 76.8/56.3 → 76.9/56.4; class A 75.3/53.2 → 75.2/53.1.

**v1.19 – re-judged after review #15 (sign dictionary, operative terms, bank-only rules, PDF spacing):** the sign dictionary (data/signs.json) is rebuilt from the sign table with its columns kept apart (" · "), so no entry runs two columns together (27 merged entries → 0, 7 unclosed quotes → 0; 282 sign questions' practice feedback changed); every fully taught answer's operative words must appear in a displayed passage of its cited rule, not in an elided paragraph (overtake#r3 now shows TR 47(ב)(3), the public-transport lane that decides Q1767; 6 chips un-elided, Q175 re-judged); no lesson teaches a rule whose only source is the bank answer (signs#r9, signs#r10 and the rules of 12 more questions removed; 14 questions moved to the "מהמאגר הרשמי" lessons, not counted, like Q606 – Q477 among them; 4 re-pointed to the law: Q97, Q723, Q1445, Q1478); docs#r5 says what TR 174(ב) says; every law chip carries its chapeau chain (12 bare "(N)" chips → 0, 34 chips gained their lead-in; cockpit#r1, newdrv#m0, sober#m0 complete); Q1704 (fatigue) → the RSA fatigue rules (partial), Q856/Q857/Q1509/Q1510 → full on the same page; PDF spacing/bidi artefacts in shown passages normalised (442 → 0 in lessons). compile_verdicts.py is no longer run by the build: tools/coverage/full.json plus the rejudge files are the record. Whole bank: strict full 56.9% → 56.5%, full 72.8% → 72.5%, full or partial 90.0% → 89.2%, bank-only 147 → 161; class B full 76.7% → 76.8%, class A 75.6% → 75.3%.

**v1.18 – re-judged after review #14 (chip integrity, twins):** every chip is now a whole sentence – a numbered item is shown with its chapeau, so no chip drops the negation that governs it (brakes3#r5 "ואַל לו לנהג להיבהל מכך ולהרפות מדוושת הבלם", edu18 p.8, in full); twin questions (same or near-same text) share their rule and verdict (Q260→defensive#r11 TR 107(ד) like Q1774; Q992 like Q1001; 6 more pairs aligned); alc2#r4 states TO s.47 exactly (90 days after a fatal accident is mandatory, 60/30 discretionary); the sign-table entries LT:203/LT:218 are the sign's own entry with the "כוחו יפה" column shown apart, and PDF split words are rejoined; Q1702 and Q454 → full, Q375 → partial (306-after-135 is an inference), Q606 → not counted (its only rule is the bank answer itself; no official text states the warning-sign shape).

**v1.15 – re-judged after review #11 (strict):** the reviewer's items: Q1058, Q1012 and Q1558 → partial (Q1558's source speaks of a blowout and a puncture; "במתינות" is gone from the rule); Q1028 stays full only because its chip now carries "…ואף מפורטת בספר הרכב של היצרן" (p.126); Q644 (partial) and Q611 (untaught: no official passage says the wet-road skid and roll-over risk grows with speed) re-checked and unchanged. A third strict re-sample of **84** other full B/A verdicts (seed 1115, pool 623, all earlier samples excluded; [rejudge_v115_sample.md](../tools/coverage/rejudge_v115_sample.md)) downgraded **11** to partial (13.1%, Wilson 95% 7.5–21.9%), re-pointed Q1779 to TR 64(2) and kept 71. Before → after: whole bank full 74.8% → **74.0%** (strict 58.7% → **57.9%**, any 90.1% → 90.1%, nobank 74.0% → 73.1%); B 79.3% → **78.1%** (strict 58.6% → **57.4%**); A 77.7% → **76.9%** (strict 55.4% → **54.5%**); bank-only 145, conflicts 6 (unchanged). 78.1% B full is still an upper bound: applying the sampled downgrade rate to the 506 B full verdicts never strictly sampled gives **≈72.9% (≈69–75%)**, consistent with review #11's own estimate of 72–76%. Also: junk sign passages (parking#r10, signs3#r7) now show the real clause, licence2#r3 carries "אלא אם יוכיח מי נהג", law3#r0 states TO s.71א1 as written (including its exception: not in a lane signed for mass-transit vehicles other than buses), and 10 weak chips now show every claim of their rule (or the rule was trimmed).

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
| whole bank | 1801 | 72.8 | 56.9 | 89.3 | 32 | 155 | 161 | 296 | 296 | 72.8 |
| B private car | 1272 | 77.3 | 56.8 | 95.0 | 0 | 60 | 64 | 225 | 225 | 77.3 |
| A motorcycle | 1155 | 75.6 | 53.4 | 93.9 | 0 | 71 | 71 | 211 | 211 | 75.6 |
| C1 truck ≤12 t | 1385 | 75.6 | 56.4 | 92.5 | 29 | 72 | 75 | 234 | 234 | 75.6 |
| C heavy truck | 1314 | 77.0 | 56.8 | 92.8 | 33 | 61 | 62 | 207 | 207 | 77.0 |
| D bus | 1316 | 77.8 | 56.8 | 93.8 | 9 | 71 | 72 | 211 | 211 | 77.8 |
| 1 tractor | 1127 | 77.5 | 54.7 | 93.5 | 2 | 70 | 71 | 181 | 181 | 77.5 |

## Class-only questions (questions that belong to that class alone)

| | questions | full % | strict full % | full or partial % | untaught, source exists | untaught, no official source | of these: taught from the official bank only, no official explanation | partial (counted as partial) | of these: shown in a lesson with the official bank answer | full % without bank-sourced rules |
|---|---|---|---|---|---|---|---|---|---|---|
| B private car | 9 | 66.7 | 66.7 | 77.8 | 0 | 1 | 2 | 1 | 1 | 66.7 |
| A motorcycle | 88 | 48.9 | 48.9 | 75.0 | 0 | 22 | 22 | 23 | 23 | 48.9 |
| C1 truck ≤12 t | 1 | 100.0 | 100.0 | 100.0 | 0 | 0 | 0 | 0 | 0 | 100.0 |
| C heavy truck | 73 | 78.1 | 78.1 | 87.7 | 1 | 7 | 8 | 7 | 7 | 78.1 |
| D bus | 190 | 72.1 | 62.6 | 85.8 | 1 | 25 | 26 | 26 | 26 | 72.1 |
| 1 tractor | 43 | 32.6 | 32.6 | 34.9 | 0 | 28 | 28 | 1 | 1 | 32.6 |

## Per topic (whole bank)

| | questions | full % | strict full % | full or partial % | untaught, source exists | untaught, no official source | of these: taught from the official bank only, no official explanation | partial (counted as partial) | of these: shown in a lesson with the official bank answer | full % without bank-sourced rules |
|---|---|---|---|---|---|---|---|---|---|---|
| law | 901 | 76.8 | 76.6 | 91.1 | 30 | 44 | 50 | 129 | 129 | 76.8 |
| signs | 390 | 90.5 | 17.2 | 97.9 | 1 | 7 | 7 | 29 | 29 | 90.5 |
| safety | 400 | 51.8 | 51.8 | 79.2 | 1 | 82 | 82 | 110 | 110 | 51.8 |
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
  - every number a rule, example, mnemonic or recap states appears in its displayed passage, and a page named in a rule matches its chip (v1.14)
  - no verdict rests on uncited lesson-body prose; a note saying the bank differs is a conflict (v1.14)
  - no wikitext residue in any chip (v1.14)
  - every passage has real words (not a bare sign number or punctuation), a number check never passes on the sign number alone, and 15 rules' distinctive claim terms appear in their passage (v1.15)
  - no rule shows a passage twice, no repealed item renders as "((בוטלה).)", bank-lesson subtitles say whether they hold law-conflict items (v1.15)
  - v1.16: the About B sentence equals COVERAGE.md and coverage.json 'est'; Q309/alc2#r0/sober#r14 state the TO 64ב(3א) limit; the distinctive claim terms of 10 more rules (the review #12 weak chips) are in their own passage, unsourced phrases stay out of trimmed rules, no sign-list chip carries another entry's residue, multi-passage rules open with a labelled passage, tyre-pressure rules cite both official wordings
  - v1.17: no '<wbr>' or other tag in any law-section heading; no PDF running footer ('לוח תמרורים … ספטמבר 2022'), displaced stand-alone punctuation, reversed '!', addressee column 'נוהג רכב' or mid-word cut in any of the sign-table passages in sources.json; every rule clause is backed by its cited passage (30 reviewed exceptions); the 5 review #13 phrases are absent; a lesson example keeps its rule's 'הספר אינו אחיד' note; MoE-server sources carry the flaky-link note; e2e: every visible link and control on 79 screens at 320/360/390 px is ≥24×24 px
  - v1.18 chip integrity: no chip drops a negation word right before its start, starts or ends mid-sentence or mid-word; a numbered law item carries its chapeau; no law chip stops on an open list without " …"
  - v1.18 twins: every pair of non-image questions with identical/near-identical text is classified (19 pairs); twins share rule and verdict (one listed exception), distinct pairs are listed
  - v1.18 sign table: no lone Hebrew letter (PDF split word) in any passage; LT:203/LT:218 show the sign's own entry with the meaning and "כוחו יפה" columns apart
  - v1.19 sign dictionary: every signs.json entry keeps the table's columns apart; no entry runs two columns together or leaves a quote open
  - v1.19 operative terms: no fully taught answer rests on a paragraph that its cited chip elides (overtake#r3 shows TR 47(ב)(3))
  - v1.19 bank-only: no regular lesson rule cites only a bank question (s=Q:…); such questions are bank-only and not counted
  - v1.19 chapeaus: no law chip opens on a bare "(N)" item; docs#r5 matches TR 174(ב); sober#m0/cockpit#r1/newdrv#m0 complete
  - v1.19 fatigue: Q1704 and its twins cite only the RSA fatigue rules
  - v1.19 spacing: no glued number/Latin–Hebrew, detached punctuation or glued dash in lessons/sources/signs; chip_integrity.py skips without the cache
  - v1.20: every 'למה?' sign feedback carries its 'כוחו יפה' column; the About quote-length claim equals the data; every lesson practice question maps to a rule of that lesson; N3 verdicts; no split-word fragments in signs/lessons/sources; no '1(,)500' artefacts; labelled sign-table chips; partial cards list no Q: link among official sources
  - clean clone (v1.17): fetch_cache downloads each meyda.education.gov.il PDF up to 6 times (cache-buster, backoff), accepts only a %PDF file with the pinned sha256 (the server alternates between the PDF and an HTTP-200 'שגיאה 404' page; edu07 was valid in 1 of 3 tries) and otherwise uses a sha256-identical copy from --pdf-dir; edu13 is served normally again (its 'removed upstream' note was corrected to 'intermittent')
  - clean clone (v1.16): `python3 tools/official/fetch_cache.py` rebuilds the pinned pages from their official URLs into the gitignored cache (PDFs by direct download; gov.il HTML once each in a headed Chrome under xvfb-run, because gov.il blocks headless clients), each checked against its committed sha256. Fresh clone on 2026-10-27: 23/25 rebuilt directly; kids_co had gained one sentence after the cited passage and was re-pinned (accessed 2026-10-27); edu13's official URL now returns 404 (withdrawn by the publisher, Wayback capture truncated), so it is rebuilt with `--pdf-dir` from a sha256-identical local copy of the 2026-10-26 download (note in pages.json). Then 25/25, `pin.py --verify` ok and every data_test check passes with no SKIP
  - runs from a clean clone: the pinned law (tools/law/law.json, oldid 3085628/3085764) is committed; the two checks that need the full textbook pages print SKIP unless `tools/official/fetch_cache.py` has rebuilt them from the official PDF (sha256-verified) – gov.il terms do not allow republishing whole pages (v1.15)
  - the gov.il terms of use are linked in About and quoted in LICENSE-DATA.md
  - the SW version and data precache are correct
- `node tools/test/e2e.js`: 280 checks, including axe (all impacts) on every B lesson, and that every lesson's diagrams have alt text.

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
- **Q333** (v1.14): minimum age for B – bank 17 years; TO s.12 says 16 years and 9 months. Conflict.
- **Q91** (v1.14): special medical vehicle on a B licence – bank up to 4,000 kg; TR 180(א)(5) says 5,000 kg. Conflict.
- **Q330** (v1.14): trailer on a B licence – bank trailer up to 1,500 kg; TR 180(ב) sets the combination limit (5,000 kg). Conflict.
- **Q1327** (v1.14): who must secure the load – bank "הנהג בלבד"; TR 85(א) also binds the owner/person in control (cf. Q326). Conflict.
- **Q1793** (v1.14): minibus – bank 16 passengers; TR 1 "אוטובוס זעיר" says up to 19 besides the driver. Conflict.
- These 6 are 'סתירה בין המאגר לחוק': not counted as full or partial and not cited; a build test marks any rule or note saying the bank differs as a conflict.

## v1.4 changes (fourth review)
- **D-only and tractor material:** 10 bus rules (TR 361/482, 408(א), 483א, 83(ג)–(ה), 432א, 1 "רכב מדברי", 418, 324/330 brake terms), taxi rules (TR 506, 281(ב), 266, 501, 511), tractor age 16 (TR 188(א)) and indicators (TR 344(א)); TR 159(ג) (use the retarder on a dangerous descent) in bus and heavy2.
- **Legal wording:** vehicle R3 now paraphrases TR 316 as an equipment-condition rule; vehicle R13 (TR 97(א)) quotes the rule first and marks the conclusion as following from it; heavy2 R0 limits 2.60 m to living and horse trailers and controlled refrigerated bodies (313(א)(1)(ב)); taxi R6 adds 281(ב); taxi R8 keeps "למעט בנסיעה בקו שירות"; 313(ב) rear overhang added.
- **Taxi lesson:** two memory aids and three bank examples (Q1157, Q1221, Q614).
- **heavy2 size diagram:** three views – all lengths side by side, width and the three height limits, rear overhang (60% / 63% / 70% ≤ 3.60 m).
- **gov.il quotes** are marked "ללא ניקוד" in the source chip and in About.
- **Sources:** unchanged rule – official state sources only. ask.ralbad.org.il was not used (not an approved source); non-state tractor pages found by search were not used either.
