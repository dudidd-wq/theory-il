#!/usr/bin/env python3
"""Parse the לות"ם text (tools/law/lotam.json, gov.il PDF Sept 2022) into {sign number: meaning}.
Numbers are accepted in increasing order inside each part, so cross-references inside a meaning
("תמרור 629") are not mistaken for entries."""
import json, re, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOT = json.load(open(os.path.join(ROOT, 'tools/law/lotam.json')))
HDR = re.compile(r'^\d+ לוח תמרורים.*?13\.09\.2022( 1 \. צורת התמרור וצבעו 2 \. מספ ?ר ?ו 3 \. פירושו 4 \. (כוחו :יפה|מיועד ל))? ')

def fix(s):
    # the sign's title ends with the first sentence mark (".", ":" or "!", which the pdf puts before the word):
    # mark the boundary with " § " so signs_tidy can print "title – meaning"
    tok = s.split()
    k = next((i for i, w in enumerate(tok[:16]) if re.match(r'^[.:!]+([^\s\d.]|$)', w)), None)
    rest = ' '.join(tok[k + 1:]) if k is not None else ''
    if k and re.search(r'[\u05d0-\u05ea]{2}', re.sub(r'\d{3} ?פ', '', rest)):
        s = ' '.join(tok[:k + 1] + ['§'] + tok[k + 1:])
    # pdf text puts sentence punctuation before words: ".משובש" → "משובש."
    # v1.19 (review #15 D2): the mark belongs after its word (".משובש" → "משובש."), not dropped – dropping it ran the
    # table's sentences and columns together ("…כל דין בחירת הנתיבים…")
    s = re.sub(r'(?<=[^\s.,;:]) ([.,;:]+)(?=\s|$)', r'\1', s)            # stand-alone mark after a number/word: "926 ." → "926."
    s = re.sub(r'(^|\s)([.,;:]+)([^\s.,;:§]+)', lambda m: m[1] + m[3] + ('.' if '.' in m[2] else m[2][-1]), s)
    s = re.sub(r'\s+', ' ', s)
    return s.strip(' .§')

PAGE = {}   # sign number -> pdf page of its row (filled by parse)

def parse():
    pages = [(i, p) for i, p in enumerate(LOT['pages'][5:], 6) if not ('עדכונים' in p[:200] or (re.search(r'חלק \d', p) and len(p) < 400))]
    txt, at0 = '', []                           # at0: (offset, pdf page) – where each page starts in txt
    for i, p in pages:
        at0.append((len(txt) + (1 if txt else 0), i)); txt = (txt + ' ' if txt else '') + HDR.sub('', p)
    REF = re.compile(r"((?<!ה)תמרור|תמרורים|מס'?|'מס|עד|ב\s*-|או|ו\s*-|,|לפי|(?<!ה)סימון|כאמור ב\s*[-–]|האות|הצהוב)\s*$")   # v1.19: "…להופיע האות 716" / "האור הצהוב 705" are references
    occ = {}
    for m in re.finditer(r'(?<![\d,.\-])([1-9]\d{2})(?![\d,.])', txt):
        if REF.search(txt[max(0, m.start() - 9):m.start()]): continue
        occ.setdefault(int(m[1]), []).append((m.start(), m.end()))
    ent, last, at, pos = {}, 100, 0, []
    while True:
        cands = []
        for e in list(range(last + 1, last + 13)) + [(last // 100 + 1) * 100 + 1]:
            if e // 100 not in (last // 100, last // 100 + 1) or (e // 100 != last // 100 and e % 100 != 1): continue
            o = next((x for x in occ.get(e, []) if x[0] >= at), None)
            if o: cands.append((o[0], e, o))
        if not cands: break
        first = min(cands)[0]
        _, e, o = min((c for c in cands if c[0] <= first + 1500), key=lambda c: c[1])
        pos.append((e, o[0], o[1])); last, at = e, o[1]
    for (n, a, b), nxt in zip(pos, pos[1:] + [(0, len(txt), 0)]):
        PAGE[str(n)] = max(pg for off, pg in at0 if off <= a)
        v = fix(txt[b:nxt[1]]); ent[str(n)] = v[:1202 if '§' in v[:1200] else 1200]   # +2 for the title mark (v1.19: 400 cut six cells mid-word)
    prev = ''
    for k in sorted(ent, key=int):  # pairs like 102/103 share one meaning cell
        if not ent[k]: ent[k] = prev
        prev = ent[k]
    return ent

if __name__ == '__main__':
    e = parse()
    print(len(e)); import sys
    for k in sorted(e, key=int): print(k, e[k][:110])
