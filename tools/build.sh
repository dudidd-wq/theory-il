set -e
cd /workspace/theory-il
python3 tools/official/sync_textbook_quotes.py && python3 tools/official/pin.py
# v1.19: compile_verdicts.py (one-time compile from positional candidate lists in /tmp/pack) no longer runs here – tools/coverage/full.json is the record; rules were removed (review #15 D3)
python3 tools/signs_build.py >/dev/null
python3 tools/lessons.py | grep -E "ERROR" || true
python3 tools/coverage.py | sed -n 1,8p
python3 tools/lessons.py > /tmp/theory_lessons_out.txt; grep -E "ERROR|^ok" /tmp/theory_lessons_out.txt || true
if grep -q ERROR /tmp/theory_lessons_out.txt; then echo "BUILD FAIL: lesson source errors"; exit 1; fi
python3 tools/coverage/nosource_build.py >/dev/null
python3 tools/test/data_test.py 2>&1 | grep -v "^  ok" | tail -5
