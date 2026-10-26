# The official textbook "נוהגים אחרת – נוהגים נכון" (2017): access and reuse terms

Checked on 2026-10-26 at 15:20 UTC+2.

## The file
- Landing page: https://www.gov.il/he/pages/driving_textbook. An automated fetch on 2026-10-26 got HTTP 403, a "Just a moment…" bot check, so this page is not cached. The PDF link below comes from it.
- PDF: https://www.gov.il/BlobFolder/reports/driving_textbook/he/publications_2017_nohagim_aheret_nohagim_nachon.pdf. It has 170 pages, was made with InDesign CC 2017, and was last modified 18.06.2019. Its text can be extracted with `pdftotext`.
- Pinned as `OFF:textbook` in `tools/official/pages.json`, with the access date (2026-10-26), the sha256 of the PDF and the sha256 of the extracted text. Every quoted phrase is checked against that text. Quotes from the book's own sample-exam questions are rejected (`pin.py`).
- The PDF and the full text are kept only in `tools/official/cache/`, which is gitignored. The site does not host or redistribute the book.

## Terms
1. **The book's own copyright notice (p. 3):** "אין לשכפל, להעתיק, לצלם, להקליט, לתרגם, לאחסן במאגר מידע, לשדר או לקלוט … כל חלק שהוא מהחומר שבספר הדרכה זה, אלא ברשות מפורשת בכתב ומראש מהרשות הלאומית לבטיחות בדרכים." The same page says the pictures and illustrations come from the Ministry of Transport question book.
2. **gov.il terms of use (pinned as `terms`, https://www.gov.il/he/pages/gov_terms_of_use):**
   - Copyright in government publications belongs to the State.
   - "המשתמש רשאי לעשות 'שימוש הוגן' בחומר המוגן, לפי הכללים הקבועים בדין. שימוש הוגן כולל ציטוט סביר מתוך החומר המוגן. המצטט כאמור חייב לציין את המקור לציטוט".
   - Distorting or altering the material is forbidden.
   - Copying, publishing or making a derivative work beyond that needs prior written consent.
3. **Copyright Law 2007, section 19 (fair use):** allows fair use for purposes such as "הבאת מובאות" (quotation). The gov.il terms above refer to this rule ("לפי הכללים הקבועים בדין"). This clause is not pinned in the repo.

## Conclusion
- **Allowed:** short quotations of reasonable length, with the source named and never altered, and our own paraphrased lesson text based on the book. This is fair use, as the gov.il terms allow.
- **Not allowed:** copying or hosting the book, its pictures or illustrations, or large parts of it, unless the National Road Safety Authority gives written permission.
- **How the site complies:**
  - Each rule is our own Hebrew paraphrase, and the chapter or page is named.
  - Short verbatim phrases are kept only to verify the rules and to show the source.
  - No images from the book are used.
- **Open point for Dudi:** about 300 short quotations are stored in `pages.json` and shown as source excerpts. Each one is short, but their total size is a judgement call. Written RSA permission would remove the doubt. This is not legal advice.
