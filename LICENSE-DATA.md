# Data licence and attribution

Questions, answers and images in `data/` and `img/q/` come from the official theory-test question banks published by
**משרד התחבורה והבטיחות בדרכים (Ministry of Transport and Road Safety, Israel)** on the Israeli government open-data portal data.gov.il,
under the **Creative Commons Attribution (CC BY)** licence – data.gov.il labels the datasets “Creative Commons Attribution” (licence id `cc-by`) without a version;
the current version is https://creativecommons.org/licenses/by/4.0/ . Portal terms: https://data.gov.il/he/terms-of-use .
Dataset pages use the portal's current address pattern `https://data.gov.il/he/datasets/ministry_of_transport/<dataset>` (checked in a real browser on 2026-10-26).

| Language | Dataset | Title | Licence | Resource last modified | Questions used |
|---|---|---|---|---|---|
| he | [tqhe](https://data.gov.il/he/datasets/ministry_of_transport/tqhe) | מאגר השאלות והתשובות הרשמי למבחן נהיגה עיוני ממוחשב | Creative Commons Attribution | 2021-12-05 | 1801 |
| en | [tqen](https://data.gov.il/he/datasets/ministry_of_transport/tqen) | The complete pool of questions and answers for the computerized driving theory test | Creative Commons Attribution | 2021-12-13 | 1712 |
| ru | [tqru](https://data.gov.il/he/datasets/ministry_of_transport/tqru) | Вопросы и ответы квалификационного экзамена на знание Правил Дорожного Движения | Creative Commons Attribution | 2019-09-05 | 1640 |
| fr | [tqfr](https://data.gov.il/he/datasets/ministry_of_transport/tqfr) | Questions et réponses de l'examen de conduite théorique informatisé | Creative Commons Attribution | 2021-12-13 | 1748 |
| es | [tqes](https://data.gov.il/he/datasets/ministry_of_transport/tqes) | Banco de preguntas del examen teórico a tomarse en el Ministerio de Transporte para y renovar licencias de conducción | Creative Commons Attribution | 2019-09-05 | 1731 |

Changes made (see `tools/build.py`): HTML markup removed from question/answer text, encoding errors fixed, vehicle-class tags normalised
(a Cyrillic «В» in the source is read as class B), images downloaded, resized to 640 px and converted to WebP. Wording and question numbers are unchanged.
Translated banks are matched to the Hebrew bank by question number and image; the Hebrew bank is authoritative.
A consistency gate drops translations whose numbers or text length don't match the Hebrew question (details in `tools/build.log`),
so the "Questions used" column for translations is lower than 1801. The ru and es banks were last updated in 2019 and may be older than the Hebrew bank.
Excluded: Hebrew question 574 (its image is broken in the source).

Not included because the open-data licence is marked *other-open* (not CC BY): the Arabic bank and the A3 (e-bike/e-scooter) bank.

This project is **not an official product** and is not endorsed by the Ministry. Verify against official sources.
