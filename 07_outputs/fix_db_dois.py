# -*- coding: utf-8 -*-
"""Fix DOI collisions in db_mining.json:
- DB02 (French & Kotzé, RECIEL 28(1)) had wrong DOI reel.12277 -> correct reel.12278 (verified).
- DB07 & DB21 (attributed to 'Vidal, O. / MDPI') carried DOIs that actually belong to
  Aguila (su12145636) and McGarry (jgy040); they are misattributed duplicates now
  correctly represented by verified entries DB27 and DB30 -> remove."""
import json
WEB = "/home/ubuntu/gpe-swarm/web/db_mining.json"
d = json.load(open(WEB, encoding="utf-8"))

removed, fixed = [], []
kept = []
for a in d["articles"]:
    if a["id"] in ("DB07", "DB21"):
        removed.append(a["id"]); continue
    if a["id"] == "DB02":
        a["doi"] = "10.1111/reel.12278"
        a["url"] = "https://onlinelibrary.wiley.com/doi/abs/10.1111/reel.12278"
        a["access_fa"] = "دسترسی رایگان (نسخهٔ مخزنِ دانشگاه لینکلن)"
        fixed.append(a["id"])
    kept.append(a)
d["articles"] = kept

# recompute prisma counts
n = len(d["articles"])
d["prisma"]["included"] = n
free_ct = sum(1 for a in d["articles"] if a.get("access_fa"))

# verify no remaining duplicate DOIs
from collections import Counter
dois = [a.get("doi") for a in d["articles"] if a.get("doi")]
dups = [k for k, v in Counter(dois).items() if v > 1]

json.dump(d, open(WEB, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("fixed:", fixed, "| removed:", removed)
print("total articles now:", n, "| with access_fa:", free_ct)
print("remaining duplicate DOIs:", dups)
