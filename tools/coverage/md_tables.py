#!/usr/bin/env python3
"""Rewrite the per-class, class-only and per-topic tables in docs/COVERAGE.md from docs/coverage_after.json."""
import json, os
R = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
d = json.load(open(os.path.join(R, 'docs/coverage_after.json'))); f = os.path.join(R, 'docs/COVERAGE.md')
CF = json.load(open(os.path.join(R, 'data/coverage_full.json')))
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
# headline paragraph, generated from the same figures (v1.11, review #8: no hand-copied numbers)
a, C = d['all'], d['class']; pc = lambda x, n: f'{100 * x / n:.1f}%'
E = d['est']
# the same sentence is rendered on the About page (js/i18n.js 'ab.covB', filled from data/coverage.json 'est'); data_test checks they match
B_HEADLINE_EN = lambda E: (f"Class B: {E['B_strict']:.1f}% strict full; {E['B_full']:.1f}% full as judged is an upper bound – estimated ≈{E['B_est']:.1f}% ({E['B_lo']:.1f}–{E['B_hi']:.1f}%) "
                           f"after the strict re-samples ({E['k']} of {E['n']} downgraded, {E['rate']:.1f}%, applied to the {E['unchecked']} B full verdicts never checked strictly).")
hl = (f"**Headline (v1.20.1, whole bank, every question judged; strict figure first, as reviews #9–#17 asked):** of all **{a['n']:,}** questions, **{a['strict_pct']:.1f}% strict full** "
      f"(a sign-dictionary meaning is not counted as teaching; v1.13–v1.16 strict re-judgements applied, [rejudge_v113_sample.md](../tools/coverage/rejudge_v113_sample.md), [rejudge_v114_sample.md](../tools/coverage/rejudge_v114_sample.md), [rejudge_v115_sample.md](../tools/coverage/rejudge_v115_sample.md), [rejudge_v116_sample.md](../tools/coverage/rejudge_v116_sample.md); lesson-body prose never counts), "
      f"**{a['full_pct']:.1f}% full** as judged, **{a['any_pct']:.1f}% full or partial**. "
      f"**{B_HEADLINE_EN(E)}** Review #12's own estimate was ≈74% (72–76%). "
      f"**Without bank-sourced rules: {a['full_nobank_pct']:.1f}% full** (B {C['B']['full_nobank_pct']:.1f}%, A {C['A']['full_nobank_pct']:.1f}%; see below). "
      f"**Bank answer contradicts the law ('סתירה בין המאגר לחוק'): {a['conflict']}** (" + ', '.join('Q' + k for k, e in sorted(CF['q'].items(), key=lambda x: int(x[0])) if e.get('src') == 'X') + "; neither full nor cited, shown only in a bank lesson next to the law text). "
      f"**Taught from the official bank only, no official explanation: {a['bank_only']}** questions (" + ', '.join(f"{'tractor' if c == '1' else c} {C[c]['bank_only']}" for c in L) + "); these are *not* counted as full or partial. "
      f"**Partial + shown with the official bank answer: B {C['B']['partial_shown']} of {C['B']['partial']} partial ({pc(C['B']['partial'], C['B']['n'])} of B), A {C['A']['partial_shown']} of {C['A']['partial']} ({pc(C['A']['partial'], C['A']['n'])} of A)**; "
      f"whole bank {a['partial_shown']} of {a['partial']} partial (every partial question that belongs to B or A); these stay *partial* and are not counted as full. "
      "Classes B and A: every question that has an official state source is taught (fully or partly); the rest are listed with the search done in [NO_SOURCE_B_A.md](NO_SOURCE_B_A.md).")
i = out.index('**Headline ('); out = out[:i] + hl + out[out.index('\n', i):]
open(f, 'w').write(out)
