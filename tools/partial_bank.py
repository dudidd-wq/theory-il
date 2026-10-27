"""v1.11: B/A bank questions that the lessons teach only PARTLY (verdict 'partial') are shown in their topic lesson,
in a section "שאלות מהמאגר שהשיעור מכסה רק חלקית": the official question and correct answer exactly as published in the
data.gov.il bank (CC BY), and next to it the lesson unit that covers part of it, with that unit's own citation.
The card labels the two parts apart: what the cited unit explains, and that the rest of the answer comes from the bank
alone (no explanation of ours). Nothing here is new text: every string is the bank's or an existing lesson unit's.
These questions stay 'partial' in every coverage figure; the section never changes a verdict."""
import json, os, re
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BA = {'B', 'A'}

def partial_ids(QS):
    F = json.load(open(os.path.join(R, 'data/coverage_full.json')))['q']
    # v1.20.1 (review #17 #3): every class, not only B/A – a C/C1/D/1-only partial is shown and practised in the lesson
    # of its rule instead of in no lesson at all (10 questions dropped from quizzes in v1.20, 48 partials shown nowhere)
    return {int(k): e for k, e in F.items() if e['v'] == 'partial' and int(k) in QS}

def unit(uid, L, SG):
    """the lesson unit a verdict points to → {'k', 't', 's', 'also'} (s None = no specific cited source)"""
    m = re.match(r'^(\w+)#([rxbcmdg])(\d+)$', uid); lid, k, i = m.group(1), m.group(2), int(m.group(3))
    if k == 'd':
        return {'k': 'sign', 't': f'תמרור {i}: ' + SG['e'][str(i)], 's': None, 'url': SG['src']['url'], 'n': str(i)}
    l = L[lid]
    if k == 'r': r = l['rules'][i]; return {'k': 'rule', 't': r['t'], 's': r['s'], 'also': r.get('also', []), 'x': r.get('x', [])}
    if k == 'x': x = l['ex'][i]; return {'k': 'ex', 't': x['t'], 's': x['s'], 'also': x.get('also', []) + ['Q:%d' % x['q']], 'x': x.get('x', [])}
    if k == 'c': c = l['recap'][i]; return {'k': 'recap', 't': c['f'] + ' – ' + c['b'], 's': c['s'], 'x': c.get('x', [])}
    if k == 'm': n = l['mnem'][i]; return {'k': 'mnem', 't': n['t'] + (' – ' + n['n'] if n['n'] else ''), 's': n['s'], 'x': n.get('x', [])}
    if k == 'g': return {'k': 'gal', 't': None, 's': 'Q:%d' % i}
    return {'k': 'body', 't': l['body'][i], 's': None}

def official(u):
    """True when the unit itself cites an official state source (not only a bank question, not uncited lesson text)"""
    if u['k'] == 'sign': return True
    return any(s and not s.startswith('Q:') for s in [u['s']] + [a for a in u.get('also', []) if u['k'] != 'ex' or not a.startswith('Q:')])

def _pos(ref, L):
    """v1.19: stable reference (lesson#r:<text start>) → current position id, so removing rules never misplaces a unit"""
    lid, k = ref.split('#', 1)
    if k[1:2] != ':' or lid not in L: return ref
    l = L[lid]; kind = k[0]
    T = {'r': [r['t'] for r in l['rules']], 'b': l['body'], 'c': [c['f'] for c in l['recap']], 'm': [m['t'] for m in l['mnem']],
         'x': ['Q%d' % x['q'] for x in l['ex']]}[kind]
    hit = [i for i, t in enumerate(T) if (t == k[2:] if kind == 'x' else t.startswith(k[2:]))]
    return f'{lid}#{kind}{hit[0]}' if len(hit) == 1 else None

def attach(out, QS):
    """add l['pbank'] = [{'q': id, 'u': [units]}] to the host lesson of every B/A partial question (first verdict unit
    whose lesson serves all the question's B/A classes) and put the question in that lesson's quiz"""
    SG = json.load(open(os.path.join(R, 'data/signs.json')))
    L = {l['id']: l for l in out}
    P = partial_ids(QS); placed = {}
    for e in P.values():
        if e.get('ref'):
            pos = [_pos(r, L) for r in e['ref']]
            if all(pos): e['rule'] = pos
    for q, e in sorted(P.items()):
        need = set(QS[q]['t']) & BA
        if need: host = next((u.split('#')[0] for u in e['rule'] if u.split('#')[0] in L and need <= set(L[u.split('#')[0]]['cls'])), None)
        else: host = next((u.split('#')[0] for u in e['rule'] if u.split('#')[0] in L and set(QS[q]['t']) & set(L[u.split('#')[0]]['cls'])), None)
        if not host: continue
        us = [unit(u, L, SG) for u in e['rule']]
        for u in us: u['o'] = official(u)
        L[host].setdefault('pbank', []).append({'q': q, 'u': us})
        if q not in L[host]['quiz']: L[host]['quiz'] = sorted(L[host]['quiz'] + [q])
        placed[q] = host
    return P, placed
