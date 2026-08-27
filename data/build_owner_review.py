#!/usr/bin/env python3
"""Owner review workbook — the decisions only the owner can make.

The engineering CSV is 4,631 rows. This is the subset that needs a human who
knows the products: 36 prices the data cannot settle, 192 prices withdrawn
because no supplier line proves them, and the records that were removed,
reclassified or corrected so they can be confirmed.

Every sheet that needs an answer has an ANSWER column, highlighted, left blank.
"""
import csv, os, collections
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
rows = list(csv.DictReader(open(os.path.join(ROOT, 'data/export/price-qa-report.csv'))))
# a corrected item now passes, so its audit row no longer carries the original
# fault. The change log kept it -- that is what the owner needs to see.
import json as _json
_log = _json.load(open(os.path.join(ROOT, 'data/suppliers/price_identity_changes.json')))
WAS = {}
for _c in _log:
    if _c['action'].startswith('setprice:') and _c.get('reason'):
        WAS[(_c['name'], _c.get('sku') or '')] = _c['reason']

INK = '1F2426'; GOLD = 'B08A34'; RED = '9B2C1E'; GREEN = '2F5145'
HEAD = PatternFill('solid', fgColor=INK)
ASK = PatternFill('solid', fgColor='FCF3DC')
BAND = PatternFill('solid', fgColor='F5F3EF')
HFONT = Font(color='FFFFFF', bold=True, size=10, name='Calibri')
THIN = Side(style='thin', color='D8D3CA')
BOX = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)


def plain(issue, product=''):
    """Turn an engineering finding into something the owner can act on."""
    import re
    t = issue or ''
    m = re.search(r"\$([\d,]+) is the '([^']+)' line", t)
    m2 = re.search(r"no '([^']+)' line exists for this collection", t)
    m3 = re.search(r"no '([^']+)' line in this collection", t)
    m4 = re.search(r"shows \$([\d,]+) \(= '([^']+)'\) but this item is '([^']+)' = \$([\d,]+)", t)
    m5 = re.search(r"shows \$([\d,]+) \(= the (\w+) price\) but this is the (\w+) = \$([\d,]+)", t)
    piece = (m2 or m3).group(1) if (m2 or m3) else None
    if m4:
        return (f"It was showing the \"{m4.group(2)}\" price. This product is the "
                f"\"{m4.group(3)}\", which your price list has at ${m4.group(4)}.")
    if m5:
        # A-Class keys a fallback price under an internal placeholder; to the
        # owner that is simply "another price from the same model".
        src = ('another price listed under the same model code'
               if m5.group(2) == 'None' else f"the {m5.group(2)} price")
        return (f"It was showing {src} instead of the {m5.group(3)} price "
                f"(${m5.group(4)}).")
    if piece == 'None':
        line = m.group(2) if m else 'a complete set'
        amt = m.group(1) if m else ''
        return (f"This is a collection name, not a single product. It was showing "
                f"${amt} — the price of the \"{line}\".")
    if piece:
        nice = {'dresser': 'dresser on its own', 'mirror': 'mirror on its own',
                'bed': 'this size of bed', 'nightstand': 'nightstand on its own'}.get(piece, piece)
        if m:
            return (f"Your price list has no line for a {nice} in this collection. "
                    f"The website was showing ${m.group(1)}, which is the \"{m.group(2)}\" price.")
        return f"Your price list has no line for a {nice} in this collection."
    return t[:150]


wb = Workbook()


def sheet(title, headers, data, widths, ask_cols=(), note=None):
    ws = wb.create_sheet(title)
    r = 1
    if note:
        ws.cell(1, 1, note).font = Font(italic=True, size=10, color='5A5F63')
        ws.merge_cells(start_row=1, start_column=1, end_row=1, end_column=len(headers))
        ws.row_dimensions[1].height = 30
        ws.cell(1, 1).alignment = Alignment(wrap_text=True, vertical='center')
        r = 3
    for i, h in enumerate(headers, 1):
        c = ws.cell(r, i, h)
        c.fill = HEAD; c.font = HFONT; c.border = BOX
        c.alignment = Alignment(vertical='center', wrap_text=True)
    ws.row_dimensions[r].height = 30
    for j, row in enumerate(data):
        for i, v in enumerate(row, 1):
            c = ws.cell(r + 1 + j, i, v)
            c.border = BOX
            c.alignment = Alignment(vertical='top', wrap_text=(i in (2, len(headers))))
            if (j % 2) and i not in ask_cols:
                c.fill = BAND
            if i in ask_cols:
                c.fill = ASK
    for i, w in enumerate(widths, 1):
        ws.column_dimensions[get_column_letter(i)].width = w
    ws.freeze_panes = ws.cell(r + 1, 1)
    return ws


# ---------- 1. read me ----------
ws = wb.active; ws.title = 'Start here'
lines = [
    ('Galerie Oasis — price review', 16, True, INK),
    ('', 11, False, INK),
    ('We checked all 4,631 priced products on the website against your supplier price lists.', 11, False, INK),
    ('4,399 were already correct. This file is only the ones that need you.', 11, False, INK),
    ('', 11, False, INK),
    ('Please work through the yellow columns. Nothing else needs your attention.', 11, True, GOLD),
    ('', 11, False, INK),
    ('1.  Decisions needed (36)', 12, True, RED),
    ('     Two questions we cannot answer from the price list. Highest priority —', 10, False, INK),
    ('     twelve beds may be priced $630 too high.', 10, False, INK),
    ('', 11, False, INK),
    ('2.  Prices we removed (192)', 12, True, RED),
    ('     Your supplier price list has no line for these exact pieces, so we took the', 10, False, INK),
    ('     price off rather than show a wrong one. They still appear on the website and', 10, False, INK),
    ('     customers can still ask about them. Fill in a price and they go back on sale.', 10, False, INK),
    ('', 11, False, INK),
    ('3.  Products we removed (4)', 12, True, INK),
    ('     Not real products — collection headings showing a full bedroom-set price.', 10, False, INK),
    ('', 11, False, INK),
    ('4.  Prices we corrected (14)', 12, True, GREEN),
    ('     Already fixed. Shown so you can confirm.', 10, False, INK),
    ('', 11, False, INK),
    ('5.  Moved to the right category (78)', 12, True, GREEN),
    ('     Prices were right, they were in the wrong part of the website.', 10, False, INK),
    ('', 11, False, INK),
    ('Why this happened: your suppliers price by collection, not by product. One', 10, False, '5A5F63'),
    ('Matrix code — B2251, Berlin — covers a $784 nightstand, a $1,950 dresser,', 10, False, '5A5F63'),
    ('a $3,147 queen bed and a $7,872 bedroom set. The website was sometimes', 10, False, '5A5F63'),
    ('picking the wrong line from that list.', 10, False, '5A5F63'),
]
for i, (t, sz, bold, col) in enumerate(lines, 1):
    c = ws.cell(i, 1, t)
    c.font = Font(size=sz, bold=bold, color=col)
ws.column_dimensions['A'].width = 96

# ---------- 2. decisions ----------
flag = [r for r in rows if r['status'] == 'FLAG']
lift = [r for r in flag if r['expected_price']]
sect = [r for r in flag if not r['expected_price']]
data = []
for r in sorted(lift, key=lambda x: x['product']):
    data.append(['Is this the lift-up (storage) version?', r['product'], r['sku'],
                 r['displayed_price'], r['expected_price'],
                 'Website shows the lift-up price. If it is the plain bed, it is too high.', ''])
for r in sorted(sect, key=lambda x: x['product']):
    data.append(['Is this price right?', r['product'] or '(model code)', r['sku'],
                 r['displayed_price'], '—',
                 'No matching line in the A-Class 2024 price list — please confirm with your rep.', ''])
sheet('1. Decisions needed',
      ['Question', 'Product', 'SKU', 'Website shows', 'Plain version', 'Why we are asking',
       'YOUR ANSWER'],
      data, [30, 32, 12, 14, 14, 46, 30], ask_cols=(7,),
      note='HIGHEST PRIORITY. Matrix sells two versions of some beds — a plain one and a lift-up storage one, about $630 apart. '
           'The product names do not say which. Your sheet lists the lift-up price so the website keeps it, but if these are the plain beds you are overcharging.')

# ---------- 3. withdrawn ----------
w = [r for r in rows if r['correction'].startswith('Price withdrawn')]
data = [[r['department'], r['product'], r['sku'], r['supplier'], r['type'],
         plain(r['issue'], r['product']), ''] for r in
        sorted(w, key=lambda x: (x['department'], x['supplier'], x['product']))]
sheet('2. Prices removed',
      ['Department', 'Product', 'SKU', 'Supplier', 'Type', 'Why we removed the price',
       'CORRECT PRICE'],
      data, [14, 40, 14, 12, 16, 62, 16], ask_cols=(7,),
      note='These now show "Price on request" on the website — customers still see them and can still enquire. '
           'We removed the price because the supplier price list has no line for that exact piece, and we would rather show nothing than a wrong number. Fill in a price to put any of them back on sale.')

# ---------- 4. removed ----------
rm = [r for r in rows if r['correction'].startswith('Removed')]
import re as _re
def _was(t):
    m = _re.search(r'\$([\d,]+)', t or '')
    return f"${m.group(1)}" if m else '—'
data = [[r['product'], r['sku'], r['supplier'], _was(r['issue']),
         plain(r['issue'], r['product']), ''] for r in rm]
sheet('3. Products removed',
      ['Product', 'SKU', 'Supplier', 'Price it was showing', 'Why', 'OK TO REMOVE?'],
      data, [26, 14, 12, 18, 76, 18], ask_cols=(6,),
      note='These were collection headings, not products a customer can buy — each was showing the price of a complete bedroom set while sitting in the Beds category.')

# ---------- 5. corrected ----------
cor = [r for r in rows if r['correction'].startswith('Price corrected')]
data = [[r['department'], r['product'], r['sku'], r['correction'].replace('Price corrected ', ''),
         r['pricelist_line'],
         plain(WAS.get((r['product'], r['sku']), r['issue']), r['product']), ''] for r in
        sorted(cor, key=lambda x: x['product'])]
sheet('4. Prices corrected',
      ['Department', 'Product', 'SKU', 'Change', 'Price-list line used', 'What was wrong',
       'CONFIRM'],
      data, [14, 34, 14, 24, 26, 60, 12], ask_cols=(7,),
      note='Already applied to the website. Each price now comes from the exact line in your supplier price list, shown here so you can check.')

# ---------- 6. reclassified ----------
rc = [r for r in rows if r['correction'].startswith('Reclassified')]
by = collections.Counter((r['correction'], r['department']) for r in rc)
data = [[r['product'], r['sku'], r['displayed_price'], r['department'],
         r['correction'].replace('Reclassified to ', ''), ''] for r in
        sorted(rc, key=lambda x: x['product'])]
sheet('5. Moved category',
      ['Product', 'SKU', 'Price (unchanged)', 'Department', 'Moved to', 'CONFIRM'],
      data, [40, 14, 18, 14, 20, 12], ask_cols=(6,),
      note='Prices were correct — these were simply in the wrong part of the website. '
           'A $6,612 three-piece set was sitting in Sofas next to $1,700 sofas.')

out = os.path.join(ROOT, 'data/export/Galerie-Oasis-price-review.xlsx')
wb.save(out)
print(f'{out}')
for s in wb.sheetnames:
    print(f'   {s:24} {max(wb[s].max_row - 3, 0):5} rows')
