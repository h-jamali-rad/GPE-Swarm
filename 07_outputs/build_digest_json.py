# -*- coding: utf-8 -*-
"""Emit web/source_digest.json for the in-site «هضم منابع» view,
reusing the authored narrative from build_sources_report.py merged with
the verified digest fields in db_mining.json."""
import os, json
import build_sources_report as R

HERE = os.path.dirname(os.path.abspath(__file__))
DB = json.load(open(os.path.join(HERE, "..", "web", "db_mining.json"), encoding="utf-8"))
arts = DB["articles"] if isinstance(DB, dict) and "articles" in DB else DB
by_id = {a["id"]: a for a in arts}

sources = []
for sid in R.ORDER:
    a = by_id[sid]; nr = R.NARR[sid]
    sources.append({
        "id": sid,
        "title": a.get("title", ""),
        "authors": a.get("authors", ""),
        "year": a.get("year", ""),
        "venue": a.get("venue", ""),
        "db": a.get("db", ""),
        "doi": a.get("doi", ""),
        "relevance": a.get("relevance", ""),
        "caution": bool(nr.get("caution")),
        "finding_fa": a.get("finding_fa", ""),
        "points": nr["points"],
        "strength_fa": a.get("strength_fa", ""),
        "weakness_fa": a.get("weakness_fa", ""),
        "chapters": a.get("chapters", []),
        "questions": a.get("questions", []),
        "usage": nr["usage"],
        "opt": nr["opt"],
        "citation_note_fa": a.get("citation_note_fa", ""),
    })

out = {
    "meta": {
        "title_fa": "هضم و تحلیلِ تفصیلیِ منابعِ کلیدی",
        "subtitle_fa": "سندِ شفافیتِ استناد: از هر منبع چه استخراج شد، کجا به‌کار رفت، و چگونه نتیجه‌گیری را تقویت کرد.",
        "note_fa": "این بخش نتیجهٔ واکاویِ کاملِ منابعِ آپلودیِ کلیدی است. برای هر منبع، دایجست، نکاتِ استخراج‌شده، محلِ کاربرد در فصول و سهمِ آن در بهینه‌سازیِ نتیجه‌گیری آمده است. منابعِ داوری‌نشده با نشانِ هشدار مشخص شده‌اند.",
    },
    "intro": R.INTRO,
    "sources": sources,
    "synthesis": R.SYNTHESIS,
    "upgrades_intro": R.UPGRADES_INTRO,
    "upgrades": R.UPGRADES,
    "upgrades_tail": R.UPGRADES_TAIL,
    "report": {
        "docx": "گزارش_تحلیل_منابع.docx",
        "pdf": "گزارش_تحلیل_منابع.pdf",
    },
}
p = os.path.join(HERE, "..", "web", "source_digest.json")
json.dump(out, open(p, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("WROTE", p, "sources:", len(sources))
