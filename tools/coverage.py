#!/usr/bin/env python3
"""Coverage audit over the WHOLE bank: does the preparation material (data/lessons.json) teach what each question asks?
Every one of the bank's questions carries a hand verdict (tools/coverage/full.json, compiled by
tools/coverage/compile_verdicts.py from the one-by-one judgement): full / partial / none, the lesson units that carry the
answer (stable references, see units.py) and a one-line reason; an untaught question is marked T (an official state
source exists – teachable) or S (no official state source found among the allowed sources).
Rules written later for specific questions declare them in tools/lessons_spec.py (R(..., q=[ids]) full, qp=[ids] partial);
those declarations override the record (they are re-judged by hand when the rule is written).
A unit only counts for the classes its lesson is shown to; the sign dictionary counts as full, but not in the strict figure.
Writes data/coverage.json (app: {qid: [status f|w|n, [lessons], [units], src]}), data/coverage_full.json (per question
verdict / rule / reason + per-class and per-topic totals) and docs/coverage_after.json (totals).
usage: coverage.py [--label after]"""
import sys, os, json, collections, re
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'coverage'))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from units import load, ROOT, resolve, ref_of

CLS = ['B', 'A', 'C1', 'C', 'D', '1']
NAMES = {'B': 'B רכב פרטי', 'A': 'A אופנוע', 'C1': 'C1 משא עד 12 ט\'', 'C': 'C משא כבד', 'D': 'D אוטובוס', '1': '1 טרקטור'}
TOP = {'law': 'חוקי התנועה', 'signs': 'תמרורים', 'safety': 'בטיחות', 'vehicle': 'הכרת הרכב'}
P = lambda p: os.path.join(ROOT, p)
Q, LS, SRC, U, D = load()
by = {q['id']: q for q in Q}
ul = {u['id']: u['lesson'] for u in U}
lcls = {L['id']: set(L['cls']) for L in LS}
SG = json.load(open(P('data/signs.json')))
for n in SG['e']: ul['signs#d' + n] = 'signs'
F = json.load(open(P('tools/coverage/full.json')))['q']

# rules declared in the spec as teaching given questions (re-judged when written)
import lessons_spec as S
for L in S.LESSONS:
    lj = next(l for l in LS if l['id'] == L['id'])
    for r in L['rules']:
        for key, v in (('q', 'full'), ('qp', 'partial')):
            for qid in r.get(key, []):
                i = next(i for i, x in enumerate(lj['rules']) if x['t'] == r['t'])
                ref = ref_of(LS, f"{L['id']}#r{i}"); e = F[str(qid)]
                if e['v'] == 'full' and not e.get('dict') and v == 'partial': continue
                if e.get('by') == 'v1.5' and e['v'] == 'full': e['u'].append(ref); continue
                F[str(qid)] = {'by': 'v1.5', 'v': v, 'u': [ref], 'why': ('rule written for this question' if v == 'full' else 'rule covers part of the answer') + f" ({r['s']})",
                               **({'strict_u': e['u'], 'dict': True} if e.get('dict') and v == 'partial' else {}), **({'src': e.get('src')} if v == 'partial' and e.get('src') else {})}
for e in F.values():
    e['ids'] = [resolve(LS, r) for r in e['u']]
    e['sids'] = [resolve(LS, r) for r in e.get('strict_u', [])]

def verdict(qid, c, strict=False):
    e = F[str(qid)]; v = e['v']; ids = e['ids']
    if e.get('dict'):
        if strict: v = 'partial' if e['v'] == 'full' else e['v']
        if strict and e['sids'] and any(c in lcls[ul[u]] for u in e['sids']): ids = e['sids']
    if v != 'none' and not any(c in lcls[ul[u]] for u in ids): v = 'none'
    return v
def best(qid, strict=False):
    return max((verdict(qid, c, strict) for c in by[qid]['t']), key=['none', 'partial', 'full'].index)
def tot(ids, c=None):
    f = (lambda i, s: verdict(i, c, s)) if c else best
    v = collections.Counter(f(i, False) for i in ids); s = collections.Counter(f(i, True) for i in ids); N = len(ids)
    pc = lambda k: round(100 * k / N, 1) if N else 0
    src = collections.Counter(F[str(i)].get('src') for i in ids if f(i, False) == 'none')
    return {'n': N, 'full': v['full'], 'partial': v['partial'], 'none': v['none'], 'full_pct': pc(v['full']), 'any_pct': pc(v['full'] + v['partial']),
            'strict_full': s['full'], 'strict_pct': pc(s['full']), 'none_teachable': src['T'], 'none_nosource': src['S'] + src[None]}

ALLIDS = sorted(by)
T = {'all': tot(ALLIDS), 'class': {}, 'class_only': {}, 'topic': {}, 'class_topic': {}}
for c in CLS:
    pool = [i for i in ALLIDS if c in by[i]['t']]
    T['class'][c] = tot(pool, c)
    T['class_only'][c] = tot([i for i in pool if set(by[i]['t']) == {c}], c)
    T['class_topic'][c] = {k: tot([i for i in pool if by[i]['k'] == k], c) for k in TOP}
for k in TOP: T['topic'][k] = tot([i for i in ALLIDS if by[i]['k'] == k])
T['by'] = dict(collections.Counter(e['by'] for e in F.values()))
T['none_ids'] = {c: [i for i in ALLIDS if c in by[i]['t'] and verdict(i, c, False) == 'none'] for c in ('B', 'A')}

# app file: status per question; hand units only (no word-overlap fill, so a weak match is never shown as a reason)
cov = {}
for q in Q:
    e = F[str(q['id'])]
    st = {'full': 'f', 'partial': 'w', 'none': 'n'}[e['v']]
    units = [u for u in e['ids'] if not u.startswith('signs#d')]
    ls = []
    for u in units:
        if ul[u] not in ls and lcls[ul[u]] & set(q['t']): ls.append(ul[u])
    if e.get('dict') and 'signs' not in ls: ls.append('signs')
    cov[q['id']] = [st, ls[:3], units[:3]] + (['S'] if e['v'] == 'none' and e.get('src') != 'T' else [])
_t = lambda x: [x['n'], x['full_pct'], x['strict_pct'], x['any_pct'], x['none_nosource']]
json.dump({'v': 2, 'legend': {'f': 'taught', 'w': 'partly', 'n': 'not taught yet', 'S': 'no official state source'},
           'tot': {'all': _t(T['all']), **{c: _t(T['class'][c]) for c in CLS}},
           'q': {str(k): v for k, v in sorted(cov.items())}}, open(P('data/coverage.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
full = {'v': 1, 'note': 'Whole-bank hand judgement of theory-il lessons against every official bank question. v: full|partial|none; '
        'rule: lesson unit(s) carrying the answer (current id; ref = stable reference); why: one-line reason; src (untaught only): '
        'T = official state source exists (teachable), S = no official state source found (law pinned on Wikisource, gov.il/mot.gov.il, '
        'rsa.org.il). strict = sign dictionary not counted as teaching. Per-class figures count a rule only if its lesson is shown to that class.',
        'totals': T,
        'q': {str(i): {'v': F[str(i)]['v'], **({'dict': True} if F[str(i)].get('dict') else {}), 'rule': F[str(i)]['ids'], 'ref': F[str(i)]['u'],
                       'why': F[str(i)]['why'], **({'src': F[str(i)].get('src') or 'S'} if F[str(i)]['v'] == 'none' else {}),
                       'cls': by[i]['t'], 'topic': by[i]['k'], 'by': F[str(i)]['by']} for i in ALLIDS}}
json.dump(full, open(P('data/coverage_full.json'), 'w'), ensure_ascii=False, indent=0)
json.dump(T, open(P('docs/coverage_after.json'), 'w'), ensure_ascii=False, indent=1)
fmt = lambda s: f"n={s['n']:4d} full {s['full_pct']:5.1f}%  strict {s['strict_pct']:5.1f}%  any {s['any_pct']:5.1f}%  untaught: T {s['none_teachable']:3d} S {s['none_nosource']:3d}"
print('ALL              ', fmt(T['all']))
for c in CLS: print(f"{NAMES[c]:17s}", fmt(T['class'][c]), ' | class-only', fmt(T['class_only'][c]))
for k in TOP: print(f"{TOP[k]:17s}", fmt(T['topic'][k]))
print('judged by', T['by'])
missing = [q['id'] for q in Q if q['id'] not in cov]
if missing: sys.exit(f'FAIL: {len(missing)} questions without a verdict')
