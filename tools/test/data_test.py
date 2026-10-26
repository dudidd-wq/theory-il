#!/usr/bin/env python3
"""Build-time data checks (run after tools/lessons.py + tools/coverage.py; exit 1 on any failure):
every bank question is mapped to a lesson, lesson quizzes / sources / sign table are consistent,
eligibility lines cite existing sections, the review-2 content fixes are in place, SW lists the data files."""
import sys, json, os, re
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
unm = [i for i in ids if str(i) not in cq or (cq[str(i)][0] != 'n' and not cq[str(i)][1])]
ok(not unm, f'every taught / partly taught question is mapped to a lesson ({len(ids)} questions, unmapped {sorted(unm)[:10]})')
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
ok(set(cq[str(i)][0] for i in ids) <= set('fwn'), 'coverage status in f/w/n (hand verdicts only, no automatic matches)')
ok(all(len(e) == 3 or (e[0] == 'n' and e[3] == 'S') for e in cq.values()), 'only untaught questions carry the no-official-source flag')
# whole-bank record: one verdict per question, every stable reference resolves, reasons present
sys.path.insert(0, os.path.join(R, "tools", "coverage"))
from units import load as uload, resolve
from overlap import overlap
CF = J('data', 'coverage_full.json')
ok(set(map(int, CF['q'])) == ids, f"coverage_full.json has a verdict for every one of the {len(ids)} questions")
ok(all(e['v'] in ('full', 'partial', 'none') and e['why'] for e in CF['q'].values()), 'every verdict has a one-line reason')
ok(all(e['v'] != 'none' or e['src'] in 'TS' for e in CF['q'].values()), 'every untaught question is marked teachable (T) or no official source (S)')
_Q, _LS, _S, _U, _D = uload()
bad = []
for i, e in CF['q'].items():
    for r in e['ref']:
        try: resolve(_LS, r)
        except ValueError as x: bad.append((i, str(x)))
ok(not bad, f'every stored unit reference resolves to exactly one unit {bad[:3]}')
# keyword overlap: the cited unit must share a content word with the question or its answer (stale-pointer guard);
# the allowlist holds checked pairs whose overlap is a synonym only
OVL_OK = {('981', 'overtake'): 'ימין / ימני', ('172', 'roadparts'): 'דרך – the defined term itself (a stopword for the matcher)', ('1064', 'defensive'): 'הסחת / היסח דעת'}
ut = {u['id']: u['text'] for u in _U}; bad = []
for i, e in cq.items():
    if e[0] == 'n': continue
    for u in e[2]:
        if u in ut and not overlap(byid[int(i)], ut[u]) and (i, u.split('#')[0]) not in OVL_OK: bad.append((i, u))
ok(not bad, f'cited units share a keyword with their question {bad[:5]}')

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
offd = lambda u: re.match(r'https://(www\.)?(gov\.il|mot\.gov\.il|rsa\.org\.il|meyda\.education\.gov\.il)/', u)  # meyda = Ministry of Education curriculum (official state textbook)
ok(all(offd(v['url']) and v.get('sha256') and v.get('accessed') and v['ex'] for v in SRC.values() if v['kind'] == 'OFF'),
   'official sources are gov.il / mot.gov.il / rsa.org.il / Ministry of Education curriculum pages, pinned (access date + sha256) and quoted')
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
ok('ללא ניקוד' in T('js', 'i18n.js') and "t('ln.noNiqqud')" in T('js', 'learn.js'), 'gov.il excerpts marked "ללא ניקוד" (chip + About)')
ok(all(x in viz for x in ('שלוחה אחורית', "'רוחב וגובה'", '313(א)(3)(ב1)')), 'v1.4: heavy2 size diagram has length / width-height / rear-overhang views')
ok(SG['e']['701'].startswith('אור אדום – ') and SG['e']['623'] == 'כביש ללא מוצא – בכביש שלפניך', 'sign title and meaning separated by " – " (701, 623)')
ok(sum(' – ' in t for t in SG['e'].values()) >= 200, 'most sign entries show "title – meaning"')
RS = lambda i: [r['s'] for r in LB[i]['rules']] + [x for r in LB[i]['rules'] for x in r.get('also', [])]
ok({'TR:324', 'TR:83(ד)', 'TR:483א'} <= set(map(str, RS('bus'))) or all(any(k in str(x) for x in RS('bus')) for k in ('TR:324', 'TR:83', 'TR:483')), 'v1.4: bus lesson teaches brake terms (324), child doors (83), bins (483א)')
ok(any('TR:188' in str(x) for x in RS('tractor')), 'v1.4: tractor lesson teaches the age-16 rule (TR:188)')
ok(len(LB['taxi']['mnem']) >= 2 and len(LB['taxi']['ex']) >= 3, 'v1.4: taxi lesson has a memory aid and bank examples')
ok(any('313' in str(x) and 'אחורית' in r['t'] for r in LB['heavy2']['rules'] for x in [r['s']] + r.get('also', [])) or any('313(ב)' in str(r['s']) for r in LB['heavy2']['rules']), 'v1.4: heavy2 teaches the 313(ב) rear overhang')
ok('gov_terms_of_use' in T('js', 'app.js') and 'gov_terms_of_use' in T('LICENSE-DATA.md') and 'שימוש הוגן' in T('LICENSE-DATA.md'), 'gov.il reuse terms in About + LICENSE-DATA.md')
ok(SG['q'].get('592') == ['504'], 'Q592 → sign 504 (white + yellow arrow)')

# 5b. v1.6: B / A coverage – every pool question is taught or listed in docs/NO_SOURCE_B_A.md with its search
NS = J('tools', 'coverage', 'nosource_ba.json')
ba = {str(q['id']) for q in Q if {'A', 'B'} & set(q['t'])}
NI = J('docs', 'coverage_after.json')['none_ids']
unt = {str(i) for c in ('B', 'A') for i in NI[c]}  # untaught for the class itself (lessons shown to B / A)
ok(set(NS['q']) == unt, f'v1.6: NO_SOURCE_B_A list = untaught B/A questions (missing {sorted(unt - set(NS["q"]), key=int)[:8]}, extra {sorted(set(NS["q"]) - unt, key=int)[:8]})')
ok(all(e['g'] in NS['groups'] and NS['groups'][e['g']]['search'] and NS['groups'][e['g']]['why'] for e in NS['q'].values()), 'v1.6: every NO_SOURCE entry has a search done and a reason')
nsmd = T('docs', 'NO_SOURCE_B_A.md'); lm = T('docs', 'LESSON_MAP_B_A.md')
ok(all(f'| {i} |' in nsmd for i in NS['q']), 'v1.6: docs/NO_SOURCE_B_A.md lists every NO_SOURCE id')
ok(all(f'| {i} |' in lm for i in ba), f'v1.6: docs/LESSON_MAP_B_A.md maps every B/A question ({len(ba)})')
for c, lim in (('B', 92.5), ('A', 92.5)):
    pool = [str(q['id']) for q in Q if c in q['t']]
    anyp = 100 * (len(pool) - len(NI[c])) / len(pool)
    ok(anyp >= lim, f'v1.6: class {c} any-coverage {anyp:.1f}% >= {lim}%')

# 6. SW + version
sw = T('sw.js'); v = re.search(r"'(\d+\.\d+\.\d+)'", T('js', 'version.js'))[1]
ok(f"const VERSION = '{v}'" in sw, f'sw.js VERSION = js/version.js ({v})')
ok(all(f'data/{f}.json' in sw for f in ('q.he', 'lessons', 'sources', 'coverage', 'signs')), 'SW precaches the data files the app needs offline')

print(f'\n{len(fails)} failed' if fails else '\nall data checks passed')
sys.exit(1 if fails else 0)
