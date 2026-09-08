# گزارش فنی Baseline (RC1)

> HJR's Agentic Architecture developed by Hossein Jamalirad — تاریخ: 2026-09-08 (UTC: 2026-09-08T17:45:00Z)

> سند تولیدشده در چرخهی کنترل کیفیت نهایی (QA Final) — فاز ۴۱/RC2 — CDSS4 Operational Core

## ۱. محیط اجرا
- Python 3.11.6؛ numpy 1.26.4؛ pandas 2.2.3؛ catboost 1.2.10؛ fastapi 0.128.2؛ uvicorn 0.48.0
- مسیر درخت: `~/phase41_work/phase41_src` (استخراج تمیز از بایگانی درونپاکتی؛ بدون تغییر)

## ۲. ماتریس گروههای آزمون
- A_SCIENTIFIC_IDENTITY: ۵/۵ — هویت علمی (SHA-256 مدل/باندل/اسکیما + مهر منبع)
- B_INPUT_ROBUSTNESS: ۹/۹ — استحکام ورودی (Missingness، ارقام فارسی/عربی، مقادیر نامعتبر)
- C_PERFORMANCE: ۳/۳ — سنجههای کارایی مستقیم/API/همروندی
- D_SECURITY_RBAC: ۱۲/۱۲ — احراز هویت، CSRF، نقشها، co-sign، ممیزی
- E_RELEASE_ENGINEERING: ۶/۶ — مهر منبع، OpenAPI، سرو UI
- F_RUNTIME: ۱/۱ — راهاندازی واقعی uvicorn

## ۳. بنچمارکهای اندازهگیریشده
```json
{
  "DIRECT_INFERENCE": {
    "n": 100,
    "mean_ms": 28.49753614515066,
    "median_ms": 26.175716891884804,
    "p95_ms": 43.37761839851736,
    "p99_ms": 74.88575099036106,
    "max_ms": 90.91348759829998,
    "engineering_p95_target_ms": 1000
  },
  "API_LATENCY": {
    "n": 50,
    "mean_ms": 40.04052869975567,
    "median_ms": 38.907318376004696,
    "p95_ms": 48.472346644848585,
    "p99_ms": 76.50565393269056,
    "max_ms": 89.01745826005936,
    "engineering_p95_target_ms": 1000
  },
  "CONCURRENCY": {
    "workers": 8,
    "n": 100,
    "wall_s": 3.1629092805087566,
    "throughput_rps": 31.616461659600592,
    "mean_ms": 248.89306008815765,
    "p95_ms": 368.3999137952924,
    "p99_ms": 417.24594507366436,
    "max_ms": 453.7785481661558,
    "engineering_p95_target_ms": 2000
  }
}
```

## ۴. تفسیر
نتایج دقیقاً با گیت فاز ۴۱ (۳۶/۳۶) همخوان است؛ Baseline ماهیت «تأییدیهی هستهی علمی» دارد و بهعنوان اعتبارسنجی جدید/خارجی تفسیر نمیشود.

---

**HJR's Agentic Architecture developed by Hossein Jamalirad**
تمامی حقوق این مستند بر اساس قواعد مستندسازی HJR محفوظ است.
