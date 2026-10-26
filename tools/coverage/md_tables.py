#!/usr/bin/env python3
"""Rewrite the per-class, class-only and per-topic tables in docs/COVERAGE.md from docs/coverage_after.json."""
import json, os
R = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
d = json.load(open(os.path.join(R, 'docs/coverage_after.json'))); f = os.path.join(R, 'docs/COVERAGE.md')
L = {'B': 'B private car', 'A': 'A motorcycle', 'C1': 'C1 truck ≤12 t', 'C': 'C heavy truck', 'D': 'D bus', '1': '1 tractor'}
row = lambda n, x: f"| {n} | {x['n']} | {x['full_pct']:.1f} | {x['strict_pct']:.1f} | {x['any_pct']:.1f} | {x['none_teachable']} | {x['none_nosource']} | {x['bank_only']} | {x['partial']} | {x['partial_shown']} | {x['full_nobank_pct']:.1f} |"
out = open(f).read()
HEAD = ('| | questions | full % | strict full % | full or partial % | untaught, source exists | untaught, no official source | '
        'of these: taught from the official bank only, no official explanation | partial (counted as partial) | of these: shown in a lesson with the official bank answer | full % without bank-sourced rules |\n|---|---|---|---|---|---|---|---|---|---|---|\n')
def sect(title, rows):
    global out
    i = out.index(title); h = out.index('| |', i); j = out.index('\n', out.index('|---', i)) + 1; k = j
    out = out[:h] + HEAD + out[j:]; j = h + len(HEAD); k = j
    while out[k:k + 1] == '|': k = out.index('\n', k) + 1
    out = out[:j] + '\n'.join(rows) + '\n' + out[k:]
sect('## Per licence class', [row('whole bank', d['all'])] + [row(L[c], d['class'][c]) for c in L])
sect('## Class-only questions', [row(L[c], d['class_only'][c]) for c in L if c in d['class_only']])
sect('## Per topic', [row(t, d['topic'][t]) for t in ['law', 'signs', 'safety', 'vehicle'] if t in d['topic']])
open(f, 'w').write(out)
