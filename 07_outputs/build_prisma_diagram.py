# -*- coding: utf-8 -*-
"""
Build the OFFICIAL PRISMA 2020 flow diagram — "Identification of studies via
databases and registers" template — in RTL/Persian, filled with the project's
REAL research numbers (read from web/db_mining.json → prisma block).

Layout faithfully mirrors the standard template (Page et al. 2021) but RTL:
  · Top header bar spanning the two columns
  · Right vertical sidebar labels: شناسایی / غربال‌گری / واردشده
  · Main flow column (right) top→bottom
  · Exclusion column (left) with a "removed/excluded" box at each stage
  · Horizontal arrows main→exclusion; vertical arrows down the main column
No external source/citation line is drawn on the figure.
Output: web/prisma_flow.png (high-res, Pillow with correct Persian shaping).
"""
import os, json
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
WEB = os.path.join(HERE, "..", "web")
FONT_REG = "/home/ubuntu/.fonts/Vazirmatn-Regular.ttf"
FONT_BOLD = "/home/ubuntu/.fonts/Vazirmatn-Bold.ttf"

SCALE = 2  # supersample for crisp text

# palette (match standard template)
GOLD  = (236, 199, 96)
STEEL = (155, 180, 205)
BORDER = (90, 90, 90)
INK = (25, 25, 25)
WHITE = (255, 255, 255)
ARROW = (60, 60, 60)
BG = (255, 255, 255)


def F(path, size):
    return ImageFont.truetype(path, int(size * SCALE))


def P(v):
    return int(v * SCALE)


def load_prisma():
    d = json.load(open(os.path.join(WEB, "db_mining.json"), encoding="utf-8"))
    return d["prisma"]


def fa_num(n):
    """Latin int → Persian digits."""
    tr = str.maketrans("0123456789", "۰۱۲۳۴۵۶۷۸۹")
    return str(n).translate(tr)


def wrap(draw, text, font, max_w):
    out = []
    for para in text.split("\n"):
        words = para.split(" ")
        cur = ""
        for w in words:
            test = (cur + " " + w).strip()
            if draw.textlength(test, font=font) <= max_w:
                cur = test
            else:
                if cur:
                    out.append(cur)
                cur = w
        out.append(cur)
    return out


def draw_box(img, draw, x, y, w, h, lines, font, fill, tcolor, bw=2, align="center", lead=None):
    x, y, w, h = P(x), P(y), P(w), P(h)
    draw.rectangle([x, y, x + w, y + h], fill=fill, outline=BORDER, width=P(bw))
    pad = P(14)
    maxw = w - 2 * pad
    wrapped = []
    lead_flags = []
    for i, ln in enumerate(lines):
        sub = wrap(draw, ln, font, maxw)
        for j, s in enumerate(sub):
            wrapped.append(s)
            # first line of a "lead" entry gets a slightly different treatment (none for now)
            lead_flags.append(False)
    asc = font.getbbox("آ")[3] - font.getbbox("آ")[1]
    lh = asc + P(9)
    total = lh * len(wrapped)
    ty = y + (h - total) // 2
    for ln in wrapped:
        tw = draw.textlength(ln, font=font)
        if align == "center":
            tx = x + (w - tw) // 2
        else:  # right align (RTL start)
            tx = x + w - pad - tw
        draw.text((tx, ty), ln, fill=tcolor, font=font)
        ty += lh


def arrow_v(draw, x, y1, y2):
    x, y1, y2 = P(x), P(y1), P(y2)
    draw.line([(x, y1), (x, y2)], fill=ARROW, width=P(2.4))
    a = P(8)
    draw.polygon([(x - a, y2 - a - P(1)), (x + a, y2 - a - P(1)), (x, y2 + P(3))], fill=ARROW)


def arrow_h_left(draw, x_from, x_to, y):
    """Arrow from main-box left edge (x_from) pointing LEFT to exclusion right edge (x_to)."""
    x_from, x_to, y = P(x_from), P(x_to), P(y)
    draw.line([(x_from, y), (x_to, y)], fill=ARROW, width=P(2.4))
    a = P(8)
    draw.polygon([(x_to + a + P(1), y - a), (x_to + a + P(1), y + a), (x_to - P(3), y)], fill=ARROW)


def draw_sidebar(img, text, y_top, y_bot, font, sx, sw):
    d = ImageDraw.Draw(img)
    d.rectangle([P(sx), P(y_top), P(sx + sw), P(y_bot)], fill=STEEL, outline=BORDER, width=P(1.5))
    tw = int(d.textlength(text, font=font))
    th = font.getbbox("آ")[3] - font.getbbox("آ")[1]
    tmp = Image.new("RGBA", (tw + P(24), th + P(28)), (0, 0, 0, 0))
    td = ImageDraw.Draw(tmp)
    td.text((P(12), P(10)), text, fill=INK, font=font)
    tmp = tmp.rotate(90, expand=True)
    px = P(sx) + (P(sw) - tmp.width) // 2
    py = P(y_top) + (P(y_bot - y_top) - tmp.height) // 2
    img.paste(tmp, (px, py), tmp)


def main():
    p = load_prisma()
    N = lambda k: fa_num(p[k])

    # ── logical canvas ──
    W, H = 1680, 1180

    # columns (RTL: main flow on the RIGHT, exclusions on the LEFT)
    MAIN_X, MAIN_W = 840, 610
    EXC_X,  EXC_W  = 150, 610
    SIDE_X, SIDE_W = 1470, 95
    MAIN_CX = MAIN_X + MAIN_W // 2

    # rows: (y_top, height)
    R_ID  = (110, 165)   # identification
    R_SC1 = (330, 95)    # records screened
    R_SC2 = (470, 95)    # reports sought
    R_SC3 = (610, 175)   # eligibility
    R_INC = (840, 130)   # included

    f_header = F(FONT_BOLD, 27)
    f_main   = F(FONT_REG, 21)
    f_exc    = F(FONT_REG, 19)
    f_side   = F(FONT_BOLD, 25)
    f_cap    = F(FONT_BOLD, 24)

    img = Image.new("RGB", (P(W), P(H)), BG)
    draw = ImageDraw.Draw(img)

    # figure caption (top) — NO external source citation
    cap = "نمودار ۱-۱ · فرایندِ غربال‌گریِ منابعِ پژوهش (الگوی PRISMA 2020 — پایگاه‌های داده و ثبت‌ها)"
    cw = draw.textlength(cap, font=f_cap)
    draw.text(((P(W) - cw) // 2, P(24)), cap, fill=INK, font=f_cap)

    # header bar across both columns
    hb_x1, hb_x2 = EXC_X, MAIN_X + MAIN_W
    draw.rectangle([P(hb_x1), P(66), P(hb_x2), P(102)], fill=GOLD, outline=BORDER, width=P(1.5))
    header = "شناساییِ مطالعات از طریقِ پایگاه‌های دادهٔ استنادی و ثبت‌ها"
    hw = draw.textlength(header, font=f_header)
    draw.text(((P(hb_x1) + P(hb_x2) - hw) // 2, P(70)), header, fill=INK, font=f_header)

    # ── MAIN boxes ──
    main_boxes = [
        (R_ID, [
            "منابعِ شناسایی‌شده از:",
            f"پایگاه‌های دادهٔ استنادی (n = {N('identified_databases')})",
            f"ثبت‌ها و منابعِ اولیه (n = {N('identified_registers')})",
        ]),
        (R_SC1, [
            "منابعِ غربال‌شده",
            f"(n = {N('screened')})",
        ]),
        (R_SC2, [
            "متونِ کامل درخواست‌شده برای بازیابی",
            f"(n = {N('sought_retrieval')})",
        ]),
        (R_SC3, [
            "متونِ ارزیابی‌شده از حیثِ واجدِ شرایط بودن",
            f"(n = {N('eligibility_assessed')})",
        ]),
        (R_INC, [
            "مطالعاتِ واردشده به مرورِ نظام‌مند",
            f"(n = {N('included')})",
            f"از پایگاه‌ها: {N('included_from_databases')}  |  از ثبت‌ها/منابعِ اولیه: {N('included_from_registers')}",
        ]),
    ]
    for (y, h), lines in main_boxes:
        draw_box(img, draw, MAIN_X, y, MAIN_W, h, lines, f_main, WHITE, INK, bw=2.4)

    # ── EXCLUSION boxes ──
    reasons = p["eligibility_excluded_reasons"]
    exc_boxes = [
        (R_ID, [
            "منابعِ حذف‌شده پیش از غربال‌گری:",
            f"موارد تکراری حذف‌شده (n = {N('duplicates_removed')})",
        ]),
        (R_SC1, [
            "منابعِ کنارگذاشته‌شده",
            f"(n = {N('screening_excluded')})",
        ]),
        (R_SC2, [
            "متونِ بازیابی‌نشده",
            f"(n = {N('not_retrieved')})",
        ]),
        (R_SC3, [
            f"متونِ کنارگذاشته با دلیل (n = {N('eligibility_excluded_total')}):",
            f"{reasons[0][0]} (n = {fa_num(reasons[0][1])})",
            f"{reasons[1][0]} (n = {fa_num(reasons[1][1])})",
            f"{reasons[2][0]} (n = {fa_num(reasons[2][1])})",
        ]),
    ]
    for (y, h), lines in exc_boxes:
        draw_box(img, draw, EXC_X, y, EXC_W, h, lines, f_exc, (247, 247, 247), (45, 45, 45),
                 bw=1.8, align="right")

    # ── arrows ──
    rows = [R_ID, R_SC1, R_SC2, R_SC3, R_INC]
    for i in range(len(rows) - 1):
        y_from = rows[i][0] + rows[i][1]
        y_to = rows[i + 1][0]
        arrow_v(draw, MAIN_CX, y_from, y_to)
    for (y, h) in [R_ID, R_SC1, R_SC2, R_SC3]:
        cy = y + h // 2
        arrow_h_left(draw, MAIN_X, EXC_X + EXC_W, cy)

    # ── sidebar labels ──
    draw_sidebar(img, "شناسایی", R_ID[0], R_ID[0] + R_ID[1], f_side, SIDE_X, SIDE_W)
    draw_sidebar(img, "غربال‌گری", R_SC1[0], R_SC3[0] + R_SC3[1], f_side, SIDE_X, SIDE_W)
    draw_sidebar(img, "واردشده", R_INC[0], R_INC[0] + R_INC[1], f_side, SIDE_X, SIDE_W)

    out = os.path.join(WEB, "prisma_flow.png")
    img.save(out, "PNG", dpi=(300, 300))
    print(f"saved: {out} {os.path.getsize(out)} bytes, {img.size}")
    print(f"included={p['included']} (db {p['included_from_databases']} + reg {p['included_from_registers']}), preprints={p['preprints_flagged']}")


if __name__ == "__main__":
    main()
