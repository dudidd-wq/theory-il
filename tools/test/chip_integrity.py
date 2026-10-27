"""v1.18 (review #14 D1): sentence integrity of every source chip shown in the lessons.

Every OFF chip (textbook / MoE booklets / gov.il pages) and every law chip (TR/TO) is located in its
cached source text and checked for:
  NEG       – a negation/exception word (אל/לא/אין/אסור/בלי/שלא/אלא…) right before the chip's start that the chip drops
              (e.g. '…ואל לו לנהג | להיבהל מכך ולהרפות מדוושת הבלם' reads as the opposite instruction);
  midword   – the chip starts or ends inside a word;
  midsent   – an OFF chip starts or ends inside a sentence (law chips are sub-clauses by nature; for them a numbered
              item must come with its chapeau – see tools/lessons.py excerpt()).
A chip may mark a deliberate cut with '…' at its start/end (used only where the source PDF interleaves two
table columns or a sentence runs across a page footer); a marked cut skips the midsent check on that side only.
"""
import json, re, os, sys
R = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, R + '/tools/official')
import pin
C = R + '/tools/official/cache/'
NEG = {'אל', 'לא', 'אין', 'אסור', 'בלי', 'אינו', 'אינה', 'אינם', 'אינן', 'איננו', 'מבלי', 'ללא', 'אף', 'שלא',
       'ואל', 'ולא', 'ואין', 'ואסור', 'ובלי', 'אלא', 'למעט', 'זולת'}
SEP = '.:;!?•\n'
Q = '“”"׳״\'`„'
NIK = r'[\u0591-\u05C7]'

def available():
    return os.path.exists(C + 'textbook_pages.json')

def _nmap(s):
    keep = [i for i, c in enumerate(s) if pin.norm(c) == c]
    return ''.join(s[i] for i in keep), keep

def _walk(o, path, kinds):
    if isinstance(o, list):
        if len(o) == 2 and all(isinstance(v, str) for v in o) and o[0].startswith(kinds):
            yield path, o
            return
        for i, v in enumerate(o):
            yield from _walk(v, path + (i,), kinds)
    elif isinstance(o, dict):
        if isinstance(o.get('s'), str) and o['s'].startswith(kinds) and isinstance(o.get('t'), str) and 'qt' in path:
            yield path, [o['s'], o['t']]
        for k, v in o.items():
            yield from _walk(v, path + (k,), kinds)

def _start_ok(pre, c, pdf):
    pre = re.sub(NIK, '', pre)
    if not pdf and re.search(r'\n\s*$', pre): return True
    if c.lstrip()[:1] in '•-–': return True
    p = pre.rstrip(' \t' + Q + '(')
    if p[-1:] in '-–' and p[:-1].rstrip()[-1:] in SEP: return True   # PDF prints a leading dash ("- ABS") before the stop
    if not p or re.search(r'(\n[ \t]*\n|✓)\s*$', pre): return True
    if p.endswith('\n'):
        ln = p[:-1].rstrip().split('\n')[-1].strip()
        if len(ln) < 50 or ln[-1:] in SEP or ln[:1] in SEP: return True
        p = p.rstrip()
    if p[-1] in SEP: return True
    if re.search(r'(^|\n|\s)\.?\d{1,2}\.?$', p): return True            # list number
    if re.search(r'(^|\n|•)[^.\n•]{1,50}\s[-–]$', p): return True       # "term – definition"
    return False

def _end_ok(post, c, pdf):
    if not pdf and re.match(r'[ \t\xa0]*\n', post): return True
    if c.rstrip(Q + ')')[-1:] in '.:;!?': return True
    p = post.lstrip(' \t' + Q + ')')
    if not p or re.match(r'\s*\n[ \t]*\n', post): return True
    if p[0] == '\n':
        ln = p.lstrip('\n').split('\n')[0].strip()
        return p.lstrip()[:1] in SEP + '•' or len(ln) < 3 or bool(re.match(r'\.?\d{1,2}\.?\s', p.lstrip()))
    return p[0] in SEP

def _check(s, c, pdf, sent):
    """problems of chip text c (one part, possibly marked with … at either end) inside source s; None if not found"""
    cut_a, cut_b = c.lstrip().startswith('…'), c.rstrip().endswith('…')
    ns, keep = _nmap(s)
    nc = pin.norm(c)
    k = ns.find(nc)
    if k < 0 or not nc: return None
    a, b = keep[k], keep[k + len(nc) - 1] + 1
    pre = re.sub(NIK, '', s[max(0, a - 40):a]); post = s[b:b + 40]
    f = []
    # a negation among the last 3 words before the chip, with no clause break in between ("ואל לו לנהג | להיבהל…")
    tail = re.split('[' + re.escape(SEP) + r',–()]', pre)[-1]
    hit = [x for x in re.findall(r'[א-ת]+', tail)[-3:] if x in NEG]
    if hit: f.append('NEG:' + hit[0])
    if re.match(r'[א-ת]', pre[-1:]): f.append('midword-start')
    rtl_end = c.rstrip()[-1:] in '.:;!?' and any(ch in '.:;!?' for ch in s[max(0, b - 3):b])  # PDF prints the stop before a Latin token
    if re.match(r'[\u0591-\u05C7א-ת]', post[:1]) and not rtl_end: f.append('midword-end')
    if sent:
        if not cut_a and not _start_ok(s[max(0, a - 300):a], c, pdf): f.append('midsent-start')
        if not cut_b and not rtl_end and not _end_ok(s[b:b + 300], c, pdf): f.append('midsent-end')
    return f

ALLOW = {  # (src, chip prefix): why the start/end is right although the text around it reads otherwise
    ('OFF:textbook', 'אסור לנהוג ברכב שאינו תקין'): 'p.28 is a two-column table (problem | fix); the sentence opens its column, the words before it are the other column',
}

def scan(lessons):
    """-> (n_checked, missing, problems[(where, src, flags, chip)])"""
    TBP = [p if isinstance(p, str) else p.get('t', '') for p in json.load(open(C + 'textbook_pages.json'))]
    L = json.load(open(R + '/tools/law/law.json'))
    n, miss, bad, seen = 0, [], [], set()
    for l in lessons:
        for path, (src, txt) in _walk(l, (), ('OFF:', 'TR:', 'TO:')):
            if (src, txt) in seen or re.match(r'(TR|TO|LT|LTP|Q|OFF):', txt): continue
            seen.add((src, txt))
            where = l['id'] + '/' + '/'.join(map(str, path[:2]))
            if src.startswith('OFF:'):
                sid = src[4:]
                m = re.match(r'(.*) \(עמ׳ (\d+)\)$', txt)
                c, pg = (m.group(1), int(m.group(2))) if m else (txt, None)
                if sid == 'textbook':
                    s = TBP[pg - 1] if pg else None
                else:
                    f_ = pin.P.get(sid); fp = f_ and C + f_[2] + '.txt'
                    s = open(fp).read() if fp and os.path.exists(fp) else None
                if s is None: continue
                parts, pdf, sent = [c], sid == 'textbook' or sid.startswith('edu'), True
            else:
                m = re.match(r'(TR|TO):(\d+[א-ת]?\d?)', src)
                d = m and L.get(m.group(1), {}).get(m.group(2))
                if not d: continue
                s = d['text'] if isinstance(d, dict) else d
                parts = [p for p in re.split(r' … ', txt) if pin.norm(p)]
                pdf, sent = False, False
            n += 1
            for part in parts:
                r = _check(s, part, pdf, sent)
                if r is None: miss.append((where, src, part[:50])); break
                if r and any(src == a_ and part.lstrip('… ').startswith(b_) for a_, b_ in ALLOW):
                    r = [x for x in r if not x.startswith('midsent')]
                if r: bad.append((where, src, r, part[:60]))
    return n, miss, bad

def selftest():
    # the review #14 D1 chip must fail; its full sentence must pass
    s = 'הרטט והנקישות מעידים על כך, שמערכת ABS פועלת כהלכה ואל לו לנהג להיבהל מכך ולהרפות מדוושת הבלם. אחרי'
    return (_check(s, 'להיבהל מכך ולהרפות מדוושת הבלם', True, True), _check(s, 'שמערכת ABSפועלת כהלכה', True, True),
            _check(s, 'הרטט והנקישות מעידים על כך, שמערכת ABS פועלת כהלכה ואל לו לנהג להיבהל מכך ולהרפות מדוושת הבלם.', True, True))

if __name__ == '__main__':
    print(selftest())
    LS = json.load(open(R + '/data/lessons.json'))['lessons']
    n, miss, bad = scan(LS)
    print('chips', n, 'not located', len(miss), 'problems', len(bad))
    for b in bad: print(b)
    for m in miss[:20]: print('MISS', m)
