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
