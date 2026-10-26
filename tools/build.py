#!/usr/bin/env python3
"""Normalise the official banks (data/raw) into compact app data (data/*.json) + local images (img/q).
Keeps official wording and question numbers; strips all HTML/scripts; fixes the Cyrillic 'В' licence tag and mojibake.
Translations are included per question ONLY when they match the Hebrew master: same id, 4 answers, exactly one marked correct, same image key,
AND they pass a cross-language consistency gate (the source banks are not guaranteed to be id-aligned, and ru/es are 2019 versions):
the numbers in the question and in the correct answer must match the Hebrew ones, and question / correct-answer length ratios must be
within a band around the language's median ratio. Translations shuffle answer order, so the correct POSITION is not compared;
the app always grades with the Hebrew master's correct answer mapped by the translation's own marked answer."""
import json, re, html, os, sys, hashlib, urllib.request, io, collections, datetime, statistics
from PIL import Image
RAW, OUT, IMG = 'data/raw', 'data', 'img/q'
TAGS = {'В': 'B', 'B': 'B', 'A': 'A', 'C1': 'C1', 'C': 'C', 'D': 'D', '1': '1'}   # 'В' = Cyrillic Ve used by the source for class B
CAT = {'חוקי התנועה': 'law', 'בטיחות': 'safety', 'תמרורים': 'signs', 'הכרת הרכב': 'vehicle'}
meta = json.load(open(f'{RAW}/meta.json'))
def fixmoji(s):
    try: return s.encode('latin1').decode('utf-8') if re.search('[ÃÂ][\x80-\xbf]', s) else s
    except Exception: return s
def text(s):
    s = re.sub(r'<br\s*/?>', ' ', s or ''); s = re.sub(r'<[^>]+>', '', s); s = html.unescape(s)
    s = fixmoji(s).replace('\xa0', ' '); return re.sub(r'\s+', ' ', s).strip()
def parse(r):
    m = re.match(r'\s*(\d+)\s*\.\s*(.*)', r['title2'] or '', re.S)
    qid, q = int(m.group(1)), text(m.group(2))
    d = r['description4'] or ''
    ul = re.search(r'<ul>(.*?)</ul>', d, re.S).group(1)
    lis = re.findall(r'<li>(.*?)</li>', ul, re.S)
    ans = [text(x) for x in lis]
    corr = [i for i, x in enumerate(lis) if re.search(r'id="correctAnswer\d+"', x)]
    imgtag = re.search(r'<img[^>]*>', d)
    src = imgtag and re.search(r'src="?([^"\s>]*)', imgtag.group(0))   # one source record lacks the opening quote
    key = src and re.search(r'(?:TQ_PIC_|/)(\d{3,6})\.jpe?g$', src.group(1), re.I)
    tagspan = re.search(r'\|\s*((?:«[^»]{1,3}»\s*\|\s*)+)', d)
    tags = sorted({TAGS[t] for t in re.findall(r'«([^»]{1,3})»', tagspan.group(1)) if t in TAGS}) if tagspan else []
    return dict(id=qid, q=q, a=ans, c=corr[0] if len(corr) == 1 else None, img=src.group(1) if key else None, key=key.group(1) if key else None, brokenimg=bool(imgtag) and not key, tags=tags, cat=r['category'])
problems = collections.Counter(); log = []
def load(ds):
    out = {}
    for r in json.load(open(f'{RAW}/{ds}.json', encoding='utf-8')):
        try: p = parse(r)
        except Exception as e: problems[ds + ':parse'] += 1; continue
        out[p['id']] = p
    return out
he = load('tqhe')
master = []
for qid in sorted(he):
    p = he[qid]
    if len(p['a']) != 4 or p['c'] is None or not p['q'] or not all(p['a']) or not p['tags'] or p['cat'] not in CAT or p['brokenimg']:
        problems['he:excluded'] += 1; log.append(f'he {qid} excluded'); continue
    master.append(p)
# images -> local webp
os.makedirs(IMG, exist_ok=True)
imgmap = {}
for p in master:
    if not p['img']: continue
    if not p['img'].startswith('https://www.gov.il/BlobFolder/'): problems['img:foreign'] += 1; p['img'] = None; continue
    name = os.path.splitext(os.path.basename(p['img']))[0].lower() + '.webp'
    dst = f'{IMG}/{name}'
    if not os.path.exists(dst):
        try:
            b = urllib.request.urlopen(urllib.request.Request(p['img'], headers={'User-Agent': 'Mozilla/5.0'}), timeout=40).read()
            im = Image.open(io.BytesIO(b)).convert('RGB'); im.thumbnail((640, 640)); im.save(dst, 'WEBP', quality=80)
        except Exception as e: problems['img:fail'] += 1; log.append(f'img fail {p["id"]} {e}'); p['img'] = None; continue
    imgmap[p['img']] = name; p['img'] = name
data = [{'id': p['id'], 'k': CAT[p['cat']], 't': p['tags'], 'q': p['q'], 'a': p['a'], 'c': p['c'], **({'i': p['img']} if p['img'] else {})} for p in master]
ver = datetime.date.today().strftime('%Y%m%d')
json.dump(data, open(f'{OUT}/q.he.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
# translations
langs = {'he': {'count': len(data), **meta['he']}}
for lang, ds in [('en', 'tqen'), ('ru', 'tqru'), ('fr', 'tqfr'), ('es', 'tqes')]:
    if lang not in meta or meta[lang]['licence'] != 'cc-by': continue
    tr, ok = load(ds), {}
    def nums(s): return set(re.findall(r'\d+(?:\.\d+)?', s.replace(',', '')))
    pairs = [(he[p['id']], tr[p['id']]) for p in data if p['id'] in tr and tr[p['id']]['q']]
    med = statistics.median((len(t['q']) + 5) / (len(h['q']) + 5) for h, t in pairs)
    def gate(h, t):
        why = []
        if nums(h['a'][h['c']]) != nums(t['a'][t['c']]): why.append('numbers in correct answer differ')
        if nums(h['q']) != nums(t['q']): why.append('numbers in question differ')
        r = (len(t['q']) + 5) / (len(h['q']) + 5) / med
        if not 0.45 <= r <= 2.2: why.append(f'question length ratio {r:.2f}')
        r = (len(t['a'][t['c']]) + 5) / (len(h['a'][h['c']]) + 5) / med
        if not 0.4 <= r <= 2.5: why.append(f'correct-answer length ratio {r:.2f}')
        return why
    for p in data:
        t = tr.get(p['id'])
        if not t or len(t['a']) != 4 or t['c'] is None or not t['q'] or not all(t['a']) or t['key'] != he[p['id']]['key']:
            problems[f'{lang}:mismatch'] += 1; continue
        why = gate(he[p['id']], t)
        if why: problems[f'{lang}:gate'] += 1; log.append(f'{lang} {p["id"]} dropped: ' + '; '.join(why)); continue
        ok[p['id']] = [t['q'], t['a'], t['c']]
    json.dump(ok, open(f'{OUT}/q.{lang}.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    langs[lang] = {'count': len(ok), **meta[lang]}
counts = collections.Counter(t for p in data for t in p['t'])
manifest = {'version': ver, 'built': datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%MZ'), 'total': len(data), 'classes': dict(counts),
            'topics': dict(collections.Counter(p['k'] for p in data)), 'images': len(imgmap), 'langs': langs,
            'excluded': {'ar': 'tqar – licence on data.gov.il is "other-open", excluded until clarified', 'a3': 'A3 banks – licence "other-open", excluded until clarified', 'am': 'no Amharic bank for the main test on data.gov.il'},
            'problems': dict(problems), 'excludedQuestions': log}
json.dump(manifest, open(f'{OUT}/manifest.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
open('tools/build.log', 'w').write('\n'.join(log))
print(json.dumps({k: manifest[k] for k in ['total', 'classes', 'topics', 'images', 'problems']}, ensure_ascii=False), {l: v['count'] for l, v in langs.items()})
