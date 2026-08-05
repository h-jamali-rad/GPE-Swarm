#!/usr/bin/env python3
"""Phase 2 — Deep conceptual digest of every source (source_analyst agent).

Reads work/extracted/<id>.json (page-segmented text) and produces a structured
"brain card" per source in work/digests/<id>.json, then merges all into
web/project_brain.json.

Three tiers by size:
  T1 (<=55k chars): single-pass full-text digest.
  T2 (55k-220k):   map-reduce over ~50k-char page-aligned chunks.
  T3 (>220k, books): keyword-relevance page selection -> map-reduce (targeted).

Idempotent & resumable: a doc whose digest already exists is skipped.
Runs docs concurrently with a thread pool.

Usage:
  python3 05_agents/digest_sources.py                # all docs
  python3 05_agents/digest_sources.py S001 S052 ...  # specific ids
  WORKERS=8 python3 05_agents/digest_sources.py
"""
import os, json, sys, re, time, threading
from concurrent.futures import ThreadPoolExecutor, as_completed
import abacusai
from abacusai import LLMName

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
EXT = os.path.join(ROOT, "work", "extracted")
DIG = os.path.join(ROOT, "work", "digests")
BRAIN = os.path.join(ROOT, "web", "project_brain.json")
os.makedirs(DIG, exist_ok=True)

MODEL = LLMName.GEMINI_2_5_FLASH  # fast + valid JSON + good quality (benchmarked)
T1_MAX = 55_000
T2_MAX = 220_000
CHUNK = 50_000
_client = None
_lock = threading.Lock()


def client():
    global _client
    if _client is None:
        _client = abacusai.ApiClient()
    return _client


DISS_CONTEXT = """عنوان رساله: «شکل‌گیری پیمان جهانی محیط زیست و تأثیرات آن بر موافقت‌نامه‌های چندجانبه محیط‌زیستی».
پرسش اصلی: شکل‌گیری «پیمان جهانی محیط زیست» (Global Pact for the Environment) چه تأثیری بر «موافقت‌نامه‌های چندجانبه محیط‌زیستی» (MEAs) خواهد داشت؟
فرضیه اصلی: نظر به پراکندگی و خلأهای هنجاری و فقدان سند الزام‌آور حاوی اصول بنیادین، پیمانِ الزام‌آور موجب نظم و توسعه هنجاری اصول و تبدیل حقوق نرم به حقوق سخت می‌شود.
پرسش‌های فرعی: (۱) ارزش افزوده پیمان برای IEL؛ (۲) مواضع کشورها درباره پیش‌نویس؛ (۳) نقش پیمان بر اجرا/پایبندی/ضمانت اجرا/حاکمیت قانون؛ (۴) نقش پیمان بر انسجام/کارآمدی/حکمرانی MEAها.
فصول: فصل۱ چارچوب؛ فصل۲ تحول حقوق بین‌الملل محیط‌زیست و شکل‌گیری پیمان (۱۹۷۲–۲۰۲۲)؛ فصل۳ خلأها بر پایه گزارش دبیرکل A/73/419 و ابتکار پیمان؛ فصل۴ تأثیر پیمان بر MEAها و آینده‌پژوهی (سند پراکندگی A/CN.4/L.682)؛ فصل۵ نتیجه‌گیری.
نکته مهم: «پیمان برای آینده» (Pact for the Future) هیچ ارتباطی با «پیمان جهانی محیط زیست» ندارد و نباید خلط شوند."""

RELEVANCE_KW = [
    "global pact", "environment", "environmental law", "mea", "multilateral environmental",
    "treaty", "convention", "principle", "customary", "soft law", "hard law", "binding",
    "fragmentation", "governance", "compliance", "enforcement", "implementation", "gap",
    "anthropocene", "precaution", "prevention", "sustainable", "stockholm", "biodiversity",
    "climate", "rule of law", "coherence", "effectiveness", "codification", "normative",
]

FULL_SCHEMA = """{
  "title": "عنوان تمیزشده منبع",
  "authors": "نویسنده یا نهاد (اگر مشخص نیست خالی)",
  "year": "سال انتشار (اگر یافت شد)",
  "doc_type": "article | book | un_document | thesis",
  "language": "en یا fa",
  "summary_fa": "چکیده مفهومی ۳ تا ۵ جمله‌ای به فارسی: این منبع دقیقاً درباره چیست",
  "why_included_fa": "چرا این منبع به پژوهش ما (تأثیر پیمان جهانی بر MEAها) مربوط است و چه کمکی می‌کند",
  "key_claims": [{"claim_fa": "ادعا/یافته کلیدی به فارسی", "pages": [شماره صفحه‌ها]}],
  "citable_excerpts": [{"quote": "نقل‌قول عیناً از متن (به زبان اصلی)", "page": شماره صفحه, "note_fa": "چرا این گزیده به‌درد ما می‌خورد"}],
  "dissertation_mapping": [{"chapter": "شماره/نام فصل مرتبط", "how_fa": "چگونه به این بخش خوراک می‌دهد"}],
  "question_hypothesis_links": ["کدام پرسش یا فرضیه را پشتیبانی/چالش می‌کند، به فارسی"],
  "research_gaps_fa": ["شکاف پژوهشی که این منبع آشکار یا مطرح می‌کند"],
  "novelty_fa": ["چگونه می‌تواند نوآوری کار ما را تقویت کند"],
  "relationships": [{"type": "supports|contradicts|extends|complements", "topic_fa": "موضوع رابطه"}],
  "themes": ["برچسب موضوعی کوتاه فارسی"],
  "importance": "core | supporting | peripheral",
  "importance_reason_fa": "دلیل این درجه اهمیت",
  "confidence": "high | medium | low"
}"""

SYS = ("تو پژوهشگر ارشد حقوق بین‌الملل محیط زیست و مشاور علمی یک رساله دکتری هستی. "
       "با دقت تحلیلی–انتقادی کار می‌کنی. فقط و فقط یک شیء JSON معتبر برمی‌گردانی، بدون markdown و بدون توضیح اضافه. "
       "نقل‌قول‌ها را عیناً از متن منبع بیاور و شماره صفحه را دقیق ذکر کن. تمام فیلدهای تحلیلی به زبان فارسی باشند. "
       "بسیار مهم: داخل مقدارِ رشته‌ها هرگز از گیومهٔ انگلیسی دوتایی (\") استفاده نکن؛ اگر متن اصلی گیومه دارد آن را با تک‌کوتیشن ' یا گیومهٔ فارسی «» جایگزین کن تا JSON معتبر بماند. شماره صفحه همیشه عدد صحیح باشد؛ اگر صفحه رومی است آن را داخل کوتیشن بگذار.")


def parse_json(txt):
    txt = txt.strip()
    if txt.startswith("```"):
        txt = re.sub(r"^```[a-zA-Z]*\n?", "", txt)
        txt = re.sub(r"\n?```$", "", txt).strip()
    # find outermost object
    s, e = txt.find("{"), txt.rfind("}")
    if s >= 0 and e > s:
        txt = txt[s:e + 1]
    try:
        return json.loads(txt, strict=False)
    except json.JSONDecodeError:
        pass
    # strip stray ASCII control chars (except \t\n\r) that break parsing
    cleaned = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", " ", txt)
    # fix doubled opening quote on a key (e.g. ""pages": -> "pages":)
    cleaned = re.sub(r'""(\w+"\s*:)', r'"\1', cleaned)
    # quote bare alphabetic tokens used as values/array elements
    # (e.g. Roman-numeral page numbers like [xiii, 2] that the model left unquoted)
    cleaned = re.sub(
        r'([:\[,]\s*)(?!true\b|false\b|null\b)([A-Za-z][A-Za-z]*)(\s*[,\]}])',
        r'\1"\2"\3', cleaned)
    try:
        return json.loads(cleaned, strict=False)
    except json.JSONDecodeError:
        pass
    # escape unescaped inner double-quotes inside string values
    fixed = escape_inner_quotes(cleaned)
    try:
        return json.loads(fixed, strict=False)
    except json.JSONDecodeError:
        pass
    # last resort: repair truncated JSON (output hit token cap mid-structure)
    return json.loads(repair_truncated_json(fixed), strict=False)


def escape_inner_quotes(txt):
    """Escape stray double-quotes that appear *inside* a JSON string value.
    A quote is treated as structural (real string boundary) only when the next
    non-space char is one of : , } ] — otherwise it is a literal quote inside
    the value and gets backslash-escaped."""
    out = []
    in_str = False
    esc = False
    n = len(txt)
    for i, ch in enumerate(txt):
        if esc:
            out.append(ch)
            esc = False
            continue
        if ch == "\\":
            out.append(ch)
            esc = True
            continue
        if ch == '"':
            if not in_str:
                in_str = True
                out.append(ch)
            else:
                # look ahead: is this a real closing quote?
                j = i + 1
                while j < n and txt[j] in " \t\r\n":
                    j += 1
                if j >= n or txt[j] in ':,}]':
                    in_str = False
                    out.append(ch)
                else:
                    out.append('\\"')  # literal inner quote
            continue
        out.append(ch)
    return "".join(out)


def repair_truncated_json(txt):
    """Salvage a JSON object that was cut off mid-output by closing open
    strings/arrays/objects. Walks the text tracking structure depth, then
    trims back to the last safe boundary and appends the needed closers."""
    depth_stack = []
    in_str = False
    esc = False
    last_safe = 0  # index just after a completed top-level-ish value (comma or close)
    for i, ch in enumerate(txt):
        if esc:
            esc = False
            continue
        if ch == "\\" and in_str:
            esc = True
            continue
        if ch == '"':
            in_str = not in_str
            continue
        if in_str:
            continue
        if ch in "{[":
            depth_stack.append(ch)
        elif ch in "}]":
            if depth_stack:
                depth_stack.pop()
            last_safe = i + 1
        elif ch == ",":
            last_safe = i  # trim the trailing comma too
    # cut to last completed element, drop dangling partial
    core = txt[:last_safe].rstrip().rstrip(",")
    # recompute open structures for the trimmed core
    stack = []
    in_str = False
    esc = False
    for ch in core:
        if esc:
            esc = False
            continue
        if ch == "\\" and in_str:
            esc = True
            continue
        if ch == '"':
            in_str = not in_str
            continue
        if in_str:
            continue
        if ch in "{[":
            stack.append(ch)
        elif ch in "}]":
            if stack:
                stack.pop()
    closers = "".join("}" if c == "{" else "]" for c in reversed(stack))
    return core + closers


def call_llm(prompt, max_tokens=4000, retries=2):
    last = None
    for a in range(retries + 1):
        try:
            r = client().evaluate_prompt(prompt=prompt, system_message=SYS, llm_name=MODEL,
                                          max_tokens=max_tokens, temperature=0.0, response_type="json")
            return parse_json(r.content)
        except Exception as e:
            last = e
            try:
                with open("work/last_raw_fail.txt", "w") as _f:
                    _f.write(r.content)
            except Exception:
                pass
            time.sleep(1.5 * (a + 1))
    raise last


def pages_to_text(pages, mark=True):
    out = []
    for p in pages:
        if not p.get("text"):
            continue
        if mark:
            out.append(f"\n===== صفحه {p['page']} =====\n{p['text']}")
        else:
            out.append(p["text"])
    return "".join(out)


def chunk_pages(pages, size=CHUNK):
    chunks, cur, cur_len = [], [], 0
    for p in pages:
        t = p.get("text", "")
        seg = f"\n===== صفحه {p['page']} =====\n{t}"
        if cur_len + len(seg) > size and cur:
            chunks.append("".join(cur)); cur, cur_len = [], 0
        cur.append(seg); cur_len += len(seg)
    if cur:
        chunks.append("".join(cur))
    return chunks


def digest_single(meta, body):
    prompt = f"""زمینه رساله:
{DISS_CONTEXT}

اکنون منبع زیر را (نام فایل: «{meta['filename']}») به‌صورت عمیق تحلیلی–انتقادی بخوان و یک کارت مغزی کامل تولید کن. حداکثر ۷ ادعای کلیدی، ۶ گزیده قابل‌استناد و ۶ برچسب موضوعی بیاور.
شماره صفحه‌ها در متن با «===== صفحه N =====» مشخص شده‌اند؛ در ارجاعات از همان شماره‌ها استفاده کن. گزیده‌ها باید محتوایی و تحلیلی باشند؛ از فهرست منابع/کتاب‌نامه نقل‌قول نکن.
خروجی دقیقاً با این ساختار JSON (کلیدها انگلیسی، مقادیر تحلیلی فارسی):
{FULL_SCHEMA}

متن منبع:
{body}"""
    d = call_llm(prompt, max_tokens=12000)
    return d


def digest_mapreduce(meta, pages, targeted=False):
    chunks = chunk_pages(pages)
    partials = []
    for i, ch in enumerate(chunks):
        p = f"""زمینه رساله:
{DISS_CONTEXT}

این بخش {i+1} از {len(chunks)} از منبع «{meta['filename']}» است. نکات مرتبط با پژوهش ما را استخراج کن.
فقط JSON با این ساختار برگردان:
{{"key_points":[{{"point_fa":"...","page":N}}],"quotes":[{{"quote":"عین متن","page":N,"note_fa":"..."}}],"themes":["..."],"gaps_fa":["..."]}}

متن:
{ch}"""
        try:
            partials.append(call_llm(p, max_tokens=2500))
        except Exception as e:
            partials.append({"key_points": [], "quotes": [], "themes": [], "gaps_fa": [], "_err": str(e)[:120]})
    # reduce
    red = f"""زمینه رساله:
{DISS_CONTEXT}

یادداشت‌های جزئی زیر از بخش‌های مختلف منبع «{meta['filename']}» استخراج شده‌اند{' (این یک اثر مرجع حجیم است و صفحات مرتبط به‌صورت هدف‌مند انتخاب شده‌اند)' if targeted else ''}.
آن‌ها را در یک کارت مغزی نهایی و منسجم ادغام کن. شماره صفحه‌ها را حفظ کن.
خروجی دقیقاً این ساختار JSON:
{FULL_SCHEMA}

یادداشت‌های جزئی (JSON):
{json.dumps(partials, ensure_ascii=False)[:120000]}"""
    d = call_llm(red, max_tokens=12000)
    return d


def select_relevant_pages(pages, keep=45):
    scored = []
    for p in pages:
        t = (p.get("text") or "").lower()
        if not t:
            continue
        score = sum(t.count(k) for k in RELEVANCE_KW)
        scored.append((score, p))
    scored.sort(key=lambda x: -x[0])
    top = [p for _, p in scored[:keep]]
    # always include first 3 and last 3 pages (intro/conclusion)
    head = pages[:3]; tail = pages[-3:]
    seen, out = set(), []
    for p in head + top + tail:
        if p["page"] not in seen:
            seen.add(p["page"]); out.append(p)
    out.sort(key=lambda p: p["page"])
    return out


def process(doc_id):
    outp = os.path.join(DIG, doc_id + ".json")
    if os.path.exists(outp):
        return doc_id, "skip", 0
    t0 = time.time()
    rec = json.load(open(os.path.join(EXT, doc_id + ".json"), encoding="utf-8"))
    meta = {k: rec[k] for k in ("id", "filename", "category", "relpath", "ext", "n_pages", "chars")}
    chars = rec["chars"]
    pages = rec["pages"]
    if chars <= T1_MAX:
        tier = 1
        d = digest_single(meta, pages_to_text(pages))
    elif chars <= T2_MAX:
        tier = 2
        d = digest_mapreduce(meta, pages)
    else:
        tier = 3
        sel = select_relevant_pages(pages)
        d = digest_mapreduce(meta, sel, targeted=True)
    d.update(meta)
    d["_tier"] = tier
    d["_elapsed"] = round(time.time() - t0, 1)
    if tier == 3:
        d["_note_targeted"] = "digest هدف‌مند از اثر مرجع حجیم (صفحات مرتبط انتخاب‌شده)"
    with _lock:
        json.dump(d, open(outp, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    return doc_id, f"T{tier}", d["_elapsed"]


def merge_brain():
    digs = []
    for fn in sorted(os.listdir(DIG)):
        if fn.endswith(".json"):
            digs.append(json.load(open(os.path.join(DIG, fn), encoding="utf-8")))
    digs.sort(key=lambda d: d["id"])
    brain = {"generated": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
             "count": len(digs), "sources": digs}
    json.dump(brain, open(BRAIN, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print(f"\nMerged {len(digs)} digests -> {BRAIN}")


def main():
    ids = [a for a in sys.argv[1:] if a.startswith("S")]
    if not ids:
        ids = sorted(f[:-5] for f in os.listdir(EXT) if f.endswith(".json"))
    todo = [i for i in ids if not os.path.exists(os.path.join(DIG, i + ".json"))]
    print(f"total={len(ids)} todo={len(todo)} done={len(ids)-len(todo)}")
    workers = int(os.environ.get("WORKERS", "6"))
    done = 0
    t0 = time.time()
    with ThreadPoolExecutor(max_workers=workers) as ex:
        futs = {ex.submit(process, i): i for i in todo}
        for fu in as_completed(futs):
            i = futs[fu]
            try:
                did, tag, el = fu.result()
                done += 1
                print(f"[{done}/{len(todo)}] {did} {tag} {el}s  ({(time.time()-t0):.0f}s elapsed)")
            except Exception as e:
                print(f"[ERR] {i}: {repr(e)[:160]}")
    merge_brain()


if __name__ == "__main__":
    main()
