"""Writes tools/coverage/nosource_ba.json and docs/NO_SOURCE_B_A.md: every class B / A pool question that is still
not taught, with the search done and why it failed. Groups carry the shared search; 'note' adds per-question detail.
Run after tools/coverage.py; the data test checks that this list equals the untaught B/A set."""
import json, os
R = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
P = lambda p: os.path.join(R, p)
BASE = ('regex search of the pinned Transport Regulations and Traffic Ordinance (tools/law/law.json), the pinned sign table '
        '(lotam, 2022), all pinned official pages (20 since v1.7.0, including the approved Ministry of Environmental Protection carbon-monoxide page; RSA/gov.il safety pages, RSA safety-rules book 03.2026, RSA/MOT textbook (fully re-searched question by question for v1.8.0) '
        '2017 prose, Ministry of Education traffic-education topic 18 prose); MoE topics s02/s04/s05/s07/s14 return 404')
G = {
 'law': ('No provision in the pinned law', BASE + '; law grep for the key terms of the answer',
         'the answer states a legal rule that the pinned revisions do not contain (or contain only for another case); '
         'teaching it would need an unpinned or newer text'),
 'pic': ('Picture / scene judgement', BASE + '; the scene was compared with the taught rules',
         'the answer depends on reading a specific photo or diagram; no official text describes this scene, and the '
         'general rule alone does not give the answer'),
 'veh': ('Vehicle technology and maintenance', BASE + '; textbook pages 16, 124, 127, 141 and edu topic 18 read in full',
         'official prose does not state this fact (only manuals / commercial theory books do); not written from general knowledge'),
 'edu': ('Only in a practice question', BASE + '; found only inside edu topic 18 or textbook sample-exam questions',
         'the answer appears only in an official practice question; the source rule forbids citing practice questions'),
 'drv': ('Driving technique / defensive driving', BASE + '; RSA book and textbook defensive-driving chapters read',
         'official prose covers the topic but not the specific claim the answer makes'),
 'moto': ('Motorcycle riding technique', BASE + '; RSA book motorcycle section (pp. 30-31) and the RSA bikers page read; '
          'MOT motorcycle course on campus.gov.il timed out / returned only boilerplate, not citable; '
          'no official motorcycle textbook found',
          'no official state text teaches this riding technique; not written from general knowledge'),
}
Q = {
 'law': {92: 'licence not valid > 1 year needs tests: no such provision in pinned TR 173/174/196/203 or TO',
         281: 'tunnel 50 m before/after: TR 47 and textbook p54 ban overtaking only on a bridge or inside a tunnel, no 50 m',
         273: 'LPG parking: refers to Ministry of Environmental Protection guidance, not in the pinned sources',
         302: 'beer counts as alcohol: OFF:drunk says any alcohol impairs but never names beer',
         1500: 'third-party property insurance: the Motor Vehicle Insurance Ordinance covers bodily injury only. Candidates for Dudi: Knesset Research Center paper (fs.knesset.gov.il, 2024) and the standard-policy regulations (תקנות הפיקוח על עסקי ביטוח (תנאי חוזה לביטוח רכב פרטי), part B), not pinned',
         1723: 'definition of a road accident: in the Road Accident Victims Compensation Law, not pinned',
         1730: '"pressure exhaust" ban: TR 318 regulates the exhaust system but has no such ban',
         1778: 'what the annual test records: not in the pinned regulations'},
 'pic': {i: '' for i in (699, 708, 728, 878, 885, 896, 898, 909, 911, 914, 923, 931, 942, 944, 948, 953, 954,
                         958, 968, 978, 980, 985)},
 'veh': {830: 'hybrid car', 886: 'hybrid fuel use', 1065: 'GPS', 1076: 'panoramic mirror', 1699: 'panoramic mirror',
         1765: 'head restraint height (textbook p133 says set it at the height of the centre of the skull, which conflicts with the bank answer)',
         1016: 'engine and safety', 1020: 'fast indicator blink', 1037: 'fire extinguisher replacement',
         1041: 'fuel economy', 1059: 'fuel economy', 1287: 'fuel economy', 1042: 'exhaust pollution maintenance',
         1066: 'jack position', 742: 'kick-down', 1290: 'manual vs automatic difference'},
 'edu': {1048: 'steering wear on front tyres', 1068: 'pressure gauge', 1069: 'fuel light', 1562: 'parking-brake light (only listed)'},
 'drv': {778: 'pedestrians near junction', 869: 'knowing the cockpit',
         1006: 'flooded road – low gear (textbook only has a photo caption)', 1183: 'approaching a cyclist',
         1296: 'daytime lights when the sun is behind'},
 'moto': {1588: 'side stand', 1596: 'separate brakes', 1599: 'helmet field of view', 1609: 'hazard detection',
          1614: 'gaze in a turn', 1615: 'why lean (textbook defines centrifugal force only for cars)', 1616: 'lean into the turn',
          1619: 'oily patch in a turn', 1620: 'avoiding an obstacle', 1626: 'safety space responsibility',
          1629: 'foot brake fails (edu 18 car prose says use the parking brake – conflicts)', 1639: 'lane splitting',
          1653: 'night riding', 1654: 'lean angle and headlight', 1655: 'scratched visor at night', 1657: 'visor in rain',
          1659: 'riding two-up', 1661: 'correct braking', 1663: 'obstacle', 1670: 'brake-pad wear mark'},
}
def main():
    qs = {q['id']: q for q in json.load(open(P('data/q.he.json')))}
    out = {'v': 1, 'groups': {k: {'title': g[0], 'search': g[1], 'why': g[2]} for k, g in G.items()}, 'q': {}}
    for g, m in Q.items():
        for i, n in m.items():
            assert str(i) not in out['q'], i
            out['q'][str(i)] = {'g': g, 'note': n, 'cls': ''.join(c for c in ('B', 'A') if c in qs[i]['t'])}
    json.dump(out, open(P('tools/coverage/nosource_ba.json'), 'w'), ensure_ascii=False, indent=1)
    L = ['# B / A questions still without an official source', '',
         'Generated by `tools/coverage/nosource_build.py`. Each question below is **not taught** in the lessons, because a genuine '
         'search of official state sources did not find a citable passage. None of them was written from general knowledge. '
         'Nevo, commercial theory books, other apps, ask.ralbad.org.il, the training_kit PDF and third-party mirrors were not used.', '',
         f'Total: {len(out["q"])} questions.', '']
    for g, (t, s, w) in G.items():
        ids = [i for i in out['q'] if out['q'][i]['g'] == g]
        L += [f'## {t} ({len(ids)})', '', f'**Search done:** {s}.', '', f'**Why it failed:** {w}.', '',
              '| id | class | question | note |', '|---|---|---|---|']
        for i in ids:
            q = qs[int(i)]
            L.append(f"| {i} | {out['q'][i]['cls']} | {q['q'][:90].replace('|', '/')} | {out['q'][i]['note']} |")
        L.append('')
    open(P('docs/NO_SOURCE_B_A.md'), 'w').write('\n'.join(L))
    cov = json.load(open(P('data/coverage.json')))['q']
    LS = json.load(open(P('data/lessons.json')))
    LS = LS['lessons'] if isinstance(LS, dict) else LS
    title = {l['id']: l['title'] for l in LS}
    st = {'f': 'taught', 'w': 'partly taught'}
    M = ['# Lesson map for classes B and A', '', 'Generated by `tools/coverage/nosource_build.py` from data/coverage.json. '
         'Every B or A pool question shows the lesson(s) that teach it, or points to docs/NO_SOURCE_B_A.md.', '',
         '| id | class | status | lesson(s) |', '|---|---|---|---|']
    n = 0
    for i, q in sorted(qs.items()):
        cl = ''.join(c for c in ('B', 'A') if c in q['t'])
        if not cl: continue
        v = cov[str(i)]; n += 1
        if v[0] == 'n' or str(i) in out['q']:
            assert str(i) in out['q'], i
            M.append(f'| {i} | {cl} | no official source | see NO_SOURCE_B_A.md |')
        else:
            M.append(f"| {i} | {cl} | {st[v[0]]} | " + '; '.join(f'{title.get(l, l)} (`{l}`)' for l in v[1]) + ' |')
    open(P('docs/LESSON_MAP_B_A.md'), 'w').write('\n'.join(M) + '\n')
    print('nosource', len(out['q']), 'map', n)
main()
