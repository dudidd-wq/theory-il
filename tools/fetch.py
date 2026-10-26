#!/usr/bin/env python3
"""Fetch official CC BY theory-question banks from data.gov.il (CKAN datastore API) into data/raw/.
Only datasets whose CKAN licence_id is 'cc-by' are fetched; 'other-open' banks (Arabic, A3) are skipped on purpose."""
import json, urllib.request, hashlib, sys, os, datetime
UA = {'User-Agent': 'Mozilla/5.0 theory-il-build'}
API = 'https://data.gov.il/api/3/action/'
SETS = {'he': 'tqhe', 'en': 'tqen', 'ru': 'tqru', 'fr': 'tqfr', 'es': 'tqes'}
def get(url):
    return json.load(urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60))
os.makedirs('data/raw', exist_ok=True)
meta = {}
for lang, ds in SETS.items():
    p = get(API + 'package_show?id=' + ds)['result']
    if p.get('license_id') != 'cc-by':
        print('SKIP (licence not cc-by):', ds, p.get('license_id')); continue
    res = [r for r in p['resources'] if r.get('datastore_active')][0]
    d = get(API + f"datastore_search?resource_id={res['id']}&limit=5000")['result']
    body = json.dumps(d['records'], ensure_ascii=False)
    open(f'data/raw/{ds}.json', 'w', encoding='utf-8').write(body)
    meta[lang] = {'dataset': ds, 'title': p.get('title'), 'datasetId': p['id'], 'resourceId': res['id'], 'licence': p['license_id'],
                  'licenceTitle': p.get('license_title'), 'org': p.get('organization', {}).get('title'),
                  'resourceModified': res.get('last_modified'), 'metadataModified': p.get('metadata_modified'),
                  'records': len(d['records']), 'sha256': hashlib.sha256(body.encode()).hexdigest(),
                  'fetched': datetime.datetime.utcnow().strftime('%Y-%m-%dT%H:%MZ'),
                  'url': f"https://data.gov.il/dataset/{p['name']}"}
    print(lang, ds, len(d['records']), res.get('last_modified'))
json.dump(meta, open('data/raw/meta.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
