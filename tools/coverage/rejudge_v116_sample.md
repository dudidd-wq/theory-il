# v1.16 strict re-sample (review #12, item 3)

Seed `random.Random(1216).sample(pool, 84)`; pool = 506 questions of class B or A judged **full** (v1.15 data), excluding sign-dictionary-only verdicts, every question in rejudge_v113–v116.txt, the v1.13/v1.14/v1.15 samples and the reviewers' own samples (/workspace/r11/samp_f.txt, review #12's seed-1212 full and seed-1213 partial lists). Rule: a verdict stays **full** only if the passage shown in the lesson decides the correct answer; otherwise **partial**.

Result: **12 of 84 downgraded to partial (14.3%; 95% Wilson interval 8.4–23.3%)**, 4 kept full after their chip was extended to the source sentence (or re-sourced), 68 confirmed.

| qid | classes | before | after | note |
|---|---|---|---|---|
| 44 | A,B | full | full | confirmed: the cited passage decides the answer |
| 65 | A,B | full | full | confirmed: the cited passage decides the answer |
| 74 | B | full | full | confirmed: the cited passage decides the answer |
| 90 | A,B | full | full | confirmed: the cited passage decides the answer |
| 97 | B | full | full | confirmed: the cited passage decides the answer |
| 110 | A,B | full | full | confirmed: the cited passage decides the answer |
| 122 | A,B | full | full | confirmed: the cited passage decides the answer |
| 134 | A,B | full | full | confirmed: the cited passage decides the answer |
| 156 | A,B | full | full | confirmed: the cited passage decides the answer |
| 163 | A,B | full | full | confirmed: the cited passage decides the answer |
| 164 | A,B | full | full | confirmed: the cited passage decides the answer |
| 180 | A,B | full | full | confirmed: the cited passage decides the answer |
| 195 | B | full | partial | TR 69(ב): only public works (and boarding, rescue) are exempt; "רכב צה"ל" is not in the cited text |
| 196 | A,B | full | full | confirmed: the cited passage decides the answer |
| 207 | A,B | full | full | confirmed: the cited passage decides the answer |
| 210 | A,B | full | full | confirmed: the cited passage decides the answer |
| 212 | A,B | full | full | confirmed: the cited passage decides the answer |
| 222 | B | full | full | confirmed: the cited passage decides the answer |
| 248 | A,B | full | full | confirmed: the cited passage decides the answer |
| 261 | B | full | full | confirmed: the cited passage decides the answer |
| 265 | A,B | full | full | confirmed: the cited passage decides the answer |
| 272 | A,B | full | full | confirmed: the cited passage decides the answer |
| 285 | A,B | full | full | confirmed: the cited passage decides the answer |
| 302 | A,B | full | full | confirmed: the cited passage decides the answer |
| 310 | A,B | full | partial | textbook p.66 explains the octagon of the stop sign only; nothing cited explains the shape of the second sign |
| 347 | A,B | full | full | confirmed: the cited passage decides the answer |
| 363 | A,B | full | partial | the dictionary entries say only what each sign warns of; neither "slow down and be alert" nor their group is in the cited text |
| 364 | A,B | full | full | confirmed: the cited passage decides the answer |
| 387 | A,B | full | full | confirmed: the cited passage decides the answer |
| 394 | A,B | full | partial | TR 47(ה)(2) names the old sign number א–30; nothing cited links it to sign 132 (or the 100 m) |
| 458 | A,B | full | full | confirmed: the cited passage decides the answer |
| 465 | A,B | full | full | confirmed: the cited passage decides the answer |
| 474 | A,B | full | full | confirmed: the cited passage decides the answer |
| 481 | A,B | full | full | confirmed: the cited passage decides the answer |
| 575 | A,B | full | partial | LT 411: entry forbidden to animals; animal-drawn carts are not in the cited entry |
| 593 | A,B | full | partial | peds#r0 cites TR 67 (yield at a crossing); the meaning of the pictured sign is not in the cited passage |
| 705 | A,B | full | full | confirmed: the cited passage decides the answer |
| 722 | A,B | full | full | confirmed: the cited passage decides the answer |
| 731 | A,B | full | full | confirmed: the cited passage decides the answer |
| 734 | A,B | full | full | confirmed: the cited passage decides the answer |
| 736 | A,B | full | full | confirmed: the cited passage decides the answer |
| 758 | A,B | full | full | confirmed: the cited passage decides the answer |
| 801 | B | full | full | confirmed: the cited passage decides the answer |
| 802 | A,B | full | full | confirmed: the cited passage decides the answer |
| 805 | A,B | full | partial | p.22–23: stopping distance grows with speed; that reaction and braking distances are each shorter at low speed is not in the cited passage |
| 816 | A,B | full | full | confirmed: the cited passage decides the answer |
| 832 | A,B | full | full | kept full after the chip was extended to the source sentence (p.110 "…הפרשי גובה, רוחב השול ואיכותו") |
| 833 | A,B | full | full | confirmed: the cited passage decides the answer |
| 838 | A,B | full | full | confirmed: the cited passage decides the answer |
| 839 | A,B | full | full | confirmed: the cited passage decides the answer |
| 866 | A,B | full | full | confirmed: the cited passage decides the answer |
| 873 | A,B | full | full | confirmed: the cited passage decides the answer |
| 882 | A,B | full | full | confirmed: the cited passage decides the answer |
| 892 | A,B | full | full | confirmed: the cited passage decides the answer |
| 913 | A,B | full | full | confirmed: the cited passage decides the answer |
| 922 | A,B | full | full | confirmed: the cited passage decides the answer |
| 934 | A,B | full | full | confirmed: the cited passage decides the answer |
| 947 | A,B | full | partial | p.50: limited view at a sharp curve; "slow down and keep right" is not in the passage (rule claim removed) |
| 978 | A,B | full | full | kept full after the chip was extended (p.72 "…ירוק -לבד … צהוב -לבד"); rule claim trimmed to the source |
| 983 | A,B | full | partial | p.106: features of winding roads; "slow down and be especially alert" is not in the passage (rule claim removed) |
| 1032 | A,B | full | full | confirmed: the cited passage decides the answer |
| 1044 | B | full | partial | p.20: clutch, neutral, P/N; that the parking brake is applied before starting is not in the passage (rule claim removed) |
| 1047 | B | full | full | confirmed: the cited passage decides the answer |
| 1295 | A,B | full | partial | TR 308(א): notice when the vehicle may endanger traffic or fails legal conditions; air pollution is not named, and the wrong options would fit the same words |
| 1397 | A,B | full | full | confirmed: the cited passage decides the answer |
| 1480 | A,B | full | full | confirmed: the cited passage decides the answer |
| 1489 | A,B | full | full | kept full: distance#r3 re-sourced from the bank question to textbook p.96 ("מרחק התגובה גדל ביחס ישר לגידול במהירות", "מהירות התגובה של הנהג") |
| 1492 | A,B | full | full | confirmed: the cited passage decides the answer |
| 1574 | B | full | full | confirmed: the cited passage decides the answer |
| 1579 | A | full | full | confirmed: the cited passage decides the answer |
| 1580 | B | full | full | confirmed: the cited passage decides the answer |
| 1597 | A | full | full | confirmed: the cited passage decides the answer |
| 1621 | A | full | full | confirmed: the cited passage decides the answer |
| 1624 | A | full | full | confirmed: the cited passage decides the answer |
| 1640 | A | full | partial | p.31: do not zigzag between lanes; the danger of a car swerving into the gap is not in the passage |
| 1644 | A | full | full | confirmed: the cited passage decides the answer |
| 1687 | B | full | full | kept full after TR 54(א)(2) "אוטובוס שאינו אוטובוס זעיר" was added to the chip |
| 1700 | B | full | full | confirmed: the cited passage decides the answer |
| 1703 | A,B | full | full | confirmed: the cited passage decides the answer |
| 1705 | A,B | full | full | confirmed: the cited passage decides the answer |
| 1766 | A,B | full | full | confirmed: the cited passage decides the answer |
| 1783 | A,B | full | full | confirmed: the cited passage decides the answer |
| 1795 | B | full | full | confirmed: the cited passage decides the answer |
| 1801 | A,B | full | full | confirmed: the cited passage decides the answer |
