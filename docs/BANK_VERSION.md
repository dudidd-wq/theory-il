# Question bank version check (v1.8.0, 2026-10-26)

Checked: data.gov.il CKAN `package_search` (one call, 2026-10-26 ~15:5x UTC+2) and the tqhe metadata fetched the same morning (`data/raw/meta.json`, not committed). gov.il pages answer 403 (bot check) to scripted fetches, so gov.il itself was not re-checked.

## Newer version than 2021?
No. The CC BY main-test banks are unchanged:

| dataset | resource last modified | metadata modified | licence |
|---|---|---|---|
| tqhe (Hebrew) | 2021-12-05 | 2023-03-21 | cc-by |
| tqen | 2021-12-13 | 2023-03-21 | cc-by |
| tqfr | 2021-12-13 | 2023-03-21 | cc-by |
| tqru, tqes | 2019-09-05 | 2023-03-21 | cc-by |
| tqar (Arabic) | 2023-05-31 | 2025-09-28 | other-open (excluded) |
| A3 e-bike banks (6) | 2024-09 / 2024-11 | 2024 | other-open (excluded, separate test) |

Only the Arabic bank and the A3 e-bike banks are newer, and both carry the "other-open" licence that the app excludes until clarified. No data was swapped.

## 1,802 vs 1,801
The tqhe resource has 1,802 records with 1,802 distinct question numbers. The app keeps 1,801. The one left out is **Q574** ("מה פירוש התמרור?", category תמרורים; correct answer "הכניסה אסורה לטרקטור ולרכב עבודה"). Its record has a broken image (`<img src="ה" … title="3574">`), so tools/build.py excludes it (`brokenimg`; logged as "he 574 excluded" in data/manifest.json). Without the sign picture the question cannot be answered. Its class tags also contain a Cyrillic «В» instead of a Latin «B».

So 1,802 counts the official file, and 1,801 counts the questions that can be shown. The site says 1,801 and never "1,200" (data_test guards this).
