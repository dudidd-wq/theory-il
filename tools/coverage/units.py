"""Lesson knowledge units + auto matcher shared by the coverage tools.
A unit is one piece of lesson content a learner sees: a rule (own wording + the cited law/sign excerpt shown in its chip),
a body paragraph, a recap card, a mnemonic, a worked example, or a gallery item (sign picture + its meaning)."""
import json, os, re
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
J = lambda p: json.load(open(os.path.join(ROOT, p)))

def norm(s):
    s = re.sub(r'[\u0591-\u05C7]', '', s)
    s = re.sub(r'[״׳"\'`“”„‘’\-–—־.,;:!?()\[\]/]', ' ', s)
    return re.sub(r'\s+', ' ', s).strip()

def load():
    Q = J('data/q.he.json'); LS = J('data/lessons.json')['lessons']; SRC = J('data/sources.json')
    byid = {q['id']: q for q in Q}
    def sx(s):
        k = s if s in SRC else re.sub(r'\(.*$', '', s)
        x = SRC.get(k); return ' '.join(x['ex'][:4]) if x else ''
    units, direct = [], {}
    def add(uid, lid, kind, text, cite=None):
        units.append({'id': uid, 'lesson': lid, 'kind': kind, 'text': text})
    for L in LS:
        lid = L['id']
        for i, p in enumerate(L['body']): add(f'{lid}#b{i}', lid, 'body', p)
        for i, r in enumerate(L['rules']):
            ex = ' '.join(sx(s) for s in [r['s']] + r.get('also', []) if not s.startswith('Q:'))
            add(f'{lid}#r{i}', lid, 'rule', r['t'] + ' || ' + ex)
            for s in [r['s']] + r.get('also', []):
                if s.startswith('Q:'): direct.setdefault(int(s[2:]), []).append(f'{lid}#r{i}')
        for i, c in enumerate(L['recap']): add(f'{lid}#c{i}', lid, 'recap', c['f'] + ' ' + c['b'])
        for i, m in enumerate(L['mnem']): add(f'{lid}#m{i}', lid, 'mnem', m['t'] + ' ' + m['n'])
        for i, x in enumerate(L['ex']):
            q = byid.get(x['q'])
            if q: add(f'{lid}#x{i}', lid, 'example', q['q'] + ' ' + q['a'][q['c']] + ' ' + x['t']); direct.setdefault(x['q'], []).append(f'{lid}#x{i}')
        for qid in L['gal']:
            q = byid.get(qid)
            if not q: continue
            add(f'{lid}#g{qid}', lid, 'gallery', q['a'][q['c']])
            # same picture + same meaning in another question = the gallery item answers it too
            for o in Q:
                if o.get('i') == q['i'] and norm(o['a'][o['c']]) == norm(q['a'][q['c']]):
                    direct.setdefault(o['id'], []).append(f'{lid}#g{qid}')
    return Q, LS, SRC, units, direct

# ---- stable unit references (judged.json) -------------------------------------------------------------
# A judgement must survive rules being inserted, so it never stores a position (lesson#r7). It stores
#   lesson#r:<start of the rule text>   (also #b body, #c recap front, #m mnemonic)
#   lesson#x:Q<qid>   worked example,   lesson#g<qid> gallery item,   signs#d<num> sign dictionary entry
# resolve() maps a reference to the current position id; a reference that matches nothing (or two units) is an error.
PREFIX = 36
def _texts(L):
    return {'r': [r['t'] for r in L['rules']], 'b': list(L['body']), 'c': [c['f'] for c in L['recap']], 'm': [m['t'] for m in L['mnem']]}
def ref_of(LS, uid):
    lid, k = uid.split('#'); kind = k[0]
    if kind in 'gd': return uid
    L = {l['id']: l for l in LS}[lid]
    if kind == 'x': return f"{lid}#x:Q{L['ex'][int(k[1:])]['q']}"
    T = _texts(L)[kind]; t = T[int(k[1:])]; n = PREFIX
    while n < len(t) and sum(o.startswith(t[:n]) for o in T) > 1: n += 8
    return f'{lid}#{kind}:{t[:n]}'
def resolve(LS, ref):
    lid, k = ref.split('#', 1); kind = k[0]
    if kind in 'gd': return ref
    if k[1] != ':': raise ValueError(f'positional unit id in judged.json: {ref}')
    L = {l['id']: l for l in LS}.get(lid)
    if L is None: raise ValueError(f'no lesson for {ref}')
    if kind == 'x':
        hit = [i for i, x in enumerate(L['ex']) if f"Q{x['q']}" == k[2:]]
    else:
        hit = [i for i, t in enumerate(_texts(L)[kind]) if t.startswith(k[2:])]
    if len(hit) != 1: raise ValueError(f'{len(hit)} units match {ref}')
    return f'{lid}#{kind}{hit[0]}'

class Matcher:
    def __init__(self, units, Q):
        self.units = units
        corpus = [norm(u['text']) for u in units] + [norm(q['q'] + ' ' + ' '.join(q['a'])) for q in Q]
        self.v = TfidfVectorizer(analyzer='char_wb', ngram_range=(3, 5), sublinear_tf=True, min_df=1).fit(corpus)
        self.U = self.v.transform([norm(u['text']) for u in units])
    def score(self, q):
        """per unit: similarity to question+correct answer, and how much better the unit fits the correct answer than the best distractor"""
        qa = self.v.transform([norm(q['q'] + ' ' + q['a'][q['c']])])
        ans = self.v.transform([norm(a) for a in q['a']])
        s_qa = (self.U @ qa.T).toarray().ravel()
        s_a = (self.U @ ans.T).toarray()          # units x 4
        c = s_a[:, q['c']]; d = np.delete(s_a, q['c'], axis=1).max(axis=1)
        return s_qa, c - d
    def top(self, q, k=4, lessons=None):
        s, disc = self.score(q)
        tot = s + 0.5 * np.clip(disc, -0.2, 0.3)
        idx = [i for i in np.argsort(-tot) if lessons is None or self.units[i]['lesson'] in lessons][:k]
        return [(self.units[i], float(s[i]), float(disc[i]), float(tot[i])) for i in idx]
