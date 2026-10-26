"""Print the fixed random audit sample with the top candidate lesson units, for manual judgement.
usage: sample.py [start] [end]   (judgements are stored in tools/coverage/judged.json)"""
import sys, random, collections, json, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from units import load, Matcher, norm
Q, LS, SRC, U, D = load()
ids = sorted(q['id'] for q in Q)
SAMPLE = sorted(random.Random(20261026).sample(ids, 270))
if __name__ == '__main__':
    cnt = collections.Counter(t for q in Q if q['id'] in SAMPLE for t in q['t'])
    print('sample per class', dict(cnt))
    m = Matcher(U, Q); by = {q['id']: q for q in Q}
    a, b = (int(sys.argv[1]), int(sys.argv[2])) if len(sys.argv) > 2 else (0, len(SAMPLE))
    for qid in SAMPLE[a:b]:
        q = by[qid]
        print(f"\n## {qid} [{q['k']}] {''.join(t if len(t)==1 else '('+t+')' for t in q['t'])}{' IMG' if q.get('i') else ''}  {q['q']}")
        print('  ✓', q['a'][q['c']], '| ✗', ' / '.join(x[:28] for i, x in enumerate(q['a']) if i != q['c']))
        if qid in D: print('  DIRECT', D[qid])
        for u, s, d, t in m.top(q, 3):
            print(f"  {u['id']:12s} {t:.2f} {u["text"][:105]}")
