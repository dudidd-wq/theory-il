set -e
cd /workspace/theory-il
python3 tools/official/sync_textbook_quotes.py && python3 tools/official/pin.py
python3 tools/coverage/compile_verdicts.py >/dev/null
python3 tools/signs_build.py >/dev/null
python3 tools/lessons.py | grep -E "ERROR" || true
python3 tools/coverage.py | sed -n 1,8p
python3 tools/lessons.py | grep -E "ERROR|^ok" 
python3 tools/coverage/nosource_build.py >/dev/null
python3 tools/test/data_test.py 2>&1 | grep -v "^  ok" | tail -5
