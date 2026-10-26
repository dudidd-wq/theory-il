#!/usr/bin/env python3
"""Build-time data checks (run after tools/lessons.py + tools/coverage.py; exit 1 on any failure):
every bank question is mapped to a lesson, lesson quizzes / sources / sign table are consistent,
eligibility lines cite existing sections, the review-2 content fixes are in place, SW lists the data files."""
import json, os, re, sys
R = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
J = lambda *p: json.load(open(os.path.join(R, *p), encoding='utf-8'))
T = lambda *p: open(os.path.join(R, *p), encoding='utf-8').read()
fails = []
def ok(c, msg):
    print(('  ok   ' if c else '  FAIL ') + msg)
    if not c: fails.append(msg)

Q = J('data', 'q.he.json'); ids = {q['id'] for q in Q}; byid = {q['id']: q for q in Q}
L = J('data', 'lessons.json')['lessons']; LB = {l['id']: l for l in L}
SRC = J('data', 'sources.json'); COV = J('data', 'coverage.json'); SG = J('data', 'signs.json')

# 1. every question mapped
cq = COV['q']
unm = [i for i in ids if str(i) not in cq or not cq[str(i)][1]]
ok(not unm, f'every question mapped to a lesson ({len(ids)} questions, unmapped {sorted(unm)[:10]})')
ok(set(map(int, cq)) == ids, 'coverage.json has exactly the bank ids')
bad = [(i, l) for i, e in cq.items() for l in e[1] if l not in LB]
ok(not bad, f'coverage lessons exist {bad[:5]}')
badu = []
for i, e in cq.items():
    for u in e[2]:
        m = re.fullmatch(r'(\w+)#([rxbcgmd])(\d+)', u)
        if not m or m[1] not in LB: badu.append(u); continue
        if m[2] == 'd':
            if m[3] not in SG['e']: badu.append(u)
            continue
        l, k, n = LB[m[1]], m[2], int(m[3])
        if k in 'rxbcm' and n >= len({'r': l['rules'], 'x': l['ex'], 'b': l['body'], 'c': l['recap'], 'm': l['mnem']}.get(k, [])): badu.append(u)
ok(not badu, f'coverage units point at existing lesson parts {badu[:5]}')
ok(set(cq[str(i)][0] for i in ids) <= set('fawn'), 'coverage status in f/a/w/n')

# 2. lessons: quizzes, sources
for l in L:
    qz = l['quiz']
    ok(all(q in ids for q in qz), f'{l["id"]}: quiz ids exist')
    elig = [q for q in qz if any(c in byid[q]['t'] for c in l['cls'])]
    ok(len(elig) == len(qz), f'{l["id"]}: quiz questions belong to the lesson classes')
    for c in l['cls']:
        n = sum(c in byid[q]['t'] for q in qz)
        ok(n >= l.get('quiz_min', 6) if 'quiz_min' in l else n >= 1, f'{l["id"]}/{c}: {n} quiz questions')
    srcs = [r['s'] for r in l['rules']] + [a for r in l['rules'] for a in r.get('also', [])] + [x['s'] for x in l['ex']] + [m['s'] for m in l['mnem']] + [c['s'] for c in l['recap']]
    miss = [s for s in srcs if s not in SRC and re.sub(r'\(.*$', '', s) not in SRC]
    ok(not miss, f'{l["id"]}: every rule/example/recap cites a known source {miss[:3]}')
kinds = {v['kind'] for v in SRC.values()}
ok(kinds <= {'TR', 'TO', 'LT', 'LTP', 'Q'}, f'sources only from law (TR/TO), sign table (LT/LTP) and the bank (Q): {sorted(kinds)}')
ok(all(('wikisource.org' in v['url'] and 'oldid=' in v['url']) for v in SRC.values() if v['kind'] in ('TR', 'TO')), 'law sources are pinned Wikisource revisions')
ok(all('gov.il' in v['url'] for v in SRC.values() if v['kind'] in ('LT', 'LTP')), 'sign sources are the gov.il sign table')

# 3. sign table
ok(len(SG['e']) == 276, f'signs.json: 276 entries ({len(SG["e"])})')
ok([p[0] for p in SG['parts']] == list(range(1, 10)), 'signs.json: parts 1–9')
ok(all(n in SG['e'] for v in SG['q'].values() for n in v), 'sign questions point at table entries')
ok(all(int(i) in ids for i in SG['q']), 'sign question ids exist')
viz = T('js', 'viz.js'); parts = [int(x) for x in re.findall(r"'חלק (\d) – ", viz)]
ok(parts == list(range(1, 10)), f'signs explorer knows all 9 parts {parts}')
for n in SG['e']:
    p = int(n) // 100
    if not re.search(rf"\[{p}01, (\d+), 'חלק {p} ", viz): ok(False, f'explorer range for {n}'); break
    hi = int(re.search(rf"\[{p}01, (\d+), 'חלק {p} ", viz)[1])
    if int(n) > hi: ok(False, f'sign {n} outside explorer range part {p} (to {hi})'); break
else: ok(True, 'every table entry falls inside an explorer range')

# 4. eligibility citations exist in TR (needs tools/law/law.json from tools/law/fetch.py + parse.py; skipped if absent)
lawp = os.path.join(R, 'tools', 'law', 'law.json')
secs = re.findall(r"\['(\d+[א-ת]?(?:\([^)]+\))*)'(?:, '(\d+[א-ת]?(?:\([^)]+\))*)')*\]", T('js', 'elig.js'))
cites = set(re.findall(r"'(\d+[א-ת]?(?:\([^)]+\))*)'", ' '.join(re.findall(r"\[(?:'\d[^\]]*)\]", T('js', 'elig.js')))))
if os.path.exists(lawp):
    TR = json.load(open(lawp, encoding='utf-8'))['TR']
    miss = [c for c in sorted(cites) if re.match(r'\d+[א-ת]?', c)[0] not in TR]
    ok(cites and not miss, f'eligibility cites {len(cites)} existing TR sections {miss}')
else: print('  skip eligibility section check (tools/law/law.json not built)')

# 5. review-2 content fixes
rs = lambda lid: [r['s'] for r in LB[lid]['rules']]
ok('TR:97(ג)' in rs('bus') and 'TR:97(ג)' in rs('lights'), 'headlights season rule 97(ג) in lights + bus')
ok(rs('newdrv')[0] == 'TO:12א(א)' and all(c in LB['newdrv']['cls'] for c in ('B', 'A', '1')), 'new driver: TO 12א(א), on the A and tractor paths')
ok('TR:189(ט)' in rs('bus'), 'bus: 189(ט) minibus exception')
ok(any(x['q'] == 180 and 'קודקוד למעלה' in x['t'] for l in L for x in l['ex']), 'Q180 example: 125 is an upright triangle')
ok(all(i in LB for i in ('sober', 'accident', 'duty', 'signal', 'terms', 'cargo')), 'safety/duty lessons present (alcohol, accident, duties, signalling, terms, cargo)')
ok("A1" in T('js', 'elig.js') and '221(א)(1)' in T('js', 'elig.js'), 'A1 line in elig.js')

# 6. SW + version
sw = T('sw.js'); v = re.search(r"'(\d+\.\d+\.\d+)'", T('js', 'version.js'))[1]
ok(f"const VERSION = '{v}'" in sw, f'sw.js VERSION = js/version.js ({v})')
ok(all(f'data/{f}.json' in sw for f in ('q.he', 'lessons', 'sources', 'coverage', 'signs')), 'SW precaches the data files the app needs offline')

print(f'\n{len(fails)} failed' if fails else '\nall data checks passed')
sys.exit(1 if fails else 0)
