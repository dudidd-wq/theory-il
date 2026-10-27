"""Writes tools/coverage/nosource_ba.json and docs/NO_SOURCE_B_A.md: every class B / A pool question that is still
not taught, with the search done and why it failed. Groups carry the shared search; 'note' adds per-question detail.
Run after tools/coverage.py; the data test checks that this list equals the untaught B/A set."""
import json, os
R = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
P = lambda p: os.path.join(R, p)
BASE = ('regex search of the pinned Transport Regulations and Traffic Ordinance (tools/law/law.json), the pinned sign table '
        '(lotam, 2022), all pinned official pages (20 since v1.7.0, including the approved Ministry of Environmental Protection carbon-monoxide page; RSA/gov.il safety pages, RSA safety-rules book 03.2026, RSA/MOT textbook (fully re-searched question by question for v1.8.0) '
        '2017 prose, Ministry of Education traffic-education topic 18 prose; since v1.12 also topics 7, 13, 17 and 21 and the Road Accident Victims Compensation Law s.1). '
        'An earlier note said MoE topics s02/s04/s05/s07/s14 return 404: that was wrong – they are available (s14 via the Wayback copy of 04.07.2022); '
        'none of the remaining questions is answered by their prose')
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
 'conf': ('Bank answer contradicts the pinned law (v1.13)', BASE + '; the answer was compared with the pinned regulation',
          'the official bank answer contradicts the pinned law; neither is taught as the answer: the bank lesson shows the '
          'bank answer and, beside it, the law text (status "סתירה בין המאגר לחוק")'),
 'moto': ('Motorcycle riding technique', BASE + '; RSA book motorcycle section (pp. 30-31) and the RSA bikers page read; '
          'MOT motorcycle course on campus.gov.il timed out / returned only boilerplate, not citable; '
          'no official motorcycle textbook found',
          'no official state text teaches this riding technique; not written from general knowledge'),
}
Q = {
 'law': {520: 'urban-area guide sign: meaning not stated in the sign table entries or any rule (v1.9 re-judgement; was gallery tile only)',
         1307: 'city-centre guide sign: not in the sign table used, no rule (v1.9 re-judgement; was gallery tile only)',
         92: 'licence not valid > 1 year needs tests: no such provision in pinned TR 173/174/196/203 or TO; TR 172א is marked "(בוטלה)" (cancelled) in the pinned text. Bank answer may be outdated vs current law – not cited',
         281: 'tunnel 50 m before/after: TR 47 and textbook p54 ban overtaking only on a bridge or inside a tunnel, no 50 m; TR 47(ה)(6) is marked "(נמחקה)" (deleted) in the pinned text. Bank answer may be outdated vs current law – not cited',
         273: 'LPG parking: refers to Ministry of Environmental Protection guidance, not in the pinned sources',
         1500: 'third-party property insurance: the Motor Vehicle Insurance Ordinance covers bodily injury only. Candidates for Dudi: Knesset Research Center paper (fs.knesset.gov.il, 2024) and the standard-policy regulations (תקנות הפיקוח על עסקי ביטוח (תנאי חוזה לביטוח רכב פרטי), part B), not pinned',
         1730: '"pressure exhaust" ban: TR 318 regulates the exhaust system but has no such ban',
         1778: 'what the annual test records: not in the pinned regulations',
         1688: 'new driver convicted of driving without a companion: not stated in TO 12א/12א1/12א2 or schedule 3 (v1.13 re-judgement; was partial via a related rule)'},
 'pic': {i: '' for i in (699, 708, 728, 878, 885, 896, 898, 909, 911, 914, 923, 931, 942, 944, 948, 953, 954,
                         955, 958, 968, 980)},  # v1.17: 955 (lanes merging from both sides) lost its only unit, an uncited example;  # v1.11 (review #8): 978 now taught (sign 702 + light sequence), 985 partial (keep right),
 'veh': {830: 'hybrid car', 1064: 'GPS distraction (v1.14: was partial via lesson-body prose)', 886: 'hybrid fuel use', 1065: 'GPS', 1076: 'panoramic mirror', 1699: 'panoramic mirror',
         1765: 'head restraint height (textbook p133 says set it at the height of the centre of the skull, which conflicts with the bank answer)',
         1016: 'engine and safety', 1020: 'fast indicator blink', 1037: 'fire extinguisher replacement',
         1041: 'fuel economy', 1059: 'fuel economy', 1287: 'fuel economy', 1042: 'exhaust pollution maintenance',
         1066: 'jack position', 742: 'kick-down', 1290: 'manual vs automatic difference',
         1021: 'replacement bulb choice: official prose only says service per manufacturer instructions (v1.13 re-judgement; was partial)'},
 'edu': {1048: 'steering wear on front tyres', 1068: 'pressure gauge', 1069: 'fuel light', 1562: 'parking-brake light (only listed)'},
 'conf': {13: '"טרקטור משא": bank answer 1,500 kg; TR 1 says 1,800 kg (v1.13, review #9 D4)',
          333: 'minimum age for B: bank answer 17 years; TO s.12 says 16 years and 9 months (v1.14, review #10 N6)',
          330: 'B trailer: bank answer trailer up to 1,500 kg; TR 180(ב) sets 5,000 kg for the combination (v1.14)',
          91: 'B special medical vehicle: bank answer up to 4,000 kg; TR 180(א)(5) says 5,000 kg (v1.14)'},
 'drv': {778: 'pedestrians near junction', 257: 'aborting an overtake (v1.14: was partial via lesson-body prose)',
         611: 'wet road: textbook p.101 names a skid hazard only, not roll-over growing with speed (v1.14: was partial)',
         964: 'yellow temporary sign is binding: not stated in the law or sign table (v1.14: was partial via lesson-body prose)', 869: 'knowing the cockpit',
         1183: 'approaching a cyclist',
         1296: 'daytime lights when the sun is behind'},
 'moto': {1588: 'side stand', 1631: 'mirror + shoulder check ending an overtake (v1.14: was partial via lesson-body prose)', 1609: 'hazard detection',
          1614: 'gaze in a turn',
          1619: 'oily patch in a turn', 1620: 'avoiding an obstacle', 1626: 'safety space responsibility',
          1629: 'foot brake fails (edu 18 car prose says use the parking brake – conflicts)', 1639: 'lane splitting',
          1654: 'lean angle and headlight',
          1659: 'riding two-up', 1663: 'obstacle', 1670: 'brake-pad wear mark'},
}
def main():
    qs = {q['id']: q for q in json.load(open(P('data/q.he.json')))}
    out = {'v': 1, 'groups': {k: {'title': g[0], 'search': g[1], 'why': g[2]} for k, g in G.items()}, 'q': {}}
    for g, m in Q.items():
        for i, n in m.items():
            assert str(i) not in out['q'], i
            out['q'][str(i)] = {'g': g, 'note': n, 'cls': ''.join(c for c in ('B', 'A') if c in qs[i]['t'])}
    json.dump(out, open(P('tools/coverage/nosource_ba.json'), 'w'), ensure_ascii=False, indent=1)
    BL = {i: l['id'] for l in json.load(open(P('data/lessons.json')))['lessons'] for i in l.get('bank', [])}
    L = ['# B / A questions still without an official source', '',
         'Generated by `tools/coverage/nosource_build.py`. Each question below has **no explanation** in the lessons, because a genuine '
         'search of official state sources did not find a citable passage. None of them was written from general knowledge. '
         'Nevo, commercial theory books, other apps, ask.ralbad.org.il, the training_kit PDF and third-party mirrors were not used.', '',
         'Since v1.10.0 each one is shown in a bank-only lesson ("מהמאגר הרשמי", column *bank lesson*): the official question and its '
         'correct answer exactly as published in the data.gov.il bank (CC BY), labelled as having no official explanation or legal '
         'source, with no explanation written by us. Coverage reports them separately as "taught from the official bank only, no '
         'official explanation", never as taught with a source.', '',
         f'Total: {len(out["q"])} questions.', '']
    for g, (t, s, w) in G.items():
        ids = [i for i in out['q'] if out['q'][i]['g'] == g]
        L += [f'## {t} ({len(ids)})', '', f'**Search done:** {s}.', '', f'**Why it failed:** {w}.', '',
              '| id | class | question | note | bank lesson |', '|---|---|---|---|---|']
        for i in ids:
            q = qs[int(i)]
            L.append(f"| {i} | {out['q'][i]['cls']} | {q['q'][:90].replace('|', '/')} | {out['q'][i]['note']} | `{BL.get(int(i), '–')}` |")
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
            M.append(f"| {i} | {cl} | no official source; question and answer shown as published in `{BL.get(i, '–')}` | see NO_SOURCE_B_A.md |")
        else:
            M.append(f"| {i} | {cl} | {st[v[0]]} | " + '; '.join(f'{title.get(l, l)} (`{l}`)' for l in v[1]) + ' |')
    open(P('docs/LESSON_MAP_B_A.md'), 'w').write('\n'.join(M) + '\n')
    print('nosource', len(out['q']), 'map', n)
if __name__ == "__main__":
    main()
