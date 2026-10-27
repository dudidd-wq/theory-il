#!/usr/bin/env python3
"""Repair the pdf-extraction damage in the לות"ם meanings without changing a word of the table:
glue letters split off a word ("ה כביש" → "הכביש", "מ י דרדרות" → "מידרדרות") only when the glued form is a
word that appears in the law, the bank or the table itself; un-mirror brackets; move "!" and "'"; drop the
column header that leaks into some cells. Hand fixes for the cells this cannot repair are in
tools/signs/manual.json "text" (each one the table's own words, in reading order, checked against the pdf)."""
import json, re, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HEB = re.compile(r'^[\u05d0-\u05ea"\']+$')

def vocab(extra=()):
    words = {}
    def add(t):
        for w in re.findall(r'[\u05d0-\u05ea]+(?:["\'][\u05d0-\u05ea]+)?', t):
            words[w] = words.get(w, 0) + 1
    law = json.load(open(os.path.join(ROOT, 'tools/law/law.json')))
    for k in ('TR', 'TO'):
        for sec in law[k].values(): add(sec.get('text', ''))
    for q in json.load(open(os.path.join(ROOT, 'data/q.he.json'))): add(q['q'] + ' ' + ' '.join(q['a']))
    base = set(words)
    for t in extra: add(t)
    words['__base__'] = base
    return words

def glue(s, V, B):
    tok = s.split(' '); out = []; i = 0
    while i < len(tok):
        best = None
        for j in range(min(len(tok), i + 6), i + 1, -1):
            part = tok[i:j]
            if not all(HEB.match(p) for p in part): continue
            w = ''.join(part)
            frag = any(len(p) == 1 or p not in B for p in part)
            known = w in V or (w[0] in 'בהלמוכש' and w[1:] in V) or (w[:2] in ('וה', 'וב', 'ול', 'שה', 'מה', 'כש') and w[2:] in V)
            if frag and known: best = j; break
        if best: out.append(''.join(tok[i:best])); i = best
        else: out.append(tok[i]); i += 1
    return ' '.join(out)

def _join_short(s, V):
    tok = s.split(' '); out = []
    for t in tok:
        a = out[-1] if out else ''
        w = a + t
        if (HEB1.match(a) and HEB1.match(t) and min(len(a), len(t)) <= 2 and max(len(a), len(t)) <= 3
                and V.get(w, 0) >= 20 and V.get(w, 0) >= 4 * max(V.get(a, 0), V.get(t, 0), 1)):
            out[-1] = w
        else: out.append(t)
    return ' '.join(out)

HEB1 = re.compile(r'^[\u05d0-\u05ea]+$')

def tidy(s, V, n=None):
    s = re.sub(r'\s*1 ?\. ?צורת ?ה ?(?:סימון|סמל|תמרור) וצבעו.*$', '', s)          # leaked column header (+ the symbol table after it)
    s = re.sub(r'""([^\s"]+)', r'"\1"', s)                                  # v1.19: the pdf puts both quote marks before the word: '""אופניים' → '"אופניים"'
    s = s.replace('""', '"').replace(' מותרת ל - ', ' מותרת ל: ')
    s = re.sub(r'\)\s*([^()]*?)\s*\(\s*', lambda m: '(' + m[1].strip() + ') ', s)   # mirrored brackets ")ס - 43 (" → "(ס - 43) "
    s = re.sub(r'\(([^()]+)\) (נייד|שונות|מדרגות|כבש|יורד)\b', r'(\1 \2)', s)
    s = re.sub(r'\(\s+', '(', s); s = re.sub(r'\s+\)', ')', s)
    s = re.sub(r'!(\S+)', r'\1!', s)                                             # "!עצור" → "עצור!"
    s = re.sub(r"'(מס|מ)(?=[\s.,]|$)", r"\1'", s)                               # "'מס 630" → "מס' 630"
    s = re.sub(r'(?<=[\u05d0-\u05ea\d]) - (?=\d)', '-', s)                        # "כ - 300" → "כ-300"
    s = re.sub(r'(?<!\S)(של|את|על|אל|עם) (ה) (?=[\u05d0-\u05ea]{2})', r'\1 \2', s)   # "של ה קו" → "של הקו" (not glue's "שלה קו")
    s = glue(s, V, V['__base__'])
    # v1.19 (review #15): letters glue() could not place – a lone prefix letter joins the next word ("ל שמאל" → "לשמאל"),
    # any other lone letter is the end of the word before it ("האו ר" → "האור", "חד ה" → "חדה")
    s = re.sub(r'(?<![^\s(])([בהולמכש]) (?=[\u05d0-\u05ea]{2})', r'\1', s)
    s = re.sub(r'([\u05d0-\u05ea]{2,}) ((?!ל:)[\u05d0-\u05ea])(?=[\s.,;:!]|$)', r'\1\2', s)   # but "מותרת ל:" stays
    # v1.20 (review #16 N4): two short real-looking fragments glue() left apart ("לצו מת" → "לצומת", "מע בר" → "מעבר"):
    # join when the glued word is common in the law/bank and ≥4× as common as either fragment
    s = _join_short(s, V)
    s = re.sub(r'(\d{3}) פ(?=[\s.,]|$)', r'\1פ', s)                             # variant numbers "724 פ" → "724פ"
    if n: s = re.sub(rf'\s*(נוהג רכב)?\s*{n}פ$', '', s)                          # next row's label leaking into the cell
    s = re.sub(r'\s+([.,;:])', r'\1', s); s = re.sub(r'\s+', ' ', s)
    s = re.sub(r'[.:]?\s*§\s*', ' – ', s, count=1).replace(' § ', ' ').replace('§', '')   # title – meaning
    return s.strip(' .–')


def _n(x): return re.sub(r'[^\u05d0-\u05ea0-9]', '', x)

def columns(s, LC, n):
    """Mark where the table's last column starts: "meaning · כוחו יפה: force" (or "· מיועד ל: …" in part 7).
    LC = tools/signs/lt_cols.json, the column-4 lines read by position from the pinned PDF (signs_cols.py), n = sign number.
    The longest run of consecutive column-4 lines that is exactly the cell's tail is the column-4 text."""
    if '·' in s: return s
    from signs_dict import PAGE
    pg = PAGE.get(str(n)); L = [x for x in LC['lines'] if pg and pg <= x[0] <= pg + 1]   # the sign's page (+ the next)
    e = _n(s); best = None
    for j in range(len(L)):
        acc = ''
        for i in range(j, max(-1, j - 40), -1):
            if L[i][1] != L[j][1]: break
            acc = _n(L[i][2]) + acc
            if not e.endswith(acc): break
            if len(acc) < 2: continue
            if len(e) - len(acc) >= 2 and (best is None or len(acc) > len(best[0])): best = (acc, L[j][1])
    if not best: return s
    k, cut = len(best[0]), len(s)
    while k:                                   # walk back over k letters/digits of the original text
        cut -= 1
        if re.match(r'[\u05d0-\u05ea0-9]', s[cut]): k -= 1
    while cut and s[cut - 1] in '("': cut -= 1     # an opening bracket / quote belongs to the column-4 text
    head, tail = s[:cut].rstrip(' .,;:–-'), s[cut:].strip(' .')
    return f'{head} · {best[1]}: {tail}' if head else s
