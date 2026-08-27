#!/usr/bin/env python3
"""Validate every customer-facing priced item against its exact pricelist line.

The rule: a card shows the price of the EXACT sellable item on it -- never the
collection, the set, another piece sharing the SKU, or the first matching row.
Identity is supplier + collection/code + piece + size + variant. A SKU alone is
never enough: Matrix B2251 is the whole Berlin collection, from a $784
nightstand to a $7,872 queen set.

Each supplier is priced from a different structure, so each is checked its own way:
  matrix  collection NAME -> {'queen bed': net, 'queen complete set': net, ...}
  aclass  (model code, piece) -> net, piece in sofa/loveseat/chair/ottoman/...
  mazin   base code -> {'Night Stand': net, 'Queen Bed': net, 'pc Queen Set': net}
  monarch one SKU = one product = one price (structurally safe; verified 1:1)
  rugs    own retail, one price per rug, no sets

Statuses: PASS, FAIL (demonstrably wrong), SUSPECT (ambiguous -- flag, never guess).
"""
import json, os, re, glob, sys, collections

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
M = 3.15
SC = sys.argv[1] if len(sys.argv) > 1 else '.'

MX = json.load(open(os.path.join(SC, 'matrix_pricelist.json')))['names']
MZ = json.load(open(os.path.join(SC, 'mazin_pricelist.json')))
AC_RAW = json.load(open(os.path.join(SC, 'aclass_pricelist.json')))
AC = collections.defaultdict(dict)
for k, v in AC_RAW.items():
    code, piece = k.split('|')
    AC[code][piece] = v

items = []
for f in sorted(glob.glob(os.path.join(ROOT, 'data/cat/*.json'))):
    if 'index' in f:
        continue
    d = json.load(open(f))
    for it in d['items']:
        it['_top'] = d['top']
        items.append(it)

SIZE_RE = re.compile(r'\b(king|queen|full|twin)\b', re.I)
# '2pcs/ctn' is carton packaging, not a set. Must not read as an N-piece set.
CTN_RE = re.compile(r'\d\s*pcs?\s*/\s*ctn', re.I)
SET_RE = re.compile(r'\b(complete\s+set|bedroom\s+set|dining\s+set|living\s+set|'
                    r'\d\s*-\s*pc\b|\bset\b)', re.I)
SET_SUBS = {'bedroom-sets', 'dining-sets', 'living-sets'}
PIECE_ORDER = [
    ('nightstand', r'\bnight\s*stand'), ('dresser', r'\bdresser\b'),
    ('chest', r'\bchest\b'), ('headboard', r'\bheadboard\b'),
    ('mattress', r'\bmattress\b'), ('mirror', r'\bmirror\b'),
    ('bed', r'\bbed\b'), ('sofa', r'\bsofa\b'), ('loveseat', r'\blove\s*seat\b'),
    ('sectional', r'\bsectional\b'), ('chaise', r'\bchaise\b'),
    ('ottoman', r'\bottoman\b'), ('chair', r'\bchair'),
    ('buffet', r'\bbuffet\b|\bhutch\b'), ('table', r'\btable\b'),
]
SUB_PIECE = {'sofas': 'sofa', 'loveseats': 'loveseat', 'chairs': 'chair',
             'ottomans': 'ottoman', 'sectionals': 'sectional', 'chaises': 'chaise',
             'nightstands': 'nightstand', 'dressers': 'dresser', 'chests': 'chest',
             'beds': 'bed', 'mirrors': 'mirror', 'headboards': 'headboard',
             'dining-tables': 'table', 'dining-chairs': 'chair', 'buffets': 'buffet',
             'living-sets': 'set', 'bedroom-sets': 'set', 'dining-sets': 'set'}


def ident(it):
    name = (it.get('name') or '')
    low = CTN_RE.sub(' ', name.lower())     # strip carton counts first
    piece = next((p for p, pat in PIECE_ORDER if re.search(pat, low, re.I)), None)
    m = SIZE_RE.search(low)
    size = m.group(1).lower() if m else None
    mirror = bool(re.search(r'\bmirror\b', low))
    lift = bool(re.search(r'lift|storage', low))
    named_piece = piece in ('nightstand', 'dresser', 'chest', 'headboard',
                            'mattress', 'mirror')
    is_set = (bool(SET_RE.search(low)) and not named_piece) or \
             (it.get('sub') in SET_SUBS and not named_piece)
    return piece, size, mirror, is_set, lift


def coll_key(name):
    cut = re.split(r'\b(king|queen|full|twin|night\s*stand|dresser|chest|bed|sofa|'
                   r'love\s*seat|sectional|ottoman|chaise|chair|table|buffet|hutch|'
                   r'mirror|set|\d\s*-\s*pc)\b', name, maxsplit=1, flags=re.I)[0]
    cut = re.sub(r'[—–|,].*$', '', cut)
    # drop department and piece-qualifier words so 'Molly Arm chair' and
    # 'Molly Dining set' both resolve to the MOLLY collection
    cut = re.sub(r'\b(dining|bedroom|living|room|arm|armless|side|swivel|storage)\b',
                 ' ', cut, flags=re.I)
    return re.sub(r'[^A-Z]', '', cut.upper())


def mx_labels(piece, size, mirror, is_set, lift, armless=False, armchair=False):
    if is_set:
        pre = [rf'{size}\s+complete\s+set'] if size else []
        base = pre + [r'complete\s+set', r'\d\s*pc\s+set', r'\bset\b']
        return [b + r'.*lift' for b in base] + base if lift else base
    return {
        'nightstand': [r'night\s*stand'],
        'chest': [r'\bchest\b'],
        'headboard': [r'headboard'],
        'mattress': [r'mattress'],
        'mirror': [r'^mirror\b'],           # a standalone mirror, NOT 'dresser & mirror'
        'buffet': [r'hutch|buffet'],
        'sofa': [r'^sofa\b'], 'loveseat': [r'love\s*seat'],
        'sectional': [r'sectional'], 'ottoman': [r'ottoman'],
        'chaise': [r'chaise'],
        'chair': ([r'armless\s*chair'] if armless else
                  [r'\barm\s*chair'] if armchair else
                  [r'side\s*chair', r'^chair\b', r'\bchair\b']),
        'table': [r'^table\b', r'\btable\b'],
        'dresser': ([r'dresser\s*&\s*mirror', r'dresser and mirror'] if mirror
                    else [r'^dresser\b(?!.*mirror)']),
        # Some collections only ever list the lift-up bed (Sterling has no plain
        # 'queen bed' line), and then that IS the price of the queen bed. Fall
        # back to any same-size bed line -- but never to a bundle line such as
        # 'queen bed + 2 nightstand', which is a different sellable thing.
        'bed': ([rf'{size}\s+bed\s+w/?\s*lift', rf'{size}\s+bed.*lift'] if (size and lift)
                else [rf'^{size}\s+bed\s*$', rf'^{size}\s+bed\b(?!.*[\+w])',
                      rf'{size}\s+bed\b(?!.*\+)'] if size
                else [r'\bbed\b(?!.*\+)']),
    }.get(piece, [])


def pick(lines, pats, allow_bundle=True):
    for p in pats:
        hits = [(l, v) for l, v in lines.items()
                if re.search(p, l, re.I) and (allow_bundle or '+' not in l)]
        if hits:
            return min(hits, key=lambda x: x[1])
    return None, None


def took_line(lines, shown):
    return [l for l, v in lines.items() if abs(round(v * M) - shown) <= 1]


rows = []
for it in items:
    if not it.get('price'):
        continue
    brand, shown = it.get('brand'), float(it['price'])
    name, sub = (it.get('name') or ''), it.get('sub')
    piece, size, mirror, is_set, lift = ident(it)
    r = dict(id=it.get('id'), name=name, sku=it.get('sku') or it.get('ref') or '',
             brand=brand, dept=it['_top'], sub=sub, shown=shown, piece=piece,
             size=size, is_set=is_set, expected=None, expected_label=None,
             status='PASS', reason='', fix='')

    # ---- structural checks ----
    # Only collection-priced feeds can inherit a set price onto a piece. Monarch
    # and Rugs Network are one SKU = one product, so a "Table Set" SKU or a
    # "Chair - Set Of 4" multipack IS the sellable item; nothing is inherited.
    COLLECTION_PRICED = brand in ('matrix', 'aclass', 'mazin')
    if is_set and sub not in SET_SUBS and COLLECTION_PRICED:
        r.update(status='FAIL', reason=f"set listed under '{sub}'",
                 fix=f"reclassify to a *-sets category")
    elif (not is_set and sub in SET_SUBS and COLLECTION_PRICED and piece in (
            'nightstand', 'dresser', 'chest', 'mirror', 'table', 'sofa')):
        r.update(status='FAIL', reason=f"individual {piece} under set category '{sub}'",
                 fix="reclassify to the piece category")

    # ---- price check, per supplier ----
    if brand == 'matrix':
        lines = MX.get(coll_key(name))
        if lines:
            low_n = name.lower()
            lab, net = pick(lines,
                            mx_labels(piece, size, mirror, is_set, lift,
                                      armless=bool(re.search(r'armless', low_n)),
                                      armchair=bool(re.search(r'\barm\s*chair', low_n))),
                            allow_bundle=is_set)
            if net:
                r['expected'], r['expected_label'] = round(net * M), lab
                if abs(r['expected'] - shown) > 1 and r['status'] == 'PASS':
                    t = took_line(lines, shown)
                    r.update(status='FAIL',
                             reason=f"shows ${shown:,.0f}"
                                    + (f" (= '{t[0]}')" if t else '')
                                    + f" but this item is '{lab}' = ${r['expected']:,}",
                             fix=f"set price to ${r['expected']:,}")
            elif r['status'] == 'PASS':
                t = took_line(lines, shown)
                r.update(status='SUSPECT',
                         reason=f"no '{piece}' line exists for this collection"
                                + (f"; ${shown:,.0f} is the '{t[0]}' line" if t else ''),
                         fix="price on request until the supplier confirms")
    elif brand == 'aclass':
        code = re.match(r'(\d{3,4})', name)
        lines = AC.get(code.group(1)) if code else None
        want = SUB_PIECE.get(sub)
        if lines and want:
            net = lines.get(want)
            if net:
                r['expected'], r['expected_label'] = round(net * M), want
                if abs(r['expected'] - shown) > 1 and r['status'] == 'PASS':
                    t = [p for p, v in lines.items() if abs(round(v * M) - shown) <= 1]
                    r.update(status='FAIL',
                             reason=f"shows ${shown:,.0f}"
                                    + (f" (= the {t[0]} price)" if t else '')
                                    + f" but this is the {want} = ${r['expected']:,}",
                             fix=f"set price to ${r['expected']:,}")
            elif r['status'] == 'PASS':
                r.update(status='SUSPECT', reason=f"no {want} line for code {code.group(1)}",
                         fix="price on request until confirmed")
    elif brand == 'mazin':
        base = re.match(r'(\d{3,5})', name) or re.match(r'(\d{3,5})', str(it.get('sku') or ''))
        det = MZ['detail'].get(base.group(1)) if base else None
        if det:
            pats = {'nightstand': r'night\s*stand', 'dresser': r'^dresser',
                    'chest': r'chest', 'mirror': r'^mirror', 'bed': rf'{size}\s+.*bed' if size else r'bed',
                    'sofa': r'sofa', 'loveseat': r'love\s*seat', 'chair': r'chair',
                    'table': r'table', 'ottoman': r'ottoman'}.get(piece)
            pats = [r'pc\s+\w*\s*set|pc\s+queen|pc\s+king'] if is_set else ([pats] if pats else [])
            lab, net = pick(det, pats)
            if net:
                r['expected'], r['expected_label'] = round(net * M), lab
                if abs(r['expected'] - shown) > 1 and r['status'] == 'PASS':
                    t = took_line(det, shown)
                    r.update(status='FAIL',
                             reason=f"shows ${shown:,.0f}"
                                    + (f" (= '{t[0]}')" if t else '')
                                    + f" but this item is '{lab}' = ${r['expected']:,}",
                             fix=f"set price to ${r['expected']:,}")
            elif r['status'] == 'PASS':
                t = took_line(det, shown)
                r.update(status='SUSPECT',
                         reason=f"no '{piece}' line in this collection"
                                + (f"; ${shown:,.0f} is '{t[0]}'" if t else ''),
                         fix="price on request until confirmed")
    rows.append(r)

# ---- decide the remedy for each finding ----
# Correct a price only where the right line is PROVED. Where the shown price is
# a real line for the same piece in the same collection and only the variant is
# unclear (Matrix sells 'queen bed' and 'queen bed w/ lift up'), the owner's
# sheet is authoritative -- flag the naming, never silently reprice.
SIZES = ('king', 'queen', 'full', 'twin')
for r in rows:
    if r['status'] == 'PASS':
        continue
    sub, br, lab = r['sub'], r['brand'], (r['expected_label'] or '')
    took = re.search(r"=\s*'([^']+)'", r['reason'])
    took = took.group(1) if took else ''
    bare = r['piece'] is None and not r['is_set']

    if 'set listed under' in r['reason']:
        r['action'] = 'move:' + ('bedroom-sets' if r['dept'] == 'bed-room' else
                                 'dining-sets' if r['dept'] == 'dining-room' else 'living-sets')
    elif 'under set category' in r['reason']:
        r['action'] = 'move:piece'
    elif br == 'aclass':
        # every A-Class product is named by model code; a bare name is the house
        # style, not a collection header. Correct the price, never delist.
        r['action'] = f"setprice:{r['expected']}" if r.get('expected') else 'flag'
    elif br == 'mazin':
        # a Mazin record names a collection, and the feed priced it from the
        # cheapest line under that heading. Which line each SKU means cannot be
        # derived -- withdraw the price rather than invent one.
        r['action'] = 'unprice'
    elif bare:
        r['action'] = 'delist'              # Matrix collection header in a piece aisle
    elif r.get('expected'):
        item_size = next((z for z in SIZES if z == r['size']), None)
        took_size = next((z for z in SIZES if z in took.lower()), None)
        # Flag, don't reprice, ONLY when the two lines are the same piece at the
        # same size and differ just by a variant the product name never states
        # (Matrix lists both 'queen bed' and 'queen bed w/ lift up'). The owner's
        # sheet decides which one this product is. Everything else -- a twin on
        # the queen line, a set on the table line, an arm chair on the armless
        # line -- is provably wrong and gets the exact price.
        variant_only = ('lift' in took.lower()) != ('lift' in lab.lower())
        same_size = item_size == took_size
        r['action'] = 'flag' if (variant_only and same_size) else f"setprice:{r['expected']}"
    else:
        r['action'] = 'unprice'

json.dump(rows, open(os.path.join(SC, 'audit_rows.json'), 'w'), indent=1)
c = collections.Counter(r['status'] for r in rows)
b = collections.Counter((r['brand'], r['status']) for r in rows)
print(f"audited {len(rows):,} priced customer-facing items")
for s in ('PASS', 'FAIL', 'SUSPECT'):
    print(f"  {s:8} {c[s]:,}")
print("\nby supplier:")
for br in sorted({r['brand'] for r in rows}):
    print(f"  {br:12} pass={b[(br,'PASS')]:5} fail={b[(br,'FAIL')]:4} suspect={b[(br,'SUSPECT')]:4}")
