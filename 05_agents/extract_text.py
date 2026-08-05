#!/usr/bin/env python3
"""Phase 1 — Text extraction for the source-analyst pipeline.

Extracts page-segmented text from every source in the manifest and writes one
JSON per document to work/extracted/<id>.json:
    {id, filename, category, relpath, ext, n_pages, chars, pages:[{page,text}]}

Page-segmented text lets the digest step cite exact page numbers. For DOCX
(no fixed pages) we segment by paragraph blocks and record paragraph ranges.
Idempotent: skips a doc if its output already exists (delete to re-extract).
"""
import os, json, sys, traceback

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SRC = os.path.join(ROOT, "03_sources")
OUT = os.path.join(ROOT, "work", "extracted")
MAN = os.path.join(ROOT, "08_manifest", "sources_manifest.json")
os.makedirs(OUT, exist_ok=True)


def extract_pdf(path):
    import fitz
    doc = fitz.open(path)
    pages = []
    for i, page in enumerate(doc):
        txt = page.get_text("text") or ""
        pages.append({"page": i + 1, "text": txt.strip()})
    doc.close()
    return pages


def extract_docx(path):
    import docx
    d = docx.Document(path)
    paras = [p.text.strip() for p in d.paragraphs if p.text.strip()]
    # group ~40 paragraphs into a pseudo-page so citations stay locatable
    pages, chunk, pno = [], [], 1
    for idx, p in enumerate(paras):
        chunk.append(p)
        if len(chunk) >= 40:
            pages.append({"page": pno, "text": "\n".join(chunk),
                          "para_range": [idx - len(chunk) + 1, idx]})
            chunk, pno = [], pno + 1
    if chunk:
        pages.append({"page": pno, "text": "\n".join(chunk),
                      "para_range": [len(paras) - len(chunk), len(paras) - 1]})
    return pages


def main():
    man = json.load(open(MAN, encoding="utf-8"))
    docs = man["documents"]
    ok = skip = fail = 0
    failures = []
    for d in docs:
        outp = os.path.join(OUT, d["id"] + ".json")
        if os.path.exists(outp):
            skip += 1
            continue
        path = os.path.join(SRC, d["relpath"])
        try:
            if d["ext"] == "pdf":
                pages = extract_pdf(path)
            elif d["ext"] in ("docx", "doc"):
                pages = extract_docx(path)
            else:
                raise ValueError("unsupported ext " + d["ext"])
            chars = sum(len(p["text"]) for p in pages)
            rec = {"id": d["id"], "filename": d["filename"], "category": d["category"],
                   "relpath": d["relpath"], "ext": d["ext"], "n_pages": len(pages),
                   "chars": chars, "pages": pages}
            json.dump(rec, open(outp, "w", encoding="utf-8"), ensure_ascii=False)
            ok += 1
            flag = "  ⚠ LOW-TEXT (likely scanned)" if chars < 500 else ""
            print(f"[{ok+skip+fail}/{len(docs)}] {d['id']} {d['n_pages'] if 'n_pages' in d else len(pages)}p {chars}c {d['filename'][:45]}{flag}")
        except Exception as e:
            fail += 1
            failures.append({"id": d["id"], "file": d["filename"], "err": str(e)[:200]})
            print(f"[FAIL] {d['id']} {d['filename'][:45]}: {e}")
    print(f"\nDONE ok={ok} skip={skip} fail={fail}")
    if failures:
        json.dump(failures, open(os.path.join(ROOT, "work", "extract_failures.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    # quick scan of low-text docs
    low = []
    for fn in os.listdir(OUT):
        r = json.load(open(os.path.join(OUT, fn), encoding="utf-8"))
        if r["chars"] < 500:
            low.append((r["id"], r["chars"], r["filename"]))
    if low:
        print(f"\n{len(low)} LOW-TEXT docs (may need OCR):")
        for i, c, f in low[:40]:
            print(f"  {i} {c}c {f[:55]}")
        json.dump([{"id": i, "chars": c, "filename": f} for i, c, f in low],
                  open(os.path.join(ROOT, "work", "low_text_docs.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=2)


if __name__ == "__main__":
    main()
