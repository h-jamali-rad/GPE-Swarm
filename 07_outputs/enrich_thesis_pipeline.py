# -*- coding: utf-8 -*-
"""
enrich_thesis_pipeline.py
==========================
Post-processes web/thesis.json into an ENRICHED thesis that actually leverages
the full research corpus, and writes web/thesis_enriched.json.

What it does (honest, data-driven — no fabricated content):
  1. Fixes the "Para N" footnote bug: converts bare "Para N" markers coming from
     the Chapter-3 draft into proper citations of the SG report A/73/419, بند N.
  2. Builds a COMPLETE reference list in 1400 format:
       - Persian sources (from brain.json fa sources + Persian legal instruments)
       - English sources (ALL 38 db_mining articles + key legal instruments)
       both alphabetically ordered, Persian first then Latin.
  3. Substantially enriches Chapter 4 (impact on MEAs) with a documented,
     citation-backed synthesis drawn from the db_mining articles mapped to فصل۴
     and the seven-perspective framework.
  4. Substantially enriches Chapter 5 (conclusions) with the six research
     findings (F1–F6), the novelty/contribution statement, and a gap-driven
     future-research agenda — every claim cited to a source.

Sources of truth: web/thesis.json, web/db_mining.json, web/brain.json,
web/research_intel.json
"""
import os, re, json

HERE = os.path.dirname(os.path.abspath(__file__))
WEB = os.path.join(HERE, "..", "web")

def load(name):
    with open(os.path.join(WEB, name), encoding="utf-8") as f:
        return json.load(f)

FA_D = str.maketrans("0123456789", "۰۱۲۳۴۵۶۷۸۹")
def fa(s):
    return str(s).translate(FA_D)

# ─────────────────────────────────────────────────────────────────────────────
# 1) FOOTNOTE "Para N" BUG FIX
# ─────────────────────────────────────────────────────────────────────────────
SG_CITE = ("سازمان ملل متحد، گزارش دبیرکل، «خلأها در حقوق بین‌الملل محیط زیست و "
           "اسناد مرتبط با محیط زیست: به‌سوی یک پیمان جهانی برای محیط زیست»، سند "
           "A/73/419، مجمع عمومی، ۳۰ نوامبر ۲۰۱۸، بند {n}.")
PARA_RE = re.compile(r"^\s*[Pp]ara\.?\s*(\d+)\s*$")

def fix_para_footnotes(thesis):
    fixed = 0
    for ch in thesis["chapters"]:
        for sec in ch["sections"]:
            fns = sec.get("fns", [])
            for i, fn in enumerate(fns):
                if isinstance(fn, str):
                    m = PARA_RE.match(fn)
                    if m:
                        fns[i] = SG_CITE.format(n=fa(m.group(1)))
                        fixed += 1
    return fixed

# ─────────────────────────────────────────────────────────────────────────────
# 2) COMPLETE 1400-FORMAT REFERENCE LIST
# ─────────────────────────────────────────────────────────────────────────────
def sort_key_fa(s):
    return s.strip()

def build_references(db, brain):
    # ---- Persian references (books/articles + legal instruments) ----
    fa_refs = []
    # curated Persian scholarly sources from brain.json (those with real authors)
    fa_src_ids = ["S074", "S189", "S191", "S194", "S195", "S196", "S198"]
    by_id = {s["id"]: s for s in brain["sources"]}
    manual_fa = {
        "S074": "مشهدی، علی و کوثری، وحید، (۱۳۹۸)، «پیمان جهانی محیط زیست؛ از قوام‌نیافتگی منابع تا توسعهٔ هنجاری»، فصلنامهٔ مطالعات حقوق عمومی.",
        "S189": "شاحیدر، عبدالکریم و مؤیدیان، امینه، «حقوق بین‌الملل محیط زیست در مرز گذار از چالش‌های داخلی و بین‌المللی»، فصلنامهٔ حقوق محیط زیست.",
        "S191": "پورهاشمی، عباس، «بررسی تحلیلی-انتقادی پیش‌نویس پیمان جهانی محیط زیست»، فصلنامهٔ پژوهش‌های حقوق بین‌الملل.",
        "S194": "بازار، وحید، «نقش دیوان بین‌المللی دادگستری در پر کردن خلأهای حقوقی حقوق بین‌الملل محیط زیست»، مجلهٔ حقوقی بین‌المللی.",
        "S195": "الهویی‌نظری، حمید، (۱۳۹۲)، «جایگاه اصول کلی حقوقی در آرای دیوان بین‌المللی دادگستری»، مجلهٔ حقوقی بین‌المللی.",
        "S196": "کردی، زهرا، «بررسی ابعاد حقوقی و سیاسی پیمان جهانی محیط زیست»، فصلنامهٔ سیاست جهانی.",
        "S198": "موسوی، سیدفضل‌اله و موسوی‌فر، سید حسین، (۱۳۹۵)، «اختلاف زیست‌محیطی آرژانتین و اروگوئه (۲۰۱۰)؛ تبیین برخی مباحث حقوق بین‌الملل محیط زیست»، فصلنامهٔ مطالعات حقوق عمومی.",
    }
    for sid in fa_src_ids:
        if sid in manual_fa:
            fa_refs.append({"text": manual_fa[sid], "cited": True})
    # Persian legal / institutional instruments
    fa_instruments = [
        "سازمان ملل متحد، گزارش دبیرکل، «خلأها در حقوق بین‌الملل محیط زیست و اسناد مرتبط با محیط زیست: به‌سوی یک پیمان جهانی برای محیط زیست»، سند A/73/419، مجمع عمومی، ۳۰ نوامبر ۲۰۱۸.",
        "کمیسیون حقوق بین‌الملل، «نتیجه‌گیری‌های کارِ گروه مطالعاتی دربارهٔ پراکندگی حقوق بین‌الملل: دشواری‌های ناشی از تنوع و گسترش حقوق بین‌الملل»، سند A/CN.4/L.682، ۲۰۰۶.",
        "مجمع عمومی سازمان ملل متحد، «حق بشری بر محیط‌زیستِ پاک، سالم و پایدار»، قطعنامهٔ ۷۶/۳۰۰، ۲۸ ژوئیهٔ ۲۰۲۲.",
        "مجمع عمومی سازمان ملل متحد، «به‌سوی یک پیمان جهانی برای محیط زیست»، قطعنامهٔ ۷۲/۲۷۷، ۱۰ مه ۲۰۱۸.",
        "کنوانسیون وین دربارهٔ حقوق معاهدات، ۱۹۶۹، مادهٔ ۳۱(۳)(ج).",
        "پیش‌نویس پیمان جهانی برای محیط زیست، ۲۰۱۷ (نسخهٔ ارائه‌شده به مجمع عمومی).",
    ]
    for t in fa_instruments:
        fa_refs.append({"text": t, "cited": True})
    fa_refs = sorted(fa_refs, key=lambda r: sort_key_fa(r["text"]))

    # ---- English references — ALL 38 db_mining articles ----
    en_refs = []
    for a in db["articles"]:
        authors = a.get("authors", "").strip()
        year = a.get("year", "")
        title = a.get("title", "").strip().rstrip(".")
        venue = a.get("venue", "").strip()
        doi = a.get("doi", "").strip()
        caution = " ⚠ [پیش‌چاپِ داوری‌نشده — non-peer-reviewed preprint]" if a["id"] == "DB36" else ""
        parts = [p for p in [authors, f"({year})" if year else "", f"{title}.", venue] if p]
        txt = " ".join(parts).rstrip(".") + "."
        if doi:
            txt += f" DOI: {doi}"
        txt += caution
        en_refs.append({"text": txt, "cited": True, "id": a["id"]})
    # English legal instruments
    en_instruments = [
        "International Law Commission (2006). Conclusions of the Work of the Study Group on the Fragmentation of International Law: Difficulties Arising from the Diversification and Expansion of International Law. UN Doc A/CN.4/L.682.",
        "United Nations (1969). Vienna Convention on the Law of Treaties. Art. 31(3)(c).",
        "UN General Assembly (2018). Gaps in International Environmental Law and Environment-related Instruments: Towards a Global Pact for the Environment. Report of the Secretary-General, UN Doc A/73/419.",
        "UN General Assembly (2018). Towards a Global Pact for the Environment. Resolution 72/277, 10 May 2018.",
        "UN General Assembly (2022). The Human Right to a Clean, Healthy and Sustainable Environment. Resolution 76/300, 28 July 2022.",
    ]
    for t in en_instruments:
        en_refs.append({"text": t, "cited": True})
    # de-dup by leading text, then alpha sort
    seen = set(); dedup = []
    for r in en_refs:
        k = r["text"][:60].lower()
        if k in seen:
            continue
        seen.add(k); dedup.append(r)
    en_refs = sorted(dedup, key=lambda r: r["text"].lower())
    return {"fa": fa_refs, "en": en_refs}

if __name__ == "__main__":
    thesis = load("thesis.json")
    db = load("db_mining.json")
    brain = load("brain.json")
    ri = load("research_intel.json")

    from enrich_thesis_content import enrich_ch4, enrich_ch5

    n_fixed = fix_para_footnotes(thesis)
    thesis["references"] = build_references(db, brain)
    enrich_ch4(thesis, db, ri)
    enrich_ch5(thesis, db, ri, brain)

    # refresh chapter stats
    for ch in thesis["chapters"]:
        ch["stat_paras"] = sum(len(s.get("paras", [])) for s in ch["sections"])
        ch["stat_fns"] = sum(len(s.get("fns", [])) for s in ch["sections"])
        ch["stat_sections"] = len(ch["sections"])

    out = os.path.join(WEB, "thesis_enriched.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(thesis, f, ensure_ascii=False, indent=1)

    # unique source count
    srcs = set()
    for ch in thesis["chapters"]:
        for sec in ch["sections"]:
            for s in sec.get("sources", []):
                srcs.add(s)
    print("para-bug footnotes fixed:", n_fixed)
    print("references: fa =", len(thesis["references"]["fa"]), "| en =", len(thesis["references"]["en"]))
    print("unique sources tagged in sections:", len(srcs))
    for ch in thesis["chapters"]:
        print(f"  {ch['num']}: {ch['stat_sections']} secs, {ch['stat_paras']} paras, {ch['stat_fns']} fns")
    print("wrote", out, os.path.getsize(out), "bytes")
