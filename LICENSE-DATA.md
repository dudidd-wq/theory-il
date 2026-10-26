# Data licence and attribution

Questions, answers and images in `data/` and `img/q/` come from the official theory-test question banks published by
**משרד התחבורה והבטיחות בדרכים (Ministry of Transport and Road Safety, Israel)** on the Israeli government open-data portal data.gov.il,
under the **Creative Commons Attribution (CC BY)** licence (terms: https://data.gov.il/terms-of-use).

| Language | Dataset | Title | Licence | Resource last modified | Questions used |
|---|---|---|---|---|---|
| he | [tqhe](https://data.gov.il/dataset/tqhe) | מאגר השאלות והתשובות הרשמי למבחן נהיגה עיוני ממוחשב | Creative Commons Attribution | 2021-12-05 | 1801 |
| en | [tqen](https://data.gov.il/dataset/tqen) | The complete pool of questions and answers for the computerized driving theory test | Creative Commons Attribution | 2021-12-13 | 1801 |
| ru | [tqru](https://data.gov.il/dataset/tqru) | Вопросы и ответы квалификационного экзамена на знание Правил Дорожного Движения | Creative Commons Attribution | 2019-09-05 | 1801 |
| fr | [tqfr](https://data.gov.il/dataset/tqfr) | Questions et réponses de l'examen de conduite théorique informatisé | Creative Commons Attribution | 2021-12-13 | 1800 |
| es | [tqes](https://data.gov.il/dataset/tqes) | Banco de preguntas del examen teórico a tomarse en el Ministerio de Transporte para y renovar licencias de conducción | Creative Commons Attribution | 2019-09-05 | 1801 |

Changes made (see `tools/build.py`): HTML markup removed from question/answer text, encoding errors fixed, vehicle-class tags normalised
(a Cyrillic «В» in the source is read as class B), images downloaded, resized to 640 px and converted to WebP. Wording and question numbers are unchanged.
Translated banks are matched to the Hebrew bank by question number and image; the Hebrew bank is authoritative.
Excluded: Hebrew question 574 (its image is broken in the source).

Not included because the open-data licence is marked *other-open* (not CC BY): the Arabic bank and the A3 (e-bike/e-scooter) bank.

This project is **not an official product** and is not endorsed by the Ministry. Verify against official sources.
