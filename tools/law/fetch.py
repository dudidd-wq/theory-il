#!/usr/bin/env python3
"""Fetch the law texts used by the lessons (public domain in Israel: Copyright Act 2007 §6 – laws and regulations have no copyright).
Source: Hebrew Wikisource "ספר החוקים הפתוח" via the MediaWiki API (pinned revision ids in revs.json; run from tools/law, then parse.py → law.json, which is committed).
Also downloads the official sign table (לוח התמרורים, gov.il PDF) – run with --lotam (needs a browser-like client; gov.il blocks plain curl)."""
import json, urllib.request, urllib.parse
PAGES = {'TR': 'תקנות_התעבורה', 'TO': 'פקודת_התעבורה'}
REVS = json.load(open('revs.json', encoding='utf-8')) if __import__('os').path.exists('revs.json') else {}
def get(title, oldid=None):
    # v1.15 (review #11 T1): fetch the PINNED revision from revs.json, not whatever is current; --latest re-pins
    u = 'https://he.wikisource.org/w/api.php?action=parse&format=json&prop=wikitext|revid&' + (f'oldid={oldid}' if oldid else 'page=' + urllib.parse.quote(title))
    d = json.load(urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': 'theory-il-builder/1.1 (static study app)'}), timeout=60))['parse']
    return d['revid'], d['wikitext']['*']
if __name__ == '__main__':
    import sys; latest = '--latest' in sys.argv; meta = {}
    for k, t in PAGES.items():
        rev, txt = get(t, None if latest else REVS.get(k, {}).get('revid'))
        if not latest and REVS.get(k) and rev != REVS[k]['revid']: sys.exit(f'{k}: got revision {rev}, pinned {REVS[k]["revid"]}'); open(f'{t}.txt', 'w').write(txt); meta[k] = {'title': t.replace('_', ' '), 'revid': rev}
        print(k, rev, len(txt))
    json.dump(meta, open('revs.json', 'w'), ensure_ascii=False)
