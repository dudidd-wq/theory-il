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
                if e.get('by') == 'spec' and e['v'] == 'full': e['u'].append(ref); continue
                if e['v'] == v and not e.get('dict'): e['u'].append(ref); e['by'] = 'spec'; continue
                F[str(qid)] = {'by': 'spec', 'v': v, 'u': [ref], 'why': ('rule written for this question' if v == 'full' else 'rule covers part of the answer') + f" ({r['s']})",
                               **({'strict_u': e['u'], 'dict': True} if e.get('dict') and v == 'partial' else {}), **({'src': e.get('src')} if v == 'partial' and e.get('src') else {})}
# v1.13 (review #9 D4): strict re-judgement, applied last. Line: "qid verdict | why"; verdict partial | none-T | none-S |
# conflict (bank answer contradicts the pinned law: not taught, not cited, shown only in a bank lesson with the law's text)
# | why (reason text only). A partial keeps its units; none/conflict drop them.
for ln in open(P('tools/coverage/rejudge_v113.txt'), encoding='utf-8'):
    ln = '' if ln.lstrip().startswith('#') else ln.strip()
    if not ln: continue
    head, why = (x.strip() for x in ln.split('|', 1)); qid, v, *add = head.split()
    e = F[qid]; e['why'] = why; e['by'] = 'v1.13'
    if v == 'why': continue
    # +refs: cited units added; when given, uncited lesson-body prose units ('#b:') are dropped (v1.13: a verdict must rest on a cited unit)
    plus = [ref_of(LS, a[1:]) for a in add if a.startswith('+')]
    if plus: e['u'] = [u for u in e['u'] if '#b:' not in u]
    if v == 'full':   # re-point a full verdict from body prose to the cited rule that decides it
        assert e['v'] == 'full' and plus, qid; e['u'] = plus + e['u']; e.pop('strict_u', None)
    elif v == 'partial':
        assert e['v'] == 'full', qid; e['v'] = 'partial'; e.pop('dict', None); e.pop('strict_u', None)
        e['u'] += plus
    else:
        e.update(v='none', u=[], src={'none-T': 'T', 'none-S': 'S', 'conflict': 'X'}[v]); e.pop('dict', None); e.pop('strict_u', None)
# v1.14 (review #10): second strict re-judgement, applied after v1.13. Same line format; here 'full' may also raise a partial
# (with +refs, the cited rules that decide the answer) and 'partial' may also re-point a partial (+refs replace its units).
for _by, ln in ((b, l) for b, fn in (('v1.14', 'rejudge_v114.txt'), ('v1.15', 'rejudge_v115.txt'), ('v1.16', 'rejudge_v116.txt'), ('v1.17', 'rejudge_v117.txt'), ('v1.18', 'rejudge_v118.txt'), ('v1.19', 'rejudge_v119.txt'), ('v1.20', 'rejudge_v120.txt'), ('v1.20.1', 'rejudge_v1201.txt')) for l in open(P('tools/coverage/' + fn), encoding='utf-8')):   # v1.15: review #11 re-judgement appended
    ln = '' if ln.lstrip().startswith('#') else ln.strip()
    if not ln: continue
    head, why = (x.strip() for x in ln.split('|', 1)); qid, v, *add = head.split()
    e = F[qid]; e['why'] = why; e['by'] = _by
    plus = [ref_of(LS, a[1:]) for a in add if a.startswith('+')]
    e.pop('dict', None); e.pop('strict_u', None)
    if v == 'full':
        assert (e['v'] in ('full', 'partial') or e.get('src') == 'T') and plus, qid; e['v'] = 'full'; e['u'] = plus; e.pop('src', None) if e.get('src') == 'T' else None   # v1.20.1: a teachable (none-T) question may be raised once a cited rule teaches it
    elif v == 'partial':
        assert e['v'] in ('full', 'partial'), qid; e['v'] = 'partial'
        if plus: e['u'] = plus
    else:
        e.update(v='none', u=[], src={'none-T': 'T', 'none-S': 'S', 'conflict': 'X'}[v])
# v1.14 (review #10 N5): uncited lesson-body prose ('#b:' units) never counts – every taught / partly taught verdict rests on a cited item
for qid, e in F.items():
    e['u'] = [u for u in e['u'] if '#b:' not in u]
    if 'strict_u' in e: e['strict_u'] = [u for u in e['strict_u'] if '#b:' not in u]
    assert e['v'] == 'none' or e['u'], f'Q{qid}: verdict {e["v"]} rests only on lesson-body prose – re-judge it in rejudge_v114.txt'
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
    # 'X' (v1.13): bank answer contradicts the pinned law – counted apart from T/S
    return {'n': N, 'full': v['full'], 'partial': v['partial'], 'none': v['none'], 'full_pct': pc(v['full']), 'any_pct': pc(v['full'] + v['partial']),
            'strict_full': s['full'], 'strict_pct': pc(s['full']), 'none_teachable': src['T'], 'none_nosource': src['S'], 'conflict': src['X'],
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
    if (e.get('dict') or any(u.startswith('signs#d') for u in e['ids'])) and 'signs' not in ls: ls.append('signs')
    cov[q['id']] = [st, ls[:3], units[:3]] + ([e.get('src') or 'S'] if e['v'] == 'none' and e.get('src') != 'T' else [])
# v1.16 (review #12 H1): the honest class-B estimate, computed once here and read by COVERAGE.md and the About page.
# Pooled strict downgrade rate of the latest independent re-samples, applied to the B full verdicts never checked strictly.
def _est():
    import math
    k = n = 0
    for f in ('rejudge_v115_sample.md', 'rejudge_v116_sample.md'):
        m = re.search(r'\*\*(\d+) of (\d+) downgraded', open(P('tools/coverage/' + f), encoding='utf-8').read()); k += int(m[1]); n += int(m[2])
    chk = {int(x) for l in open(P('tools/coverage/strict_checked.txt'), encoding='utf-8') if not l.startswith('#') for x in l.split()}
    z = 1.96; ph = k / n; c = (ph + z * z / (2 * n)) / (1 + z * z / n); h = z * math.sqrt(ph * (1 - ph) / n + z * z / (4 * n * n)) / (1 + z * z / n)
    out = {'k': k, 'n': n, 'rate': round(100 * ph, 1), 'lo_rate': round(100 * (c - h), 1), 'hi_rate': round(100 * (c + h), 1)}
    # v1.21: the same estimate for class A (same pooled downgrade rate; the samples were drawn from class-B verdicts, so for A it is an extrapolation)
    for K in ('B', 'A'):
        B = [i for i in ALLIDS if K in by[i]['t']]
        fullB = [i for i in B if F[str(i)]['v'] == 'full']
        un = [i for i in fullB if not F[str(i)].get('dict') and i not in chk]
        e = lambda r: round(100 * (len(fullB) - len(un) * r) / len(B), 1)
        if K == 'B': out['unchecked'] = len(un)
        else: out['A_unchecked'] = len(un)
        out.update({K + '_full': T['class'][K]['full_pct'], K + '_strict': T['class'][K]['strict_pct'], K + '_est': e(ph), K + '_lo': e(c + h), K + '_hi': e(c - h)})
    return out
EST = _est(); T['est'] = EST
_t = lambda x: [x['n'], x['full_pct'], x['strict_pct'], x['any_pct'], x['none_nosource'], x['bank_only'], x['full_nobank_pct'], x['partial'], x['partial_shown'],
              # v1.21 (the 'מה האתר מכסה' panel): exact counts – full, strict-full, bank answer contradicts the law
              x['full'], x['strict_full'], x['conflict']]
json.dump({'v': 2, 'legend': {'f': 'taught', 'w': 'partly', 'n': 'not taught yet', 'S': 'no official state source', 'X': 'bank answer contradicts the law'},
           'est': EST,
           'tot': {'all': _t(T['all']), **{c: _t(T['class'][c]) for c in CLS}},
           # v1.10: textbook use, computed (About text): [rules citing it, all rules, excerpts, pages, % of the book's ~45,600 words, median/max words, # ≤ 20 words]
           'tb': (lambda R, TQ: [sum(1 for r in R if 'OFF:textbook' in [r['s']] + r.get('also', [])), len(R), len(TQ), len({z['p'] for z in TQ}),
                                 round(100 * sum(len(z['t'].split()) for z in TQ) / 45600, 1),
                                 # v1.20 (review #16 N2): the real excerpt lengths (median, longest, how many ≤ 20 words) instead of a fixed 'up to 20'
                                 sorted(len(z['t'].split()) for z in TQ)[len(TQ) // 2], max(len(z['t'].split()) for z in TQ), sum(len(z['t'].split()) <= 20 for z in TQ)])(
               [r for L in LS for r in L['rules']], json.load(open(P('tools/official/pages.json')))['textbook']['quotes']),
           'q': {str(k): v for k, v in sorted(cov.items())}}, open(P('data/coverage.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
full = {'v': 1, 'note': 'Whole-bank hand judgement of theory-il lessons against every official bank question. v: full|partial|none; '
        'rule: lesson unit(s) carrying the answer (current id; ref = stable reference); why: one-line reason; src (untaught only): '
        'T = official state source exists (teachable), S = no official state source found, X = the bank answer contradicts the pinned law (law pinned on Wikisource, gov.il/mot.gov.il, '
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
