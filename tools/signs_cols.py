#!/usr/bin/env python3
"""Read the last column ("4. כוחו יפה" / "4. מיועד ל") of the לות"ם table from the pinned gov.il PDF by word position
(pdftotext -bbox), so signs.json can keep the table's columns apart (review #15 D2: the linear text ran the meaning
and the force column into one sentence). Output tools/signs/lt_cols.json = {lines: [[pdf page, label, line], ...]} in reading order.
Usage: python3 tools/signs_cols.py /path/to/lotam.pdf   (the file must match the sha256 pinned in tools/law/lotam.json)"""
import json, re, os, sys, hashlib, subprocess, collections
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'tools/signs/lt_cols.json')

def vis(x):   # pdftotext gives Hebrew in visual order: reverse the word, but keep digit runs in their own order
    return re.sub(r'\d[\d.,:]*\d|\d', lambda m: m[0][::-1], x[::-1])   # ("17:00" too)

def words(p):
    un = lambda x: x.replace('&quot;', '"').replace('&apos;', "'").replace('&amp;', '&')
    return [(float(a), float(b), float(c), vis(un(x))) for a, b, c, x in
            re.findall(r'<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="[\d.]+">([^<]*)</word>', p)]

def main(pdf):
    pin = json.load(open(os.path.join(ROOT, 'tools/law/lotam.json')))['sha256']
    assert hashlib.sha256(open(pdf, 'rb').read()).hexdigest() == pin, 'not the pinned PDF'
    html = subprocess.run(['pdftotext', '-bbox', pdf, '-'], capture_output=True, text=True).stdout
    out, fx, lab = [], None, None
    for pg, p in enumerate(html.split('<page ')[1:], 1):
        if pg < 7 or pg > 92: continue            # table pages (93–94 are the update notes)
        W = words(p); rows = collections.defaultdict(list)
        for w in W: rows[round(w[1])].append(w)
        H = []                                     # header rows: (y, right edge of column 4 or None, label)
        for y, ws in sorted(rows.items()):
            t = [w[3] for w in ws]
            if {'פירושו', 'מספרו'} & set(t) or {'צורת', 'וצבעו'} <= set(t):
                f = [w for w in ws if w[3] in ('כוחו', 'מיועד')]
                H.append((y, f[0][2] if f else None, ('כוחו יפה' if f[0][3] == 'כוחו' else 'מיועד ל') if f else None))
        lines = collections.defaultdict(list)
        for x0, y, x1, s in W:
            if y > 570: continue                   # footer
            h = [x for x in H if x[0] <= y - 6]
            f, l = (h[-1][1], h[-1][2]) if h else (fx, lab)
            if f and x1 <= f + 5: lines[(round(y), l)].append((x1, s))
        if H: fx, lab = H[-1][1], H[-1][2]
        for (y, l) in sorted(lines):
            t = ' '.join(s for x, s in sorted(lines[(y, l)], reverse=True))
            if re.fullmatch(r'4 ?\.?|ל', t) or 'יפה:' in t or 'מיועד ל' in t and len(t) < 14: continue   # the column header itself
            out.append([pg, l, t])
    json.dump({ 'lines': out}, open(OUT, 'w'), ensure_ascii=False, indent=0)
    print('lines', len(out))

if __name__ == '__main__':
    main(sys.argv[1])
