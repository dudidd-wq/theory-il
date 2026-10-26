#!/usr/bin/env python3
"""Build data/lessons.json + data/sources.json from tools/lessons_spec.py.
Fails if any rule's check substring is missing from its cited source text."""
import json, re, sys, os, hashlib
from urllib.parse import quote
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'tools'))
from lessons_spec import LESSONS, EXAMPLES, NOTES
from cite_v113 import CHK as CITE

LAW = json.load(open(os.path.join(ROOT, 'tools/law/law.json')))
LOT = json.load(open(os.path.join(ROOT, 'tools/law/lotam.json')))
OFF = json.load(open(os.path.join(ROOT, 'tools/official/pages.json')))  # pinned RSA/gov.il pages (tools/official/pin.py)
QS = {q['id']: q for q in json.load(open(os.path.join(ROOT, 'data/q.he.json')))}
META = LAW['_meta']
import bank_lessons as _bl
NOSRC = set(_bl.nosource_ids(QS))  # v1.13 D2
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

PASS = []  # v1.11: passages picked by the last source() calls (per-example official wording)

def own():
    # v1.13 (review #9 D1): the excerpt(s) this item itself pinned – [source id, passage (with page)] – shown first in its chip
    return [[s_, t_] for s_, t_ in dict.fromkeys(PASS)]

def trap(q):
    # v1.11 (review #8 item 2): the wrong option closest in wording to the correct one (token overlap) – an objective pick, no written text
    tok = lambda s: set(re.findall(r'[\w\u0590-\u05ff]+', s))
    A = tok(q['a'][q['c']])
    sc = [(len(A & tok(a)) / (len(A | tok(a)) or 1), -k) for k, a in enumerate(q['a']) if k != q['c']]
    return -max(sc)[1] if sc else None

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
        if e: PASS.append((sid, e))
    elif kind == 'LT':
        ws = lt_windows(key)
        ok = [w for w in ws if all(norm(c, True) in norm(w, True) for c in checks)]
        if not ok: errors.append(f'{where}: {checks} not near sign {key}')
        s = sources.setdefault(sid, {'kind': kind, 'label': 'תמרור ' + key, 'title': '',
            'doc': LOT['title'], 'url': LOT['url'], 'ex': []})
        if ok:
            e = re.sub(r'\s+', ' ', ok[0])[:220]
            if e not in s['ex']: s['ex'].append(e)
            # the sign's own entry only (cut at the next sign number); PDF RTL artefact ' .word' shown as ' word'
            m = re.search(r'(?<!\d)' + re.escape(key) + r'(?!\d)', e); e2 = e[m.start():] if m else e
            kn = int(re.match(r'\d+', key).group()) if re.match(r'\d+', key) else None
            m = next((m for m in re.finditer(r'\s(\d{3})[א-ת]?\s', e2[len(key):]) if kn and kn < int(m.group(1)) <= kn + 9), None)
            e2 = e2[:len(key) + m.start()] if m else e2
            PASS.append((sid, re.sub(r'(^|\s)[.,:;]+(?=\S)', r'\1', e2).strip()))
    elif kind == 'LTP':
        pg = [p for p in LOT_PAGES if re.search(r'חלק\s*' + key + r'\s', p) and len(p) < 400]
        if not pg or not all(norm(c, True) in norm(pg[0], True) for c in checks):
            errors.append(f'{where}: part {key} heading mismatch')
        sources.setdefault(sid, {'kind': kind, 'label': 'לוח התמרורים, חלק ' + key, 'title': '',
            'doc': LOT['title'], 'url': LOT['url'],
            'ex': [re.sub(r'^.*?(חלק)', r'\1', pg[0]).strip()] if pg else []})
        if pg: PASS.append((sid, re.sub(r'^.*?(חלק)', r'\1', pg[0]).strip()))
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
            PASS.append((sid, e))
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
        PASS.clear()
        source(r['s'], r['chk'], f'{lid}.rule{i}')
        for a, ch in r.get('also', []): source(a, ch, f'{lid}.rule{i}.also')
        rules.append({'t': r['t'], 's': r['s'], **({'also': [a for a, _ in r['also']]} if r.get('also') else {}), 'x': own()})
    mnem = []
    for i, m in enumerate(L.get('mnem', [])):
        PASS.clear()
        source(m[2], list(m[3]) if len(m) > 3 else CITE.get(f'{lid}.mnem{i}', []), f'{lid}.mnem{i}')
        mal = CITE.get(f'{lid}.mnem{i}.also', [])
        for a_, ch in mal: source(a_, ch, f'{lid}.mnem{i}.also')
        mnem.append({'t': m[0], 'n': m[1], 's': m[2], **({'also': [a_ for a_, _ in mal]} if mal else {}), 'x': own()})
    recap = []
    for i, c in enumerate(L['recap']):
        PASS.clear()
        source(c['s'], c.get('chk') or CITE.get(f'{lid}.recap{i}', []), f'{lid}.recap{i}')
        recap.append({**{k: v for k, v in c.items() if k != 'chk'}, 'x': own()})
    ex = []
    for i, x in enumerate(EXAMPLES.get(lid, [])):
        if x['q'] not in QS: errors.append(f'{lid}.ex{i}: no Q{x["q"]}')
        PASS.clear()
        source(x['s'], x.get('chk', []), f'{lid}.ex{i}')
        for a_, ch in x.get('also', []): source(a_, ch, f'{lid}.ex{i}.also')
        qt = [{'s': s_, 't': t_} for s_, t_ in dict.fromkeys(PASS)]
        q_ = QS.get(x['q'])
        ex.append({**{k: v for k, v in x.items() if k not in ('chk', 'also')}, **({'also': [a_ for a_, _ in x['also']]} if x.get('also') else {}),
                   'qt': qt, 'x': [[d['s'], d['t']] for d in qt], **({'tr': trap(q_)} if q_ and trap(q_) is not None else {})})
    quiz = pick(L, dict(L['quiz']), False)
    if COV:  # quiz = the bank questions the coverage map sends to this lesson (taught/likely), regex picks as fallback
        mapped = [int(k) for k, v in COV.items() if v[0] in 'fa' and v[1] and v[1][0] == lid and int(k) in QS
                  and set(QS[int(k)]['t']) & set(L['cls'])]
        if all(sum(1 for i in mapped if c in QS[i]['t']) >= L.get('quiz_min', 5) for c in L['cls']):
            quiz = sorted(mapped)
        else:
            quiz = sorted(set(mapped) | set(quiz))
    # v1.13 (review #9 D2): questions with no official source are never practised as regular lesson items –
    # they appear only in the 'מהמאגר הרשמי' bank-only lessons (question + published answer, no explanation)
    quiz = [i for i in quiz if i not in NOSRC]
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
                'body': L['body'], 'rules': rules, 'mnem': mnem,
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
# v1.11: B/A partial questions shown (question + official answer + the partial unit, labelled apart) in their topic lesson
import partial_bank
if os.path.exists(os.path.join(ROOT, 'data/coverage_full.json')):
    PB, PBP = partial_bank.attach(out, QS)
    miss = sorted(set(PB) - set(PBP))
    if miss: errors.append(f'partial B/A questions with no host lesson: {miss}')
    print(f'partial B/A shown in lessons: {len(PBP)}/{len(PB)}; non-official units: {sum(1 for l in out for p in l.get("pbank", []) if not any(u["o"] for u in p["u"]))}')
notes = {}
for qid, (txt, src, chk) in bank_lessons.BANK_NOTES.items():
    q = QS.get(qid)
    if not q: errors.append(f'bank note {qid}: no such question'); continue
    PASS.clear(); source(src, chk, f'banknote{qid}')
    notes[str(qid)] = {'exam': q['a'][q['c']], 'law': txt, 's': src, 'k': 'tb', 'x': own()}
for qid, (law, src, chk) in NOTES.items():
    q = QS.get(qid)
    if not q: errors.append(f'note {qid}: no such question'); continue
    PASS.clear(); source(src, chk, f'note{qid}')
    notes[str(qid)] = {'exam': q['a'][q['c']], 'law': law, 's': src, 'x': own()}

if errors:
    print('\n'.join('ERROR ' + e for e in errors)); sys.exit(1)

meta = {'built': 'from tools/lessons_spec.py', 'TR_rev': META['TR']['revid'], 'TO_rev': META['TO']['revid'],
        'lotam': {'title': LOT['title'], 'url': LOT['url'], 'sha256': LOT.get('sha256')}}
json.dump({'v': 1, 'meta': meta, 'lessons': out, 'notes': notes}, open(os.path.join(ROOT, 'data/lessons.json'), 'w'),
          ensure_ascii=False, separators=(',', ':'))
json.dump(sources, open(os.path.join(ROOT, 'data/sources.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
print('ok', len(out), 'lessons', len(sources), 'sources',
      os.path.getsize(os.path.join(ROOT, 'data/lessons.json')), os.path.getsize(os.path.join(ROOT, 'data/sources.json')), 'bytes')
