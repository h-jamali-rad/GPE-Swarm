# -*- coding: utf-8 -*-
"""Parse the user's real chapter drafts (docx) into a structured section tree
with inline footnote markers preserved. Output: intermediate dict used by
build_thesis_json.py"""
import docx, re, json
from docx.oxml.ns import qn
from lxml import etree

def load_footnotes(doc):
    fnmap = {}
    for rel in doc.part.rels.values():
        if 'footnotes' in rel.reltype:
            root = etree.fromstring(rel.target_part.blob)
            for f in root.findall(qn('w:footnote')):
                fid = f.get(qn('w:id'))
                txt = ''.join(t.text or '' for t in f.iter(qn('w:t'))).strip()
                fnmap[fid] = txt
    return fnmap

def para_text_with_fn(p, fnmap, fn_collector):
    """Return paragraph text with inline {{fn:i}} markers; append fn texts to collector."""
    out = []
    for child in p._p.iter():
        tag = child.tag
        if tag == qn('w:t'):
            out.append(child.text or '')
        elif tag == qn('w:footnoteReference'):
            fid = child.get(qn('w:id'))
            if fid in fnmap and fnmap[fid]:
                fn_collector.append(fnmap[fid])
                out.append('{{fn:%d}}' % len(fn_collector))
    return ''.join(out)

# heading detection: e.g. 2-1-1-1 ...  or 3-1-2-2-1 ...
HEAD_RE = re.compile(r'^\s*(\d+(?:\s*[-–]\s*\d+){0,5})\s+(.*)')

def parse_draft(path):
    doc = docx.Document(path)
    fnmap = load_footnotes(doc)
    sections = []   # flat list: {num, level, title, paras:[{text}], fns:[...]}
    cur = None
    intro_paras = []
    title = None
    for p in doc.paragraphs:
        t = p.text.strip()
        if not t:
            continue
        m = HEAD_RE.match(t)
        # chapter title line
        if title is None and t.startswith('فصل'):
            title = t
            continue
        if t == 'مقدمه':
            cur = {'num': '', 'level': 0, 'title': 'مقدمه', 'paras': [], 'fns': []}
            sections.append(cur)
            continue
        if m and len(m.group(1).replace(' ', '')) <= 12 and len(t) < 90:
            num = re.sub(r'\s+', '', m.group(1))
            level = num.count('-')
            cur = {'num': num, 'level': level, 'title': m.group(2).strip(), 'paras': [], 'fns': []}
            sections.append(cur)
            continue
        # body paragraph
        if cur is None:
            cur = {'num': '', 'level': 0, 'title': 'مقدمه', 'paras': [], 'fns': []}
            sections.append(cur)
        fns = cur['fns']
        txt = para_text_with_fn(p, fnmap, fns)
        cur['paras'].append(txt)
    return {'title': title, 'sections': sections}

if __name__ == '__main__':
    import sys
    for f in ['/home/ubuntu/Uploads/پیش نویس فصل دوم 6 دی- 57 ص.docx',
              '/home/ubuntu/Uploads/پیش نویس فصل سوم-قسمت اول+.docx']:
        d = parse_draft(f)
        print('====', d['title'])
        print('sections:', len(d['sections']))
        tot_paras = sum(len(s['paras']) for s in d['sections'])
        tot_fns = sum(len(s['fns']) for s in d['sections'])
        print('paras:', tot_paras, 'fns:', tot_fns)
        for s in d['sections'][:6]:
            print(' ', s['num'], s['level'], s['title'][:50], '| paras', len(s['paras']), '| fns', len(s['fns']))
