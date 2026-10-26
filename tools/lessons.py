#!/usr/bin/env python3
"""Build data/lessons.json + data/sources.json from tools/lessons_spec.py.
Fails if any rule's check substring is missing from its cited source text."""
import json, re, sys, os, hashlib
from urllib.parse import quote
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'tools'))
from lessons_spec import LESSONS, EXAMPLES

LAW = json.load(open(os.path.join(ROOT, 'tools/law/law.json')))
LOT = json.load(open(os.path.join(ROOT, 'tools/law/lotam.json')))
QS = {q['id']: q for q in json.load(open(os.path.join(ROOT, 'data/q.he.json')))}
META = LAW['_meta']
TITLES = {'TR': 'תקנות_התעבורה', 'TO': 'פקודת_התעבורה'}
NAMES = {'TR': 'תקנות התעבורה, התשכ"א–1961', 'TO': 'פקודת התעבורה [נוסח חדש]'}
BANK_URL = 'https://data.gov.il/dataset/theoryexamhe'

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
    for m in re.finditer(r'(?<![\d,])' + re.escape(num) + r'(?![\d,])', LOT_ALL[START:]):
        i = START + m.start()
        out.append(LOT_ALL[i:i + 400])
    return out

def parse(src):
    m = re.match(r'^(TR|TO|LT|LTP|Q):([^()]+)(\(.*\))?$', src)
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
               '&oldid=' + str(rev) + '#' + quote('סעיף_' + key))
        s = sources.setdefault(sid, {'kind': kind, 'label': ('תקנה ' if kind == 'TR' else 'סעיף ') + key,
            'title': sec.get('title', ''), 'doc': NAMES[kind], 'url': url, 'rev': rev, 'ex': []})
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
        source(m[2], [], f'{lid}.mnem{i}')
    recap = []
    for i, c in enumerate(L['recap']):
        source(c['s'], [], f'{lid}.recap{i}')
        recap.append(c)
    ex = []
    for i, x in enumerate(EXAMPLES.get(lid, [])):
        if x['q'] not in QS: errors.append(f'{lid}.ex{i}: no Q{x["q"]}')
        source(x['s'], x.get('chk', []), f'{lid}.ex{i}')
        ex.append({k: v for k, v in x.items() if k != 'chk'})
    quiz = pick(L, dict(L['quiz']), False)
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
        if n < 5: errors.append(f'{lid}: only {n} quiz questions for class {c}')
    out.append({'id': lid, 'cls': L['cls'], 'icon': L['icon'], 'title': L['title'], 'sub': L['sub'],
                'body': L['body'], 'rules': rules, 'mnem': [{'t': m[0], 'n': m[1], 's': m[2]} for m in L.get('mnem', [])],
                'viz': L.get('viz', []), 'gal': gal, 'ex': ex, 'quiz': quiz, 'recap': recap})
    print(f'{lid:9s} rules={len(rules):2d} gal={len(gal):2d} ex={len(ex)} quiz={len(quiz):3d} per-class={per}')

if errors:
    print('\n'.join('ERROR ' + e for e in errors)); sys.exit(1)

meta = {'built': 'from tools/lessons_spec.py', 'TR_rev': META['TR']['revid'], 'TO_rev': META['TO']['revid'],
        'lotam': {'title': LOT['title'], 'url': LOT['url'], 'sha256': LOT.get('sha256')}}
json.dump({'v': 1, 'meta': meta, 'lessons': out}, open(os.path.join(ROOT, 'data/lessons.json'), 'w'),
          ensure_ascii=False, separators=(',', ':'))
json.dump(sources, open(os.path.join(ROOT, 'data/sources.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
print('ok', len(out), 'lessons', len(sources), 'sources',
      os.path.getsize(os.path.join(ROOT, 'data/lessons.json')), os.path.getsize(os.path.join(ROOT, 'data/sources.json')), 'bytes')
