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
        # v1.18 (review #14 D5): a cross-reference ('בתמרור 218 המוצב…') is not a window of the sign's own entry
        if re.search(r'(?<![א-ת])[בל]?תמרור\s*$', LOT_ALL[max(START, i - 12):i]): continue
        out.append(LOT_ALL[i:i + 700])   # v1.17 (review #13 N7): long enough that an entry starting late in the window is not cut
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

# v1.18 (review #14 D5): the sign-table PDF splits some words ("מו פ יע", "ב קטע", "ש בה", "עד ל תמרור", "תמרורי ם") – rejoin them
def fix_split(t):
    t = re.sub(r'(?<=\s)([א-ת]{2}) ([א-ת]) ([א-ת]{2})(?=[\s.,:;]|$)', r'\1\2\3', ' ' + t)[1:]
    t = re.sub(r'(?<![^\s])(?<!\d )([בלשה]) (?=[א-ת]{2})', r'\1', t)
    t = re.sub(r'(?<=[א-ת]) ([םןץףך])(?=[\s.,:;]|$)', r'\1', t)
    return re.sub(r'(?<![^\s])([כבמל]) - (?=\d)', r'\1-', t)
# the "כוחו יפה" (where the sign applies) column, for entries whose two text columns otherwise read as one sentence
LT_FORCE = {'203': 'בצומת או בתנועה שלפניך', '218': 'עד לצומת הבא'}
# v1.20 (review #16 item 6): every sign's last column (כוחו יפה / מיועד ל) as the dictionary splits it (signs_build.py) –
# a lesson chip that quotes the entry shows that column under its label too, never merged into the meaning
try:
    _SE = json.load(open(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data/signs.json'), encoding='utf-8'))['e']
except Exception: _SE = {}
LT_COL = {k: m.groups() for k, v in _SE.items() for m in [re.search(r' · (כוחו יפה|מיועד ל): (.+)$', v)] if m}
def lt_col(key, e2):
    if ' · ' in e2 or key not in LT_COL: return e2
    lab, tail = LT_COL[key]
    words = re.findall(r'[^\s.,;:]+', tail)
    if not words: return e2
    m = None
    for n in range(len(words), min(3, len(words)) - 1, -1):   # the whole column, or (an entry cut by the cap, ending '…') its opening words
        pat = r'[\s.,;:]+'.join(re.escape(w) for w in words[:n])
        for m in re.finditer(r'(?<=[\s.,;:])' + pat + (r'(?=[\s.,;:]*$)' if n == len(words) else r'(?=[\s.,;:]*…?$)'), e2): pass
        if m: break
    if not m or m.start() < len(key) + 3: return e2
    head = e2[:m.start()].rstrip(' .,;:–-')
    return f'{head} · {lab}: {e2[m.start():].rstrip(" .")}'
_HEB = 'אבגדהוזחטיכלמנסעפצקרשת'
def _item(p):
    # v1.19 (review #15 D6): the label of a numbered / lettered item line – (kind, ordinal) – or None
    m = re.match(r'\((\d+)([א-ת]?)\)', p)
    if m: return ('n', int(m.group(1)), m.group(2))
    m = re.match(r'\(([א-ת])(\d?)\)', p)
    if m and m.group(1) in _HEB: return ('l', _HEB.index(m.group(1)) + 1, m.group(2))
    m = re.match(r'(\d+)\.\s', p)
    if m: return ('d', int(m.group(1)), '')
    return None
def _follows(a, b):
    # item b can be the next sibling of item a
    return a[0] == b[0] and (b[1] == a[1] + 1 or (b[1] == a[1] and b[2] > a[2]))
def _chapeaus(parts, i):
    # v1.19 (review #15 D6): the chain of chapeau lines ("… אלה:", "… אלא אם כן –") that govern item line i, found
    # by tracking the item nesting forward (an item continues the deepest open level it follows, else opens a new one)
    # stack: [(item, line index)]; an unlabelled lead-in line ("”X“ – … כל אלה:") enters as (None, k) and heads the list after it
    stack, END = [], r'(?:[.;]|\.\))\s*$'
    for k, p in enumerate(parts[:i + 1]):
        it = _item(p)
        if not it:
            if p and re.search(r'[–:—-]\s*$', p):
                while stack and stack[-1][0] is None: stack.pop()
                stack.append((None, k))
            continue
        lv = next((n for n in range(len(stack) - 1, -1, -1) if stack[n][0] and _follows(stack[n][0], it)), None)
        if lv is None:
            # a new sub-list cannot hang under an item that ended its sentence ('.', ';') – it belongs to an open lead-in
            while stack and re.search(END, parts[stack[-1][1]]): stack.pop()
            stack.append((it, k))
        else: stack[lv:] = [(it, k)]
    if not stack or stack[-1][1] != i: return []
    out, k = [], len(stack) - 2
    # a parent is shown when it leads in ('–', ':', ',') or is an unpunctuated table-row label ("(6) רכב מסחרי בלתי אחוד")
    while k >= 0 and not re.search(END, parts[stack[k][1]]):
        out.append(stack[k][1]); k -= 1
    return out
def excerpt(text, checks):
    # the sentence(s) / sub-clauses containing the checks
    # v1.18 (review #14 D1): a numbered item "(1) …" is shown with its chapeau ("… באופן שלא –", "… אלא –"),
    # so a chip never drops the negation/condition that governs it; a long excerpt is cut at a clause/sentence end, marked " …"
    parts = [p.strip() for p in re.split(r'\n', text)]
    idx = []
    for i, p in enumerate(parts):
        if p and any(norm(c) in norm(p) for c in checks):
            idx.extend(_chapeaus(parts, i))
            idx.append(i)
    ex, last = '', None
    for i in sorted(set(idx)):
        if parts[i] in ex:
            continue
        ex += (parts[i] if last is None else (' ' if i == last + 1 else ' … ') + parts[i])
        last = i
    if len(ex) > 1300:
        ends = [k + 1 for k in (ex.find(m, 900) for m in ('; ', '. ', ' … ')) if 0 <= k < 1300]
        cut = min(ends) if ends else max(ex.rfind(' … ', 0, 900), max(ex.rfind(m, 0, 900) for m in ('; ', '. ')) + 1)
        ex = ex[:cut].rstrip() + ' …'
    # v1.18 (self-audit): a chip that stops on an open list ('… את –', '…, או') says the list goes on
    if last is not None and last < len(parts) - 1 and re.search(r'(?:[–—:]|\sאו)\s*$', ex) and not ex.endswith('…'): ex += ' …'
    return ex

PASS = []  # v1.11: passages picked by the last source() calls (per-example official wording)

def own():
    # v1.13 (review #9 D1): the excerpt(s) this item itself pinned – [source id, passage (with page)] – shown first in its chip
    # v1.15 (review #11 C5): the parsed law renders a repealed item as '((בוטלה).)' – shown as the law prints it, '(בוטלה).'
    return [[s_, re.sub(r'\(\((נמחקה|בוטלה|בוטל|נמחק)\)\.\)', r'(\1).', t_)] for s_, t_ in dict.fromkeys(PASS)]

def trap(q):
    # v1.11 (review #8 item 2): the wrong option closest in wording to the correct one (token overlap) – an objective pick, no written text
    tok = lambda s: set(re.findall(r'[\w\u0590-\u05ff]+', s))
    A = tok(q['a'][q['c']])
    sc = [(len(A & tok(a)) / (len(A | tok(a)) or 1), -k) for k, a in enumerate(q['a']) if k != q['c']]
    return -max(sc)[1] if sc else None

def pdf_tidy(t):
    # v1.19 (review #15 D8): spacing artefacts of the PDF text layer, shown as the page prints them (the words are unchanged):
    # a number or Latin letter glued to Hebrew ('3,500ק”ג', 'Bמאפשרת'), punctuation detached from its word ('אלכוהול ,סמים',
    # 'הנסיעה .ככל'), a dash glued to the next word ('דם -כמות'), and the bidi-reversed '… 240 -מיקרוגרם' ('… – 240 מיקרוגרם')
    t = re.sub(r'(?<![^\s(])([,.])(\d+|[A-Za-z]+)(?=[\sא-ת])', r'\2\1', t)   # bidi-reversed '.1לכביש' / ',1או ,R' → '1.' / '1,' / 'R,'
    t = re.sub(r'(?<=\d[.,])(?=[א-ת])', ' ', t)
    t = t.replace('“ +', '+ “')
    t = re.sub(r'(?<=\d)(?=[א-ת][א-ת"”׳״\'])', ' ', t)
    t = re.sub(r'(?<=[A-Za-z])(?=[א-ת])|(?<=[א-ת])(?=[A-Za-z])', ' ', t)
    t = re.sub(r' ([,.;:])(?=[א-ת"“(])', r'\1 ', t)
    t = re.sub(r' ([,;])(?=\s)', r'\1', t)
    t = re.sub(r'(?<=\s)(\d[\d,.]*) -(?=[א-ת])', r'– \1 ', t)
    t = re.sub(r'(?<=:) -(?=[א-ת])', ' - ', t)   # a list dash after a colon stays a list dash
    t = re.sub(r'(?<=\S) -(?=[א-ת"“])', ' – ', t)
    t = re.sub(r'•(?=[א-ת"“])', '• ', t)
    return re.sub(r'  +', ' ', t)

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
        def _own(w):
            e = re.sub(r'\s+', ' ', w)[:220]
            # the sign's own entry only (cut at the next sign number); PDF RTL artefact ' .word' shown as ' word'
            # v1.15: the entry opens where the number is followed by a word (not a range "101 – 152", a list "101 , 102" or a page header)
            ww = re.sub(r'\s+', ' ', w)
            # v1.16 (review #12 D5): not a cross-reference ("או 724", "עד 724") nor the variant entry ("724 פ")
            m = re.search(r'(?<![\d\-–] )(?<!\d)(?<!או )(?<!עד )(?<!תמרור )' + re.escape(key) + r'(?!\d)(?= [.,]?(?!(?:פ|או|עד)(?![א-ת]))[א-ת])', ww)
            m = m or re.search(r'(?<!\d)' + re.escape(key) + r'(?!\d)', e)
            if m and m.re.pattern.endswith('[א-ת])'): e = ww[m.start():m.start() + 220]; e2 = e
            else: e2 = e[m.start():] if m else e
            kn = int(re.match(r'\d+', key).group()) if re.match(r'\d+', key) else None
            _t = e2[len(key):]
            m = next((m for m in re.finditer(r'\s(\d{3})[א-ת]?\s', _t) if kn and kn < int(m.group(1)) <= kn + 9
                      and not re.search(r'(?:^|\s)(?:או|עד|תמרור|ו)\s?$', _t[:m.start()])), None)
            # v1.16: a services symbol (ס-130) ends at the next symbol number
            m = m or (re.search(r'\sס\s*-\s*\d{2,3}(?!\d)', _t) if key.startswith('ס-') else None)
            m_end = bool(m)
            e2 = e2[:len(key) + m.start()] if m else e2
            # v1.15: never run into the PDF page header ("12 לוח תמרורים (לות"ם) ספטמבר 2022 …") or the variant entry ("150 פ")
            m = re.search(r'\s\d{1,3} לוח תמרורים|\sלוח תמרורים \(|\s' + re.escape(key) + r' ?פ(?![א-ת])', e2[len(key):])
            m_end = m_end or bool(m)
            e2 = e2[:len(key) + m.start()] if m else e2
            # v1.17 (review #13 N2): also drop the PDF's displaced stand-alone punctuation (" , .בהתאמה", "בצבע , כחול")
            # v1.18 (review #14 D5): RTL-displaced punctuation (' .ישר', ' ,הכביש') belongs after its word ('ישר.', 'הכביש,')
            e2 = re.sub(r'(\d) \.(?=\s|$)', r'\1.', e2)
            e2 = re.sub(r'(^|\s)([.,:;]+)([^\s.,:;]+)', r'\1\3\2', e2)
            e2 = re.sub(r'\(\)([^\s()]+)', r'(\1)', e2)
            e2 = re.sub(r'""([^\s"]+)', r'"\1"', e2)
            e2 = re.sub(r'(^|\s)!([א-ת]+)', r'\1\2!', e2)   # v1.17: RTL-reversed '!עצור' -> 'עצור!'   # and reversed quotes 'תמרור ""עצור' -> 'תמרור "עצור"'   # RTL-reversed brackets "()קמפינג" -> "(קמפינג)"
            e2 = re.sub(r'\s+', ' ', re.sub(r'(?<=\s)[.,:;]+(?=\s|$)', '', e2)).strip()
            # v1.17 (review #13 N7): the table's last column names who the sign addresses ("נוהג רכב") – not part of the meaning
            e2 = re.sub(r'\s+נוהג רכב\.?$', '', e2)
            e2 = fix_split(e2)
            # v1.18 (review #14 D5): the table's columns – meaning (פירושו) | where it applies (כוחו יפה) – shown apart
            if key in LT_FORCE and (' ' + LT_FORCE[key]) in e2: e2 = e2.replace(' ' + LT_FORCE[key], ' · כוחו יפה: ' + LT_FORCE[key], 1)
            # v1.17: an entry cut by the 220-character cap ends at a whole word, marked '…'
            if len(e2) >= 200 and not re.search(r'[.!?)]$', e2) and not m_end: e2 = e2.rsplit(' ', 1)[0] + ' …'
            e2 = lt_col(key, e2)   # v1.20 (review #16 item 6): after the cap, so a cut column still gets its label
            return e, e2
        if ok:
            # v1.15 (review #11 C1): prefer the window where the number opens the sign's own entry (its cut entry holds the checks),
            # not a cross-reference such as "עד לתמרור 433 , 434" inside the previous sign
            cand = [_own(w) for w in ok]
            e, e2 = next((c for c in cand if all(norm(x, True) in norm(c[1], True) for x in checks)), cand[0])
            # v1.17 (review #13 N2): sources.json keeps the sign's own cleaned entry (no page footer, no neighbouring signs)
            if e2 not in s['ex']: s['ex'].append(e2)
            PASS.append((sid, e2))
    elif kind == 'LTP':
        pg = [p for p in LOT_PAGES if re.search(r'חלק\s*' + key + r'\s', p) and len(p) < 400]
        if not pg or not all(norm(c, True) in norm(pg[0], True) for c in checks):
            errors.append(f'{where}: part {key} heading mismatch')
        sources.setdefault(sid, {'kind': kind, 'label': 'לוח התמרורים, חלק ' + key, 'title': '',
            'doc': LOT['title'], 'url': LOT['url'],
            'ex': [fix_split(re.sub(r'^.*?(חלק)', r'\1', pg[0]).strip())] if pg else []})
        if pg: PASS.append((sid, fix_split(re.sub(r'^.*?(חלק)', r'\1', pg[0]).strip())))
    elif kind == 'OFF':
        pg = OFF.get(key)
        if not pg: errors.append(f'{where}: no official page {key}'); return sid
        qs = [q for q in pg['quotes'] if any(norm(c, True) in norm(q['t'], True) for c in checks)]
        # v1.15 (review #11 N3): a pinned quote contained in another selected one is not shown twice (rail2#r4, lanes#r1)
        _n = [norm(q['t'], True) for q in qs]
        qs = [q for i, q in enumerate(qs) if not any(j != i and _n[i] in _n[j] and (len(_n[j]) > len(_n[i]) or j < i) for j in range(len(qs)))]
        for c in checks:
            if not any(norm(c, True) in norm(q['t'], True) for q in pg['quotes']): errors.append(f'{where}: "{c}" not in a pinned quote of OFF:{key}')
        if not checks: errors.append(f'{where}: OFF source needs checks (they pick the quoted passage)')
        s = sources.setdefault(sid, {'kind': kind, 'label': pg['title'], 'title': '', 'doc': pg['publisher'], 'url': pg['url'],
            'accessed': pg['accessed'], 'sha256': pg['sha256'], 'pub': pg.get('updated') or pg.get('published'), 'ex': []})
        # v1.17 (review #13 N1): the MoE file server sometimes answers with a 'שגיאה 404' page – the link says so
        if 'meyda.education.gov.il' in pg['url']: s['flaky'] = True
        for q in qs:
            # v1.18 (review #14 D5): the textbook PDF's reversed number-prefix ('מ 2-נקודות') shown as written ('מ-2 נקודות')
            e = re.sub(r'(?<![^\s(])([בכמלה]) (\d+(?:[.,]\d+)?)-(?=[א-ת"“])', r'\1-\2 ', pdf_tidy(q['t'])) + (f' (עמ׳ {q["p"]})' if q.get('p') else '')
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
    if COV:  # quiz = the bank questions the coverage map answers with a unit of THIS lesson
        # v1.20 (review #16 pedagogy): no regex fallback any more – it filled licence2 with 100 of 102 questions taught in other
        # lessons (134 such questions over 3 lessons, Q1333 with no teaching unit at all). A lesson's practice now follows what it
        # teaches: a full verdict with a unit in this lesson (partials join via pbank, below); data_test enforces it.
        quiz = sorted(int(k) for k, v in COV.items() if v[0] == 'f' and lid in v[1] and int(k) in QS and set(QS[int(k)]['t']) & set(L['cls']))
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
        if n < (L.get('quiz_min', 5) if not COV else 1): errors.append(f'{lid}: only {n} quiz questions for class {c}')
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
