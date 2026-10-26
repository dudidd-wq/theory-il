"""Keyword-overlap sanity check between a question and the lesson unit cited as its reason (catches stale or
unrelated pointers). Words are compared by a 4-letter stem after stripping one Hebrew prefix letter; stop words ignored."""
import re
from units import norm
STOP = set('''את של על אם או לא כן מה מי היא הוא הם זה זו אין יש כל עם אל גם רק כי אשר לפי בין עד מן אחר אחרי לפני כאשר
יותר פחות מותר אסור חייב צריך עליו עליך רכב נהג נוהג הנוהג הרכב דרך הדרך תמרור התמרור נכון לבין בעת שלא אינו אינה ניתן אחד אחת שני שתי ימינה שמאלה'''.split())
def words(s):
    out = set()
    for w in norm(s).split():
        if len(w) < 3 or w in STOP or w.isdigit() and len(w) < 3: continue
        for x in {w, w[1:] if len(w) > 3 and w[0] in 'הובלמשכ' else w}:
            if len(x) >= 3 and x not in STOP: out.add(x[:4])
    return out
def overlap(q, unit_text):
    return words(q['q'] + ' ' + q['a'][q['c']]) & words(unit_text)
