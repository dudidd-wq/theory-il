#!/usr/bin/env python3
"""Compile the full-bank hand judgement into tools/coverage/full.json (stable unit references).
Inputs: tools/coverage/verdicts.txt (questions judged one by one from the full_pack.py review batches; candidate
numbers refer to /tmp/pack/cands.json written when the batch was printed), judged.json (the earlier hand-judged
sample, re-used as is), judged_src.txt (official-source class for its 'none' items), and the explicit links
(a rule citing the question, a worked example, a gallery item with the same picture and meaning).
Verdict codes: f<k> full via candidate k | p<k> note: partial | d full via the sign dictionary only |
n T hint: not taught, official state source exists (teachable) | n S hint: not taught, no official state source found.
Run once after a judging round; afterwards full.json is the record (re-judged entries are edited there)."""
import sys, os, json, re
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from units import load, ref_of, resolve, ROOT
Q, LS, SRC, U, D = load()
P = lambda p: os.path.join(ROOT, p)
C = json.load(open('/tmp/pack/cands.json'))
SG = json.load(open(P('data/signs.json')))
J = json.load(open(P('tools/coverage/judged.json'))); man = {**J['before'], **J['after']}
JS = {}
for l in open(P('tools/coverage/judged_src.txt')):
    if l.strip() and not l.startswith('#'):
        q, s, h = (l.rstrip('\n').split(' ', 2) + [''])[:3]; JS[q] = (s, h)
out = {}
for l in open(P('tools/coverage/verdicts.txt')):
    l = l.strip()
    if not l or l.startswith('#'): continue
    qid, code, *rest = l.split(' ', 2); note = rest[0] if rest else ''
    e = {'by': 'hand'}
    if code == 'd':
        e.update(v='full', dict=True, u=['signs#d' + n for n in SG['q'][qid]], why='official sign meaning (sign dictionary, gov.il)')
    elif code[0] in 'fp':
        k = int(code[1:]); uid = C[qid][k - 1]
        e.update(v='full' if code[0] == 'f' else 'partial', u=[ref_of(LS, uid)],
                 why=note or ('the cited rule states the correct answer' if code[0] == 'f' else 'related rule only'))
    elif code == 'n':
        s, h = (note.split(' ', 1) + [''])[:2]
        assert s in ('T', 'S'), l
        e.update(v='none', u=[], src=s, why=h)
        if qid in SG['q']: e.update(v='full', dict=True, u=['signs#d' + n for n in SG['q'][qid]])
    else: raise SystemExit('bad verdict line: ' + l)
    out[qid] = e
for qid, j in man.items():
    assert qid not in out, qid
    e = {'by': 'sample', 'v': j['v'], 'u': list(j['u']), 'why': j.get('why', '') or {'full': 'the cited rule states the correct answer', 'partial': 'related rule only', 'none': ''}[j['v']]}
    if j['v'] == 'none':
        s, h = JS.get(qid, ('', ''))
        if qid in SG['q']: e.update(v='full', dict=True, u=['signs#d' + n for n in SG['q'][qid]], why='official sign meaning (sign dictionary, gov.il)')
        else:
            assert s in ('T', 'S'), f'judged none without source class: {qid}'
            e.update(src=s, why=(e['why'] + ' – ' if e['why'] else '') + h)
    elif j['v'] == 'partial' and qid in SG['q']:
        e.update(v='full', dict=True, strict_u=e['u'], u=['signs#d' + n for n in SG['q'][qid]])
    out[qid] = e
for q in Q:
    k = str(q['id'])
    if k in out: continue
    links = D.get(q['id'])
    assert links, f'unjudged question {k}'
    out[k] = {'by': 'link', 'v': 'full', 'u': [ref_of(LS, u) for u in links], 'why': 'rule written for this question (explicit citation / worked example / same sign picture)'}
assert len(out) == len(Q), (len(out), len(Q))
for e in out.values():
    for r in e['u']: resolve(LS, r)
json.dump({'note': __doc__.split('\n')[0], 'q': {k: out[k] for k in sorted(out, key=int)}}, open(P('tools/coverage/full.json'), 'w'), ensure_ascii=False, indent=0)
import collections
print(len(out), collections.Counter((e['v'], e.get('dict', False), e.get('src')) for e in out.values()))
