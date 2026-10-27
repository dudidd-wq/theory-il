import re,json,sys
def parse(fn):
    t=open(fn).read(); secs={}; cur=None; buf=[]
    for line in t.split('\n'):
        m=re.match(r'\{\{ח:סעיף\*?\|([^|}]*)\|([^|}]*)',line)
        if m and 'עוגן=תוספת' in line:  # schedule item: key 'תוספתNפרטM' (anchor ת וספת_N_פרט_M)
            a=re.search(r'עוגן=תוספת (\d+) פרט (\S+?)\}\}',line)
            if cur and cur[0] not in secs: secs[cur[0]]={'title':ttl(cur[1]),'text':clean('\n'.join(buf))}
            cur=(f'תוספת{a.group(1)}פרט{a.group(2)}' if a else m.group(1).strip(), f'תוספת {a.group(1)}, פרט {a.group(2)}' if a else ''); buf=[]
            continue
        if m:
            if cur and cur[0] not in secs: secs[cur[0]]={'title':ttl(cur[1]),'text':clean('\n'.join(buf))}
            cur=(m.group(1).strip(),m.group(2).strip()); buf=[]
        elif cur: buf.append(line)
    if cur and cur[0] not in secs: secs[cur[0]]={'title':ttl(cur[1]),'text':clean('\n'.join(buf))}
    return secs
def _cell(c):
    return re.sub(r'\s+',' ',re.sub(r'<[^>]+>',' ',c)).strip()
def table_rows(s):
    # v1.14 (review #10 N2): a table whose first column labels the rows (e.g. TR 54) is written one row per line,
    # each value next to its own column heading ("heading – value"), so a passage holding a number also says what it applies to
    def conv(m):
        rows=re.findall(r'<tr[^>]*>(.*?)</tr>',m.group(0),re.S)
        if not rows or 'rowspan' not in rows[0].split('</th>')[0]: return m.group(0)
        hdr=[[_cell(c) for c in re.findall(r'<th[^>]*>(.*?)</th>',r,re.S)] for r in rows]
        cap=[h[0] for h in hdr if len(h)==1]
        out=[]
        for r in rows:
            td=[_cell(c) for c in re.findall(r'<td[^>]*>(.*?)</td>',r,re.S)]
            if not td: continue
            H=next((h for h in reversed(hdr) if len(h)==len(td)-1 and len(td)>2),None)
            if not H: return m.group(0)
            vals=[f'{h} – {v}' for h,v in zip(H,td[1:]) if v and v!='&nbsp;']
            out.append(td[0]+(' ('+cap[0]+'): ' if cap else ': ')+'; '.join(vals) if vals else td[0])
        return '\n'.join(out)
    return re.sub(r'<table.*?</table>',conv,s,flags=re.S)
def ttl(t):
    # v1.17 (review #13 N3): section titles keep the Wikisource <wbr> break hints as markup – drop them (and any other tag)
    return re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', re.sub(r'<wbr\s*/?>', '', t))).strip()
def clean(s):
    s=table_rows(s)
    # v1.14 (review #10 N1): named template parameters (e.g. {{ח:תת|סוג=הגדרה}}) are markup, not text
    s=re.sub(r'\{\{(ח:[^{}|]*)((?:\|[^{}]*)?)\}\}',lambda m:'{{'+m.group(1)+''.join('|'+a for a in m.group(2).split('|')[1:] if not re.match(r'^[^=\s]+=',a))+'}}',s)
    # two-column rows {{טור לשמאל|label|value}} -> 'label – value' (tables of dimensions and weights)
    s=re.sub(r'\{\{טור לשמאל\|(?:יישור=[^|{}]*\|)?([^{}]*?)\|([^|{}]*)\}\}',lambda m:(m.group(1).rstrip(' –:')+' – '+m.group(2)).strip(' –'),s)
    s=re.sub(r'\{\{ח:(תת+|תתת+)\|?([^}]*)\}\}',lambda m:' '+m.group(2).replace('|',' ')+' ',s)
    s=re.sub(r'\{\{ח:פנימי\|[^|}]*\|([^}]*)\}\}',r'\1',s)
    s=re.sub(r'\{\{ח:חיצוני\|[^|}]*\|([^}]*)\}\}',r'\1',s)
    s=re.sub(r'\{\{ח:חיצוני\|([^}]*)\}\}',r'\1',s)
    s=re.sub(r'\{\{ח:הערה\|([^}]*)\}\}',lambda m:m.group(1) if re.fullmatch(r'[,./;:]|[A-Z]',m.group(1)) else '('+m.group(1)+')',s)   # v1.20 (review #16 N6): an editor's inserted ',' '/' 'J' is part of the text ('1,500', '76/756/EEC'), not a bracketed note
    s=re.sub(r'\{\{[^}]*\}\}','',s); s=re.sub(r'<[^>]+>',' ',s); s=s.replace('&nbsp;',' ')
    s=re.sub(r'\[\[[^|\]]*\|([^\]]*)\]\]',r'\1',s); s=re.sub(r'\[\[([^\]]*)\]\]',r'\1',s)
    return re.sub(r'[ \t]+',' ',s).strip()
if __name__=='__main__':
    out={}
    for k,fn in [('TR','תקנות_התעבורה.txt'),('TO','פקודת_התעבורה.txt')]:
        out[k]=parse(fn); print(k,len(out[k]))
    out['_meta']=json.load(open('revs.json'))
    json.dump(out,open('law.json','w'),ensure_ascii=False)
