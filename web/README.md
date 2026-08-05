# داشبورد وب (Vercel)

سایت استاتیک نمایش پروژه سوارم و خروجی‌ها.

## به‌روزرسانی داده‌ها
پس از هر تغییر در منابع یا خروجی‌ها:
```bash
python3 web/build_site_data.py        # web/data.json را بازتولید می‌کند
```
برای لینک درست منابع به GitHub، متغیر محیطی مخزن را تنظیم کنید:
```bash
REPO_SLUG="h-jamali-rad/<repo>" python3 web/build_site_data.py
```

## اجرای محلی
```bash
cd web && python3 -m http.server 3000
# سپس http://localhost:3000
```

## دیپلوی روی Vercel
- Root Directory: ریشه مخزن
- Output Directory: `web`  (در `vercel.json` تنظیم شده)
- بدون Build Command (سایت استاتیک است)
- فایل `.vercelignore` مانع آپلود PDFهای سنگین می‌شود؛ لینک منابع به GitHub اشاره می‌کند.
