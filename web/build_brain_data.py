#!/usr/bin/env python3
"""Phase 3 — Post-process digests into web/brain.json for the Project Brain UI.

Reads work/digests/<id>.json (or web/project_brain.json), and derives the
aggregates the front-end needs for all views:
  - sources[]         : trimmed brain cards
  - themes[]          : {name, count, source_ids}
  - chapters[]        : {name, items:[{source_id, how_fa}]}
  - gaps[] / novelty[]: aggregated, each linked to a source
  - graph{nodes,edges}: sources <-> themes <-> gaps for the knowledge graph
  - matrix{rows,cols,cells}: sources x top-themes relevance grid

Re-run after the digest step (or any time digests change):
  python3 web/build_brain_data.py
"""
import os, json, re, collections, time

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DIG = os.path.join(ROOT, "work", "digests")
WEB = os.path.join(ROOT, "web")
REPO_SLUG = os.environ.get("REPO_SLUG", "h-jamali-rad/GPE-Swarm")
RAW = f"https://github.com/{REPO_SLUG}/blob/main/03_sources/"

CHAPTER_ORDER = ["فصل۱", "فصل۲", "فصل۳", "فصل۴", "فصل۵"]


def chapter_key(name):
    if not name:
        return "سایر"
    m = re.match(r"\s*(فصل\s*[۱۲۳۴۵1-5])", name)
    if m:
        n = m.group(1).replace(" ", "")
        n = n.replace("1", "۱").replace("2", "۲").replace("3", "۳").replace("4", "۴").replace("5", "۵")
        return n
    return "سایر"


CHAPTER_LABELS = {
    "فصل۱": "فصل ۱ — چارچوب پژوهش",
    "فصل۲": "فصل ۲ — تحول IEL و شکل‌گیری پیمان (۱۹۷۲–۲۰۲۲)",
    "فصل۳": "فصل ۳ — خلأها (A/73/419) و ابتکار پیمان",
    "فصل۴": "فصل ۴ — تأثیر بر MEAها و آینده‌پژوهی (A/CN.4/L.682)",
    "فصل۵": "فصل ۵ — نتیجه‌گیری",
    "سایر": "سایر / عمومی",
}

# canonicalize near-duplicate theme labels
THEME_CANON = [
    (r"موافقت.?نامه.*چندجانبه", "موافقت‌نامه‌های چندجانبه (MEAs)"),
    (r"پیمان جهانی", "پیمان جهانی محیط زیست"),
    (r"حقوق بین.?الملل محیط", "حقوق بین‌الملل محیط زیست"),
    (r"خلأ.*هنجاری", "خلأهای هنجاری"),
    (r"حقوق نرم.*سخت|نرم به سخت", "گذار حقوق نرم به سخت"),
    (r"پراکندگی", "پراکندگی حقوق بین‌الملل"),
    (r"حکمرانی|حاکمیت محیط", "حکمرانی محیط‌زیستی"),
    (r"آنتروپوسن|آنتروپوس", "عصر آنتروپوسن"),
    (r"اجرا|پایبندی|ضمانت اجرا", "اجرا و پایبندی"),
    (r"اصول .*محیط|اصول بنیادین", "اصول بنیادین محیط‌زیست"),
    (r"استکهلم", "استکهلم (۱۹۷۲/۲۰۲۲)"),
    (r"عرف", "حقوق بین‌الملل عرفی"),
    (r"حقوق طبیعت|حقوق بشر", "حقوق (طبیعت/بشر) و محیط‌زیست"),
]


def canon_theme(t):
    t = (t or "").strip()
    for pat, canon in THEME_CANON:
        if re.search(pat, t):
            return canon
    return t


def load_digests():
    digs = []
    if os.path.isdir(DIG):
        for fn in sorted(os.listdir(DIG)):
            if fn.endswith(".json"):
                try:
                    digs.append(json.load(open(os.path.join(DIG, fn), encoding="utf-8")))
                except Exception:
                    pass
    return digs


def main():
    digs = load_digests()
    digs.sort(key=lambda d: d.get("id", ""))

    sources = []
    theme_map = collections.defaultdict(list)   # theme -> [ids]
    chap_map = collections.defaultdict(list)     # chap -> [{id, how}]
    gaps, novelty = [], []

    for d in digs:
        sid = d.get("id")
        raw_themes = [canon_theme(t) for t in d.get("themes", []) if t]
        themes = sorted(set(raw_themes))
        for t in themes:
            theme_map[t].append(sid)
        for m in d.get("dissertation_mapping", []):
            ck = chapter_key(m.get("chapter", ""))
            chap_map[ck].append({"id": sid, "how_fa": m.get("how_fa", ""),
                                  "title": d.get("title", d.get("filename", ""))})
        for g in d.get("research_gaps_fa", []):
            if g:
                gaps.append({"text": g, "id": sid, "title": d.get("title", "")})
        for n in d.get("novelty_fa", []):
            if n:
                novelty.append({"text": n, "id": sid, "title": d.get("title", "")})
        sources.append({
            "id": sid, "title": d.get("title") or d.get("filename"),
            "filename": d.get("filename"), "authors": d.get("authors", ""),
            "year": d.get("year", ""), "doc_type": d.get("doc_type", ""),
            "category": d.get("category", ""), "language": d.get("language", ""),
            "importance": d.get("importance", "supporting"),
            "importance_reason_fa": d.get("importance_reason_fa", ""),
            "confidence": d.get("confidence", ""),
            "summary_fa": d.get("summary_fa", ""), "why_included_fa": d.get("why_included_fa", ""),
            "key_claims": d.get("key_claims", []), "citable_excerpts": d.get("citable_excerpts", []),
            "dissertation_mapping": d.get("dissertation_mapping", []),
            "question_hypothesis_links": d.get("question_hypothesis_links", []),
            "research_gaps_fa": d.get("research_gaps_fa", []), "novelty_fa": d.get("novelty_fa", []),
            "relationships": d.get("relationships", []), "themes": themes,
            "tier": d.get("_tier"), "n_pages": d.get("n_pages"),
            "url": RAW + (d.get("relpath", "").replace("\\", "/")),
        })

    # themes sorted by frequency
    themes_list = sorted(({"name": k, "count": len(set(v)), "source_ids": sorted(set(v))}
                          for k, v in theme_map.items()), key=lambda x: -x["count"])

    # chapters ordered
    chapters = []
    for ck in CHAPTER_ORDER + ["سایر"]:
        if ck in chap_map:
            chapters.append({"key": ck, "label": CHAPTER_LABELS.get(ck, ck),
                             "items": chap_map[ck], "count": len(chap_map[ck])})

    # graph: source nodes + top theme nodes; edges source->theme
    top_themes = [t["name"] for t in themes_list[:22]]
    nodes, edges = [], []
    for s in sources:
        nodes.append({"data": {"id": s["id"], "label": s["id"], "kind": "source",
                                "title": s["title"], "importance": s["importance"],
                                "doc_type": s["doc_type"]}})
    for t in top_themes:
        tid = "T_" + re.sub(r"\W+", "_", t)[:24]
        cnt = next((x["count"] for x in themes_list if x["name"] == t), 1)
        nodes.append({"data": {"id": tid, "label": t, "kind": "theme", "weight": cnt}})
        for sid in theme_map[t]:
            edges.append({"data": {"source": sid, "target": tid}})

    # matrix: rows=sources, cols=top themes, cell=1 if source has theme
    cols = top_themes[:16]
    rows = []
    for s in sources:
        cells = [1 if c in s["themes"] else 0 for c in cols]
        if sum(cells) > 0:
            rows.append({"id": s["id"], "title": s["title"], "importance": s["importance"], "cells": cells})

    brain = {
        "generated": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "repo_slug": REPO_SLUG,
        "count": len(sources),
        "stats": {
            "sources": len(sources),
            "themes": len(themes_list),
            "gaps": len(gaps),
            "novelty": len(novelty),
            "core": sum(1 for s in sources if s["importance"] == "core"),
        },
        "sources": sources,
        "themes": themes_list,
        "chapters": chapters,
        "gaps": gaps,
        "novelty": novelty,
        "graph": {"nodes": nodes, "edges": edges},
        "matrix": {"cols": cols, "rows": rows},
    }
    outp = os.path.join(WEB, "brain.json")
    json.dump(brain, open(outp, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    kb = os.path.getsize(outp) // 1024
    print(f"Wrote {outp}  ({kb} KB)")
    print(f"  sources={brain['stats']['sources']} themes={brain['stats']['themes']} "
          f"gaps={brain['stats']['gaps']} novelty={brain['stats']['novelty']} core={brain['stats']['core']}")
    print(f"  chapters={[(c['key'],c['count']) for c in chapters]}")


if __name__ == "__main__":
    main()
