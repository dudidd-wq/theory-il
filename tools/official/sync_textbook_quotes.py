#!/usr/bin/env python3
"""Write tools/official/textbook_quotes.txt: every check that a lesson cites from OFF:textbook (pin.py then
verifies each one against the cached textbook text, outside its sample-exam blocks, and pins it)."""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.join(HERE, '..'))
import lessons_v16
Q = []
def R(text, src, *checks, also=(), q=(), qp=()):
    for s, c in [(src, checks)] + list(also):
        if s == 'OFF:textbook': Q.extend(c)
    return {}
def C(front, back, src, *checks):
    if src == 'OFF:textbook': Q.extend(checks)
    return {}
lessons_v16.lessons(R, C)
for v in lessons_v16.EXAMPLES16.values():
    for e in v:
        if e[2] == 'OFF:textbook': Q.extend(e[3:])
for v in lessons_v16.NOTES16.values():
    if v[1] == 'OFF:textbook': Q.extend(v[2])
import lessons_spec
for L in lessons_spec.LESSONS:
    for r in L.get('rules', []):
        for s_, c in [(r['s'], r['chk'])] + list(r.get('also', [])):
            if s_ == 'OFF:textbook': Q.extend(c)
    for c in L.get('recap', []):
        if c['s'] == 'OFF:textbook': Q.extend(c.get('chk', []))
    for m in L.get('mnem', []):
        if m[2] == 'OFF:textbook' and len(m) > 3: Q.extend(m[3])
for v in lessons_spec.EXAMPLES.values():
    for e in v:
        if e['s'] == 'OFF:textbook': Q.extend(e['chk'])
import bank_lessons
for v in bank_lessons.BANK_NOTES.values():
    if v[1] == 'OFF:textbook': Q.extend(v[2])
seen = []
for x in Q:
    if x not in seen: seen.append(x)
open(os.path.join(HERE, 'textbook_quotes.txt'), 'w', encoding='utf-8').write('\n'.join(seen) + '\n')
print('textbook quotes', len(seen))
