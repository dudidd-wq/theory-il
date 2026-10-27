#!/usr/bin/env python3
"""v1.15 (review #11 T1): rebuild the gitignored official cache that data_test's textbook checks read.
gov.il terms allow quotation, not republishing whole pages, so the full texts are not committed; instead the
official PDFs are downloaded once from their pinned URLs (tools/official/pages.json), checked against the
committed pdf_sha256, and the page texts are regenerated exactly as the build used them.
usage: fetch_cache.py            download missing PDFs (one request each), verify sha256, rebuild texts
       fetch_cache.py --offline  only rebuild texts from PDFs already in the cache (no network)"""
import hashlib, json, os, re, subprocess, sys, urllib.request
HERE = os.path.dirname(os.path.abspath(__file__)); CACHE = os.path.join(HERE, 'cache')
PAGES = json.load(open(os.path.join(HERE, 'pages.json'), encoding='utf-8'))
FILES = {'textbook': 'textbook.pdf'}   # the cache files data_test reads (textbook.txt, textbook_pages.json)
BIDI = re.compile('[\u200e\u200f\u202a-\u202e\u2066-\u2069]')
def pages(pdf):
    n = int(re.search(r'Pages:\s+(\d+)', subprocess.run(['pdfinfo', pdf], capture_output=True, text=True).stdout).group(1))
    P = [BIDI.sub('', subprocess.run(['pdftotext', '-f', str(i), '-l', str(i), pdf, '-'], capture_output=True, text=True).stdout) for i in range(1, n + 1)]
    return [re.sub(r'[ \t]+', ' ', t[:-1] if t.endswith('\f') else t) for t in P]
if __name__ == '__main__':
    os.makedirs(CACHE, exist_ok=True); off = '--offline' in sys.argv
    for k, fn in FILES.items():
        p = os.path.join(CACHE, fn); rec = PAGES[k]
        if not os.path.exists(p):
            if off: sys.exit(f'{fn} missing (run without --offline to download it once from {rec["url"]})')
            req = urllib.request.Request(rec['url'], headers={'User-Agent': 'Mozilla/5.0 (theory-il cache rebuild)'})
            open(p, 'wb').write(urllib.request.urlopen(req, timeout=120).read())
        if hashlib.sha256(open(p, 'rb').read()).hexdigest() != rec['pdf_sha256']: sys.exit(f'{fn}: sha256 differs from the pinned pdf_sha256')
        P = pages(p); stem = fn[:-4]
        open(os.path.join(CACHE, stem + '.txt'), 'w', encoding='utf-8').write('\f'.join(P))
        json.dump(P, open(os.path.join(CACHE, stem + '_pages.json'), 'w', encoding='utf-8'), ensure_ascii=False)
        if hashlib.sha256(chr(12).join(P).encode()).hexdigest() != rec['sha256']: sys.exit(f'{k}: rebuilt text differs from the pinned sha256')
        print(f'{k}: {len(P)} pages, text sha256 {hashlib.sha256(chr(12).join(P).encode()).hexdigest()[:12]} (pinned {rec["sha256"][:12]})')
