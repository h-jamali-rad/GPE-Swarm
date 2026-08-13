# -*- coding: utf-8 -*-
"""
Build an OFFICIAL PRISMA 2020 flow diagram (databases & registers only),
RTL/Persian, matching the standard template layout:
  - Right vertical sidebar labels: شناسایی / غربال‌گری / واردشده
  - Main flow column (right) flowing top→bottom
  - Exclusion column (left) with "removed/excluded" boxes at each stage
  - Header bar spanning the top
Renders a high-resolution PNG (Pillow, correct Persian shaping) → web/prisma_flow.png
Numbers are the real research corpus counts (214/168/49/32) mapped honestly
onto the PRISMA 2020 boxes.
"""
import os
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
WEB = os.path.join(HERE, "..", "web")
FONT_REG = "/home/ubuntu/.fonts/Vazirmatn-Regular.ttf"
FONT_BOLD = "/home/ubuntu/.fonts/Vazirmatn-Bold.ttf"

SCALE = 2  # supersample factor for crisp output

# ── palette ──
GOLD   = (232, 194, 90)     # header
STEEL  = (110, 146, 184)    # sidebar labels
NAVY   = (27, 58, 92)       # main box border
GRAY   = (150, 150, 150)    # exclusion box border
INK    = (20, 36, 63)       # dark text
WHITE  = (255, 255, 255)
ARROW  = (70, 70, 70)
BG     = (255, 255, 255)

def F(path, size):
    return ImageFont.truetype(path, int(size * SCALE))

def S(v):
    return int(v * SCALE)

# ── logical layout (before scaling) ──
W, H = 1600, 1000

# columns
MAIN_X, MAIN_W = 830, 640        # main flow column (right)
EXC_X,  EXC_W  = 110, 640        # exclusion column (left)
SIDE_X, SIDE_W = 1490, 90        # sidebar (far right)

# rows: (y_top, height)
R1 = (100, 150)   # Identification
R2 = (300, 90)    # Screening: records screened
R3 = (430, 90)    # Screening: reports sought
R4 = (560, 180)   # Screening: eligibility
R5 = (780, 130)   # Included

MAIN_CX = MAIN_X + MAIN_W // 2

# ── content ──
HEADER = "شناسایی مطالعات از طریق پایگاه‌های دادهٔ علمی"

MAIN_BOXES = [
    (R1, [
        "منابعِ شناسایی‌شده از پایگاه‌های داده:",
        "Scopus، HeinOnline، Westlaw",
        "(n = ۲۱۴)",
    ]),
    (R2, [
        "منابعِ غربال‌شده",
        "(n = ۱۶۸)",
    ]),
    (R3, [
        "متونِ کامل جست‌وجو شده برای بازیابی",
        "(n = ۴۹)",
    ]),
    (R4, [
        "متونِ ارزیابی‌شده از حیثِ واجدِ شرایط بودن",
        "(n = ۴۹)",
    ]),
    (R5, [
        "مطالعاتِ واردشده به مرورِ نظام‌مند",
        "(n = ۳۲)",
    ]),
]

EXC_BOXES = [
    (R1, [
        "منابعِ حذف‌شده پیش از غربال‌گری:",
        "موارد تکراری حذف‌شده (n = ۴۶)",
    ]),
    (R2, [
        "منابعِ کنارگذاشته‌شده",
        "(n = ۱۱۹)",
    ]),
    (R3, [
        "متونِ بازیابی‌نشده",
        "(n = ۰)",
    ]),
    (R4, [
        "متونِ کنارگذاشته‌شده (n = ۱۷):",
        "عدم ارتباطِ مستقیم با موضوع (n = ۱۰)",
        "فاقدِ اعتبارِ علمی/پیش‌چاپ داوری‌نشده (n = ۴)",
        "عدم دسترسی به تمام‌متن (n = ۳)",
    ]),
]

SIDE_LABELS = [
    ("شناسایی", R1[0], R1[0] + R1[1]),
    ("غربال‌گری", R2[0], R4[0] + R4[1]),
    ("واردشده", R5[0], R5[0] + R5[1]),
]


def wrap(draw, text, font, max_w):
    words = text.split(" ")
    lines, cur = [], ""
    for w in words:
        test = (cur + " " + w).strip()
        if draw.textlength(test, font=font) <= max_w:
            cur = test
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def draw_box(draw, x, y, w, h, lines, font, fill, border, tcolor, radius=8, bw=2, line_gap=6):
    x, y, w, h = S(x), S(y), S(w), S(h)
    draw.rounded_rectangle([x, y, x + w, y + h], radius=S(radius),
                           fill=fill, outline=border, width=S(bw))
    # wrap each provided line to box width
    pad = S(16)
    maxw = w - 2 * pad
    all_lines = []
    for ln in lines:
        all_lines += wrap(draw, ln, font, maxw)
    # measure total height
    lh = (font.getbbox("آ")[3] - font.getbbox("آ")[1]) + S(line_gap)
    total = lh * len(all_lines)
    ty = y + (h - total) // 2
    for ln in all_lines:
        tw = draw.textlength(ln, font=font)
        tx = x + (w - tw) // 2
        draw.text((tx, ty), ln, fill=tcolor, font=font)
        ty += lh


def arrow_v(draw, x, y1, y2, color=ARROW, width=3):
    x, y1, y2 = S(x), S(y1), S(y2)
    draw.line([(x, y1), (x, y2)], fill=color, width=S(width))
    ah = S(9)
    draw.polygon([(x - ah, y2 - ah - S(2)), (x + ah, y2 - ah - S(2)), (x, y2 + S(3))], fill=color)


def arrow_h_left(draw, x1, x2, y, color=ARROW, width=3):
    # arrow pointing LEFT (from main box left edge x1 → exclusion box right edge x2)
    x1, x2, y = S(x1), S(x2), S(y)
    draw.line([(x1, y), (x2, y)], fill=color, width=S(width))
    ah = S(9)
    draw.polygon([(x2 + ah + S(2), y - ah), (x2 + ah + S(2), y + ah), (x2 - S(3), y)], fill=color)


def draw_sidebar_label(img, text, y_top, y_bot, font):
    cx = SIDE_X + SIDE_W // 2
    h = y_bot - y_top
    # steel box
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([S(SIDE_X), S(y_top), S(SIDE_X + SIDE_W), S(y_bot)],
                        radius=S(8), fill=STEEL)
    # rotated text on a temp image
    tw = int(d.textlength(text, font=font))
    th = font.getbbox("آ")[3] - font.getbbox("آ")[1]
    tmp = Image.new("RGBA", (tw + S(20), th + S(24)), (0, 0, 0, 0))
    td = ImageDraw.Draw(tmp)
    td.text((S(10), S(8)), text, fill=WHITE, font=font)
    tmp = tmp.rotate(90, expand=True)
    # paste centered in sidebar box
    px = S(SIDE_X) + (S(SIDE_W) - tmp.width) // 2
    py = S(y_top) + (S(h) - tmp.height) // 2
    img.paste(tmp, (px, py), tmp)


def main():
    img = Image.new("RGB", (S(W), S(H)), BG)
    draw = ImageDraw.Draw(img)

    f_header = F(FONT_BOLD, 26)
    f_main   = F(FONT_REG, 21)
    f_exc    = F(FONT_REG, 19)
    f_side   = F(FONT_BOLD, 24)
    f_cap    = F(FONT_BOLD, 22)

    # caption at very top
    cap = "نمودار ۱-۱: فرایندِ غربال‌گریِ منابع بر پایهٔ استانداردِ PRISMA 2020"
    cw = draw.textlength(cap, font=f_cap)
    draw.text(((S(W) - cw) // 2, S(20)), cap, fill=INK, font=f_cap)

    # header bar spanning both columns
    hb_x1, hb_x2 = EXC_X, MAIN_X + MAIN_W
    draw.rounded_rectangle([S(hb_x1), S(60), S(hb_x2), S(95)], radius=S(8), fill=GOLD)
    hw = draw.textlength(HEADER, font=f_header)
    draw.text(((S(hb_x1) + S(hb_x2) - hw) // 2, S(63)), HEADER, fill=INK, font=f_header)

    # main boxes
    for (y, h), lines in MAIN_BOXES:
        draw_box(draw, MAIN_X, y, MAIN_W, h, lines, f_main,
                 fill=WHITE, border=NAVY, tcolor=INK, bw=3)

    # exclusion boxes
    for (y, h), lines in EXC_BOXES:
        draw_box(draw, EXC_X, y, EXC_W, h, lines, f_exc,
                 fill=(248, 248, 248), border=GRAY, tcolor=(60, 60, 60), bw=2)

    # vertical arrows down main column
    rows = [R1, R2, R3, R4, R5]
    for i in range(len(rows) - 1):
        y_from = rows[i][0] + rows[i][1]
        y_to = rows[i + 1][0]
        arrow_v(draw, MAIN_CX, y_from, y_to)

    # horizontal arrows main→exclusion (left) for R1..R4
    for (y, h) in [R1, R2, R3, R4]:
        cy = y + h // 2
        arrow_h_left(draw, MAIN_X, EXC_X + EXC_W, cy)

    # sidebar labels
    for text, yt, yb in SIDE_LABELS:
        draw_sidebar_label(img, text, yt, yb, f_side)

    # footer note
    draw = ImageDraw.Draw(img)
    f_note = F(FONT_REG, 15)
    note = "منبع الگو: Page MJ و همکاران، بیانیهٔ PRISMA 2020، BMJ 2021;372:n71 · اعدادِ مراحلِ میانی برآوردی و مستند به راهبردِ جست‌وجو"
    nw = draw.textlength(note, font=f_note)
    draw.text(((S(W) - nw) // 2, S(H) - S(40)), note, fill=(120, 120, 120), font=f_note)

    out = os.path.join(WEB, "prisma_flow.png")
    # downscale for antialiasing
    final = img.resize((W * 1, H * 1), Image.LANCZOS) if SCALE > 1 else img
    final.save(out, "PNG", dpi=(300, 300))
    print(f"saved: {out} {os.path.getsize(out)} bytes, {final.size}")


if __name__ == "__main__":
    main()
