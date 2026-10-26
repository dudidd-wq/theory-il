import re,json,sys
def parse(fn):
    t=open(fn).read(); secs={}; cur=None; buf=[]
    for line in t.split('\n'):
        m=re.match(r'\{\{ח:סעיף\*?\|([^|}]*)\|([^|}]*)',line)
        if m and 'עוגן=תוספת' in line:  # schedule item: key 'תוספתNפרטM' (anchor ת וספת_N_פרט_M)
            a=re.search(r'עוגן=תוספת (\d+) פרט (\S+?)\}\}',line)
            if cur and cur[0] not in secs: secs[cur[0]]={'title':cur[1],'text':clean('\n'.join(buf))}
            cur=(f'תוספת{a.group(1)}פרט{a.group(2)}' if a else m.group(1).strip(), f'תוספת {a.group(1)}, פרט {a.group(2)}' if a else ''); buf=[]
            continue
        if m:
            if cur and cur[0] not in secs: secs[cur[0]]={'title':cur[1],'text':clean('\n'.join(buf))}
            cur=(m.group(1).strip(),m.group(2).strip()); buf=[]
        elif cur: buf.append(line)
    if cur and cur[0] not in secs: secs[cur[0]]={'title':cur[1],'text':clean('\n'.join(buf))}
    return secs
def clean(s):
    # two-column rows {{טור לשמאל|label|value}} -> 'label – value' (tables of dimensions and weights)
    s=re.sub(r'\{\{טור לשמאל\|(?:יישור=[^|{}]*\|)?([^{}]*?)\|([^|{}]*)\}\}',lambda m:(m.group(1).rstrip(' –:')+' – '+m.group(2)).strip(' –'),s)
    s=re.sub(r'\{\{ח:(תת+|תתת+)\|?([^}]*)\}\}',lambda m:' '+m.group(2).replace('|',' ')+' ',s)
    s=re.sub(r'\{\{ח:פנימי\|[^|}]*\|([^}]*)\}\}',r'\1',s)
    s=re.sub(r'\{\{ח:חיצוני\|[^|}]*\|([^}]*)\}\}',r'\1',s)
    s=re.sub(r'\{\{ח:חיצוני\|([^}]*)\}\}',r'\1',s)
    s=re.sub(r'\{\{ח:הערה\|([^}]*)\}\}',r'(\1)',s)
    s=re.sub(r'\{\{[^}]*\}\}','',s); s=re.sub(r'<[^>]+>',' ',s); s=s.replace('&nbsp;',' ')
    s=re.sub(r'\[\[[^|\]]*\|([^\]]*)\]\]',r'\1',s); s=re.sub(r'\[\[([^\]]*)\]\]',r'\1',s)
    return re.sub(r'[ \t]+',' ',s).strip()
if __name__=='__main__':
    out={}
    for k,fn in [('TR','תקנות_התעבורה.txt'),('TO','פקודת_התעבורה.txt')]:
        out[k]=parse(fn); print(k,len(out[k]))
    out['_meta']=json.load(open('revs.json'))
    json.dump(out,open('law.json','w'),ensure_ascii=False)
