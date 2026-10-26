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
ok(kinds <= {'TR', 'TO', 'LT', 'LTP', 'Q', 'OFF'}, f'sources only from law (TR/TO), sign table (LT/LTP), the bank (Q) and official RSA/MoT pages (OFF): {sorted(kinds)}')
offd = lambda u: re.match(r'https://(www\.)?(gov\.il|mot\.gov\.il|rsa\.org\.il)/', u)
ok(all(offd(v['url']) and v.get('sha256') and v.get('accessed') and v['ex'] for v in SRC.values() if v['kind'] == 'OFF'),
   'official sources are gov.il / mot.gov.il / rsa.org.il pages, pinned (access date + sha256) and quoted')
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
exs = {(x['q'], x['s']) for l in L for x in l['ex']}
ok((207, 'TR:72(א)(7)') in exs and (88, 'TR:48(ג)') in exs, 'citations: Q207→72(א)(7), Q88→48(ג)')
ok('TR:47(ו)' in rs('overtake') and {'TR:117(ב)', 'TR:117(ג)'} <= set(rs('rail')), 'overtake 47(ו) exception; rail 117(ב)+(ג)')
ok("A1" in T('js', 'elig.js') and '221(א)(1)' in T('js', 'elig.js'), 'A1 line in elig.js')

# 5b. v1.3: official sources, notes, diagrams, sign texts
LJ = J('data', 'lessons.json'); NT = LJ.get('notes', {})
ok(all(k in NT for k in ('1192', '40', '592')), 'bank-vs-law notes for Q1192, Q40, Q592')
ok(all(NT[k]['exam'] == next(q['a'][q['c']] for q in Q if q['id'] == int(k)) for k in NT), 'notes quote the bank answer unchanged')
vz = set(re.search(r'export const VIZ = \{([^}]*)\}', viz)[1].replace(' ', '').split(','))
ok(all(v in vz for l in L for v in l['viz']), f'every lesson diagram exists in js/viz.js')
ok(sum(1 for l in L if not l['viz']) <= 2, f"lessons without a diagram: {[l['id'] for l in L if not l['viz']]}")
ok(all(i in LB for i in ('vehicle', 'defensive', 'moto2', 'heavy2')), 'v1.3 lessons: vehicle, defensive, moto2, heavy2')
ok(set(LB['moto2']['cls']) == {'A'} and set(LB['heavy2']['cls']) == {'C1', 'C'}, 'moto2 is A-only, heavy2 C1/C')
ok(all(v['kind'] != 'OFF' or ('sha256' in v and v.get('accessed')) for v in SRC.values()), 'official pages pinned with sha256 + access date')
bad = [k for k, t in SG['e'].items() if re.search(r'(?<!\S)[\u05d0-\u05ea](?!\S)', t) or re.search(r'\)[^()]*\(', t)]
ok(len(bad) <= 3, f'sign texts without split letters / mirrored brackets (left: {bad})')
ok('gov_terms_of_use' in T('js', 'app.js') and 'gov_terms_of_use' in T('LICENSE-DATA.md') and 'שימוש הוגן' in T('LICENSE-DATA.md'), 'gov.il reuse terms in About + LICENSE-DATA.md')
ok(SG['q'].get('592') == ['504'], 'Q592 → sign 504 (white + yellow arrow)')

# 6. SW + version
sw = T('sw.js'); v = re.search(r"'(\d+\.\d+\.\d+)'", T('js', 'version.js'))[1]
ok(f"const VERSION = '{v}'" in sw, f'sw.js VERSION = js/version.js ({v})')
ok(all(f'data/{f}.json' in sw for f in ('q.he', 'lessons', 'sources', 'coverage', 'signs')), 'SW precaches the data files the app needs offline')

print(f'\n{len(fails)} failed' if fails else '\nall data checks passed')
sys.exit(1 if fails else 0)
