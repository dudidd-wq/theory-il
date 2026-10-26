# PROGRESS – theory-il (תאוריה לנהיגה)
Resume here after interruptions. Plan: /workspace/driving-theory-plan/PLAN.md
- [x] repo created + Pages (https://github.com/dudidd-wq/theory-il → https://dudidd-wq.github.io/theory-il/)
- [x] data pipeline: `python3 tools/fetch.py && python3 tools/build.py` → data/q.*.json, data/manifest.json, img/q/*.webp (1801 he q; Q574 excluded – broken image in source; translations matched by id+image, own correct index)
- [x] app shell (RTL, themes, SW, manifest, fonts)
- [x] onboarding profile (vehicle class)
- [x] practice by topic / sign trainer / mock exam / mistakes SRS / bookmarks / stats
- [x] parent view, read-aloud, gamification
- [x] backup (IDB, persist, file, code, autosave, reminder, undo)
- [x] about/sources/privacy/disclaimer
- [x] Playwright mobile+desktop + axe: `python3 -m http.server 8787 --bind 127.0.0.1 & node tools/test/e2e.js` (52 checks × 2 profiles)
- [x] live check — e2e 104/104 against https://dudidd-wq.github.io/theory-il/ (v1.0.1, 2026-10-26)

## Notes
- translations have different answer ORDER than Hebrew → each lang stores its own correct index; app shuffles anyway
- ru/es banks are 2019 versions; Hebrew is authoritative (shown in UI)
- every change: `python3 tools/bump.py` (patch) → syncs js/version.js + sw.js VERSION, regenerates sw-assets.js (image precache list)
- SW caches are prefixed `theory-il-` (activate only deletes its own; github.io origin is shared)
- no test hook: e2e.js reads localStorage + the published data files

## v1.1 – learning phase (שלב הלימוד) + review fixes
- [x] review fix: cross-language consistency gate in build.py (numbers in q + correct answer, length ratios vs language median) – drops en 89 / ru 161 / fr 52 / es 70 suspect translations (shown in Hebrew instead); catches en/fr #257, fr #108, es #1400, en #1776
- [x] review fix: build.py docstring no longer claims a "same correct position" check (banks shuffle answers); "older bank version" note for ru/es (2019) questions
- [x] law sources: Wikisource "ספר החוקים הפתוח" (תקנות התעבורה, פקודת התעבורה) → tools/law/law.json; official לוח התמרורים PDF (gov.il) → tools/law/lotam.json
- [x] lessons spec + validator (every rule cites a section; check strings must occur in the cited text) → data/lessons.json, data/sources.json
- [x] learn UI: path per class, lesson view (intro, rules + law chips, visual, sign gallery, examples, mini-quiz, recap, mnemonic), mastery + unlocks, TTS
- [x] visuals: own SVG/CSS (priority, following distance slider, speed table, overtaking, parking distances, blind spots, sign shapes, motorcycle) – text alternative, reduced motion
- [x] store/backup schema 2 (S.les) with v1 migration; readiness includes lessons; parent view
- [x] About/LICENSE-DATA/README: law + sign-table sources, §6 note
- [x] 1.1.0 SW bump, e2e learn tests (path, locks, law chips, viz alt + reduced motion, recap, quiz→mastery→unlock, en note, dark, offline, backup les) 196/196 local
- [x] pushed d2a758f, Pages built, live e2e 196/196 (2026-10-26)

### Review findings 1 (fold-in)
- [x] HIGH: data.gov.il links → /he/datasets/ministry_of_transport/<id> (About, manifest, LICENSE-DATA, fetch.py, raw meta) + CC BY 4.0 link; all 5 dataset pages + terms checked 200 in Chrome (2026-10-26)
- [x] Translation consistency gate + ru/es 2019 flag (also in About source list)
- [x] Exam: persist/resume across reload/update; topic-weighted mix; unanswered not recorded
- [x] SRS: all seen questions scheduled by due date
- [x] Notice "bank last updated 2021" on welcome + exam intro
- [x] Teen feel: welcome illustration, pass celebration (reduced-motion safe), toast off Next, streak freeze, 2-column desktop
- [x] Backup reminder only after real copy/share/download
- [x] SW: banner for an already-waiting worker; data fetch timeout; image cache refresh
- [x] Drop data/raw from the published site (raw banks + law.json untracked; regenerate with tools/fetch.py / tools/law/fetch.py+parse.py, sha256 in data/raw/meta.json); test hook `window.__theory` removed, e2e reads localStorage + data files (130/130 local)
- [x] Alt text / screen-reader notice (generic alt + sr-only note per picture question + About section; no invented descriptions); per-class eligibility (js/elig.js, own wording, every line links TR 176–189/221 at pinned revid); search by text/number (#/search); mistakes filter by topic (#/review/all-<topic>)

## v1.2 – coverage audit (are all question topics taught by the lessons?)
- [x] tools/coverage.py: lesson knowledge units (rules + cited excerpt, body, recap, examples, gallery) → auto match per question (char n-gram TF-IDF + answer-discrimination) → data/coverage.json
- [x] manual judgement sample (seed 20261026, 270 Qs, 166–215 per class) → tools/coverage/judged.json; before numbers docs/coverage_before.json (full 21–25%, full+partial 36–42% per class)
- [x] sign coverage: sign questions → לות"ם numbers (data/signs.json, 276 entries, parts 1–9); sample sign questions full 12→47 of 57
- [x] fixes: 6 new law-cited lessons (signal, duty, sober, accident, terms, cargo) + bus rules + sign dictionary; 22 lessons / 108 sources, all TR/TO pinned Wikisource or gov.il לות"ם
- [x] "why" box + "related lesson"/"learn this" link after answering (no link when the topic is not taught)
- [x] build-time test: tools/coverage.py exits 1 on unmapped; tools/test/data_test.py (mapping, units, quizzes, sources, signs, elig, review fixes, SW)
- [x] 1.2.0 SW bump, e2e, push, live check; after numbers in docs/COVERAGE.md (sample full 19→44%, full+partial 33→60%)
- [x] pushed f0d14e0, Pages built, live e2e 216/216, data_test all passed (2026-10-26 10:50 IST)

### review #2 findings (theory_review_findings_2.md), by severity
- [x] HIGH bus/heavy headlights: 97(ג) season 1.11–31.3 also for bus/taxi/>14,999 (Q1155)
- [x] new-driver definition per TO 12א(א) (exception is about the *previous* licence); newdrv lesson on A and 1 paths
- [x] per-answer "why" (matching rule + citation) after each answer
- [x] "learn this" link on wrong answers and in mistakes list (grouped by lesson + practise per lesson)
- [x] alcohol/accident/duties lessons from law; vehicle-basics lesson NOT added – no citable official source (see docs/COVERAGE.md)
- [x] lesson quizzes drawn from questions mapped to that lesson
- [x] Q180 example: 125 is an upright triangle
- [x] citations: Q207→72(א)(7); Q88→48(ג); overtake 47(ו)(1) exception; rail 117(ב) condition + 117(ג)
- [x] 189(ט) minibus 18; A1 line in elig.js
- [x] low: diagram focus at last step; no achievement toast on wrong answer; blind-spot starts on lesson vehicle; red ring speed sign; Wikisource CC BY-SA in About; image precache retry + "X of N saved"; signs explorer parts 5 & 9; aria-valuetext
- [x] restore: merge option (opt-in checkbox)

## v1.3 – official sources (law + MOT + National Road Safety Authority) and review #3
- [x] 17 official gov.il pages pinned (tools/official/pages.json: access date + sha256; no archive copy – archive.org 429, Save Page Now not used)
- [x] gov.il terms of use checked; recorded in About ("מקורות רשמיים") and LICENSE-DATA.md (fair use / ציטוט סביר with source; no alteration; not CC BY)
- [x] alcohol, fatigue, speed, distance, tyres, winter/summer, shoulder, emergency, truck/bus drivers – cited RSA rules in sober/defensive/vehicle/heavy2/bus/moto2
- [x] headlight failure (TR 97), new-driver renewal (TO 12א + 3rd schedule), tachograph/rest (TR 364ד, 168), trailer/container (TR 85א, 313)
- [x] new lesson taxi (D): TR 501, 503, 510, 511, 485, 517, 281, 83(א), 184, 385א, 447, 369א + taxi-ride diagram
- [x] class-only: TR 86 (bulk cargo), 34(א) (moto2), 38, 359א (tractor), 65 (junction), 324 (service brakes); tractor diagram
- [x] review #3, all 10 findings: Q1192 note, Q40 wording-only, Q592 note, "כלל קשור" label, honest figures in COVERAGE.md, moto2/heavy2/vehicle lessons, 109 sign texts tidied, Q1767/Q88 mapping, sober 547, axe aria-allowed-role
- [x] still uncovered (no official source): tractor PTO/differential/spark arrester/levelling, mechanics, vehicle dynamics, taxi tariff/meter seal – see docs/COVERAGE.md
- [x] sample 44→60% full, 60→77% any; whole bank labels f+a 33%, any 50%

## v1.4.0 (review #4)
- [x] D-only rules: Q1214, 1145, 1221, 1280, 613, 1229, 1341, 1137 taught (TR 361/482, 408(א), 483א, 83(ג)–(ה), 432א, 1, 418, 506); 1160 – no official source
- [x] brake terms (TR 324/330: Q1377, 1676) in the bus lesson; TR 159(ג) retarder on dangerous descents (Q324, 1396)
- [x] tractor: age 16 (TR 188(א), Q334), indicators (TR 344(א), Q1109); 1100, 1102, 1092, 1085, 1107, 1104, 1106, 1088, 1095 – no official source, listed in COVERAGE.md
- [x] legal wording: vehicle R3 (316), R13 (97(א)), heavy2 R0 2.60 m, taxi R6 281(ב), taxi R8 קו שירות; 313(ב) rear overhang
- [x] matcher misses Q1443, 1072, 1515, 768 hand-judged
- [x] sign dictionary "title – meaning"; "ללא ניקוד" on gov.il quotes and in About
- [x] taxi mnem + 3 bank examples; heavy2 size diagram (lengths / width-height / rear overhang)
- [x] sample union 60.4→61.5% full, 77.4→78.9% any; strict (dictionary = partial) 48.5% full; reviewer's own strict estimate 35–38%

## v1.5.0 (review #5 + "בחן את כל השאלות")
- [x] all 1,801 questions judged (tools/coverage/verdicts.txt → data/coverage_full.json: verdict, rule id, reason; per-class, class-only, per-topic totals incl. strict)
- [x] headline is now the whole bank: 59.3% full / 46.4% strict / 74.0% any (v1.4 baseline from the same verdicts 42.4 / 29.5 / 54.2; reviewer's v1.4 estimate 44.6 / 31.7 / 59.0); per-class table in COVERAGE.md and About
- [x] new lessons: busline, cargo2, taxi2, moto3, tractor2, equip, terms2, law2, parking2, roads2, signs2 (class-only + general gaps, TR 313(ב), TR 1, gov.il pages), rules3 (TR 159, 160, 157, 80, 38, 84, 85, 26), docs (TR 9, 13, 174, 276, 283, 290, 308, 169ד, TO 12א1); TR 47(א) for Q1630
- [x] stored judgements keyed by rule id + keyword check; stale pointers (Q1571 → terms, TR 1) fixed; weak automatic matches hidden
- [x] "not explained yet" box: link to the official bank (data.gov.il tqhe) + the class's gov.il page; plain "no official state source" variant
- [x] law notes Q1793 (16 vs 19), Q13 (1,500 vs 1,800 kg); taxi example trimmed to TR 511; sign 703 punctuated; Kol Zchut link removed
- [x] no class removed; tractor (1) and motorcycle (A) labelled partial in About/COVERAGE.md
- [ ] 140 questions judged "source exists" not yet taught (mostly general law: 108); 328 have no official state source

## v1.6 – B and A taught to 100% (minus a listed no-source remainder) – in progress
Scope (Dudi, 26.10 13:46 UTC+2): every B and A question taught from an official state source; true no-source remainder → docs/NO_SOURCE_B_A.md; tractor (1) and others wait; no class removed; 1 and A stay partial.
- new official source: the RSA + Ministry of Transport theory textbook "נוהגים אחרת – נוהגים נכון" (2017, gov.il BlobFolder PDF, cached in tools/official/cache, gitignored). Lessons cite it as `OFF:textbook`; pin.py pins every quote with its page, and refuses a quote that occurs only inside the textbook's sample-exam questions (never cite them).
- build order: `python3 tools/official/sync_textbook_quotes.py && python3 tools/official/pin.py` → compile_verdicts → signs_build → lessons → coverage → lessons → data_test
- lessons live in tools/lessons_v16.py (merged by lessons_spec.add_v16); lesson↔question map = data/coverage.json `q`
- [x] batch 1: law rules – road parts (+ `roadparts` diagram), quad / tractor passengers, signal, blocked lane, stopping, belts in reverse, towed vehicle, accident report, breakdown 24h, escort, paid rides, bus-stop parking, documents, temporary police sign, NOTE Q91
- batch 2 (14:01 UTC+2): textbook ch.1–3 lessons cockpit, moveoff, downhill, lanes, junction2 (+startcar/stopdist diagrams). B full 64.3%, A 64.8%.
- batch 3 (14:02 UTC+2): textbook ch.3 lessons turns (+leftturn diagram), parking2; lanes/junction extended. B full 66.1%, A 66.6%.
- 2026-10-26 14:04 UTC+2 — v1.6 batch 4: yield2 (right of way, TB pp.60–68) + lights2 (traffic light stop line, hazard lights, stop/park order). B full 67.3% / A 67.8%.
- 2026-10-26 14:05 UTC+2 — v1.6 batch 5: peds2 + rail2 (TB pp.73–90). B full 68.9% any 81.3% / A full 69.6% any 82.8%.
- 2026-10-26 14:07 UTC+2 — v1.6 batch 6: gap2 + overtake2 (TB pp.91–106). B full 70.0% any 82.5% / A full 70.6% any 84.0%.
- 2026-10-26 14:08 UTC+2 — v1.6 batch 7: shoulder2, skid2, night2 (TB pp.107–124).
- 2026-10-26 14:10 UTC+2 — v1.6 batch 8: maint2, safety2, winter2, docs2 (TB pp.126–145). B full 74.0% any 87.3% / A full 74.0% any 87.9%.
- 2026-10-26 14:12 UTC+2 — v1.6 batch 9: emerg2, licence2, alc2 (TB pp.145–157). B full 74.5% any 88.1% / A full 74.6% any 88.6%.
- v1.6 batch 10: law2, law3, signs3 (law/sign citations: TO 28, 12, 12א, 71א1; TR 45, 47, 54, 62, 85, 180, 190, 284, 307, 308, 316, 318א, 364, 370ב, 380; LT signs). B full 76.1% any 90.3% / A full 76.3% any 90.8%.
- v1.6 fix: two v1.6 lessons (parking2, law2) silently dropped by id clash with v1.5 lessons; renamed parking3/law4, and add_v16 now asserts unique ids. B full 77.4% any 91.6% / A full 77.1% any 91.5%.
- 2026-10-26 14:26 UTC+2 v1.6 batch 11: new official source OFF:edu18 (Ministry of Education traffic-education curriculum, topic 18 – prose only, practice-question blocks excluded by pin.py); lesson brakes3 (brakes, tyres, dashboard). B full 78.1% any 92.4% / A full 77.6% any 92.1%.
- v1.6 batch 12: air resistance (textbook p124), mirror overlap (p16), signs ס-130/131 (lotam), motorcycle side-by-side TR:122 and passengers TR:120(ב), sidewalk TR:38, licence doctor TR:192(א1), police mobile sign TR:23(ג). B full 78.4% any 92.8% / A full 78.0% any 92.8%.
- 2026-10-26 14:36 UTC+2 v1.6 batch 13: docs/NO_SOURCE_B_A.md (92 B/A ids with search + reason, from tools/coverage/nosource_ba.json), docs/LESSON_MAP_B_A.md (every B/A question → lesson or NO_SOURCE), data tests for both; tools/build.sh added. Junction rule OFF:book now teaches Q1666. B full 78.4% any 92.8% / A full 78.1% any 92.9%. Next: 20 B/A questions taught only in tractor/moto/bus/heavy lessons need a B/A-visible rule.
- 2026-10-26 14:42 UTC+2 v1.6 batch 14: 19 B/A questions that were taught only in tractor/moto/bus/heavy lessons now have a rule in a lesson shown to B/A (TR:1 רכב איטי + טרקטור משא, TR:39ג(ב)(ד), TR:38(א), TR:54(א), TR:52, TR:88, textbook pp.16/22/124 seat + reaction distance + downhill + keep right, RSA fatigue page – 3 more pinned quotes). Q699 re-judged: no picture in the bank → NO_SOURCE (pic). coverage.py keeps the old units when a spec rule adds the same verdict; NO_SOURCE/test now use the per-class untaught sets. B full 79.8% any 94.3% / A full 78.9% any 93.6%; NO_SOURCE 93.
- 2026-10-26 14:44 UTC+2 batch 15: taught 725 (turns), 928 (TR:36(ב), partial), 1792 (TR:27(ב)+TR:322(ג), partial). B any 94.6%, A 93.9%; NO_SOURCE 90.
- 2026-10-26 14:46 UTC+2 batch 16: taught 930, 1499, 1077 (p), 1043 (p, TR:160), 750, 801, 818, 833, 1013 from textbook prose pp. 29/39/93/109/129-133. B any 95.3%, A 94.2%.
- batch 17 (14:55 UTC+2): teach 1005 (textbook p14 passive safety, partial); NO_SOURCE notes updated for 92, 281, 1500 (Knesset/regulation candidates) and 1039/1040/1061 (kids.gov.il MoEP candidate, not used). NO_SOURCE 80.
- batch 18 (14:52 UTC+2): verdicts for 92, 302, 708, 728 changed T→S (search failed; listed in NO_SOURCE_B_A.md). B and A: 0 untaught with a known source.
## v1.6.0 release (14:52 UTC+2)
- B 1272: 1213 taught (1023 full, 190 partial), 59 no official source. A 1155: 1088 taught, 67 no official source. NO_SOURCE_B_A.md: 80 ids (union).
- COVERAGE.md tables regenerated by tools/coverage/md_tables.py; About table is data-driven (data/coverage.json).
- live v1.6.0 confirmed via sw.js; live e2e 220 passed, 0 failed (the first run hit a one-off 6 s waitForFunction timeout; the rerun was clean).
## v1.7.0 (15:05 UTC+2 onward)
- Dudi approved kids.gov.il/sababa/sababa_pool/pages/4451 (Ministry of Environmental Protection, carbon monoxide). It is pinned as OFF:kids_co with sha256 in pages.json. data_test allows this one URL.
- maint2 rule (OFF:kids_co): Q1061 full; Q1039 and Q1040 partial. They were removed from NO_SOURCE (now 77).
- COVERAGE.md tables and headline regenerated. B: 1216 taught of 1272, 56 with no source. A: 1089 taught of 1155, 66 with no source.
- bumped to 1.7.0 (js/version.js, sw.js VERSION).
- live v1.7.0 confirmed via sw.js; sources.json has OFF:kids_co; live e2e 220 passed, 0 failed; data_test passed (15:14 UTC+2).
- 2026-10-26 15:20 (UTC+2) v1.8 item 2: textbook searched for all 77 no-source B/A + 209 partial B/A; 6 new T() rules (p75, p81, p98–99, p106, p131, p150) + 861 qp on cockpit#r12; full: 23 24 46 47 55 128 134 455; partial: 861 1532. No-source 77→75. Pic/moto groups: textbook has no explicit text. B full 81.1% / A 79.7%.
- 2026-10-26 15:22 (UTC+2) v1.8 item 3a: no "1,200 questions" text found (guard added to data_test); unofficial-site + no-course note (he/en) on welcome (disc.short), About (ab.course, cites TR 203(א), 205) and README.
- 2026-10-26 15:24 (UTC+2) v1.8 item 3b: docs/BANK_VERSION.md – no newer CC BY bank than 2021-12 on data.gov.il; 1,802 vs 1,801 = Q574 (broken sign image, excluded). Report only, no data swap.
- 2026-10-26 15:25 (UTC+2) v1.8.0: bump (js/version.js, sw.js), COVERAGE headline 76.5% full / 63.5% strict / 90.4% any; data_test passed.
- v1.8.0 live (sw VERSION 1.8.0); live e2e 220/220. Flake cause: offline-images toast ("442/442") follows the bookmark toast on live, so axe toast-wait raised 6s→15s (test only).
- v1.9 item 1 (review #6): LICENSE-DATA.md + About list the textbook (p.3 no-copy clause, 173 rules/312 excerpts/95 pages/~5.7% words), edu18 and kids.gov.il with their own terms; Wikisource excerpts stay CC BY-SA; CC BY version caveat; visible note that RSA written permission was not requested/obtained.
- v1.9 item 2: About coverage table (and stats table) wrapped in a focusable scroll region + compact padding ≤420px; e2e overflow sweep at 320/360/390 (fixed viewport, isMobile off) over 79 screens incl. About, all B/A lessons, exam running — fails on v1.8 (#/about=418px), passes now.
- v1.9 item 3: Q330 bank-vs-law note (bank 1,500 kg trailer vs TR 180(ב) 5,000 kg combined; verbatim check against pinned law) → 14 notes. Numeric scan of all 'full' verdicts (answer numbers with units vs cited rule text): no further bank-vs-law conflicts; it surfaced 4 mis-mapped verdicts (Q152, Q1305, Q1520, Q1537) handled in item 4.
- v1.9 item 4: re-judged over-claims (tools/coverage/rejudge_v19.txt: 36 by hand, 54 gallery-only re-based on the sign table); 3 new textbook rules; whole bank 75.7/59.6/90.2, B 80.3/59.6/95.6, A 78.7/56.3/94.2; B/A no-source 77 (+520, +1307).
- v1.9 item 5: worked bank examples added to all 48 B/A lessons that had none (tools/examples_v19.py; each quotes the mapped lesson rule with its official source and verbatim checks); 64/70 lessons now have examples (the 6 without are C/D/tractor-only); data_test enforces it.
- v1.9 item 6: data_test builds tools/law/law.json from the pinned wikitext when missing, and FAILS (two checks) when the wikitext is missing too; no silent skip.
- v1.9 item 7: exam note says questions are spread across topics in proportion to the bank (he/en); exam size, pass mark and minutes come from st.EXAM (store.js) instead of hard-coded 30/26/40 in app.js and the UI strings; About coverage table order fixed explicitly (whole bank, B, A, C1, C, D, tractor). Local e2e 223/0.
- v1.9.0 release: SW VERSION 1.9.0, data_test passed.
- v1.10 item 1: "מהמאגר הרשמי" bank-only lessons (tools/bank_lessons.py): all 144 no-source questions (77 B/A) shown in 7 topic lessons (law, picture scenes, vehicle, driving technique, motorcycle, heavy vehicles, tractor) at the end of each class path — official question + correct answer exactly as published (data.gov.il, CC BY link), a visible "no official explanation or legal source" label on the lesson and on every card, no rule/body/example of ours; Q1765 states factually that the official textbook says "בגובה מרכז הגולגולת" (verbatim, pinned). Lesson quiz = exactly those questions; why box of a no-source question links to its bank lesson. Per-class "no source" no longer counts questions taught in a lesson of another class (C 62→60, D 72→67, tractor 65→64; they move to T). data_test + e2e (237 ok, 320/360/390 sweep incl. bank lessons).
- v1.10 item 2 (coverage reporting): bank-only lessons counted separately everywhere ("taught from the official bank only, no official explanation": ALL 144, B 56, A 67, C1 69, C 60, D 67, 1 64), never as full; new COVERAGE.md/About columns for bank-only and "full without bank-sourced rules".
- Review #7 item 2: 11 full verdicts that rested only on rules sourced from another bank question re-based on official text (textbook p.22 stopping distance, blind spot; TR 85(א)(4), 359א, 70, 179, 39ו) via tools/coverage/rebase_v110.txt; 18 remaining bank-sourced full questions (B 4, A 11) disclosed with an alternative figure: without bank-sourced rules ALL 74.7%, B 80.0%, A 77.7% (reviewer's pre-rebase 73.7/79.2/76.9). build.sh now fails when lessons.py prints ERROR; OFF:textbook checks in lessons_spec are pinned.
- Review #7 items 3+4: About law text now says practice shows "למה?" with the linked rule (or "no source") and the exam shows no explanations; textbook text computed from data ("182 of 797 rules"), no "רוב הכללים".
- Review #7 item 7: textbook counts computed into coverage.json `tb` and LICENSE-DATA.md (v1.10: 182 rules / 327 excerpts / 96 pages; v1.9.0 actual 176/316/96); ABS cited as p.140 (was p.139); privacy text: no server of ours, GitHub Pages receives page requests and may log IP addresses.
- Review #7 item 1 — CORRECTION to the v1.9 item 3 line above (line 140): Q1305/Q1520 were NOT fixed in v1.9. Now fixed in tools/coverage/rejudge_v110.txt: Q1305 → heavy2#r2/cargo2#r0 (TR 313(א)(3), 12.00 m), Q1520 → equip#r2 (TR 368); data_test checks both.
- Review #7 item 6: image questions without a text description (e.g. Q616) keep the "no description" disclosure — no official source describes those images, so no alt text was invented.
- Review #7 item 8: e2e overflow sweep already covers 320/360/390 px (confirmed).
- Review #7 item 5: a direct link to a locked lesson (or its quiz) now opens the read-only preview (#/learn/<id>/peek) instead of redirecting to the list; e2e checks both.
- v1.10.0 release: SW VERSION 1.10.0, data_test passed, local e2e 239/0.
- v1.11 item 1: B/A partly taught questions shown in their topic lesson (tools/partial_bank.py): all 212 B/A partial questions (B 194 = 15.3%, A 179 = 15.5%) in 48 lessons, section "שאלות מהמאגר שהשיעור מכסה רק חלקית" before the quiz (the quiz now includes them): official question + correct answer as published (CC BY), the verdict's existing unit with its citation, and a separate "rest – official bank only" line; 15 cards whose unit has no cited official source are labelled so. No new text; verdicts unchanged (still partial).
- v1.11 item 2: reporting: coverage.json tot gains [partial, partial shown]; COVERAGE.md tables gain "partial" and "of these: shown with the official bank answer"; About table column "חלקי / מוצגים עם תשובת המאגר" and covText explains it stays partial.
- v1.11 item 3: tests: data_test 5e (every B/A partial question in a lesson of its class and in that quiz; stays partial; cards carry only existing units; "official" label only with a non-bank source; docs/About); e2e partial cards (text, answer, labels, CC BY, no-source label, axe); overflow sweep covers every B/A lesson at 320/360/390.
- v1.11 review#8 item 1: bank cards (bank-only lessons and partial cards) and worked examples show all official options in the published order, the official correct one marked by icon + text "התשובה הנכונה לפי המאגר" (not colour only); e2e compares the shown options with the bank; data_test guard.
