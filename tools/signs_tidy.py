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

def tidy(s, V, n=None):
    s = re.sub(r'\s*1 \. צורת ה ?(?:סימון|סמל|תמרור) וצבעו.*$', '', s)          # leaked column header (+ the symbol table after it)
    s = s.replace('""', '"').replace(' מותרת ל - ', ' מותרת ל: ')
    s = re.sub(r'\)\s*([^()]*?)\s*\(\s*', lambda m: '(' + m[1].strip() + ') ', s)   # mirrored brackets ")ס - 43 (" → "(ס - 43) "
    s = re.sub(r'\(([^()]+)\) (נייד|שונות|מדרגות|כבש|יורד)\b', r'(\1 \2)', s)
    s = re.sub(r'\(\s+', '(', s); s = re.sub(r'\s+\)', ')', s)
    s = re.sub(r'!(\S+)', r'\1!', s)                                             # "!עצור" → "עצור!"
    s = re.sub(r"'(מס|מ)(?=[\s.,]|$)", r"\1'", s)                               # "'מס 630" → "מס' 630"
    s = re.sub(r'(?<=[\u05d0-\u05ea\d]) - (?=\d)', '-', s)                        # "כ - 300" → "כ-300"
    s = glue(s, V, V['__base__'])
    s = re.sub(r'(\d{3}) פ(?=[\s.,]|$)', r'\1פ', s)                             # variant numbers "724 פ" → "724פ"
    if n: s = re.sub(rf'\s*(נוהג רכב)?\s*{n}פ$', '', s)                          # next row's label leaking into the cell
    s = re.sub(r'\s+נוהג רכב$', '', s)                                          # the "intended for" column of part 7
    s = re.sub(r'\s+([.,;:])', r'\1', s); s = re.sub(r'\s+', ' ', s)
    s = re.sub(r'[.:]?\s*§\s*', ' – ', s, count=1).replace(' § ', ' ').replace('§', '')   # title – meaning
    return s.strip(' .–')
