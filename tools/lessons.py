#!/usr/bin/env python3
"""Build data/lessons.json + data/sources.json from tools/lessons_spec.py.
Fails if any rule's check substring is missing from its cited source text."""
import json, re, sys, os, hashlib
from urllib.parse import quote
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'tools'))
from lessons_spec import LESSONS, EXAMPLES, NOTES

LAW = json.load(open(os.path.join(ROOT, 'tools/law/law.json')))
LOT = json.load(open(os.path.join(ROOT, 'tools/law/lotam.json')))
OFF = json.load(open(os.path.join(ROOT, 'tools/official/pages.json')))  # pinned RSA/gov.il pages (tools/official/pin.py)
QS = {q['id']: q for q in json.load(open(os.path.join(ROOT, 'data/q.he.json')))}
META = LAW['_meta']
TITLES = {'TR': 'תקנות_התעבורה', 'TO': 'פקודת_התעבורה'}
NAMES = {'TR': 'תקנות התעבורה, התשכ"א–1961', 'TO': 'פקודת התעבורה [נוסח חדש]'}
BANK_URL = 'https://data.gov.il/he/datasets/ministry_of_transport/tqhe'

def norm(s, nospace=False):
    s = re.sub(r'[\u0591-\u05C7]', '', s)
    s = re.sub(r'[״׳"\'`“”„‘’\-–—־.,;:!?()\[\]/]', ' ', s)
    s = re.sub(r'\s+', '' if nospace else ' ', s).strip()
    return s

LOT_PAGES = LOT['pages']
LOT_ALL = ' '.join(LOT_PAGES)
START = LOT_ALL.find('לוח ה תמרורים')

def lt_windows(num):
    out = []
    pat = (r'ס\s*-\s*' + num[2:] if num.startswith('ס-') else re.escape(num)) + r'(?![\d,])'
    for m in re.finditer(r'(?<![\d,])' + pat, LOT_ALL[START:]):
        i = START + m.start()
        out.append(LOT_ALL[i:i + 400])
    return out

def anchor(key):
    m = re.match(r'תוספת(\d+)פרט(.+)$', key)
    return f'תוספת_{m[1]}_פרט_{m[2]}' if m else 'סעיף_' + key

def parse(src):
    m = re.match(r'^(TR|TO|LT|LTP|Q|OFF):([^()]+)(\(.*\))?$', src)
    if not m: raise SystemExit('bad src ' + src)
    return m.group(1), m.group(2), m.group(3) or ''

sources = {}
errors = []

def excerpt(text, checks):
    # the sentence(s) / sub-clauses containing the checks
    parts = re.split(r'\n', text)
    keep = []
    for p in parts:
        np_ = norm(p)
        if any(norm(c) in np_ for c in checks) and p.strip() not in keep:
            keep.append(p.strip())
    ex = ' … '.join(keep)
    return ex[:900]

def source(src, checks, where):
    kind, key, sub = parse(src)
    sid = kind + ':' + key
    if kind in ('TR', 'TO'):
        sec = LAW[kind].get(key)
        if not sec: errors.append(f'{where}: no section {sid}'); return sid
        text = sec['text']; nt = norm(text)
        for c in checks:
            if norm(c) not in nt: errors.append(f'{where}: "{c}" not in {sid}')
        rev = META[kind]['revid']
        url = ('https://he.wikisource.org/w/index.php?title=' + quote(TITLES[kind]) +
               '&oldid=' + str(rev) + '#' + quote(anchor(key)))
        s = sources.setdefault(sid, {'kind': kind, 'label': sec['title'] if key.startswith('תוספת') else ('תקנה ' if kind == 'TR' else 'סעיף ') + key,
            'title': '' if key.startswith('תוספת') else sec.get('title', ''), 'doc': NAMES[kind], 'url': url, 'rev': rev, 'ex': []})
        e = excerpt(text, checks)
        if e and e not in s['ex']: s['ex'].append(e)
    elif kind == 'LT':
        ws = lt_windows(key)
        ok = [w for w in ws if all(norm(c, True) in norm(w, True) for c in checks)]
        if not ok: errors.append(f'{where}: {checks} not near sign {key}')
        s = sources.setdefault(sid, {'kind': kind, 'label': 'תמרור ' + key, 'title': '',
            'doc': LOT['title'], 'url': LOT['url'], 'ex': []})
        if ok:
            e = re.sub(r'\s+', ' ', ok[0])[:220]
            if e not in s['ex']: s['ex'].append(e)
    elif kind == 'LTP':
        pg = [p for p in LOT_PAGES if re.search(r'חלק\s*' + key + r'\s', p) and len(p) < 400]
        if not pg or not all(norm(c, True) in norm(pg[0], True) for c in checks):
            errors.append(f'{where}: part {key} heading mismatch')
        sources.setdefault(sid, {'kind': kind, 'label': 'לוח התמרורים, חלק ' + key, 'title': '',
            'doc': LOT['title'], 'url': LOT['url'],
            'ex': [re.sub(r'^.*?(חלק)', r'\1', pg[0]).strip()] if pg else []})
    elif kind == 'OFF':
        pg = OFF.get(key)
        if not pg: errors.append(f'{where}: no official page {key}'); return sid
        qs = [q for q in pg['quotes'] if any(norm(c, True) in norm(q['t'], True) for c in checks)]
        for c in checks:
            if not any(norm(c, True) in norm(q['t'], True) for q in pg['quotes']): errors.append(f'{where}: "{c}" not in a pinned quote of OFF:{key}')
        if not checks: errors.append(f'{where}: OFF source needs checks (they pick the quoted passage)')
        s = sources.setdefault(sid, {'kind': kind, 'label': pg['title'], 'title': '', 'doc': pg['publisher'], 'url': pg['url'],
            'accessed': pg['accessed'], 'sha256': pg['sha256'], 'pub': pg.get('updated') or pg.get('published'), 'ex': []})
        for q in qs:
            e = q['t'] + (f' (עמ׳ {q["p"]})' if q.get('p') else '')
            if e not in s['ex']: s['ex'].append(e)
    elif kind == 'Q':
        q = QS.get(int(key))
        if not q: errors.append(f'{where}: no question {key}'); return sid
        ans = q['a'][q['c']]
        for c in checks:
            if norm(c) not in norm(q['q'] + ' ' + ans): errors.append(f'{where}: "{c}" not in Q{key}')
        sources.setdefault(sid, {'kind': kind, 'label': 'שאלה ' + key + ' במאגר', 'title': '',
            'doc': 'מאגר שאלות התאוריה הרשמי (data.gov.il, CC BY)', 'url': BANK_URL,
            'ex': [q['q'] + ' — ' + ans], 'qid': q['id']})
    return src

def pick(lesson, spec, img):
    rx = re.compile(spec['re'])
    out = []
    for q in QS.values():
        if q['k'] not in spec.get('k', [q['k']]) and 'k' in spec: continue
        if img and not q.get('i'): continue
        if img and q['k'] != 'signs': continue
        if not set(q['t']) & set(lesson['cls']): continue
        if spec.get('cls_only') and 'B' in q['t']: continue
        if rx.search(q['q'] + ' ' + q['a'][q['c']]): out.append(q['id'])
    return out

COVF = os.path.join(ROOT, 'data/coverage.json')
COV = json.load(open(COVF))['q'] if os.path.exists(COVF) and '--regex-quiz' not in sys.argv else {}
out = []
used = {}
for L in LESSONS:
    lid = L['id']
    rules = []
    for i, r in enumerate(L['rules']):
        source(r['s'], r['chk'], f'{lid}.rule{i}')
        for a, ch in r.get('also', []): source(a, ch, f'{lid}.rule{i}.also')
        rules.append({'t': r['t'], 's': r['s'], **({'also': [a for a, _ in r['also']]} if r.get('also') else {})})
    for i, m in enumerate(L.get('mnem', [])):
        source(m[2], list(m[3]) if len(m) > 3 else [], f'{lid}.mnem{i}')
    recap = []
    for i, c in enumerate(L['recap']):
        source(c['s'], c.get('chk', []), f'{lid}.recap{i}')
        recap.append({k: v for k, v in c.items() if k != 'chk'})
    ex = []
    for i, x in enumerate(EXAMPLES.get(lid, [])):
        if x['q'] not in QS: errors.append(f'{lid}.ex{i}: no Q{x["q"]}')
        source(x['s'], x.get('chk', []), f'{lid}.ex{i}')
        ex.append({k: v for k, v in x.items() if k != 'chk'})
    quiz = pick(L, dict(L['quiz']), False)
    if COV:  # quiz = the bank questions the coverage map sends to this lesson (taught/likely), regex picks as fallback
        mapped = [int(k) for k, v in COV.items() if v[0] in 'fa' and v[1] and v[1][0] == lid and int(k) in QS
                  and set(QS[int(k)]['t']) & set(L['cls'])]
        if all(sum(1 for i in mapped if c in QS[i]['t']) >= L.get('quiz_min', 5) for c in L['cls']):
            quiz = sorted(mapped)
        else:
            quiz = sorted(set(mapped) | set(quiz))
    gal = []
    if L.get('gal'):
        cand = pick(L, {'k': ['signs'], 're': L['gal']['re']}, True)
        seen = set()
        for i in cand:
            im = QS[i]['i']
            if im in seen: continue
            seen.add(im); gal.append(i)
        # spread picks evenly over the candidates
        n = L['gal']['n']
        if len(gal) > n:
            step = len(gal) / n
            gal = [gal[int(k * step)] for k in range(n)]
    per = {c: sum(1 for i in quiz if c in QS[i]['t']) for c in L['cls']}
    for c, n in per.items():
        if n < L.get('quiz_min', 5): errors.append(f'{lid}: only {n} quiz questions for class {c}')
    out.append({'id': lid, 'cls': L['cls'], 'icon': L['icon'], 'title': L['title'], 'sub': L['sub'],
                'body': L['body'], 'rules': rules, 'mnem': [{'t': m[0], 'n': m[1], 's': m[2]} for m in L.get('mnem', [])],
                'viz': L.get('viz', []), 'gal': gal, 'ex': ex, 'quiz': quiz, 'recap': recap})
    print(f'{lid:9s} rules={len(rules):2d} gal={len(gal):2d} ex={len(ex)} quiz={len(quiz):3d} per-class={per}')

# v1.10: bank-only lessons for every question with no official source (question + answer as published, no explanation)
import bank_lessons
if os.path.exists(os.path.join(ROOT, 'data/coverage_full.json')):
    BL, _ = bank_lessons.build(QS)
    for b in BL:
        per = {c: sum(1 for i in b['quiz'] if c in QS[i]['t']) for c in b['cls']}
        if min(per.values()) < 1: errors.append(f"{b['id']}: empty for a class")
        out.append({k: v for k, v in b.items() if k != 'quiz_min'})
        print(f"{b['id']:9s} bank={len(b['bank']):3d} per-class={per}")
notes = {}
for qid, (txt, src, chk) in bank_lessons.BANK_NOTES.items():
    q = QS.get(qid)
    if not q: errors.append(f'bank note {qid}: no such question'); continue
    source(src, chk, f'banknote{qid}')
    notes[str(qid)] = {'exam': q['a'][q['c']], 'law': txt, 's': src, 'k': 'tb'}
for qid, (law, src, chk) in NOTES.items():
    q = QS.get(qid)
    if not q: errors.append(f'note {qid}: no such question'); continue
    source(src, chk, f'note{qid}')
    notes[str(qid)] = {'exam': q['a'][q['c']], 'law': law, 's': src}

if errors:
    print('\n'.join('ERROR ' + e for e in errors)); sys.exit(1)

meta = {'built': 'from tools/lessons_spec.py', 'TR_rev': META['TR']['revid'], 'TO_rev': META['TO']['revid'],
        'lotam': {'title': LOT['title'], 'url': LOT['url'], 'sha256': LOT.get('sha256')}}
json.dump({'v': 1, 'meta': meta, 'lessons': out, 'notes': notes}, open(os.path.join(ROOT, 'data/lessons.json'), 'w'),
          ensure_ascii=False, separators=(',', ':'))
json.dump(sources, open(os.path.join(ROOT, 'data/sources.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
print('ok', len(out), 'lessons', len(sources), 'sources',
      os.path.getsize(os.path.join(ROOT, 'data/lessons.json')), os.path.getsize(os.path.join(ROOT, 'data/sources.json')), 'bytes')
