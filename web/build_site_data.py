#!/usr/bin/env python3
"""Generate web/data.json for the Vercel dashboard.

Reads the source manifest, the extracted tasks, the agent prompts and the
07_outputs/ tree, and produces a single JSON the static site consumes.
Re-run this whenever sources or outputs change (e.g. after an agent produces
results) so the dashboard stays in sync.
"""
import os, json, re, datetime

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
WEB = os.path.join(ROOT, "web")

# --- repo slug used to build links to source PDFs on GitHub -----------------
# Update REPO_SLUG after the GitHub repo is created (owner/repo).
REPO_SLUG = os.environ.get("REPO_SLUG", "h-jamali-rad/GPE-Swarm")
BRANCH = os.environ.get("REPO_BRANCH", "main")
RAW_BASE = f"https://github.com/{REPO_SLUG}/blob/{BRANCH}/03_sources/"


def load_manifest():
    with open(os.path.join(ROOT, "08_manifest", "sources_manifest.json"), encoding="utf-8") as f:
        return json.load(f)


AGENTS = [
    {"id": "orchestrator", "name_fa": "هماهنگ‌کننده", "name_en": "Orchestrator",
     "task": "—", "desc": "توزیع وظایف، تجمیع نتایج و کنترل کیفیت خروجی‌ها."},
    {"id": "source_analyst", "name_fa": "تحلیل‌گر منابع", "name_en": "Source Analyst",
     "task": "وظیفه ۱", "desc": "مطالعه عمیق تحلیلی–انتقادی کلیه منابع و استخراج یافته‌ها و نقاط قوت/ضعف."},
    {"id": "database_researcher", "name_fa": "جستجوگر پایگاه‌داده", "name_en": "Database Researcher",
     "task": "وظیفه ۲", "desc": "جستجوی نظام‌مند در Westlaw، HeinOnline و Scopus و شناسایی منابع جدید."},
    {"id": "question_hypothesis_evaluator", "name_fa": "ارزیاب سؤال و فرضیه", "name_en": "Question & Hypothesis Evaluator",
     "task": "وظیفه ۳", "desc": "ارزیابی و ارتقاء پرسش‌ها و فرضیه‌های پروپوزال."},
    {"id": "scenario_analyst", "name_fa": "تحلیل‌گر سناریو", "name_en": "Scenario Analyst",
     "task": "وظیفه ۴", "desc": "تحلیل و ارتقاء سناریوی کلی رساله و رفع خلأهای پوششی."},
    {"id": "synthesis_writer", "name_fa": "نگارنده نسخه پیشنهادی", "name_en": "Synthesis Writer",
     "task": "وظیفه ۵", "desc": "تهیه نسخه حرفه‌ای سناریو و فهرست مطالب پیشنهادی."},
]

OUTPUT_DIRS = [
    ("01_source_analysis", "تحلیل منابع", "source_analyst"),
    ("02_database_search", "جستجوی پایگاه‌داده", "database_researcher"),
    ("03_questions_hypotheses", "سؤال‌ها و فرضیه‌ها", "question_hypothesis_evaluator"),
    ("04_scenario_analysis", "تحلیل سناریو", "scenario_analyst"),
    ("05_final_scenario", "سناریوی نهایی", "synthesis_writer"),
]


def scan_outputs():
    out = []
    for folder, label, agent in OUTPUT_DIRS:
        d = os.path.join(ROOT, "07_outputs", folder)
        files = []
        if os.path.isdir(d):
            for fn in sorted(os.listdir(d)):
                if fn == ".gitkeep" or fn.startswith("."):
                    continue
                full = os.path.join(d, fn)
                if os.path.isfile(full):
                    files.append({"name": fn, "size_kb": os.path.getsize(full) // 1024,
                                   "path": f"07_outputs/{folder}/{fn}"})
        out.append({"folder": folder, "label": label, "agent": agent,
                     "files": files, "ready": len(files) > 0})
    return out


CAT_LABELS = {
    "GP/Articles": "پیمان جهانی — مقالات",
    "GP/Articles/نتیجه گیری": "پیمان جهانی — نتیجه‌گیری",
    "GP/Books": "پیمان جهانی — کتاب‌ها",
    "GP/UN": "پیمان جهانی — اسناد ملل متحد",
    "MEAs": "موافقت‌نامه‌های چندجانبه",
    "MEAs/UN": "موافقت‌نامه‌ها — اسناد ملل متحد",
    "MEAs/articles": "موافقت‌نامه‌ها — مقالات",
    "MEAs/books": "موافقت‌نامه‌ها — کتاب‌ها",
    "Stockholm+50": "استکهلم+۵۰",
    "gap": "خلأها در حقوق بین‌الملل محیط زیست",
    "gap/مقاله": "خلأها — مقاله",
    "gap/مقاله/read": "خلأها — مطالعه",
}


def main():
    man = load_manifest()
    for d in man["documents"]:
        d["url"] = RAW_BASE + d["relpath"].replace("\\", "/")
        d["cat_label"] = CAT_LABELS.get(d["category"], d["category"])

    tasks_md = ""
    tpath = os.path.join(ROOT, "01_scenario_and_tasks", "TASKS.md")
    if os.path.exists(tpath):
        with open(tpath, encoding="utf-8") as f:
            tasks_md = f.read()

    data = {
        "generated": datetime.datetime.utcnow().isoformat() + "Z",
        "repo_slug": REPO_SLUG,
        "title_fa": "شکل‌گیری پیمان جهانی محیط زیست و تأثیرات آن بر موافقت‌نامه‌های چندجانبه محیط‌زیستی",
        "subtitle_fa": "سامانه سوارم پژوهشی — داشبورد پروژه و خروجی‌ها",
        "stats": {
            "sources": man["total_documents"],
            "categories": len(man["categories"]),
            "agents": len(AGENTS),
            "tasks": 5,
        },
        "categories": [
            {"key": k, "label": CAT_LABELS.get(k, k), "count": v}
            for k, v in sorted(man["categories"].items())
        ],
        "agents": AGENTS,
        "outputs": scan_outputs(),
        "documents": man["documents"],
        "tasks_md": tasks_md,
    }
    outp = os.path.join(WEB, "data.json")
    with open(outp, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"Wrote {outp}")
    print(f"  sources={data['stats']['sources']} categories={data['stats']['categories']} "
          f"agents={data['stats']['agents']}")
    ready = sum(1 for o in data["outputs"] if o["ready"])
    print(f"  outputs ready: {ready}/{len(data['outputs'])}")


if __name__ == "__main__":
    main()
