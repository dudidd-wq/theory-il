"""Print the whole bank in review batches for the full-bank hand judgement (tools/coverage/verdicts.json).
Each question shows its classes, topic, correct answer, the sign-table entry (if any) and numbered candidate
units from lessons open to its classes: hand-judged units first, then explicit links, then the matcher's best.
usage: full_pack.py START END  (writes the candidate refs to /tmp/pack/cands.json)"""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from units import load, Matcher, resolve, ref_of
Q, LS, SRC, U, D = load()
lcls = {L['id']: set(L['cls']) for L in LS}; ut = {u['id']: u for u in U}
J = json.load(open('tools/coverage/judged.json')); man = {**J['before'], **J['after']}
SG = json.load(open('data/signs.json'))
m = Matcher(U, Q)
a, b = int(sys.argv[1]), int(sys.argv[2])
cp = '/tmp/pack/cands.json'; C = json.load(open(cp)) if os.path.exists(cp) else {}
SKIP = set(map(int, open('/tmp/pack/skip.txt').read().split())) if os.path.exists('/tmp/pack/skip.txt') else set()
todo = [q for q in sorted(Q, key=lambda q: q['id']) if q['id'] not in SKIP]
for q in todo[a:b]:
    vis = {l for l, c in lcls.items() if c & set(q['t'])}
    cands = []
    j = man.get(str(q['id']))
    for r in (j['u'] if j else []):
        u = resolve(LS, r)
        if u.split('#')[0] in vis and u in ut and u not in cands: cands.append(u)
    for u in D.get(q['id'], []):
        if u.split('#')[0] in vis and u not in cands: cands.append(u)
    for u, s, d, tot in m.top(q, 8, lessons=vis):
        if len(cands) >= 3: break
        if u['id'] not in cands and u['kind'] != 'gallery' or (u['kind'] == 'gallery' and u['id'] not in cands and tot > .5): cands.append(u['id'])
    cands = cands[:3]
    C[str(q['id'])] = cands
    cl = ''.join(t if len(t) == 1 else '(' + t + ')' for t in q['t']) if len(q['t']) < 6 else '*'
    hj = f" HJ={j['v'][0]}" if j else ''
    print(f"#{q['id']} {cl} {q['k'][:2]}{'*' if q.get('i') else ''}{hj} {q['q'][:80]} => {q['a'][q['c']][:60]}")
    ds = SG['q'].get(str(q['id']), [])
    if ds: print('  d' + ' d'.join(f"{n}:{SG['e'].get(n, '')[:45]}" for n in ds))
    print('  ' + ' | '.join(f"{i}{u.split('#')[0][:4]}:{ut[u]['text'].split(' || ')[0][:48]}" for i, u in enumerate(cands, 1)))
json.dump(C, open(cp, 'w'), ensure_ascii=False)
