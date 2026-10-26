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
- [ ] live check

## Notes
- translations have different answer ORDER than Hebrew → each lang stores its own correct index; app shuffles anyway
- ru/es banks are 2019 versions; Hebrew is authoritative (shown in UI)
- every change: `python3 tools/bump.py` (patch) → syncs js/version.js + sw.js VERSION, regenerates sw-assets.js (image precache list)
- SW caches are prefixed `theory-il-` (activate only deletes its own; github.io origin is shared)
- test hook `window.__theory` (S, view, pool, exam) – read-only, used by e2e.js
