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
LALL = J('data', 'lessons.json')['lessons']; LB = {l['id']: l for l in LALL}
L = [l for l in LALL if 'bank' not in l]   # taught lessons; v1.10 bank-only lessons are checked in section 5c
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
ok(all(len(e) == 3 or (e[0] == 'n' and e[3] in ('S', 'X')) for e in cq.values()), 'only untaught questions carry the no-official-source / bank-vs-law flag')
# whole-bank record: one verdict per question, every stable reference resolves, reasons present
sys.path.insert(0, os.path.join(R, "tools", "coverage"))
from units import load as uload, resolve
from overlap import overlap
CF = J('data', 'coverage_full.json')
ok(set(map(int, CF['q'])) == ids, f"coverage_full.json has a verdict for every one of the {len(ids)} questions")
ok(all(e['v'] in ('full', 'partial', 'none') and e['why'] for e in CF['q'].values()), 'every verdict has a one-line reason')
ok(all(e['v'] != 'none' or e['src'] in ('T', 'S', 'X') for e in CF['q'].values()), 'every untaught question is marked teachable (T), no official source (S) or bank-vs-law conflict (X)')
# v1.13 (review #9 D4): Q13's bank answer contradicts TR 1 – conflict status, not taught, not cited, never in a regular quiz
_X = sorted(int(k) for k, e in CF['q'].items() if e.get('src') == 'X')
_LJ = J('data', 'lessons.json')
# v1.14 (review #10 N6): every bank-vs-law conflict – uncited, only in a bank lesson, with a note quoting the law
_XOK = [q for q in _X if not CF['q'][str(q)]['rule'] and all(q not in l['quiz'] for l in _LJ['lessons'] if not l.get('bank'))
        and any(q in l.get('bank', []) for l in _LJ['lessons']) and _LJ['notes'].get(str(q), {}).get('x')]
ok(_X == [13, 91, 330, 333, 1327, 1793] and _XOK == _X and '1,800' in _LJ['notes']['13']['x'][0][1],
   f'v1.14: bank-vs-law conflict status {_X}: uncited, only in a bank lesson, each note quotes the law')
# v1.14 (review #10 N6): a note or rule that says the bank's answer differs from the law marks a conflict (generic scan)
_BD = re.compile(r'הבנק כותב|בבנק השאלות|תשובת המאגר|התשובה במאגר')
_bdn = [int(k) for k, n in _LJ['notes'].items() if _BD.search(n.get('law', '')) and CF['q'].get(k, {}).get('src') != 'X'
        and k not in ('281', '92', '1765')]
_bdr = [(k, r) for k, e in CF['q'].items() if e['v'] != 'none' for r in e['rule']
        if r.split('#')[1][0] == 'r' and _BD.search(next(l for l in _LJ['lessons'] if l['id'] == r.split('#')[0])['rules'][int(r.split('#r')[1])]['t'])]
ok(not _bdn and not _bdr, f'v1.14: a note saying the bank differs is a conflict (X) {_bdn[:5]}; no verdict cites a rule that says the bank differs {_bdr[:5]}')
# v1.14 (review #10 N5): coverage never rests on uncited lesson-body prose
ok(not [k for k, e in CF['q'].items() for r in e['rule'] + e['ref'] if '#b' in r], 'v1.14: no verdict cites lesson-body prose (#b units)')
_RJ4 = {l.split()[0]: l.split()[1] for l in open('tools/coverage/rejudge_v114.txt', encoding='utf-8') if l.strip() and not l.startswith('#')}
_RJ = {l.split()[0]: l.split()[1] for l in open('tools/coverage/rejudge_v113.txt', encoding='utf-8') if l.strip() and not l.startswith('#') and l.split()[0] not in _RJ4}
ok(all(CF['q'][q]['by'] == 'v1.14' and CF['q'][q]['v'] == {'partial': 'partial', 'full': 'full'}.get(v, 'none')
       and (v != 'conflict' or CF['q'][q].get('src') == 'X') for q, v in _RJ4.items()), f'v1.14: every re-judgement of review #10 ({len(_RJ4)}) is applied')
ok(all(CF['q'][q]['by'] == 'v1.13' and (v in ('why',) or CF['q'][q]['v'] == {'partial': 'partial', 'full': 'full'}.get(v, 'none')) for q, v in _RJ.items()),
   f'v1.13: every strict re-judgement ({len(_RJ)}) is applied')
ok(not any(e['by'] == 'v1.5' and e.get('why', '').startswith('rule written for this question') for e in CF['q'].values()), 'v1.13: spec links are not labelled v1.5')
_Q, _LS, _S, _U, _D = uload()
bad = []
for i, e in CF['q'].items():
    for r in e['ref']:
        try: resolve(_LS, r)
        except ValueError as x: bad.append((i, str(x)))
ok(not bad, f'every stored unit reference resolves to exactly one unit {bad[:3]}')
# keyword overlap: the cited unit must share a content word with the question or its answer (stale-pointer guard);
# the allowlist holds checked pairs whose overlap is a synonym only
OVL_OK = {('981', 'overtake'): 'ימין / ימני', ('172', 'roadparts'): 'דרך – the defined term itself (a stopword for the matcher)', ('1064', 'defensive'): 'הסחת / היסח דעת', ('910', 'peds2'): 'ילדים / ליד בתי ספר (partial; the textbook excerpt sample shifted in v1.10)'}
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
KIDS_CO = 'https://kids.gov.il/sababa/sababa_pool/pages/4451'  # Ministry of Environmental Protection CO page, approved by Dudi 2026-10-26 (this one page only)
PITZ = J('tools', 'official/pages.json')['pitzuim']['url']  # v1.12: Compensation Law s.1, Wikisource permanent revision 2968550 (approved by Dudi)
ok(PITZ.startswith('https://he.wikisource.org/w/index.php?') and PITZ.endswith('&oldid=2968550'), 'v1.12: Compensation Law pinned to Wikisource oldid 2968550')
offd = lambda u: re.match(r'https://(www\.)?(gov\.il|mot\.gov\.il|rsa\.org\.il|meyda\.education\.gov\.il)/', u) or u in (KIDS_CO, PITZ)  # meyda = Ministry of Education curriculum (official state textbook)
ok(all(offd(v['url']) and v.get('sha256') and v.get('accessed') and v['ex'] for v in SRC.values() if v['kind'] == 'OFF'),
   'official sources are gov.il / mot.gov.il / rsa.org.il / Ministry of Education curriculum pages (+ the approved MoEP CO page), pinned (access date + sha256) and quoted')
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

# 4. eligibility citations exist in TR. Needs tools/law/law.json: built here from the pinned wikitext (parse.py) when
#    only that is missing; if the wikitext is missing too the check FAILS (run tools/law/fetch.py, then parse.py) – never skipped.
LD = os.path.join(R, 'tools', 'law')
lawp = os.path.join(LD, 'law.json')
cites = set(re.findall(r"'(\d+[א-ת]?(?:\([^)]+\))*)'", ' '.join(re.findall(r"\[(?:'\d[^\]]*)\]", T('js', 'elig.js')))))
if not os.path.exists(lawp) and all(os.path.exists(os.path.join(LD, f)) for f in ('תקנות_התעבורה.txt', 'פקודת_התעבורה.txt')):
    import subprocess
    subprocess.run([sys.executable, 'parse.py'], cwd=LD, check=True, stdout=subprocess.DEVNULL)
    print('  built tools/law/law.json from the pinned wikitext')
ok(os.path.exists(lawp), 'tools/law/law.json present (pinned law; run tools/law/fetch.py then parse.py)')
if os.path.exists(lawp):
    TR = json.load(open(lawp, encoding='utf-8'))['TR']
    miss = [c for c in sorted(cites) if re.match(r'\d+[א-ת]?', c)[0] not in TR]
    ok(cites and not miss, f'eligibility cites {len(cites)} existing TR sections {miss}')
else: ok(False, 'eligibility section check could not run (no law.json)')

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
ok(all(l['ex'] for l in L if set(l['cls']) & {'B', 'A'}), 'v1.9: every B/A lesson has a worked bank example')
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

# v1.8.0: the site never claims "1,200 questions" (the bank has 1,801); it says it is unofficial and that no course is required
UI = T('js', 'i18n.js') + T('js', 'app.js') + T('index.html') + ''.join(T('docs', f) for f in os.listdir(os.path.join(R, 'docs')) if f.endswith('.md'))
ok(not re.search(r'1[,.]?200\s*(שאלות|questions)', UI), 'no "1,200 questions" claim in UI or docs')
I18 = T('js', 'i18n.js')
ok(I18.count("'ab.course'") == 2 and 'אתר לא רשמי' in I18 and 'Unofficial site' in I18 and '203(א)' in I18, 'unofficial-site / no-course note in he and en')
LD = T('LICENSE-DATA.md')
ok(all(k in LD for k in ('OFF:textbook', 'OFF:edu18', 'OFF:kids_co', 'has not been requested', 'stays CC BY-SA', 'version caveat')), 'LICENSE-DATA lists textbook/edu18/kids, permission status, CC BY-SA and CC BY version notes')
ok(I18.count("'ab.perm'") == 2 and I18.count("'ab.tbook'") == 2 and I18.count("'ab.kidsTerms'") == 2, 'About lists textbook/edu18/kids sources and the permission notice in he and en')

# 5c. v1.10: bank-only lessons ("מהמאגר הרשמי") – every question with no official source is shown in one, before its quiz
BK = [l for l in LALL if 'bank' in l]
QB = {q['id']: q for q in Q}
NOSRC = {int(k) for k, e in CF['q'].items() if e['v'] == 'none' and e.get('src') in ('S', 'X')}
inbank = {i for l in BK for i in l['bank']}
ok(NOSRC == inbank, f'v1.10: every no-source question is in a bank lesson, and only those ({len(NOSRC)} vs {len(inbank)})')
ok(all(set(l['quiz']) == set(l['bank']) for l in BK), 'v1.10: a bank lesson quizzes exactly the questions it shows')
ok(all(c in l['cls'] for l in BK for i in l['bank'] for c in QB[i]['t']), 'v1.10: each bank question is shown to every class it belongs to')
ok(all(not any(l[k] for k in ('body', 'rules', 'ex', 'recap', 'mnem', 'gal', 'viz')) for l in BK), 'v1.10: bank lessons carry no explanation, rule or example of ours')
ok(all(l['title'].startswith('מהמאגר הרשמי: ') for l in BK), 'v1.10: bank lessons are titled "מהמאגר הרשמי"')
ok({int(k) for k in NS['q']} <= inbank, 'v1.10: every NO_SOURCE_B_A question is in a bank lesson')
for c in ('B', 'A', 'C1', 'C', 'D', '1'):
    path = [l['id'] for l in LALL if c in l['cls']]; nb = [i for i, x in enumerate(path) if x.startswith('bank_')]
    ok(not nb or nb[0] == len(path) - len(nb), f'v1.10: class {c} bank lessons come after all taught lessons')
    ok(J('docs', 'coverage_after.json')['class'][c]['bank_only'] == sum(1 for i in inbank if c in QB[i]['t']) ==
       J('docs', 'coverage_after.json')['class'][c]['none_nosource'] + J('docs', 'coverage_after.json')['class'][c]['conflict'],
       f'v1.10: class {c} bank-only figure = its no-source (+ v1.13 bank-vs-law conflict) questions')
NT = J('data', 'lessons.json')['notes']
ok(all(int(k) in inbank for k, v in NT.items() if v.get('k') == 'tb'), 'v1.10: textbook-differs notes only on bank questions')
ok(NT.get('1765', {}).get('k') == 'tb' and NT['1765']['s'] == 'OFF:textbook', 'v1.10: Q1765 states the textbook difference with its source')
JL = T('js', 'learn.js')
ok("'ln.bankNote'" in JL and 'BANK_URL' in JL and I18.count("'ln.bankNote'") == 2 and I18.count("'ln.bankAttr'") == 2, 'v1.10: bank lessons show the no-explanation label and CC BY attribution (he and en)')

# 5d. v1.10 (review #7 item 2): bank-sourced rules re-based on law/textbook where the official text states the answer;
# the remaining ones are disclosed through a "without bank-sourced rules" figure
LB = {l['id']: l for l in LALL}
RB = [('distance', 2), ('distance', 4), ('distance', 5), ('blind', 0), ('blind', 1), ('heavy', 4), ('bus', 5), ('bus', 6), ('tractor', 2), ('tractor', 3), ('tractor', 8)]
ok(all(not LB[l]['rules'][i]['s'].startswith('Q:') for l, i in RB), 'v1.10: re-based rules cite law/textbook, not only a bank question')
CFQ = J('data', 'coverage_full.json')['q']
ok(CFQ['1305']['rule'] and set(CFQ['1305']['rule']) <= {'heavy2#r2', 'cargo2#r0'} and CFQ['1520']['rule'] == ['equip#r2'], 'v1.10: Q1305 -> TR 313(א)(3) length rule, Q1520 -> TR 368 chocks rule')
CA = J('docs', 'coverage_after.json'); CJ = J('data', 'coverage.json')['tot']
TBC = J('data', 'coverage.json')['tb']; LDT = T('LICENSE-DATA.md')
ok(f"{TBC[0]} of the {TBC[1]} lesson rules cite it; {TBC[2]} excerpts from {TBC[3]} of its 170 pages" in LDT and f"about {TBC[4]} %" in LDT,
   f'v1.10: LICENSE-DATA textbook counts match the build ({TBC})')
ok("'ab.tbookText', ...(COV?.tb" in T('js', 'app.js') and I18.count('{0}') >= 2 and 'רוב הכללים' not in I18, 'v1.10: About textbook counts are computed, not "most rules"')
ok('GitHub Pages' in I18 and I18.count('IP') >= 2 and "'ln.why'" in I18 and 'במבחן אין הסברים' in I18, 'v1.10: About privacy names GitHub Pages logging; law text says practice shows "Why?"')
ok(all(len(v) == 9 and v[6] <= v[1] and v[8] <= v[7] for v in CJ.values()), 'v1.10/1.11: app coverage table carries the without-bank-sourced figure (<= full) and partial / shown with bank answer')
ok(all(CA['class'][c]['full_nobank_pct'] <= CA['class'][c]['full_pct'] and CA['class'][c]['full_bank_sourced'] >= 0 for c in CA['class']), 'v1.10: per-class without-bank-sourced figure recorded')
CM = T('docs', 'COVERAGE.md')
ok(f"{CA['all']['full_nobank_pct']}%" in CM and 'bank-sourced' in CM, 'v1.10: COVERAGE.md reports the without-bank-sourced figure next to the headline')

# 5e. v1.11: B/A questions taught only partly are shown in their topic lesson with the official bank answer, before its quiz
import importlib.util as _iu
_sp = _iu.spec_from_file_location('partial_bank', os.path.join(R, 'tools', 'partial_bank.py')); PBM = _iu.module_from_spec(_sp); _sp.loader.exec_module(PBM)
PART = {int(k): e for k, e in CF['q'].items() if e['v'] == 'partial' and set(e['cls']) & {'B', 'A'}}
PBL = [(l, p) for l in LALL for p in l.get('pbank', [])]
miss = [(q, c) for q, e in PART.items() for c in set(e['cls']) & {'B', 'A'}
        if not any(p['q'] == q and c in l['cls'] and q in l['quiz'] for l, p in PBL)]
ok(not miss, f'v1.11: every B/A partial question is shown in a lesson of its class and is in that lesson\'s quiz ({len(PART)} questions; missing {miss[:5]})')
ok(all(CA['class'][c]['partial_shown'] == CA['class'][c]['partial'] for c in ('B', 'A')), 'v1.11: B and A: every per-class partial question is shown with the bank answer')
ok(all(CF['q'][str(p['q'])]['v'] == 'partial' for l, p in PBL), 'v1.11: shown-with-bank-answer questions all stay partial (never counted full)')
ok(len({p['q'] for l, p in PBL}) == len(PBL), 'v1.11: each partial question is shown once')
bad = []
for l, p in PBL:
    exp = [PBM.unit(u, LB, SG) for u in CF['q'][str(p['q'])]['rule']]
    for u in exp: u['o'] = PBM.official(u)
    if exp != p['u']: bad.append(p['q'])
ok(not bad, f'v1.11: partial cards carry only the existing lesson units the verdict cites, with their sources (no new text) {bad[:5]}')
ok(all(not u['o'] or u['k'] == 'sign' or any(x and not x.startswith('Q:') for x in [u['s']] + u.get('also', [])) for l, p in PBL for u in p['u']),
   'v1.11: a unit is labelled "official source" only when it cites a non-bank official source')
ok("'ln.pbRest'" in JL and "'ln.pbNoOff'" in JL and I18.count("'ln.pbRest'") == 2 and I18.count("'ln.pbankNote'") == 2 and I18.count("'ab.covPart'") == 2, 'v1.11: partial cards label official-source part and bank-only rest apart (he + en), About column')
ok('shown with the official bank answer' in CM and f"B {CA['class']['B']['partial_shown']} of {CA['class']['B']['partial']}" in CM, 'v1.11: COVERAGE.md reports partial + shown with official bank answer')

ok(JL.count('opts(v)') >= 3 and "'ln.okb'" in I18 and I18.count("'ln.okb'") == 2, 'v1.11 (review #8): bank cards, partial cards and worked examples show all official options with the correct one marked')
ok(CFQ['978']['v'] == 'full' and 'signs#d702' in CFQ['978']['rule'] and CFQ['985']['v'] == 'partial' and CFQ['1464']['v'] == 'partial'
   and not {'978', '985', '1464'} & set(NS['q']), 'v1.11 (review #8): Q978 taught (sign 702 + light sequence), Q985 and Q1464 partial, none listed as no-source')
ok(CFQ['1506']['rule'] == ['heavy2#r24'] and CFQ['1322']['rule'] == ['heavy2#r22'] and CFQ['1393']['rule'] == ['heavy2#r17'], 'v1.11 (review #8): C/C1 citations 1506, 1322, 1393 point at the unit that teaches the answer')
ok('ובאופנוע (A) הכיסוי חלקי' not in I18 and I18.count('{0}.') >= 2 and 'אף רישיון אינו מכוסה במלואו' in I18 and "t('ab.covText', [" in T('js', 'app.js'), 'v1.11 (review #8): About says every class is partial and gives computed per-class full figures')
ok(not [x['q'] for l in LJ['lessons'] for x in l['ex'] if x['s'].startswith('Q:') or any(a.startswith('Q:') for a in x.get('also', []))], 'v1.11 (review #8): no worked example is sourced from a bank question (signs#x0 re-based on sign table 135/306)')
_LB = {l['id']: l for l in LJ['lessons']}
ok(any('אור מהבהב צהוב' in r['t'] and 'מחווני הכיוון' in r['t'] for r in _LB['bus']['rules']) and not any('אורות מצוקה' in r['t'] for r in _LB['bus']['rules']) and 'אורות מצוקה' not in _LB['bus']['ex'][0]['t'], 'v1.11 (review #8): bus TR 70 rule restates 70(ב)(1) (amber flasher or all indicators), not "hazard lights"')
ok(any('בבלם ובמצמד' in r['t'] for r in _LB['blind']['rules']), 'v1.11 (review #8): blind stopping-steps rule follows the textbook wording (brake and clutch)')
_CSS = T('css', 'style.css'); _APP = T('js', 'app.js')
ok('.tbl.cov td::before { content: attr(data-label)' in _CSS and "'data-label': t(COVH[k + 1]) }, h('bdi'" in _APP and 'pc(nb)' in _APP, 'v1.11 (review #8): About coverage table stacks as labelled cards at phone widths; percentages one decimal')
_np = lambda x: re.sub(r'[\s.,:;\-–״"\'()]+', '', x)
_EXBA = [(l['id'], x) for l in LJ['lessons'] if 'B' in l['cls'] or 'A' in l['cls'] for x in l['ex']]
_badtr = [x['q'] for _, x in _EXBA if 'tr' in x and not (0 <= x['tr'] < len(byid[x['q']]['a']) and x['tr'] != byid[x['q']]['c'])]
ok(not _badtr and sum('tr' in x for _, x in _EXBA) >= len(_EXBA) - 2, f'v1.11 (review #8): B/A worked examples name the closest wrong option (index != correct): {sum("tr" in x for _, x in _EXBA)}/{len(_EXBA)} {_badtr[:5]}')
_badqt = [(x['q'], p['s']) for _, x in _EXBA for p in x.get('qt', []) if not any(_np(p['t'].rstrip('…')) in _np(e) for e in SRC.get(p['s'], {}).get('ex', []))]
ok(not _badqt and sum(bool(x.get('qt')) for _, x in _EXBA) == len(_EXBA) and "'ln.trapNote'" in I18 and 'x.qt.map' in JL, f'v1.11+v1.13 (reviews #8, #9 D3): every worked example (0 uncited) quotes its own official passage verbatim (from the pinned source excerpts): {sum(bool(x.get("qt")) for _, x in _EXBA)}/{len(_EXBA)} {_badqt[:5]}')
# v1.12: MoE topics 7/13/17/21 + Compensation Law s.1 (approved by Dudi 2026-10-26)
_PG = J('tools', 'official/pages.json'); _NS = J('tools', 'coverage/nosource_ba.json')['q']
_SH = {'edu07': '0297ccb25afb', 'edu13': '85cce4eea0bf', 'edu17': 'd04c0c507fd3', 'edu21': '43d231c129ee'}
ok(all(_PG[k]['pdf_sha256'].startswith(v) and _PG[k]['url'].startswith('https://meyda.education.gov.il/') and _PG[k]['quotes'] and all(q.get('p') for q in _PG[k]['quotes']) for k, v in _SH.items())
   and _PG['pitzuim']['src_sha256'].startswith('8fdd952b') and _PG['pitzuim']['revid'] == 2968550, 'v1.12: new sources pinned with PDF / API sha256 and page numbers')
_V12F, _V12P = (1661, 1653, 302, 1006, 1723), (1596, 1599, 1655, 1657, 1615, 1616)
ok(all(CFQ[str(i)]['v'] == 'full' and any(r.startswith(('moto3#', 'alc2#', 'winter2#', 'accident#')) for r in CFQ[str(i)]['rule']) for i in _V12F)
   and all(CFQ[str(i)]['v'] == 'partial' and CFQ[str(i)]['rule'] for i in _V12P), 'v1.12: 5 questions full and 6 partial from the new sources')
ok(not any(str(i) in _NS for i in _V12F + _V12P), 'v1.12: newly sourced questions removed from NO_SOURCE_B_A')
ok(all('may be outdated' in _NS[i]['note'] for i in ('281', '92')) and _NS['281']['g'] == 'law', 'v1.12: Q281 / Q92 kept as no-source with an outdated-answer note (not cited)')
ok(not any(f"'Q:{i}'" in T('tools', 'lessons_v112.py') for i in (281, 92)) and 'return 404\')' not in T('tools', 'coverage/nosource_build.py'), 'v1.12: Q281/Q92 not cited; stale 404 note fixed')
_AR = [r for L in LALL if L['id'] == 'accident' for r in L['rules'] if 'OFF:pitzuim' in r.get('also', [])]
ok(len(_AR) == 1 and _AR[0]['s'] == 'OFF:edu21', 'v1.12: Q1723 rule combines MoE topic 21 with Compensation Law s.1')
_N12 = J('data', 'lessons.json')['notes']
ok(_N12.get('281', {}).get('s') == 'TR:47' and _N12.get('92', {}).get('s') == 'TR:172א' and all('אינה מעודכנת' in _N12[i]['law'] for i in ('281', '92')), 'v1.12: Q281 / Q92 carry the in-app "bank answer may be outdated" note (deleted / cancelled provision)')

# 5f. v1.13 (review #9 D1): every cited item pins its OWN passage, shown first in its chip; the passage is in the pinned
# source and carries the item's own checks (no more "first excerpts of the section")
sys.path.insert(0, os.path.join(R, 'tools'))
from lessons_spec import LESSONS as _LS, EXAMPLES as _EXS
from cite_v113 import CHK as _CITE
_LAW = J('tools', 'law/law.json')
_nm = lambda x: re.sub(r'\s+', ' ', re.sub(r'[״׳"\'`“”„‘’\-–—־.,;:!?()\[\]/]', ' ', re.sub(r'[\u0591-\u05C7]', '', x))).strip()
_pg = lambda e: re.sub(r'\s*\(עמ׳ \d+\)$', '', e)
_sid = lambda s: re.match(r'^(TR|TO|LT|LTP|Q|OFF):([^()]+)', s).group(0)
_LJI = {l['id']: l for l in LJ['lessons']}
_bad1, _n1 = [], 0
for _L in _LS:
    _J = _LJI.get(_L['id'])
    if not _J: continue
    _items = [('rule', r, _j, r.get('chk', [])) for r, _j in zip(_L['rules'], _J['rules'])]
    _items += [('mnem', m, _j, list(m[3]) if len(m) > 3 else _CITE.get(f"{_L['id']}.mnem{i}", [])) for i, (m, _j) in enumerate(zip(_L.get('mnem', []), _J['mnem']))]
    _items += [('recap', c, _j, c.get('chk') or _CITE.get(f"{_L['id']}.recap{i}", [])) for i, (c, _j) in enumerate(zip(_L['recap'], _J['recap']))]
    _items += [('ex', x, _j, x.get('chk', [])) for x, _j in zip(_EXS.get(_L['id'], []), _J['ex'])]
    for _k, _sp_, _j, _ch in _items:
        _s = _j['s']
        if _s.startswith('Q:'): continue
        _n1 += 1; _x = _j.get('x') or []; _sd = _sid(_s); _w = f"{_L['id']}.{_k}:{_s}"
        if not _x or _x[0][0] != _sd: _bad1.append(_w + ' no own excerpt first'); continue
        for _xs, _xe in _x:
            if not any(_nm(_pg(_xe))[:200] in _nm(e) for e in SRC.get(_xs, {}).get('ex', [])): _bad1.append(_w + ' excerpt not pinned')
            _kd, _ky = _xs.split(':', 1)
            if _kd in ('TR', 'TO') and any(_nm(_pt) not in _nm(_LAW[_kd][_ky]['text']) for _pt in _pg(_xe).split(' … ')): _bad1.append(_w + ' excerpt not in law text')
        _own = ' '.join(_nm(e) for xs, e in _x if xs == _sd)
        if _sd.split(':')[0] in ('TR', 'TO') and not _ch: _bad1.append(_w + ' no checks')
        _bad1 += [_w + f' check "{c}" not in its own excerpt' for c in _ch if _sd.split(':')[0] in ('TR', 'TO', 'OFF') and _nm(c) not in _own]
ok(not _bad1 and _n1 > 600, f'v1.13 (review #9 D1): every rule / mnemonic / recap / example pins its own passage, present in the pinned source and containing its own checks ({_n1} items; {_bad1[:4]})')
ok('mine.length ? mine' in JL and 'slice(0, 4)' not in JL and "'#page=' + pg[1]" in JL, 'v1.13 (review #9 D1): the chip shows the item\'s own passage first')

# v1.13 (review #9 D2): no-source questions are never regular lesson-quiz items; each is in a 'מהמאגר הרשמי' bank-only lesson
_NSQ = {int(k) for k, e in CF['q'].items() if e['v'] == 'none' and e.get('src') in ('S', 'X')}
_inq = sorted({(l['id'], q) for l in LJ['lessons'] if not l.get('bank') for q in l['quiz'] if q in _NSQ})
_nob = sorted(q for q in _NSQ if not any(q in l.get('bank', []) for l in LJ['lessons']))
ok(not _inq and not _nob and {92, 909, 914, 923, 1160, 1076, 1699, 1765, 1454, 1455, 1456, 1472} <= _NSQ, f'v1.13 (review #9 D2): {len(_NSQ)} no-source questions: none in a regular lesson quiz {_inq[:5]}, all in a bank-only lesson {_nob[:5]}')
# v1.13 (review #9): rules whose only source is a bank question (circular) are labelled "תשובת המאגר" in their chip
_QR = sorted((l['id'], i, r['s']) for l in LALL for i, r in enumerate(l['rules']) if r['s'].startswith('Q:'))
ok({('signs', 'Q:606'), ('signs', 'Q:477'), ('bus', 'Q:1726')} <= {(a, c) for a, _, c in _QR} and "cited && x.kind === 'Q' ? t('ln.bankAns')" in JL
   and 'refs = (s, also = [], own) => h(\'span\', { class: \'refs\' }, [s, ...also].map(a => ref(a, own, true)))' in JL
   and 'תשובת המאגר' in T('js', 'i18n.js'), f'v1.13 (review #9): {len(_QR)} bank-sourced rules are labelled "תשובת המאגר" in their chip')
# v1.13 (review #9 D5): maint2's carbon-monoxide rule keeps to the kids_co wording (no "closed car park" inference)
_CO = [r['t'] for r in LB['maint2']['rules'] if r['s'] == 'OFF:kids_co']
ok(len(_CO) == 1 and 'חניון' not in _CO[0] and 'אין להשאיר' not in _CO[0] and 'שיכולה להתרחש באזורים סגורים' in _CO[0], 'v1.13 (review #9 D5): maint2 CO rule states only what kids_co says')
# v1.13 (review #9 D6): the Compensation Law source JSON is in the repo and its sha256 is the one pages.json records
import hashlib, subprocess as _sp
_PF = os.path.join(R, 'tools', 'official', 'cache', 'pitzuim_rev2968550.json')
_trk = _sp.run(['git', 'ls-files', '--error-unmatch', _PF], cwd=R, capture_output=True).returncode == 0
ok(_trk and os.path.exists(_PF) and hashlib.sha256(open(_PF, 'rb').read()).hexdigest() == J('tools', 'official', 'pages.json')['pitzuim']['src_sha256'],
   'v1.13 (review #9 D6): the committed pitzuim API JSON reproduces src_sha256')
# v1.13 (D1 follow-up): no full verdict rests only on uncited lesson-body prose – practice feedback always has a cited rule
_BO = sorted(int(i) for i, e in CF['q'].items() if e['v'] == 'full' and e.get('rule') and all('#b' in u for u in e['rule']))
ok(not _BO, f'v1.13: no full verdict rests only on uncited lesson-body prose {_BO[:10]}')

# v1.14 (review #10 N1): no wiki markup residue in any displayed passage (template params, braces, links, html)
import re as _re
_WK = _re.compile(r'סוג=|\w+=\S|\{\{|\}\}|\[\[|\]\]|<[a-z/]|&nbsp;|\|')
_res = sorted({(l['id'], k, i) for l in LALL for k in ('rules', 'mnem', 'recap', 'ex') for i, r in enumerate(l.get(k, [])) for x in r.get('x', []) if _WK.search(x[1])})
_res += sorted({('src', s_) for s_, v in SRC.items() for e in v.get('ex', []) if _WK.search(e)})
ok(not _res, f'v1.14 (review #10 N1): no wikitext residue (e.g. "סוג=הגדרה") in any chip passage {_res[:5]}')
# v1.14 (review #10 N2): TR 54 table rows are pinned with their column headings – every speed rule's passage holds its number
_T54 = [(l['id'], k, i, x[1]) for l in LALL for k in ('rules', 'mnem', 'recap', 'ex') for i, r in enumerate(l.get(k, [])) for x in r.get('x', []) if x[0] == 'TR:54' and _re.search(r'\(א\)', r.get('s', '') + '(א)')]
_bad54 = [(a, b, c) for a, b, c, p in _T54 if p.startswith('דרך עירונית דרך עירונית') or 'רשות התימרור המרכזית' in p]
ok(len(_T54) > 15 and not _bad54 and all(' – ' in p for _, _, _, p in _T54 if 'מהירות מרבית מותרת בקילומטרים לשעה' in p), f'v1.14 (review #10 N2): TR 54 chips show the table row with headings, not bare column headers or 54(ה1) ({len(_T54)} passages; {_bad54[:4]})')
_L7 = LB['law3']['rules'][7]['x'][0][1]
ok('דרך שאינה עירונית עם שטח הפרדה בנוי – 90' in _L7 and 'רכב מנועי למעט' in _L7, 'v1.14 (review #10 N2): law3#r7 chip states "…עם שטח הפרדה בנוי – 90" for its row')

# v1.14 (review #10 N3): textbook chips are whole sentences/list items, not fragments
_TBP = [re.sub(r'\s+', ' ', p if isinstance(p, str) else p.get('t', '')) for p in json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'official', 'cache', 'textbook_pages.json')))]
_frag = []; _nt = 0
for _l in LB.values():
    for _i, _r in enumerate(_l.get('rules', [])):
        for _x in _r.get('x') or []:
            if _x[0] != 'OFF:textbook': continue
            _m = re.match(r'(.*) \(עמ׳ (\d+)\)$', _x[1]); _c = _m.group(1); _nt += 1
            if len(_c) >= 45: continue
            _t = _TBP[int(_m.group(2)) - 1]; _k = _t.find(_c); _e = _t[_k + len(_c):_k + len(_c) + 2]
            if not (_c.rstrip().endswith(('.', '!', ':')) or _e.strip()[:1] in ('.', '•', '!', ':', '')): _frag.append(f"{_l['id']}#r{_i}")
ok(not _frag and _nt >= 340, f'v1.14 (review #10 N3): every short textbook chip ends at a sentence/list-item boundary ({_nt} chips; fragments: {_frag[:8]})')
_smp = []
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'official')); import pin as _pin
_RAW = [p if isinstance(p, str) else p.get('t', '') for p in json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'official', 'cache', 'textbook_pages.json')))]
for _l in LB.values():
    for _i, _r in enumerate(_l.get('rules', [])):
        for _x in _r.get('x') or []:
            if _x[0] != 'OFF:textbook': continue
            _m = re.match(r'(.*) \(עמ׳ (\d+)\)$', _x[1]); _pg = _RAW[int(_m.group(2)) - 1]
            for _z in _pin.quiz_spans(_pg): _pg = _pg.replace(_z, '')
            if _pin.norm(_m.group(1)) not in _pin.norm(_pg): _smp.append(f"{_l['id']}#r{_i}")
ok(not _smp, f'v1.14: every textbook chip occurs in the explanatory prose (not a sample-exam block) of the page its tag names ({_smp[:8]})')
# v1.14 (review #10 item 8 / N2): every number a rule/example/mnemonic/recap states appears in its displayed passages
_W = {'1': ['אחת', 'אחד'], '2': ['שתי', 'שני', 'שנתיים', 'חודשיים'], '3': ['שלוש'], '4': ['ארבע'], '5': ['חמש', 'חמישה'], '6': ['שש', 'שישה'], '7': ['שבע'], '8': ['שמונה'], '9': ['תשע'], '10': ['עשר'], '11': ['אחד־עשר', 'אחד עשר', 'אחת עשרה'], '12': ['שנים עשר', 'שתים עשרה'], '14': ['ארבע עשרה'], '15': ['חמש עשרה', 'חמישה עשר'], '16': ['שש עשרה', 'שישה עשר', 'שש־עשרה'], '17': ['שבע עשרה', 'שבע־עשרה'], '18': ['שמונה עשרה', 'שמונה־עשרה'], '19': ['תשעה עשר', 'תשע עשרה'], '20': ['עשרים'], '21': ['עשרים ואחת'], '24': ['עשרים וארבע'], '30': ['שלושים'], '40': ['ארבעים'], '48': ['ארבעים ושמונה'], '50': ['חמישים'], '60': ['שישים'], '100': ['מאה'], '8.5': ['8 שעות ו־30 דקות']}
def _nums(s):
    s = re.sub(r'(תקנה|תקנות|תקנת|סעיף|סעיפים|תמרור|תמרורים|פקודה|שורה|פרט|חלק|ס׳|תק׳)\s*[\d]+[א-ת]?(\([^)]*\))*', '', s)
    s = re.sub(r'\(\d+[א-ת]?(\([^)]*\))+\)', '', s); s = re.sub(r'\d+[א-ת]?\([א-ת0-9]+\)', '', s)
    s = re.sub(r'\(בבנק[^)]*\)', '', s); s = re.sub(r'עמ׳\s*\d+(–\d+)?', '', s)
    s = re.sub(r'\((\d{3}[א-ת]?(\([^)]*\))?(,\s*)?)+( ועוד)?\)', '', s)   # sign numbers (511), (909, 914 ועוד)
    s = re.sub(r'[A-Za-z]+\d+|\d+[א-ת]\d+|\b\d(-\d)+\b', '', s)          # classes A1/C1, refs 12א1, mnemonic chains 1-2-3
    s = re.sub(r'(?<![\d.])\d{1,2}\.\d{1,2}\.\d{4}(?!\d)', '', s); s = re.sub(r'\b(19|20)\d\d\b', '', s)
    s = re.sub(r'(\d+)\s*(טון|אלף)', lambda m: str(int(m.group(1)) * 1000), s)
    return set(re.findall(r'\d+(?:\.\d+)?', s.replace(',', '')))
_nm = []; _nn = 0
for _l in LB.values():
    for _k, _F in (('rules', ('t',)), ('ex', ('t',)), ('mnem', ('t', 'n')), ('recap', ('b',))):
        for _i, _r in enumerate(_l.get(_k, [])):
            if not _r.get('x') or any(_x[0].startswith('Q:') for _x in _r['x']): continue
            _t = ' '.join(str(_r.get(_f, '')) for _f in _F); _nn += 1
            _P = ' '.join(_x[1] for _x in _r['x']).replace('(,)', '').replace(',', '')
            _pf = {float(v) for v in re.findall(r'(?<![\d.])\d+(?:\.\d+)?(?![\d])', _P)}
            for _n in _nums(_t):
                if float(_n) in _pf or any(w in _P for w in _W.get(_n, [])): continue
                _dm = re.fullmatch(r'(\d{1,2})\.(\d{1,2})', _n)
                if _dm and re.search(r'(?<!\d)' + _dm.group(1) + r' ב', _P): continue   # date 1.11 ↔ "1 בנובמבר"
                _nm.append(f"{_l['id']}#{_k}{_i}:{_n}")
ok(not _nm and _nn >= 1000, f'v1.14 (review #10 item 8): every number stated in a rule/example/mnemonic/recap appears in its displayed passages ({_nn} items; missing: {_nm[:8]})')
_pr = []
for _l in LB.values():
    for _k in ('rules', 'ex', 'mnem', 'recap'):
        for _i, _r in enumerate(_l.get(_k, [])):
            _pg = [int(p) for _x in _r.get('x') or [] for p in re.findall(r'\(עמ׳ (\d+)\)$', _x[1])]
            for _m in re.finditer(r'עמ׳\s*(\d+)(?:[–-](\d+))?', ' '.join(str(_r.get(f, '')) for f in ('t', 'n', 'b'))):
                if not any(int(_m.group(1)) <= p <= int(_m.group(2) or _m.group(1)) for p in _pg): _pr.append(f"{_l['id']}#{_k}{_i}")
ok(not _pr, f'v1.14 (review #10 N3): a page cited in a rule text ("עמ׳ N") matches the page tag of one of its chips ({_pr[:8]})')
print(f'\n{len(fails)} failed' if fails else '\nall data checks passed')
sys.exit(1 if fails else 0)

