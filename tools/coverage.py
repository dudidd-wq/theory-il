#!/usr/bin/env python3
"""Coverage audit: does the preparation material (data/lessons.json) teach what each bank question asks?
- manual judgement of a fixed random sample (tools/coverage/judged.json, key = 'before' / 'after')
- auto matcher over the whole bank (tools/coverage/units.py), thresholds calibrated on the manual labels
- writes data/coverage.json  {qid: [status, [lesson ids, best first], [unit ids]]}
  status: 'f' full (manual or explicit link), 'a' likely (auto), 'w' weak/partial, 'n' none (nearest lesson only)
usage: coverage.py [--label before|after] [--report]"""
import sys, os, json, math, collections
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'coverage'))
import numpy as np
from units import load, Matcher, ROOT, resolve
from sample import SAMPLE

LABEL = sys.argv[sys.argv.index('--label') + 1] if '--label' in sys.argv else 'after'
HI, LO = 0.45, 0.30            # calibrated on the manual sample (see report)
CLS = ['B', 'A', 'C1', 'C', 'D', '1']
NAMES = {'B': 'B רכב פרטי', 'A': 'A אופנוע', 'C1': 'C1 משא עד 12 ט\'', 'C': 'C משא כבד', 'D': 'D אוטובוס', '1': '1 טרקטור'}
TOP = {'law': 'חוקי התנועה', 'signs': 'תמרורים', 'safety': 'בטיחות', 'vehicle': 'הכרת הרכב'}

Q, LS, SRC, U, D = load()
by = {q['id']: q for q in Q}
ul = {u['id']: u['lesson'] for u in U}
lcls = {L['id']: set(L['cls']) for L in LS}
J = json.load(open(os.path.join(ROOT, 'tools/coverage/judged.json')))
# 'after' = the before labels plus re-judged deltas (questions whose material was added since)
man = J['before'] if LABEL == 'before' else {**J['before'], **J.get('after', {})}
# judged units are stored as stable references (text start / qid), resolved to current position ids here
man = {k: {**e, 'u': [resolve(LS, r) for r in e['u']]} for k, e in man.items()}
# signs dictionary (data/signs.json, gov.il לות"ם): a sign question whose sign is identified is taught by the
# dictionary in the signs lesson (official meaning, cited LT:n) – unit id 'signs#d<num>'
SG = json.load(open(os.path.join(ROOT, 'data/signs.json'))) if LABEL != 'before' else {'q': {}, 'e': {}}
for n in SG['e']: ul['signs#d' + n] = 'signs'
man_strict = dict(man)  # labels before the sign dictionary is credited (strict figure)
for qid, nums in SG['q'].items():
    if qid not in man or man[qid]['v'] != 'full':
        man[qid] = {'v': 'full', 'u': ['signs#d' + n for n in nums], 'why': 'sign dictionary'}
m = Matcher(U, Q)
uidx = {u['id']: i for i, u in enumerate(U)}

def auto(q):
    s, d = m.score(q); tot = s + 0.5 * np.clip(d, -0.2, 0.3)
    order = np.argsort(-tot)
    return [(U[i]['id'], float(tot[i])) for i in order[:12]]

cov, autoclass = {}, {}
for q in Q:
    top = auto(q)
    best = top[0][1]
    links = D.get(q['id'], [])
    st = 'f' if links else ('a' if best >= HI else 'w' if best >= LO else 'n')
    autoclass[q['id']] = st
    j = man.get(str(q['id']))
    units = links or [u for u, _ in top[:2]]
    if str(q['id']) in SG['q']: autoclass[q['id']] = st = 'f'
    if j:
        st = {'full': 'f', 'partial': 'w', 'none': 'n'}[j['v']]
        if j['u']: units = j['u'] + [u for u in units if u not in j['u']]
    # lessons ranked: explicit/judged units first, then auto ranking; keep only lessons shown to one of the question's classes
    ls = []
    for u in units + [u for u, _ in top]:
        l = ul[u]
        if l not in ls and lcls[l] & set(q['t']): ls.append(l)
    if not ls:  # nearest lesson open to its classes, whatever the score
        for i in np.argsort(-(m.score(q)[0])):
            l = U[i]['lesson']
            if lcls[l] & set(q['t']): ls = [l]; break
    cov[q['id']] = [st, ls[:3], [u for u in units if ul[u] in ls][:3]]

json.dump({'v': 1, 'label': LABEL, 'legend': {'f': 'taught', 'a': 'likely taught (auto)', 'w': 'partly', 'n': 'not taught (nearest lesson)'},
           'q': {str(k): v for k, v in sorted(cov.items())}},
          open(os.path.join(ROOT, 'data/coverage.json'), 'w'), ensure_ascii=False, separators=(',', ':'))

def wilson(k, n, z=1.96):
    if not n: return (0, 0)
    p = k / n; d = 1 + z * z / n; c = p + z * z / (2 * n); h = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n))
    return (100 * (c - h) / d, 100 * (c + h) / d)

def verdict(qid, c):
    j = man[str(qid)]; v = j['v']
    if v != 'none' and not any(c in lcls[ul[u]] for u in j['u']): v = 'none'
    return v

stats = {'label': LABEL, 'class': {}, 'topic': {}, 'auto': {}, 'agree': {}}
for c in CLS:
    ids = [i for i in SAMPLE if c in by[i]['t']]
    n = collections.Counter(verdict(i, c) for i in ids)
    N = len(ids)
    stats['class'][c] = {'n': N, 'full': n['full'], 'partial': n['partial'], 'none': n['none'],
                         'full_pct': round(100 * n['full'] / N, 1), 'full_ci': [round(x, 1) for x in wilson(n['full'], N)],
                         'any_pct': round(100 * (n['full'] + n['partial']) / N, 1), 'any_ci': [round(x, 1) for x in wilson(n['full'] + n['partial'], N)]}
    pool = [q for q in Q if c in q['t']]
    ac = collections.Counter('f' if autoclass[q['id']] in 'fa' else autoclass[q['id']] for q in pool
                             if any(c in lcls[ul[u]] for u in cov[q['id']][2]) or autoclass[q['id']] == 'n')
    stats['auto'][c] = {'pool': len(pool), **{k: round(100 * v / len(pool), 1) for k, v in ac.items()}}
n = collections.Counter(man[str(i)]['v'] for i in SAMPLE)
stats['all'] = {'n': len(SAMPLE), **dict(n), 'full_pct': round(100 * n['full'] / len(SAMPLE), 1), 'any_pct': round(100 * (n['full'] + n['partial']) / len(SAMPLE), 1)}
for k in TOP:
    ids = [i for i in SAMPLE if by[i]['k'] == k]
    n = collections.Counter(man[str(i)]['v'] for i in ids)
    stats['topic'][k] = {'n': len(ids), **dict(n), 'full_pct': round(100 * n['full'] / len(ids), 1),
                         'any_pct': round(100 * (n['full'] + n['partial']) / len(ids), 1)}
# agreement of the auto classifier with the manual labels (covered = full|partial vs f|a|w)
tp = sum(1 for i in SAMPLE if man[str(i)]['v'] != 'none' and autoclass[i] in 'faw')
fp = sum(1 for i in SAMPLE if man[str(i)]['v'] == 'none' and autoclass[i] in 'faw')
fn = sum(1 for i in SAMPLE if man[str(i)]['v'] != 'none' and autoclass[i] == 'n')
tn = len(SAMPLE) - tp - fp - fn
stats['agree'] = {'tp': tp, 'fp': fp, 'fn': fn, 'tn': tn, 'accuracy': round(100 * (tp + tn) / len(SAMPLE), 1)}
# signs: share of sign questions whose picture/meaning appears in a lesson
sg = [i for i in SAMPLE if by[i]['k'] == 'signs']
stats['signs'] = {'n': len(sg), 'full': sum(man[str(i)]['v'] == 'full' for i in sg), 'partial': sum(man[str(i)]['v'] == 'partial' for i in sg)}
# whole-bank labels as the app shows them (status per question; f/a = "taught", w = related rule only, n = not taught yet)
def labels(pool):
    c = collections.Counter(cov[q['id']][0] for q in pool); N = len(pool)
    return {'n': N, **{k: round(100 * c[k] / N, 1) for k in 'fawn'}, 'fa': round(100 * (c['f'] + c['a']) / N, 1), 'any': round(100 * (N - c['n']) / N, 1)}
stats['bank'] = {'all': labels(Q), **{c: labels([q for q in Q if c in q['t']]) for c in CLS}}
# the sample is a simple random draw from the whole bank, so per-class figures are already weighted by the bank mix;
# the sign/non-sign split re-weights them explicitly by each class's share of sign questions in the bank (as the reviewer did)
stats['weighted'] = {}
for c in CLS:
    ids = [i for i in SAMPLE if c in by[i]['t']]; pool = [q for q in Q if c in q['t']]
    w = sum(q['k'] == 'signs' for q in pool) / len(pool); r = {'sign_share': round(100 * w, 1)}
    for part, sel in (('signs', lambda i: by[i]['k'] == 'signs'), ('other', lambda i: by[i]['k'] != 'signs')):
        v = collections.Counter(verdict(i, c) for i in ids if sel(i)); n = sum(v.values())
        r[part] = {'n': n, 'full': round(100 * v['full'] / n, 1), 'any': round(100 * (v['full'] + v['partial']) / n, 1)}
    r['full'] = round(w * r['signs']['full'] + (1 - w) * r['other']['full'], 1); r['any'] = round(w * r['signs']['any'] + (1 - w) * r['other']['any'], 1)
    stats['weighted'][c] = r
# strict figure (review #4 definition): the sign dictionary is not counted as teaching – a sign question whose
# full label comes only from the dictionary counts as partial (its why-box still shows the official meaning)
def verdict_strict(qid, c):
    j = man_strict.get(str(qid), {'v': 'none', 'u': []}); v = j['v']
    if str(qid) in SG['q'] and v == 'none': j = man[str(qid)]; v = 'partial'
    if v != 'none' and not any(c in lcls[ul[u]] for u in j['u']): v = 'none'
    return v
stats['strict'] = {}
for c in CLS:
    ids = [i for i in SAMPLE if c in by[i]['t']]; v = collections.Counter(verdict_strict(i, c) for i in ids); N = len(ids)
    stats['strict'][c] = {'n': N, 'full_pct': round(100 * v['full'] / N, 1), 'any_pct': round(100 * (v['full'] + v['partial']) / N, 1)}
v = collections.Counter(max((verdict_strict(i, c) for c in set(by[i]['t'])), key=['none', 'partial', 'full'].index) for i in SAMPLE)
stats['strict']['all'] = {'n': len(SAMPLE), 'full_pct': round(100 * v['full'] / len(SAMPLE), 1), 'any_pct': round(100 * (v['full'] + v['partial']) / len(SAMPLE), 1)}
# class-only questions (in exactly one class) and the union by number of classes
stats['only'] = {}
for c in CLS:
    ids = [i for i in SAMPLE if by[i]['t'] == [c] or set(by[i]['t']) == {c}]
    v = collections.Counter(verdict(i, c) for i in ids); n = len(ids)
    if n: stats['only'][c] = {'n': n, 'full': v['full'], 'partial': v['partial'], 'full_pct': round(100 * v['full'] / n, 1), 'any_pct': round(100 * (v['full'] + v['partial']) / n, 1)}
stats['by_ncls'] = {}
for k in sorted({len(set(by[i]['t'])) for i in SAMPLE}):
    ids = [i for i in SAMPLE if len(set(by[i]['t'])) == k]
    v = collections.Counter(max((verdict(i, c) for c in set(by[i]['t'])), key=['none', 'partial', 'full'].index) for i in ids)
    stats['by_ncls'][k] = {'n': len(ids), 'full_pct': round(100 * v['full'] / len(ids), 1), 'any_pct': round(100 * (v['full'] + v['partial']) / len(ids), 1)}
os.makedirs(os.path.join(ROOT, 'docs'), exist_ok=True)
json.dump(stats, open(os.path.join(ROOT, f'docs/coverage_{LABEL}.json'), 'w'), ensure_ascii=False, indent=1)
for c, s in stats['class'].items():
    print(f"{NAMES[c]:18s} n={s['n']:3d} full {s['full_pct']:5.1f}% {s['full_ci']}  full+partial {s['any_pct']:5.1f}% {s['any_ci']}  auto {stats['auto'][c]}")
for k, s in stats['topic'].items(): print(TOP[k], s)
print('signs', stats['signs'], 'agree', stats['agree'])
print('strict (sign dictionary = partial)', stats['strict'])
print('bank labels', stats['bank'])
print('weighted', {c: (w['full'], w['any']) for c, w in stats['weighted'].items()})
print('class-only', stats['only'])
print('by number of classes', stats['by_ncls'], 'union', stats['all'])
missing = [q['id'] for q in Q if not cov[q['id']][1]]
print('mapped', len(cov), 'unmapped', missing[:10])
if missing: sys.exit(f'FAIL: {len(missing)} questions not mapped to any lesson')
