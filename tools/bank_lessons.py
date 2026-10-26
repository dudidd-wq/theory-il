"""v1.10: "מהמאגר הרשמי" lessons. Every bank question with no official state source (full.json verdict none, src S)
is shown in one of these lessons: the official question and its correct answer exactly as published in the
data.gov.il bank (CC BY), with a visible label that there is no official explanation or legal source.
Nothing here is an explanation: the lessons carry no rules, body, examples or recap. The only extra text is
BANK_NOTES: a factual, cited statement where the official textbook says something different from the bank."""
import importlib.util, json, os
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_s = importlib.util.spec_from_file_location('nosource_build', os.path.join(R, 'tools/coverage/nosource_build.py'))
NS = importlib.util.module_from_spec(_s); _s.loader.exec_module(NS)

# group → (lesson title suffix, icon); 'edu' (vehicle facts only in a practice question) is shown with the vehicle group
GROUPS = {'law': ('חוק ותקנות', 'book'), 'pic': ('תמונות ומצבי דרך', 'mirror'), 'veh': ('הרכב, מחוונים ותחזוקה', 'gauge'),
          'drv': ('טכניקת נהיגה', 'gap'), 'moto': ('רכיבה על אופנוע', 'info'), 'heavy': ('רכב כבד וציבורי', 'bus'),
          'trac': ('טרקטור', 'info')}
MERGE = {'edu': 'veh', 'conf': 'law'}
SUB = 'השאלה והתשובה הנכונה כפי שפורסמו במאגר הרשמי – אין להן הסבר רשמי או מקור חוקי'
# qid → (text, source, checks): the official textbook differs from the bank answer (stated, not explained)
BANK_NOTES = {
    1765: ('בספר הלימוד הרשמי, בפרק "משענת ראש" ותרומתה לבטיחות הנוסעים, כתוב שאפשר לכוון את משענת הראש "כך שתהיה בגובה מרכז '
           'הגולגולת". תשובת המאגר שונה: השפה העליונה של המשענת בקו אחד עם הקצה העליון של ראש הנהג.',
           'OFF:textbook', ['ואפשר לכוונה כך שתהיה בגובה מרכז הגולגולת']),
    # Q13 (v1.13, status 'סתירה בין המאגר לחוק'): its TR 1 note is in lessons_spec NOTES (shown beside the bank answer)
}

def nosource_ids(QS):
    """bank questions judged 'none' with no official state source (final verdicts written by tools/coverage.py;
    bank lessons never change a verdict, so the second lessons.py pass in build.sh reads the current ones)"""
    F = json.load(open(os.path.join(R, 'data/coverage_full.json')))['q']
    return sorted(int(k) for k, e in F.items() if e['v'] == 'none' and e.get('src') in ('S', 'X') and int(k) in QS)

def group_of(q):
    for g, m in NS.Q.items():
        if q['id'] in m: return MERGE.get(g, g)
    if set(q['t']) == {'1'}: return 'trac'
    return 'law' if q['k'] in ('law', 'signs') else 'heavy'

def build(QS):
    ids = nosource_ids(QS)
    by = {}
    for i in ids: by.setdefault(group_of(QS[i]), []).append(i)
    order = ['law', 'pic', 'veh', 'drv', 'moto', 'heavy', 'trac']
    out = []
    for g in order:
        if g not in by: continue
        qs = sorted(by[g]); cls = [c for c in ('B', 'A', 'C1', 'C', 'D', '1') if any(c in QS[i]['t'] for i in qs)]
        title, ic = GROUPS[g]
        out.append({'id': 'bank_' + g, 'cls': cls, 'icon': ic, 'title': 'מהמאגר הרשמי: ' + title, 'sub': SUB,
                    'body': [], 'rules': [], 'mnem': [], 'viz': [], 'gal': [], 'ex': [], 'recap': [],
                    'quiz': qs, 'bank': qs, 'quiz_min': 1})
    assert sorted(i for l in out for i in l['bank']) == ids
    return out, ids
