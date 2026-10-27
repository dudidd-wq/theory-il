#!/usr/bin/env python3
"""v1.15/v1.16 (review #11 T1, #12 T1b): rebuild the gitignored official cache (tools/official/cache/) from the official URLs
so that `pin.py --verify` and data_test's passage checks work from a clean clone.
gov.il terms allow quotation, not republishing whole pages, so full texts are never committed (only the Compensation Law
API JSON is). Every page listed in pages.json is rebuilt and checked against its committed sha256 (and pdf_sha256):
  - PDFs (textbook, safety-rules book, MoE topics): downloaded once each with urllib; texts regenerated with pdftotext
    exactly as pinned (textbook: per page, bidi marks removed; book: whole file; MoE: whole file, last form feed dropped);
  - gov.il / kids.gov.il HTML pages: opened once each in a headed Chrome (fetch_html.js under xvfb-run – gov.il blocks
    headless and scripted clients); the rendered text is kept as <stem>.txt and the article body as <stem>.body;
  - the Compensation Law body comes from the committed revision JSON (no network).
A file that already exists with the pinned hash is reused (no request). Nothing is written for a page whose rebuilt
hash differs from the pin; the script exits non-zero and lists those pages.
usage: fetch_cache.py            rebuild everything missing (network: one request per missing page)
       fetch_cache.py --offline  only rebuild what can be built from files already in the cache"""
import hashlib, json, os, re, shutil, subprocess, sys, tempfile, time, urllib.request
HERE = os.path.dirname(os.path.abspath(__file__)); CACHE = os.path.join(HERE, 'cache')
PAGES = json.load(open(os.path.join(HERE, 'pages.json'), encoding='utf-8'))
sys.path.insert(0, HERE); import pin   # pid -> (url, title, file stem, quotes); PDFS
STEM = {pid: v[2] for pid, v in pin.P.items()}; STEM['terms'] = pin.TERMS['file']
BIDI = re.compile('[\u200e\u200f\u202a-\u202e\u2066-\u2069]')
UA = {'User-Agent': 'Mozilla/5.0 (theory-il cache rebuild)'}
sha = lambda s: hashlib.sha256(s.encode() if isinstance(s, str) else s).hexdigest()
C = lambda f: os.path.join(CACHE, f)

def pages(pdf):
    n = int(re.search(r'Pages:\s+(\d+)', subprocess.run(['pdfinfo', pdf], capture_output=True, text=True).stdout).group(1))
    P = [BIDI.sub('', subprocess.run(['pdftotext', '-f', str(i), '-l', str(i), pdf, '-'], capture_output=True, text=True).stdout) for i in range(1, n + 1)]
    return [re.sub(r'[ \t]+', ' ', t[:-1] if t.endswith('\f') else t) for t in P]
def pdf_text(stem, pdf):
    if stem == 'textbook': return '\f'.join(pages(pdf))
    w = BIDI.sub('', subprocess.run(['pdftotext', pdf, '-'], capture_output=True, text=True).stdout)
    return w if stem == 'book' else (w[:-1] if w.endswith('\f') else w)
def body(stem, t):
    """The article body inside the rendered page text, as pinned."""
    if stem == 'kids_co':
        i = t.index('תחבורה וזיהום אויר\n') + len('תחבורה וזיהום אויר\n'); e = t.index('\nתנאי שימוש', i)
        return '\n'.join(l.strip() for l in t[i:e].split('\n') if l.strip())
    s = t.split('שתפו:\n', 1)[1]
    return s[:s.index('\nמידע שימושי')].strip()

def main():
    off = '--offline' in sys.argv; os.makedirs(CACHE, exist_ok=True); bad, html, done = [], [], []
    for pid, rec in PAGES.items():
        stem = STEM[pid]; out = C(stem + ('.txt' if stem in pin.PDFS else '.body'))
        if os.path.exists(out) and sha(open(out, encoding='utf-8').read()) == rec['sha256']: done.append(pid); continue
        if pid == 'pitzuim':
            j = json.loads(open(C('pitzuim_rev2968550.json'), 'rb').read())
            t = j['query']['pages']['322734']['revisions'][0]['slots']['main']['*']
            if sha(t) != rec['sha256']: bad.append(pid); continue
            open(out, 'w', encoding='utf-8').write(t); done.append(pid); continue
        if stem in pin.PDFS:
            pdf = C(pin.PDFS[stem][0])
            if not (os.path.exists(pdf) and sha(open(pdf, 'rb').read()) == rec['pdf_sha256']):
                if off: bad.append(pid + ' (PDF missing; run without --offline)'); continue
                data = urllib.request.urlopen(urllib.request.Request(rec['url'], headers=UA), timeout=180).read(); time.sleep(1)
                if sha(data) != rec['pdf_sha256']: bad.append(pid + ' (downloaded PDF differs from pdf_sha256)'); continue
                open(pdf, 'wb').write(data)
            t = pdf_text(stem, pdf)
            if sha(t) != rec['sha256']: bad.append(pid + ' (text differs from sha256)'); continue
            open(out, 'w', encoding='utf-8').write(t)
            if stem == 'textbook': json.dump(t.split('\f'), open(C('textbook_pages.json'), 'w', encoding='utf-8'), ensure_ascii=False)
            done.append(pid); continue
        html.append((pid, stem, rec))
    # HTML pages: reuse a cached rendered text if it still yields the pinned body, else open the page once
    need = [(pid, stem, rec) for pid, stem, rec in html
            if not (os.path.exists(C(stem + '.txt')) and _try(stem, open(C(stem + '.txt'), encoding='utf-8').read(), rec))]
    if need and not off:
        tmp = tempfile.mkdtemp(prefix='fc_')
        cmd = ['node', os.path.join(HERE, 'fetch_html.js'), tmp] + [f"{stem}={rec['url']}" for _, stem, rec in need]
        if not os.environ.get('DISPLAY') or shutil.which('xvfb-run'): cmd = ['xvfb-run', '-a'] + cmd
        subprocess.run(cmd, timeout=60 + 40 * len(need))
        for pid, stem, rec in need:
            f = os.path.join(tmp, stem + '.txt')
            if os.path.exists(f): shutil.copy(f, C(stem + '.txt'))
        shutil.rmtree(tmp, ignore_errors=True)
    for pid, stem, rec in html:
        t = open(C(stem + '.txt'), encoding='utf-8').read() if os.path.exists(C(stem + '.txt')) else ''
        if _try(stem, t, rec): open(C(stem + '.body'), 'w', encoding='utf-8').write(body(stem, t)); done.append(pid)
        else: bad.append(pid + (' (not fetched)' if not t else ' (page text no longer yields the pinned body: the page changed or was blocked)'))
    print(f'fetch_cache: {len(done)}/{len(PAGES)} pages match their pinned sha256')
    if bad: sys.exit('not rebuilt: ' + '; '.join(bad))
def _try(stem, t, rec):
    try: return sha(body(stem, t)) == rec['sha256']
    except (ValueError, IndexError): return False
if __name__ == '__main__': main()
