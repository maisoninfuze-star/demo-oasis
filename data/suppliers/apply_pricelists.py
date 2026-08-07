#!/usr/bin/env python3
"""Apply the owner's supplier price-list PDFs to the catalogue.

Rule per supplier WITH a PDF (each PDF applies ONLY to its own supplier):
  - item's SKU found in the PDF  -> retail price = net x 2 x 1.15 (rounded to $)
  - item's SKU NOT in the PDF    -> delisted (hidden from the site, kept in
                                    the JSON so a future pricelist can revive it)
Suppliers without a PDF are untouched.

PDFs:
  Matrix  '2026 Matrix Furniture Group - Toronto Pricelist - Alpha JULY 2026.pdf'
  A-Class 'A-CLASS UPHOLSTERY PRICE LIST 2024.pdf'
  Mazin   'Price_List_GTA 2026.pdf' (identified by 57% direct SKU overlap)
"""
import json, os, re
import pdfplumber

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
MARGIN = lambda net: round(net * 3.15)   # owner: pdf price x 3.15

def money(s):
    s = s.replace(',', '').replace(' ', '')
    try: return float(s)
    except ValueError: return None

# ---------------- Mazin: 'Price_List_GTA 2026.pdf' ----------------
COLOUR_WORDS = r'beige|black|brown|blue|grey|gray|white|red|green|gold|silver|walnut|espresso|cherry|oak|natural|mustard|yellow|teal|navy|cream|ivory|charcoal|dark|light'
def parse_mazin():
    prices = {}   # 4-5 digit base -> min net price
    detail = {}   # base -> {clean-description: net}
    pat = re.compile(r'\b(\d{3,5})[A-Z0-9-]*\b\s+(.*?)\$\s*([\d ,]+\.?\d{0,2})')
    with pdfplumber.open(os.path.join(ROOT, 'Price_List_GTA 2026.pdf')) as pdf:
        for pg in pdf.pages:
            for line in (pg.extract_text() or '').split('\n'):
                m = pat.search(line)
                if not m: continue
                base, desc, val = m.group(1), m.group(2), money(m.group(3))
                if val and 20 <= val <= 20000:
                    prices[base] = min(prices.get(base, 1e9), val)
                    clean = re.sub(COLOUR_WORDS, '', desc, flags=re.I)
                    clean = re.sub(r'\b\d+/ctn\b|\(#\)|[^A-Za-z /&-]', ' ', clean)
                    clean = re.sub(r'\s+', ' ', clean).strip(' -/').strip()
                    if len(clean) >= 4:
                        detail.setdefault(base, {})
                        detail[base][clean] = min(detail[base].get(clean, 1e9), val)
    parse_mazin.detail = detail
    return prices

# ---------------- A-Class: per-piece rows under an item code ----------------
def parse_aclass():
    prices = {}   # (code, piece) -> net ; also (code, None) -> sofa/base price
    code = None
    piece_pat = re.compile(r'^(Sofa|Loveseat|Chair|Ottoman|Sectional|Chaise)\b', re.I)
    with pdfplumber.open(os.path.join(ROOT, 'A-CLASS UPHOLSTERY PRICE LIST 2024.pdf')) as pdf:
        for pg in pdf.pages:
            for line in (pg.extract_text() or '').split('\n'):
                mcode = re.match(r'^(\d{3,4})\s+(Sofa|Loveseat|Chair|Ottoman|Sectional|Chaise)?', line)
                if mcode and mcode.group(1):
                    code = mcode.group(1)
                if not code: continue
                dollars = re.findall(r'\$([\d,]+)', line)
                if dollars:
                    net = money(dollars[0])          # first column = Fabrics tier
                    if net and 50 <= net <= 20000:
                        piece = None
                        if re.search(r'total price', line, re.I):
                            piece = 'set'
                        else:
                            pm = re.search(r'\b(Sofa|Loveseat|Chair|Ottoman|Sectional|Chaise)\b', line, re.I)
                            if pm: piece = pm.group(1).lower()
                        if piece:
                            prices[(code, piece)] = min(prices.get((code, piece), 1e9), net)
                            prices.setdefault((code, None), net)
    return prices

# ---------------- Matrix: two-column pages, collection blocks ----------------
def parse_matrix():
    prices = {}   # collection code -> {label: net}
    name_prices = {}  # normalized collection NAME -> {label: net}
    codenames = {}    # code -> display name
    fname = os.path.join(ROOT, '2026 Matrix Furniture Group - Toronto Pricelist - Alpha JULY 2026.pdf')
    head_pat = re.compile(r'^(\d{3,4})\s+([A-Z][A-Z ]{2,24})')
    with pdfplumber.open(fname) as pdf:
        for pg in pdf.pages:
            words = pg.extract_words()
            mid = pg.width / 2
            for half in ((0, mid), (mid, pg.width)):
                col = [w for w in words if half[0] <= w['x0'] < half[1]]
                lines = {}
                for w in col:
                    lines.setdefault(round(w['top'] / 6), []).append(w)
                text_lines = []
                for k in sorted(lines):
                    text_lines.append(' '.join(w['text'] for w in sorted(lines[k], key=lambda x: x['x0'])))
                cur = curname = None
                for line in text_lines:
                    h = head_pat.match(line)
                    if h:
                        cur = h.group(1)
                        curname = re.sub(r'[^A-Z]', '', h.group(2))
                        codenames.setdefault(cur, h.group(2).strip().title())
                    if cur:
                        for d in re.findall(r'\$\s*([\d ,]+)', line):
                            v = money(d)
                            if v and 50 <= v <= 30000:
                                label = re.sub(r'\$.*$', '', line).strip().lower()
                                prices.setdefault(cur, {})
                                prices[cur][label] = min(prices[cur].get(label, 1e9), v)
                                if curname and len(curname) >= 4:
                                    name_prices.setdefault(curname, {})
                                    name_prices[curname][label] = min(name_prices[curname].get(label, 1e9), v)
    return {'codes': prices, 'names': name_prices, 'codenames': codenames}

# ---------------- apply to a supplier feed ----------------
def apply(slug, pricemap, key_fn):
    path = os.path.join(HERE, f'{slug}.json')
    d = json.load(open(path))
    priced = delisted = 0
    for it in d['items']:
        if it.get('synth'):
            continue          # synthesized configs carry their own pdf price
        it.pop('delisted', None)
        net = key_fn(it, pricemap)
        if net:
            it['net'] = net
            it['price'] = str(MARGIN(net))
            it['from'] = True          # configs/colours vary; price is "from"
            priced += 1
        else:
            it['delisted'] = True
            it.pop('price', None); it.pop('net', None)
            delisted += 1
    json.dump(d, open(path, 'w'), ensure_ascii=False, indent=1)
    print(f"{slug:8s} priced {priced}, delisted {delisted}, total {len(d['items'])}")

def mazin_key(it, pm):
    sku = str(it.get('sku', ''))
    m = re.match(r'(\d{3,5})', sku)
    if m and m.group(1) in pm: return pm[m.group(1)]
    # concatenated double codes like 59765940
    if m and len(m.group(1)) >= 8:
        a, b = m.group(1)[:4], m.group(1)[4:8]
        if a in pm: return pm[a]
        if b in pm: return pm[b]
    return None

def aclass_key(it, pm):
    code = str(it.get('sku', ''))
    piece = None
    pm2 = re.search(r'(sofa-bed|sofa|loveseat|chair|ottoman|sectional|chaise)', str(it.get('id', '')), re.I)
    if pm2: piece = pm2.group(1).lower().replace('sofa-bed', 'sofa')
    if (code, piece) in pm: return pm[(code, piece)]
    if (code, None) in pm: return pm[(code, None)]
    return None

PIECE_WORDS = [
    ('queen bed', ['queen bed']), ('king bed', ['king bed']),
    ('bed', ['queen bed', 'bed']), ('dresser', ['dresser']), ('mirror', ['mirror']),
    ('chest', ['chest']), ('nightstand', ['night stand', 'nightstand']),
    ('sectional', ['sectional']), ('sofa', ['sofa']), ('loveseat', ['loveseat', 'love seat']),
    ('chair', ['chair']), ('server', ['server', 'buffet']), ('table', ['table']),
    ('set', ['complete set', 'set']),
]

def _pick_line(lines, it):
    # lines: {label: net} -> choose the line for this item's own piece type
    blob = (str(it.get('name','')) + ' ' + ' '.join(it.get('cats') or []) + ' ' + str(it.get('id',''))).lower()
    for piece, labels in PIECE_WORDS:
        if piece in blob:
            for lab in labels:
                for label, v in lines.items():
                    if lab in label:
                        return v
    for label, v in lines.items():
        if 'complete set' in label or 'set' in label:
            return v
    return max(lines.values())

def matrix_key(it, pm):
    sku_num = re.sub(r'[A-Z]', '', str(it.get('sku', '')))
    if sku_num and sku_num in pm['codes']:
        return _pick_line(pm['codes'][sku_num], it)
    n = re.sub(r'[^A-Z]', '', str(it.get('name', '')).upper())
    for pn, v in pm['names'].items():
        if pn in n or (n and n in pn):
            return _pick_line(v, it)
    return None

if __name__ == '__main__':
    mz = parse_mazin();  print(f"mazin pdf: {len(mz)} priced codes")
    ac = parse_aclass(); print(f"aclass pdf: {len(set(k[0] for k in ac))} item codes")
    mx = parse_matrix(); print(f"matrix pdf: {len(mx['codes'])} codes, {len(mx['names'])} names")
    apply('mazin', mz, mazin_key)
    apply('aclass', ac, aclass_key)
    apply('matrix', mx, matrix_key)
