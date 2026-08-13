# -*- coding: utf-8 -*-
"""Append the 6 newly-analysed primary/secondary sources (DB35–DB40) to
web/db_mining.json using the exact existing article schema. Idempotent:
re-running removes any prior DB35–DB40 before appending."""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
DB = os.path.join(HERE, "..", "web", "db_mining.json")

NEW = [
  {
    "id": "DB35",
    "db": "PACE Digital Commons",
    "authors": "Tigre, M. A.",
    "year": 2022,
    "title": "The Evolution of International Environmental Law Amidst Political Gridlock: Environmental Rights as a Common Ground",
    "venue": "SJD Dissertation, Elisabeth Haub School of Law at Pace University, 260 pp. (open access)",
    "doi": "",
    "chapters": ["فصل۲", "فصل۳", "فصل۴", "فصل۵"],
    "questions": ["اصلی", "فرعی۱", "فرعی۲"],
    "relevance": 97,
    "finding_fa": "در شرایطِ بن‌بستِ سیاسیِ حقوق بین‌الملل محیط زیست، «حقوقِ محیط‌زیستی» (به‌ویژه حق بر محیط‌زیستِ سالم) می‌تواند زمینهٔ مشترکی برای پیشبردِ تدریجیِ نظام فراهم کند؛ توسعهٔ حقوق نه از راهِ یک معاهدهٔ فراگیرِ واحد، بلکه از مسیرِ رویه، آرای قضایی و شناساییِ حقوق پیش می‌رود.",
    "strength_fa": "رسالهٔ دکتریِ روشمند و پرارجاع با روش‌شناسیِ نتیجه‌گیریِ الگو (تحلیلِ روند + سنجشِ گزینه‌ها + قضاوتِ متوازن)؛ منبعِ طلاییِ رساله برای الگوی نتیجه‌گیری و برای تبیینِ «دستاوردهای پنهانِ» فرایندِ پیمان.",
    "weakness_fa": "تمرکز بر رویکردِ حق‌محور؛ کمتر به پیامدهای فنیِ پیمان بر تک‌تکِ MEAها می‌پردازد.",
    "citation_note_fa": "الگوی روش‌شناختیِ نتیجه‌گیریِ رساله (فصل۵) و مبنای تحلیلِ «حق بر محیط‌زیستِ سالم» به‌مثابهٔ دستاوردِ پنهانِ فرایندِ پیمان (قطعنامهٔ ۷۶/۳۰۰ مجمع عمومی). دسترسی آزاد: digitalcommons.pace.edu/lawdissertations/33/."
  },
  {
    "id": "DB36",
    "db": "Preprints.org",
    "authors": "Damoah, B., Keengwe, J. S. & Ofori, E.",
    "year": 2026,
    "title": "Stalemate in the Anthropocene: Ineffective Treaties and the Struggle for Planetary Governance",
    "venue": "Preprints.org (پیش‌چاپ — داوری‌نشده / non-peer-reviewed preprint)",
    "doi": "10.20944/preprints202603.2371.v1",
    "chapters": ["فصل۲", "فصل۴", "فصل۵"],
    "questions": ["اصلی", "فرعی۲"],
    "relevance": 84,
    "finding_fa": "در عصرِ انتروپوسن، معاهداتِ محیط‌زیستی به‌سببِ ساختارِ بخشی، ضعفِ اجرا و وابستگی به اجماع در «بن‌بست» گرفتار شده‌اند؛ حکمرانیِ سیّارهٔ زمین نیازمندِ بازاندیشیِ بنیادین در سازوکارهای الزام‌آورسازی و نظارت است.",
    "strength_fa": "تبیینِ روشنِ چرایی ناکارآمدیِ معاهداتِ پرشمار و پراکنده؛ به‌کارِ تحلیلِ «چرا ابزارِ معاهدهٔ فراگیرِ واحد با سرشتِ نظامِ حقوق بین‌الملل محیط زیست ناسازگار است» می‌آید (فصل۴ و فصل۵).",
    "weakness_fa": "⚠️ پیش‌چاپِ داوری‌نشده (Preprints.org)؛ باید با احتیاط و در کنارِ منابعِ داوری‌شده استناد شود و اعتبارِ آن به‌صراحت در متن قید گردد.",
    "citation_note_fa": "استناد در فصل۲ (انتروپوسن) و فصل۴/۵ (چراییِ ناکارآمدیِ معاهدات) — همراه با تصریحِ داوری‌نشده‌بودنِ منبع. مجوز CC BY."
  },
  {
    "id": "DB37",
    "db": "United Nations (ILC)",
    "authors": "International Law Commission (Study Group; Koskenniemi, M., رئیس)",
    "year": 2006,
    "title": "Conclusions of the work of the Study Group on the Fragmentation of International Law: Difficulties arising from the Diversification and Expansion of International Law",
    "venue": "Yearbook of the ILC 2006, vol. II, Part Two; A/61/10 (para. 251)",
    "doi": "",
    "chapters": ["فصل۲", "فصل۳", "فصل۴"],
    "questions": ["اصلی", "فرعی۱"],
    "relevance": 95,
    "finding_fa": "نتیجه‌گیریِ رسمیِ کمیسیون حقوق بین‌الملل دربارهٔ چندپارگی: نظامِ حقوق بین‌الملل یک «نظامِ حقوقی» است و ابزارهایی چون قاعدهٔ خاصِ مقدم (lex specialis)، نظام‌های خودبسنده (self-contained regimes) و «یکپارچه‌سازیِ نظام‌مند» از رهگذرِ مادهٔ ۳۱(۳)(ج) کنوانسیون وین برای مدیریتِ تعارضِ هنجاری در دسترس است.",
    "strength_fa": "سندِ مرجعِ رسمی و لنگرِ اصطلاح‌شناسیِ مستندِ رساله؛ همهٔ اصطلاحاتِ فنیِ به‌کاررفته در تحلیلِ تعاملِ پیمان با MEAها از این سند و مطالعهٔ تحلیلیِ آن گرفته شده است.",
    "weakness_fa": "سندِ چارچوبی و کلی؛ کاربستِ آن بر موردِ خاصِ پیمان جهانی نیازمندِ تحلیلِ تکمیلی است.",
    "citation_note_fa": "لنگرِ اصطلاح‌شناسیِ مستند (واژه‌نامه) و مبنای تحلیلِ فصل۳/۴ دربارهٔ چندپارگی و ابزارهای انسجام‌بخشی. متمایز از DB22 (مطالعهٔ تحلیلیِ A/CN.4/L.682)."
  },
  {
    "id": "DB38",
    "db": "IDDRI",
    "authors": "Chabason, L. & Hege, E.",
    "year": 2019,
    "title": "Failure of the Global Pact for the Environment: a missed opportunity or a bullet dodged?",
    "venue": "IDDRI (Institut du développement durable et des relations internationales) — Blog Post, 28 May 2019",
    "doi": "",
    "chapters": ["فصل۲", "فصل۳", "فصل۴"],
    "questions": ["اصلی", "فرعی۲"],
    "relevance": 88,
    "finding_fa": "ناکامیِ مذاکراتِ پیمان جهانی را می‌توان هم «فرصتی ازدست‌رفته» و هم «تیرِ ازکنارگذشته» دانست؛ نویسندگان علل شکست را در نبودِ ارادهٔ سیاسی، بیمِ دولت‌ها از الزام‌آورشدنِ اصول، و رقابتِ نهادی می‌بینند و نتیجهٔ ملموسِ فرایند را قطعنامهٔ ۷۲/۲۷۷ و روندِ «به‌سوی یک پیمان جهانی» می‌دانند.",
    "strength_fa": "تحلیلِ سیاسیِ دقیق و دستِ‌اول از علل شکست و مواضعِ بازیگران؛ مستقیماً به کارِ فصل۴ (علل ناکامی و مواضعِ ژئوپلیتیک) می‌آید.",
    "weakness_fa": "یادداشتِ تحلیلیِ کوتاه (نه مقالهٔ داوری‌شدهٔ بلند)؛ منظرِ نهادیِ IDDRI.",
    "citation_note_fa": "منبعِ اصلیِ تحلیلِ علل شکست و مواضعِ دولت‌ها (فصل۴، گفتار مواضعِ ژئوپلیتیک) و بخشِ نتیجه‌گیریِ متوازن (فصل۵)."
  },
  {
    "id": "DB39",
    "db": "Victoria University of Wellington",
    "authors": "Tiller, D.",
    "year": 2018,
    "title": "Are the Aims of the Proposed Global Pact for the Environment Desirable and Will the Pact Add Any Value to International Environmental Law?",
    "venue": "LLB(Hons) Research Paper, Victoria University of Wellington, Faculty of Law",
    "doi": "",
    "chapters": ["فصل۳", "فصل۴", "فصل۵"],
    "questions": ["اصلی", "فرعی۱", "فرعی۲"],
    "relevance": 90,
    "finding_fa": "اهدافِ پیمان (تحکیم و انسجام‌بخشیِ اصول) مطلوب‌اند، اما ارزش‌افزودهٔ عملیِ آن به‌سببِ ضعفِ سازوکارِ اجرا و خطرِ تضعیفِ رژیم‌های تخصصیِ موجود محدود است؛ داوریِ متوازن: «هدف درست، ابزار محلِ تردید».",
    "strength_fa": "پرسشِ پژوهشِ آن دقیقاً منطبق بر پرسش‌های رسالهٔ ماست (مطلوبیتِ اهداف + ارزش‌افزوده)؛ الگوی داوریِ متوازن برای فصل۵.",
    "weakness_fa": "پایان‌نامهٔ کارشناسیِ حقوق (LLB Hons)؛ عمقِ نظریِ محدودتر نسبت به منابعِ دکتری — در کنارِ منابعِ قوی‌تر استناد می‌شود.",
    "citation_note_fa": "مبنای گفتارِ «مطلوبیتِ اهداف و ارزش‌افزوده» (فصل۳) و داوریِ متوازنِ نتیجه‌گیری (فصل۵-۳)."
  },
  {
    "id": "DB40",
    "db": "Primary Source (IUCN / Le Club des Juristes)",
    "authors": "Draft Global Pact for the Environment (پیش‌نویسِ گروهِ حقوق‌دانانِ بین‌المللی)",
    "year": 2017,
    "title": "Draft Global Pact for the Environment (Projet de Pacte mondial pour l'environnement) — 26 Articles",
    "venue": "Le Club des Juristes / IUCN — متنِ رسمیِ پیش‌نویس (Primary Source), 2017",
    "doi": "",
    "chapters": ["فصل۳", "فصل۴"],
    "questions": ["اصلی", "فرعی۱"],
    "relevance": 96,
    "finding_fa": "متنِ اصلیِ پیش‌نویسِ پیمان در ۲۶ ماده که اصولِ بنیادینِ حقوق بین‌الملل محیط زیست (پیشگیری، احتیاط، «آلوده‌ساز می‌پردازد»، عدالتِ بین‌نسلی، عدم‌پس‌رفت، حقِ محیط‌زیستِ سالم و ...) را در یک سندِ چترِ الزام‌آورِ واحد گرد می‌آورد.",
    "strength_fa": "منبعِ دستِ‌اول و متنِ مبنای تحلیل؛ برای مقایسهٔ ماده‌به‌مادهٔ اصولِ پیمان با اصولِ مندرج در MEAها و اعلامیهٔ ریو ضروری است (فصل۳).",
    "weakness_fa": "پیش‌نویسِ غیررسمی (سندِ کاری)؛ هیچ‌گاه به معاهدهٔ لازم‌الاجرا تبدیل نشد و صرفاً به قطعنامهٔ ۷۲/۲۷۷ انجامید.",
    "citation_note_fa": "متنِ مبنای تحلیلِ محتواییِ اصولِ پیمان (فصل۳) و سنجشِ نسبتِ آن با MEAهای موجود (فصل۴)."
  },
]

def main():
    d = json.load(open(DB, encoding="utf-8"))
    arts = [a for a in d["articles"] if a["id"] not in {x["id"] for x in NEW}]
    arts += NEW
    d["articles"] = arts
    # update meta counts if present
    if isinstance(d.get("meta"), dict):
        d["meta"]["count_total"] = len(arts)
    json.dump(d, open(DB, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    # integrity checks
    ids = [a["id"] for a in arts]
    assert len(ids) == len(set(ids)), "duplicate IDs!"
    dois = [a["doi"] for a in arts if a.get("doi")]
    assert len(dois) == len(set(dois)), "duplicate DOIs!"
    print("total articles:", len(arts))
    print("new IDs present:", [i for i in ids if i in {x['id'] for x in NEW}])
    print("unique DOIs:", len(dois), "of", len(dois))

if __name__ == "__main__":
    main()
