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
                if e['v'] == v and not e.get('dict'): e['u'].append(ref); e['by'] = 'v1.5'; continue
                F[str(qid)] = {'by': 'v1.5', 'v': v, 'u': [ref], 'why': ('rule written for this question' if v == 'full' else 'rule covers part of the answer') + f" ({r['s']})",
                               **({'strict_u': e['u'], 'dict': True} if e.get('dict') and v == 'partial' else {}), **({'src': e.get('src')} if v == 'partial' and e.get('src') else {})}
for e in F.values():
    e['ids'] = [resolve(LS, r) for r in e['u']]
    e['sids'] = [resolve(LS, r) for r in e.get('strict_u', [])]

# v1.10 (review #7): a unit whose only source is a bank question (Q:) – rule with no law/textbook/official-page source,
# or a recap/mnemonic/worked example citing Q: – does not count in the "without bank-sourced rules" figure
_LB = {L['id']: L for L in LS}
def bank_sourced(uid):
    lid, k = uid.split('#'); L = _LB[lid]; kind, n = k[0], k[1:]
    if kind == 'r': r = L['rules'][int(n)]; return all(x.startswith('Q:') for x in [r['s']] + r.get('also', []))
    if kind == 'c': return L['recap'][int(n)]['s'].startswith('Q:')
    if kind == 'm': return L['mnem'][int(n)]['s'].startswith('Q:')
    if kind == 'x': return L['ex'][int(n)]['s'].startswith('Q:')
    return False
def verdict(qid, c, strict=False, nobank=False):
    e = F[str(qid)]; v = e['v']; ids = e['ids']
    if nobank: ids = [u for u in ids if not bank_sourced(u)]
    if e.get('dict'):
        if strict: v = 'partial' if e['v'] == 'full' else e['v']
        if strict and e['sids'] and any(c in lcls[ul[u]] for u in e['sids']): ids = e['sids']
    if v != 'none' and not any(c in lcls[ul[u]] for u in ids): v = 'none'
    return v
def best(qid, strict=False, nobank=False):
    return max((verdict(qid, c, strict, nobank) for c in by[qid]['t']), key=['none', 'partial', 'full'].index)
# v1.10: questions shown in a bank-only lesson (official question + answer, no official explanation) – reported separately
BANK = {c: {i for L in LS if 'bank' in L and c in L['cls'] for i in L['bank'] if c in by[i]['t']} for c in CLS}
BANK[None] = {i for L in LS for i in L.get('bank', [])}
# v1.11: B/A partial questions shown in their topic lesson with the official bank answer (still counted 'partial')
PBANK = {c: {p['q'] for L in LS if c in L['cls'] for p in L.get('pbank', []) if c in by[p['q']]['t']} for c in CLS}
PBANK[None] = {p['q'] for L in LS for p in L.get('pbank', [])}
def tot(ids, c=None):
    f = (lambda i, s, nb=False: verdict(i, c, s, nb)) if c else best
    v = collections.Counter(f(i, False) for i in ids); s = collections.Counter(f(i, True) for i in ids); N = len(ids)
    pc = lambda k: round(100 * k / N, 1) if N else 0
    # a question taught only in a lesson not shown to this class has an official source: count it as T, not S
    src = collections.Counter((F[str(i)].get('src') or 'S') if F[str(i)]['v'] == 'none' else 'T' for i in ids if f(i, False) == 'none')
    return {'n': N, 'full': v['full'], 'partial': v['partial'], 'none': v['none'], 'full_pct': pc(v['full']), 'any_pct': pc(v['full'] + v['partial']),
            'strict_full': s['full'], 'strict_pct': pc(s['full']), 'none_teachable': src['T'], 'none_nosource': src['S'],
            'bank_only': sum(1 for i in ids if f(i, False) == 'none' and i in BANK[c]),
            'partial_shown': sum(1 for i in ids if f(i, False) == 'partial' and i in PBANK[c]),
            'full_nobank_pct': pc(sum(1 for i in ids if f(i, False, True) == 'full')),
            'full_bank_sourced': sum(1 for i in ids if f(i, False) == 'full' and f(i, False, True) != 'full')}

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
_t = lambda x: [x['n'], x['full_pct'], x['strict_pct'], x['any_pct'], x['none_nosource'], x['bank_only'], x['full_nobank_pct'], x['partial'], x['partial_shown']]
json.dump({'v': 2, 'legend': {'f': 'taught', 'w': 'partly', 'n': 'not taught yet', 'S': 'no official state source'},
           'tot': {'all': _t(T['all']), **{c: _t(T['class'][c]) for c in CLS}},
           # v1.10: textbook use, computed (About text): [rules citing it, all rules, excerpts, pages, % of the book's ~45,600 words]
           'tb': (lambda R, TQ: [sum(1 for r in R if 'OFF:textbook' in [r['s']] + r.get('also', [])), len(R), len(TQ), len({z['p'] for z in TQ}),
                                 round(100 * sum(len(z['t'].split()) for z in TQ) / 45600, 1)])(
               [r for L in LS for r in L['rules']], json.load(open(P('tools/official/pages.json')))['textbook']['quotes']),
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
fmt = lambda s: f"n={s['n']:4d} full {s['full_pct']:5.1f}%  strict {s['strict_pct']:5.1f}%  any {s['any_pct']:5.1f}%  untaught: T {s['none_teachable']:3d} S {s['none_nosource']:3d} bank-only {s['bank_only']:3d} partial {s['partial']:3d} shown {s['partial_shown']:3d} nobank {s['full_nobank_pct']:5.1f}% ({s['full_bank_sourced']})"
print('ALL              ', fmt(T['all']))
for c in CLS: print(f"{NAMES[c]:17s}", fmt(T['class'][c]), ' | class-only', fmt(T['class_only'][c]))
for k in TOP: print(f"{TOP[k]:17s}", fmt(T['topic'][k]))
print('judged by', T['by'])
missing = [q['id'] for q in Q if q['id'] not in cov]
if missing: sys.exit(f'FAIL: {len(missing)} questions without a verdict')
if '--list-bank-sourced' in sys.argv:
    for i in ALLIDS:
        if best(i) == 'full' and best(i, False, True) != 'full': print(i, F[str(i)]['ids'])
