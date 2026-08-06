# -*- coding: utf-8 -*-
"""
Build the doctoral dissertation DRAFT as a .docx compliant with the 1400 thesis-writing
guideline (Islamic Azad University). RTL + justified, B Nazanin (Persian) + Times New Roman
(English), real Word footnotes, clickable TOC field, A4, margins right3/left3/top3.5/bottom3 cm.
"""
import re
import thesis_content as C
from docx import Document
from docx.shared import Pt, Mm, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.opc.part import Part
from docx.opc.packuri import PackURI

FA_FONT = "B Nazanin"
EN_FONT = "Times New Roman"
W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"

def w(tag):
    return qn("w:" + tag)

# ----------------------------------------------------------------- helpers
def set_run_fonts(run, fa_pt, en_pt, bold=False, color=None):
    rpr = run._r.get_or_add_rPr()
    rfonts = rpr.find(w("rFonts"))
    if rfonts is None:
        rfonts = OxmlElement("w:rFonts"); rpr.insert(0, rfonts)
    rfonts.set(w("ascii"), EN_FONT); rfonts.set(w("hAnsi"), EN_FONT); rfonts.set(w("cs"), FA_FONT)
    sz = OxmlElement("w:sz"); sz.set(w("val"), str(int(en_pt*2))); rpr.append(sz)
    szcs = OxmlElement("w:szCs"); szcs.set(w("val"), str(int(fa_pt*2))); rpr.append(szcs)
    rtl = OxmlElement("w:rtl"); rtl.set(w("val"), "1"); rpr.append(rtl)
    if bold:
        b = OxmlElement("w:b"); rpr.append(b)
        bcs = OxmlElement("w:bCs"); rpr.append(bcs)
    if color is not None:
        c = OxmlElement("w:color"); c.set(w("val"), color); rpr.append(c)

def make_rtl(paragraph, justify=True):
    ppr = paragraph._p.get_or_add_pPr()
    bidi = OxmlElement("w:bidi"); bidi.set(w("val"), "1"); ppr.append(bidi)
    if justify:
        paragraph.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY

# ----------------------------------------------------------------- footnotes
class Footnotes:
    def __init__(self, doc):
        self.doc = doc; self.items = []; self._next_id = 1
    def add(self, paragraph, text):
        fid = self._next_id; self._next_id += 1
        self.items.append((fid, text))
        run = paragraph.add_run()
        rpr = run._r.get_or_add_rPr()
        rstyle = OxmlElement("w:rStyle"); rstyle.set(w("val"), "FootnoteReference"); rpr.append(rstyle)
        rtl = OxmlElement("w:rtl"); rtl.set(w("val"), "1"); rpr.append(rtl)
        ref = OxmlElement("w:footnoteReference"); ref.set(w("id"), str(fid))
        run._r.append(ref)
        return fid
    def _fn_paragraph_xml(self, fid, text):
        esc = (text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"))
        return (
            f'<w:footnote w:id="{fid}">'
            f'<w:p><w:pPr><w:pStyle w:val="FootnoteText"/><w:bidi w:val="1"/>'
            f'<w:jc w:val="both"/></w:pPr>'
            f'<w:r><w:rPr><w:rStyle w:val="FootnoteReference"/><w:rtl w:val="1"/></w:rPr>'
            f'<w:footnoteRef/></w:r>'
            f'<w:r><w:rPr><w:rFonts w:ascii="{EN_FONT}" w:hAnsi="{EN_FONT}" w:cs="{FA_FONT}"/>'
            f'<w:sz w:val="18"/><w:szCs w:val="22"/><w:rtl w:val="1"/></w:rPr>'
            f'<w:t xml:space="preserve"> {esc}</w:t></w:r></w:p></w:footnote>'
        )
    def finalize(self):
        parts = [
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
            f'<w:footnotes xmlns:w="{W}">',
            '<w:footnote w:type="separator" w:id="-1"><w:p><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:r><w:separator/></w:r></w:p></w:footnote>',
            '<w:footnote w:type="continuationSeparator" w:id="0"><w:p><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:r><w:continuationSeparator/></w:r></w:p></w:footnote>',
        ]
        for fid, text in self.items:
            parts.append(self._fn_paragraph_xml(fid, text))
        parts.append('</w:footnotes>')
        xml = "".join(parts).encode("utf-8")
        partname = PackURI("/word/footnotes.xml")
        ct = "application/vnd.openxmlformats-officedocument.wordprocessingml.footnotes+xml"
        fn_part = Part(partname, ct, xml, self.doc.part.package)
        reltype = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/footnotes"
        self.doc.part.relate_to(fn_part, reltype)

# ----------------------------------------------------------------- styles
def build_styles(doc):
    from docx.enum.style import WD_STYLE_TYPE
    styles = doc.styles
    normal = styles["Normal"]
    normal.font.name = EN_FONT; normal.font.size = Pt(14)
    rpr = normal.element.get_or_add_rPr()
    rfonts = rpr.find(w("rFonts"))
    if rfonts is None:
        rfonts = OxmlElement("w:rFonts"); rpr.insert(0, rfonts)
    rfonts.set(w("ascii"), EN_FONT); rfonts.set(w("hAnsi"), EN_FONT); rfonts.set(w("cs"), FA_FONT)
    szcs = OxmlElement("w:szCs"); szcs.set(w("val"), "28"); rpr.append(szcs)
    if "FootnoteText" not in [s.name for s in styles]:
        fts = styles.add_style("FootnoteText", WD_STYLE_TYPE.PARAGRAPH)
        fts.font.name = EN_FONT; fts.font.size = Pt(9)
        fts.paragraph_format.space_after = Pt(0)
    if "FootnoteReference" not in [s.name for s in styles]:
        frs = styles.add_style("FootnoteReference", WD_STYLE_TYPE.CHARACTER)
        frs.font.size = Pt(9)
        va = OxmlElement("w:vertAlign"); va.set(w("val"), "superscript")
        frs.element.get_or_add_rPr().append(va)

# ----------------------------------------------------------------- content builders
FN_RE = re.compile(r"\{\{fn:(.*?)\}\}", re.S)

def add_body_paragraph(doc, fns, text, fa_pt=14, en_pt=12, bold=False,
                       align_justify=True, space_after=6, first_indent=7):
    p = doc.add_paragraph()
    make_rtl(p, justify=align_justify)
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.line_spacing = 1.15
    if first_indent:
        p.paragraph_format.first_line_indent = Mm(first_indent)
    pos = 0
    for m in FN_RE.finditer(text):
        pre = text[pos:m.start()]
        if pre:
            r = p.add_run(pre); set_run_fonts(r, fa_pt, en_pt, bold=bold)
        fns.add(p, m.group(1).strip())
        pos = m.end()
    tail = text[pos:]
    if tail:
        r = p.add_run(tail); set_run_fonts(r, fa_pt, en_pt, bold=bold)
    return p

def add_heading(doc, num, title, level):
    style = {1: "Heading 1", 2: "Heading 2", 3: "Heading 3"}[level]
    p = doc.add_paragraph(style=doc.styles[style])
    make_rtl(p, justify=False)
    if level == 1:
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_before = Pt(18); p.paragraph_format.space_after = Pt(14)
        r = p.add_run(f"{num}\n"); set_run_fonts(r, 16, 14, bold=True, color="000000")
        r2 = p.add_run(title); set_run_fonts(r2, 15, 13, bold=True, color="000000")
    else:
        p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        p.paragraph_format.space_before = Pt(10); p.paragraph_format.space_after = Pt(6)
        fa = 14 if level == 2 else 13
        r = p.add_run(f"{num}  {title}"); set_run_fonts(r, fa, 12, bold=True, color="000000")
    return p

def add_toc(doc):
    p = doc.add_paragraph()
    make_rtl(p, justify=False); p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    run = p.add_run()
    fldBegin = OxmlElement("w:fldChar"); fldBegin.set(w("fldCharType"), "begin")
    instr = OxmlElement("w:instrText"); instr.set(qn("xml:space"), "preserve")
    instr.text = 'TOC \\o "1-3" \\h \\z \\u'
    fldSep = OxmlElement("w:fldChar"); fldSep.set(w("fldCharType"), "separate")
    t = OxmlElement("w:t"); t.text = "برای به‌روزرسانی فهرست مطالب، روی آن کلیک کرده و کلید F9 را فشار دهید."
    fldEnd = OxmlElement("w:fldChar"); fldEnd.set(w("fldCharType"), "end")
    r = run._r
    r.append(fldBegin); r.append(instr); r.append(fldSep); r.append(t); r.append(fldEnd)

def enable_update_fields(doc):
    settings = doc.settings.element
    uf = OxmlElement("w:updateFields"); uf.set(w("val"), "true"); settings.append(uf)

def set_rtl_section(doc):
    for section in doc.sections:
        sectPr = section._sectPr
        bidi = OxmlElement("w:bidi"); sectPr.append(bidi)

def centered(doc, text, fa_pt, en_pt, bold=False, space_after=6, space_before=0):
    p = doc.add_paragraph(); make_rtl(p, justify=False)
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.space_before = Pt(space_before)
    r = p.add_run(text); set_run_fonts(r, fa_pt, en_pt, bold=bold)
    return p

# ----------------------------------------------------------------- main
def main():
    doc = Document()
    build_styles(doc)
    fns = Footnotes(doc)

    sec = doc.sections[0]
    sec.page_height = Mm(297); sec.page_width = Mm(210)
    sec.top_margin = Cm(3.5); sec.bottom_margin = Cm(3.0)
    sec.right_margin = Cm(3.0); sec.left_margin = Cm(3.0)

    # ---------------- TITLE PAGE
    centered(doc, "بسم‌الله الرحمن الرحیم", 14, 12, bold=False, space_after=24)
    centered(doc, C.UNIVERSITY, 16, 13, bold=True, space_after=2)
    centered(doc, C.BRANCH, 15, 12, bold=True, space_after=2)
    centered(doc, C.FACULTY, 14, 12, bold=True, space_after=20)
    centered(doc, C.DEGREE, 14, 12, bold=False, space_after=18)
    centered(doc, "عنوان:", 14, 12, bold=False, space_after=4)
    centered(doc, C.TITLE, 17, 14, bold=True, space_after=22)
    centered(doc, C.SUPERVISOR, 14, 12, bold=False, space_after=4)
    centered(doc, C.ADVISOR, 14, 12, bold=False, space_after=4)
    centered(doc, C.AUTHOR, 14, 12, bold=False, space_after=22)
    centered(doc, C.YEAR, 14, 12, bold=False, space_after=6)
    doc.add_page_break()

    # ---------------- ABSTRACT
    p = doc.add_paragraph(); make_rtl(p, justify=False); p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_after = Pt(10)
    r = p.add_run("چکیده"); set_run_fonts(r, 14, 12, bold=True)
    add_body_paragraph(doc, fns, C.ABSTRACT, fa_pt=13, en_pt=11, space_after=8, first_indent=0)
    p = doc.add_paragraph(); make_rtl(p); p.paragraph_format.space_after = Pt(14)
    r = p.add_run("کلیدواژه‌ها: "); set_run_fonts(r, 13, 11, bold=True)
    r2 = p.add_run(C.KEYWORDS); set_run_fonts(r2, 13, 11, bold=False)
    doc.add_page_break()

    # ---------------- TOC
    p = doc.add_paragraph(); make_rtl(p, justify=False); p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_after = Pt(10)
    r = p.add_run("فهرست مطالب"); set_run_fonts(r, 14, 12, bold=True)
    add_toc(doc)
    doc.add_page_break()

    # ---------------- BODY
    for block in C.BLOCKS:
        t = block[0]
        if t == "h1":
            add_heading(doc, block[1], block[2], 1)
        elif t == "h2":
            add_heading(doc, block[1], block[2], 2)
        elif t == "h3":
            add_heading(doc, block[1], block[2], 3)
        elif t == "p":
            add_body_paragraph(doc, fns, block[1], fa_pt=14, en_pt=12, space_after=6, first_indent=7)

    # ---------------- REFERENCES
    doc.add_page_break()
    p = doc.add_paragraph(style=doc.styles["Heading 1"]); make_rtl(p, justify=False)
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER; p.paragraph_format.space_after = Pt(12)
    r = p.add_run("فهرست منابع"); set_run_fonts(r, 15, 13, bold=True, color="000000")

    p = doc.add_paragraph(); make_rtl(p, justify=False); p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    r = p.add_run("الف) منابع فارسی"); set_run_fonts(r, 14, 12, bold=True)
    for ref in C.REFS_FA:
        add_body_paragraph(doc, fns, ref, fa_pt=11, en_pt=11, space_after=4, first_indent=0)

    p = doc.add_paragraph(); make_rtl(p, justify=False); p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    p.paragraph_format.space_before = Pt(8)
    r = p.add_run("ب) منابع انگلیسی"); set_run_fonts(r, 14, 12, bold=True)
    for ref in C.REFS_EN:
        p = doc.add_paragraph(); make_rtl(p, justify=True)
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        p.paragraph_format.space_after = Pt(4); p.paragraph_format.line_spacing = 1.15
        r = p.add_run(ref); set_run_fonts(r, 11, 11, bold=False)

    # heading styles: RTL + B Nazanin + black
    for hname in ("Heading 1", "Heading 2", "Heading 3"):
        st = doc.styles[hname]
        st.font.name = EN_FONT; st.font.color.rgb = RGBColor(0, 0, 0)
        rpr = st.element.get_or_add_rPr()
        rf = rpr.find(w("rFonts"))
        if rf is None:
            rf = OxmlElement("w:rFonts"); rpr.insert(0, rf)
        rf.set(w("cs"), FA_FONT); rf.set(w("ascii"), EN_FONT); rf.set(w("hAnsi"), EN_FONT)

    fns.finalize()
    set_rtl_section(doc)
    enable_update_fields(doc)
    out = "/home/ubuntu/gpe-swarm/07_outputs/رساله_پیش‌نویس_پیمان‌جهانی‌محیط‌زیست.docx"
    doc.save(out)
    print("saved:", out)

if __name__ == "__main__":
    main()
