# گزارش اعتبارسنجی رابط کاربر و اتصال به بکاند

> HJR's Agentic Architecture developed by Hossein Jamalirad — تاریخ: 2026-09-08 (UTC: 2026-09-08T17:45:00Z)

> سند تولیدشده در چرخهی کنترل کیفیت نهایی (QA Final) — فاز ۴۱/RC2 — CDSS4 Operational Core

## ۱. آزمون زنده (Live Smoke)
- اجرای uvicorn واقعی روی پورت محلی؛ `GET /` ← **HTTP 200** با `text/html`؛
- `GET /api/health` ← `{"status": "ok", "app_version": "41.0.0-rc2", "build_id": "NOA-mTESE-CDSS-Phase41-RC2", "deployment_profile": "onprem", "model_sha256": "ff3a815a5f1f21f23e8c6bef5db6b0c376edc158cb0e39d18cc9ebbe123f4aa5", "schema_sha256": "ab8e3e1e5fd9b36205f9de0af84ed79719c4882e5843c68af2a781289f348ec4", "threshold": 0.37, "external_validation": "NOT_PERFORMED", "routine_deployment_readiness": "NOT_ESTABLISHED"}`
- endpoint بالینی: `/api/clinical-predict` در OpenAPI با پاسخهای 200/401/403/422 مستند و در مسیر UI نشانده شده.
## ۲. اتصال UI → بکاند
- کد سمت کاربر فقط از طریق فراخوانیهای `fetch` به مسیرهای معتبر بکاند (شامل `/api/clinical-predict`) داده میگیرد؛
- محاسبات علمی در مرورگر انجام نمیشود (ممنوعیت ProjectBrainV4: «هدفهای مرورگر فقط نیّت UI»).
- اسکریپت رسمی (F_RUNTIME و C_ENDPOINT_FUNCTIONAL) جریان کامل login ← clinical-predict ← گزارش/co-sign را با TestClient و uvicorn واقعی پوشش داد.
## ۳. نتیجه
PASS — UI بهدرستی سرو میشود، RTL/فارسی است و تنها از مسیر بکاند معتبر تغذیه میکند.

---

**HJR's Agentic Architecture developed by Hossein Jamalirad**
تمامی حقوق این مستند بر اساس قواعد مستندسازی HJR محفوظ است.
