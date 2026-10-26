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
