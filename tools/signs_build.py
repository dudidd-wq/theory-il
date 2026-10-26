#!/usr/bin/env python3
"""Build data/signs.json: the official meaning of every sign in the לות"ם (gov.il, pinned sha256) and
which bank questions/images show which sign. Sources per question, in order:
  1. the correct answer is a sign number ("302")            -> that number
  2. tools/signs/manual.json fix / img (checked by eye)
  3. char n-gram match of the correct answer to the meaning (sim>=0.55, margin>=0.1), minus manual drops
No meaning text is written by hand: every entry is the table's own wording (pdf text order repaired)."""
import json, re, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'coverage'))
from signs_dict import parse, LOT, ROOT
from units import norm

PARTS = [(1, 'תמרורי אזהרה והתראה'), (2, 'תמרורי הוריה'), (3, 'תמרורי זכות קדימה'), (4, 'תמרורי איסורים והגבלות'),
         (5, 'תמרורי תחבורה ציבורית'), (6, 'תמרורי מודיעין והדרכה'), (7, 'רמזורים ובקרת נתיבים'),
         (8, 'סימון על פני הדרך'), (9, 'תמרורים באתר עבודה')]

def build():
    from sklearn.feature_extraction.text import TfidfVectorizer
    E = parse(); keys = sorted(E, key=int)
    man = json.load(open(os.path.join(ROOT, 'tools/signs/manual.json')))
    Q = [q for q in json.load(open(os.path.join(ROOT, 'data/q.he.json'))) if q['k'] == 'signs']
    v = TfidfVectorizer(analyzer='char_wb', ngram_range=(3, 5), sublinear_tf=True).fit([norm(E[k]) for k in keys] + [norm(q['a'][q['c']]) for q in Q])
    M = v.transform([norm(E[k][:200]) for k in keys])
    qmap, how, img = {}, {}, {}
    for q in Q:
        a = q['a'][q['c']].strip(); qid = str(q['id'])
        nums = re.findall(r'(?<![\d,.])([1-9]\d{2})(?![\d,.])', a) if 'תמרור' in a or re.fullmatch(r'[\d ,.ו]+', a) else []
        nums = [n for n in nums if n in E]
        if nums: qmap[qid], how[qid] = nums, 'number'; continue
        if qid in man['fix']: qmap[qid], how[qid] = man['fix'][qid], 'manual'; continue
        if q.get('i') in man['img']: qmap[qid], how[qid] = man['img'][q['i']], 'manual'; continue
        if int(qid) in man['drop']: continue
        s = (M @ v.transform([norm(a)]).T).toarray().ravel(); o = s.argsort()[::-1]
        if s[o[0]] >= 0.55 and s[o[0]] - s[o[1]] >= 0.1 and q.get('i'):
            qmap[qid], how[qid] = [keys[o[0]]], 'text'
    for q in Q:  # a picture of one sign (not a numbers table) -> thumbnail for the dictionary
        qid = str(q['id'])
        if q.get('i') and how.get(qid) in ('manual', 'text') and len(qmap[qid]) == 1:
            img.setdefault(qmap[qid][0], q['i'])
    out = {'v': 1, 'src': {'title': LOT['title'], 'url': LOT['url'], 'sha256': LOT['sha256']},
           'parts': [[p, t] for p, t in PARTS], 'e': {k: E[k] for k in keys}, 'img': img, 'q': qmap}
    return out, how

if __name__ == '__main__':
    out, how = build()
    json.dump(out, open(os.path.join(ROOT, 'data/signs.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
    import collections
    print('entries', len(out['e']), 'with picture', len(out['img']), 'questions mapped', len(out['q']), collections.Counter(how.values()))
