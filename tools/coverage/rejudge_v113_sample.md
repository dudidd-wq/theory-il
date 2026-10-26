# v1.13 strict re-sample of "full" verdicts (review #9, D4)

Standard: a verdict stays **full** only if the cited unit itself decides the correct answer against the other options; a rule that is only related, or states part of the answer, is **partial**. Sample: 64 non-dictionary *full* verdicts of questions in class B or A, drawn with `random.seed(913)` from all such verdicts (excluding Q22/Q34/Q1029/Q1773, which got new official rules in v1.13). Judged by reading the question, the bank answer and the cited unit. Decisions are applied by `tools/coverage.py` from `rejudge_v113.txt`.

Result: 12 of 64 downgraded to partial (19%); the rest stay full.

| id | decision | reason |
|---|---|---|
| 126 | full | the cited unit decides the answer |
| 23 | full | the cited unit decides the answer |
| 894 | full | the cited unit decides the answer |
| 1727 | partial | rule B: up to 3,500 kg and 8 passengers; it does not say a private minibus is included |
| 1336 | full | the cited unit decides the answer |
| 1606 | partial | rule: straight line, no throttle, no brake; pulling the clutch is not stated |
| 642 | full | the cited unit decides the answer |
| 660 | full | the cited unit decides the answer |
| 774 | full | the cited unit decides the answer |
| 769 | full | the cited unit decides the answer |
| 264 | full | the cited unit decides the answer |
| 1617 | full | the cited unit decides the answer |
| 1728 | full | the cited unit decides the answer |
| 588 | full | the cited unit decides the answer |
| 226 | full | the cited unit decides the answer |
| 1720 | partial | body: no driving when your state is unsafe or under drugs; sedatives and the prescription exception are not stated |
| 1753 | full | the cited unit decides the answer |
| 1583 | full | the cited unit decides the answer |
| 819 | full | the cited unit decides the answer |
| 46 | full | the cited unit decides the answer |
| 56 | full | the cited unit decides the answer |
| 969 | full | the cited unit decides the answer |
| 1334 | full | the cited unit decides the answer |
| 829 | full | the cited unit decides the answer |
| 252 | full | the cited unit decides the answer |
| 863 | partial | rule: clutch, neutral, parking brake; the foot brake pressed is not stated |
| 112 | partial | rule gives the lane to turn left from; the lane to enter (5) is not stated |
| 143 | full | the cited unit decides the answer |
| 117 | full | the cited unit decides the answer |
| 18 | full | the cited unit decides the answer |
| 63 | full | the cited unit decides the answer |
| 17 | full | the cited unit decides the answer |
| 741 | full | the cited unit decides the answer |
| 1593 | partial | rule: A for over 35 kW; the 25 kW (33 hp) threshold in the answer is not stated |
| 404 | full | the cited unit decides the answer |
| 1796 | full | the cited unit decides the answer |
| 1675 | full | the cited unit decides the answer |
| 45 | full | the cited unit decides the answer |
| 738 | partial | rule: "in many vehicles also the brake pedal"; the answer's foot brake before moving the selector is not stated as a rule |
| 199 | partial | body lists places where a stopped car hides or blocks; "hides a sign / disturbs traffic" as the rule is not stated |
| 1576 | full | the cited unit decides the answer |
| 1376 | full | the cited unit decides the answer |
| 1542 | full | the cited unit decides the answer |
| 991 | full | the cited unit decides the answer |
| 290 | full | the cited unit decides the answer |
| 688 | full | the cited unit decides the answer |
| 152 | full | the cited unit decides the answer |
| 279 | full | the cited unit decides the answer |
| 103 | full | the cited unit decides the answer |
| 1755 | full | the cited unit decides the answer |
| 811 | full | the cited unit decides the answer |
| 727 | full | the cited unit decides the answer |
| 744 | full | the cited unit decides the answer |
| 919 | partial | rule: watch for a door about to open; slowing and preparing to stop is not stated |
| 1525 | partial | body: no driving when your state is unsafe or under drugs; sedatives and the prescription / doctor condition are not stated |
| 1001 | full | the cited unit decides the answer |
| 9 | full | the cited unit decides the answer |
| 812 | partial | rule: reaction distance depends on reaction time and speed; it does not define it (from seeing the danger to reacting) |
| 770 | partial | rule: slow before a junction; peripheral observation and avoiding non-driving activity are not stated |
| 803 | full | the cited unit decides the answer |
| 476 | full | the cited unit decides the answer |
| 1653 | full | the cited unit decides the answer |
| 169 | full | the cited unit decides the answer |
| 640 | full | the cited unit decides the answer |

## Flagged by review #9

| id | decision | reason |
|---|---|---|
| 13 | conflict | bank answer (1,500 kg) contradicts TR 1 "טרקטור משא" (1,800 kg): not taught or cited; bank lesson shows the law text |
| 1297 | partial | the textbook keeps right to escape to the shoulder; slowing down when a car comes at you in your lane is not stated |
| 1021 | none-S | only "service per manufacturer instructions" is stated; no official source on choosing a replacement bulb |
| 1688 | none-S | the answer is not stated in TO 12א/12א1/12א2 or schedule 3; no official source found that decides it |
| 587 | why | official sign meaning (sign dictionary, sign 624) |
| 994 | partial | edu 18 says hard, sustained braking locks the wheels; "wheels stop turning" as a definition is not stated |
| 22 | full (new rule) | TR 83ב(א): "לא ינהג אדם ולא יסע ברכב ... אלא אם כן הנוהג והנוסעים בו חגורים" – both driver and passenger |
| 34 | full (new rule) | TR 1 definition of "רחוב משולב", verbatim |
| 1029 | full (new rule) | MoE topic 18: low tyre pressure affects "חום הצמיג בנסיעה (בקיצוניות – סכנת פיצוץ לצמיג)" |
| 1773 | full (new rule) | MoE topic 17: in summer "מצטברים על פני הכביש לכלוך ושומנים" before the first rain |

## Full verdicts that rested only on uncited lesson-body prose (found by the v1.13 e2e check)

A verdict must rest on a cited unit. 15 *full* verdicts pointed only at lesson-body prose (no pinned passage); each was re-judged:

| id | decision | reason |
|---|---|---|
| 130 | full +overtake#r5 | TR 47(ה): no overtaking "בראות לקויה" (was lesson-body prose) |
| 1444 | full +overtake#r5 | TR 47(ה): no overtaking in poor visibility (was lesson-body prose) |
| 141 | full +speed#r7 | TR 52: slow down when visibility is limited / sharp bend (was lesson-body prose) |
| 297 | full +sober#r16 | TO 64ב(א1): a police officer may demand a breath sample (was lesson-body prose) |
| 303 | full +sober#r0 | TR 26(2): no driving under the influence of intoxicating drugs (was lesson-body prose) |
| 772 | full +overtake#r4 | TR 47(ד): overtake only when the road is clear enough to finish safely (was lesson-body prose) |
| 1497 | full +distance#r4 | textbook: stopping distance grows with speed (was lesson-body prose) |
| 1660 | full +moto#r2 | TR 120(ג): passenger only from age 18 (was lesson-body prose) |
| 267 | partial +newdrv#r2 | TO 12א1 states the companion duty, not who counts as a new driver of B/C1 |
| 822 | partial +overtake#r4 | TR 47(ד) covers the clear-road condition, not overtaking several vehicles at once |
| 823 | partial +overtake#r4 | TR 47(ד) covers finishing safely; "is it permitted" is not stated by that rule |
| 1017 | partial +vehicle#r4 | tyre pressure affects tyre wear (OFF:tires); "longer tyre life" from moderate driving is not stated |
| 1542 | partial +lights#r7 | TR 99(א) requires dimming; the dazzle effect itself is not stated |
| 1199 | none-S | bus driver responsible for passengers boarding/alighting: no pinned rule states it (was lesson-body prose) |
| 1759 | none-S | bus in a public-transport lane overtaking an overtaking vehicle: TR 47(ח) excludes buses ("לא יעקוף רכב עוקף אחר בכל דרך"); no pinned text supports the bank answer "רשאי" (was an unrelated body unit) |
