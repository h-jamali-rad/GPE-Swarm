#!/usr/bin/env python3
"""Build a manifest (JSON + Markdown) of all source documents. Does NOT read file contents — only inventories filenames, categories, sizes."""
import os, json, hashlib

ROOT = os.path.join(os.path.dirname(__file__), "..", "03_sources")
ROOT = os.path.abspath(ROOT)

CATEGORY_LABELS = {
    "GP": "Global Pact for the Environment (پیمان جهانی محیط زیست)",
    "GP/Articles": "GP — Articles",
    "GP/Books": "GP — Books",
    "GP/UN": "GP — UN Documents",
    "MEAs": "Multilateral Environmental Agreements (موافقت‌نامه‌های چندجانبه)",
    "Stockholm+50": "Stockholm+50",
    "gap": "Gaps in International Environmental Law (خلاءها)",
}

def sha1_short(path):
    h = hashlib.sha1()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()[:12]

entries = []
for dirpath, dirnames, filenames in os.walk(ROOT):
    for fn in filenames:
        if fn.startswith("._") or fn == ".DS_Store":
            continue
        ext = os.path.splitext(fn)[1].lower()
        if ext not in (".pdf", ".doc", ".docx"):
            continue
        full = os.path.join(dirpath, fn)
        rel = os.path.relpath(full, ROOT)
        cat = os.path.dirname(rel) or "(root)"
        entries.append({
            "id": f"S{len(entries)+1:03d}",
            "filename": fn,
            "category": cat,
            "relpath": rel,
            "ext": ext.lstrip("."),
            "size_bytes": os.path.getsize(full),
            "sha1": sha1_short(full),
            "read": False,          # updated by analysis agents later
            "notes": "",
        })

entries.sort(key=lambda e: (e["category"], e["filename"].lower()))
for i, e in enumerate(entries):
    e["id"] = f"S{i+1:03d}"

manifest = {
    "generated": "auto",
    "total_documents": len(entries),
    "categories": {},
    "documents": entries,
}
for e in entries:
    manifest["categories"].setdefault(e["category"], 0)
    manifest["categories"][e["category"]] += 1

out_json = os.path.join(os.path.dirname(__file__), "sources_manifest.json")
with open(out_json, "w", encoding="utf-8") as f:
    json.dump(manifest, f, ensure_ascii=False, indent=2)

# Markdown index
lines = ["# فهرست منابع پژوهش (Source Manifest)", ""]
lines.append(f"**تعداد کل اسناد:** {len(entries)}  ")
lines.append("")
lines.append("> این فهرست فقط نام و دسته‌بندی فایل‌هاست؛ محتوای هیچ مقاله‌ای خوانده نشده است.")
lines.append("")
lines.append("## شمار اسناد به تفکیک دسته")
lines.append("")
lines.append("| دسته | تعداد |")
lines.append("|---|---|")
for cat in sorted(manifest["categories"]):
    lines.append(f"| `{cat}` | {manifest['categories'][cat]} |")
lines.append("")
cur = None
for e in entries:
    if e["category"] != cur:
        cur = e["category"]
        lines.append("")
        lines.append(f"### `{cur}`")
        lines.append("")
        lines.append("| ID | فایل | نوع | حجم |")
        lines.append("|---|---|---|---|")
    size_kb = e["size_bytes"] // 1024
    lines.append(f"| {e['id']} | {e['filename']} | {e['ext']} | {size_kb} KB |")

out_md = os.path.join(os.path.dirname(__file__), "sources_manifest.md")
with open(out_md, "w", encoding="utf-8") as f:
    f.write("\n".join(lines))

print(f"Manifest built: {len(entries)} documents across {len(manifest['categories'])} categories")
print("->", out_json)
print("->", out_md)
