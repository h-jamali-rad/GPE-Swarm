# -*- coding: utf-8 -*-
"""Combine parsed real drafts (ch2/ch3) + authored chapters (1/4/5) + critique +
scenario + 1400 compliance into web/thesis.json for the GPE pipeline."""
import json, re, os
from parse_drafts import parse_draft
from thesis_authored import AUTHORED_CHAPTERS
from thesis_critique_scenario import CRITIQUE, SCENARIO

FA_D = str.maketrans("0123456789", "۰۱۲۳۴۵۶۷۸۹")
def fa_num(s):
    return s.translate(FA_D)

DRAFT2 = "/home/ubuntu/Uploads/پیش نویس فصل دوم 6 دی- 57 ص.docx"
DRAFT3 = "/home/ubuntu/Uploads/پیش نویس فصل سوم-قسمت اول+.docx"

def draft_to_chapter(path, num_fa, title_fa, cap_fa, summary_fa):
    d = parse_draft(path)
    secs = []
    for s in d["sections"]:
        num = fa_num(s["num"]) if s["num"] else ""
        secs.append({
            "num": num,
            "level": s["level"],
            "title_fa": s["title"],
            "status": "user-draft",
            "paras": s["paras"],
            "fns": s["fns"],
            "sources": [],
        })
    return {
        "num": num_fa,
        "title_fa": title_fa,
        "cap_fa": cap_fa,
        "status": "user-draft",
        "status_fa": "پیش‌نویس نگارنده (واقعی، بازتاب‌شده)",
        "summary_fa": summary_fa,
        "raw_title_fa": d["title"],
        "sections": secs,
    }

CH2 = draft_to_chapter(
    DRAFT2, "فصل ۲",
    "شکل‌گیری حقوق بین‌الملل محیط زیست و پیمان جهانی محیط زیست (۱۹۷۲–۲۰۲۲)",
    "حداکثر ۷۰ صفحه",
    "متنِ واقعیِ پیش‌نویسِ نگارنده (۵۷ صفحه، ۸۶ پانویس) به‌صورت ساختارمند و قابل‌ناوبری. روایتِ گذارِ حقوق نرم به سخت، تاریخچهٔ ابتکارهای ناکام و دیپلماسیِ فرانسه. نقدها در بخش «نقد و سناریو» آمده است.",
)
CH3 = draft_to_chapter(
    DRAFT3, "فصل ۳",
    "از واکاوی خلأهای حقوق بین‌الملل محیط زیست تا بررسی ابتکار پیمان جهانی محیط زیست",
    "حداکثر ۸۰ صفحه",
    "متنِ واقعیِ پیش‌نویسِ نگارنده (قسمت اول، ۲۸۳ پانویس) حول گزارش دبیرکل A/73/419. گفتار دومِ فصل (تحلیل ابتکار پیمان) هنوز نوشته نشده و باید کامل شود.",
)

# order authored ch1, then ch2 (draft), ch3 (draft), then authored ch4, ch5
by_num = {c["num"]: c for c in AUTHORED_CHAPTERS}
CHAPTERS = [by_num["فصل ۱"], CH2, CH3, by_num["فصل ۴"], by_num["فصل ۵"]]

# progress stats
def chapter_stats(ch):
    npar = sum(len(s.get("paras", [])) for s in ch["sections"])
    nfn = sum(len(s.get("fns", [])) for s in ch["sections"])
    return npar, nfn

for ch in CHAPTERS:
    npar, nfn = chapter_stats(ch)
    ch["stat_paras"] = npar
    ch["stat_fns"] = nfn
    ch["stat_sections"] = len(ch["sections"])

COMPLIANCE_1400 = {
    "intro_fa": "چک‌لیست انطباق با «آیین‌نامهٔ نگارش رساله ۱۴۰۰» (دانشگاه آزاد اسلامی، واحد تهران جنوب). وضعیت هر مورد در نسخهٔ خروجیِ Word/PDF اعمال می‌شود.",
    "items": [
        {"item_fa": "اندازهٔ کاغذ A4 (۲۱×۲۹٫۷)", "rule_fa": "متن روی کاغذ A4", "status": "ok"},
        {"item_fa": "حاشیه‌ها", "rule_fa": "راست ۳، چپ ۳، بالا ۳٫۵، پایین ۳ سانتی‌متر", "status": "ok"},
        {"item_fa": "فاصلهٔ خطوط", "rule_fa": "۱٫۳ سانتی‌متر بین خطوط", "status": "ok"},
        {"item_fa": "فونت متن فارسی", "rule_fa": "نازنین نازک، اندازهٔ ۱۴", "status": "ok"},
        {"item_fa": "تیترهای اصلی", "rule_fa": "نازنین سیاه، ۱۴", "status": "ok"},
        {"item_fa": "تیترهای فرعی", "rule_fa": "نازنین سیاه، ۱۲", "status": "ok"},
        {"item_fa": "پانویس‌ها", "rule_fa": "نازنین نازک، ۱۱ + معادل لاتین اصطلاحات", "status": "ok"},
        {"item_fa": "شماره‌گذاری فصل‑بخش", "rule_fa": "دو عدد با خط تیره؛ راست=فصل (مثال ۲-۴-۳)", "status": "warn",
         "note_fa": "در پیش‌نویس فصل ۳ دو خطای شماره‌گذاری (۳-۱-۶-۲/۳) باید اصلاح شود."},
        {"item_fa": "ترتیب صفحات آغازین", "rule_fa": "بسم‌الله، عنوان، تقدیم، سپاسگزاری، منشور اخلاق، تعهدنامه اصالت، تأییدیهٔ داوران، چکیده، فهرست‌ها", "status": "todo",
         "note_fa": "صفحات آغازین در خروجیِ نهایی افزوده می‌شوند."},
        {"item_fa": "صفحه‌شماری", "rule_fa": "بخش آغازین با حروف ابجد (الف، ب، …)، پیکرهٔ اصلی با اعداد", "status": "todo"},
        {"item_fa": "فهرست منابع تفکیک‌شده", "rule_fa": "منابع فارسی/عربی (نازنین ۱۱) و لاتین (Times New Roman ۱۱)", "status": "warn",
         "note_fa": "یکسان‌سازیِ شیوهٔ استناد (پانویس + فهرست) در فصل ۲ لازم است."},
        {"item_fa": "چکیدهٔ فارسی و انگلیسی", "rule_fa": "چکیدهٔ فارسی + چکیدهٔ انگلیسی (حداکثر یک صفحه)", "status": "todo"},
    ],
}

DATA = {
    "meta": {
        "title_fa": "نگارش ساختارمند رساله",
        "subtitle_fa": "شکل‌گیری پیمان جهانی محیط زیست و تأثیرات آن بر موافقت‌نامه‌های چندجانبهٔ محیط‌زیستی",
        "note_fa": "این بخش، رسالهٔ زنده و ساختارمند را روی همان GPE pipeline میزبانی می‌کند: فصل‌به‌فصل، گفتار‑به‑گفتار، با متنِ واقعیِ پیش‌نویس‌های نگارنده (فصل ۲ و ۳) به‌همراه پانویس‌ها، و فصل‌های تألیفیِ عامل (۱، ۴، ۵). خروجیِ Word/PDF از همین محتوا و منطبق بر آیین‌نامهٔ ۱۴۰۰ صادر می‌شود. «پیمان برای آینده» (Pact for the Future) هیچ ارتباطی با «پیمان جهانی محیط زیست» ندارد.",
        "supervisor_fa": "استاد راهنما: دکتر مسعود احسان‌نژاد",
        "degree_fa": "رسالهٔ دکتری تخصصی — حقوق بین‌الملل عمومی",
        "university_fa": "دانشگاه آزاد اسلامی، واحد تهران جنوب",
        "generated": "2026-08-07",
    },
    "compliance_1400": COMPLIANCE_1400,
    "chapters": CHAPTERS,
    "critique": CRITIQUE,
    "scenario": SCENARIO,
}

OUT = "/home/ubuntu/gpe-swarm/web/thesis.json"
with open(OUT, "w", encoding="utf-8") as f:
    json.dump(DATA, f, ensure_ascii=False, indent=1)

sz = os.path.getsize(OUT)
print("wrote", OUT, "size", sz, "bytes")
for ch in CHAPTERS:
    print(f"  {ch['num']}: {ch['stat_sections']} secs, {ch['stat_paras']} paras, {ch['stat_fns']} fns  [{ch['status']}]")
print("critique chapters:", len(CRITIQUE["chapters"]))
print("scenario author chs:", len(SCENARIO["author_scenario_fa"]), "rewrite chs:", len(SCENARIO["rewrite_scenario_fa"]))
