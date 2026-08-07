#!/usr/bin/env python3
"""Every priced line in the owner's PDFs becomes a purchasable item.

The supplier websites list only some pieces (e.g. Duke sofa) while the
pricelists price whole programmes: sofa / loveseat / chair / 3-pc set,
queen & king sets, dressers, mirrors... This synthesizes catalogue items
for the configurations the sites never listed, using a sibling item's
photo from the same collection. Idempotent: previous synth items are
replaced on each run. Run AFTER apply_pricelists.py.
"""
import json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from apply_pricelists import parse_matrix, parse_aclass, parse_mazin, MARGIN

HERE = os.path.dirname(os.path.abspath(__file__))

def load(slug):
    return json.load(open(os.path.join(HERE, f'{slug}.json')))

def dump(slug, d):
    d['count'] = len(d['items'])
    json.dump(d, open(os.path.join(HERE, f'{slug}.json'), 'w'), ensure_ascii=False, indent=1)

def label_slug(s):
    return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')[:40]

SHORT = [
    (r'3 ?pc|total price|3 pcs', '3-Pc Set'), (r'queen complete', 'Queen Set'),
    (r'king complete', 'King Set'), (r'queen bed', 'Queen Bed'), (r'king bed', 'King Bed'),
    (r'dresser *& *mirror', 'Dresser & Mirror'), (r'dresser', 'Dresser'), (r'mirror', 'Mirror'),
    (r'chest', 'Chest'), (r'night ?stand', 'Nightstand'), (r'sectional', 'Sectional'),
    (r'sofa bed|sleeper', 'Sofa Bed'), (r'loveseat|love seat', 'Loveseat'), (r'sofa', 'Sofa'),
    (r'chaise', 'Chaise'), (r'ottoman', 'Ottoman'), (r'accent chair', 'Accent Chair'),
    (r'side chair|dining chair', 'Dining Chair'), (r'chair', 'Chair'),
    (r'coffee.*end', 'Coffee & End Tables'), (r'coffee table', 'Coffee Table'),
    (r'end table', 'End Table'), (r'console', 'Console'), (r'server|buffet', 'Server'),
    (r'dining table', 'Dining Table'), (r'table', 'Table'), (r'bench', 'Bench'),
    (r'daybed', 'Daybed'), (r'futon', 'Futon'), (r'bed', 'Bed'), (r'set', 'Set'),
]
def short_label(text):
    t = str(text).lower()
    for pat, out in SHORT:
        if re.search(pat, t): return out
    return None

import json as _j
try: MX_FOUND = _j.load(open('/tmp/mx_found.json'))
except Exception: MX_FOUND = {}
try: AC_FOUND = _j.load(open('/tmp/ac_found.json'))
except Exception: AC_FOUND = {}
report = {}

# ================= MATRIX =================
mx = parse_matrix()
d = load('matrix')
d['items'] = [it for it in d['items'] if not it.get('synth')]
by_code = {}
for it in d['items']:
    num = re.sub(r'[A-Z]', '', str(it.get('sku', '')))
    if num: by_code.setdefault(num, []).append(it)

def covered(items, label):
    """does an existing site item already represent this pdf line?"""
    l = label.lower()
    for it in items:
        blob = (str(it.get('name','')) + ' ' + ' '.join(it.get('cats') or [])).lower()
        for kw in ('sofa','loveseat','chair','dresser','mirror','chest','server','table'):
            if kw in l and kw in blob: return True
        if 'bed' in l and 'set' not in l and 'bed' in blob: return True
        if 'set' in l and 'set' in blob: return True
    return False

synth = 0
for code, lines in mx['codes'].items():
    siblings = by_code.get(code, [])
    img_src = next((it for it in siblings if it.get('img')), None)
    name = mx['codenames'].get(code, code)
    if not img_src and code in MX_FOUND:
        img_src = {'img': MX_FOUND[code][1], 'cats': [], 'url': f'https://matrixfurnituregroup.ca/product-detail/{MX_FOUND[code][0]}'}
    for label, net in lines.items():
        lab = short_label(label)
        if not lab: continue
        if covered(siblings, lab): continue
        if not img_src: continue          # no photo in the collection at all
        d['items'].append({
            'id': f'matrix-synth-{code}-{label_slug(lab)}',
            'name': f'{name} — {lab}',
            'sku': code, 'cats': list(img_src.get('cats') or []),
            'img': img_src.get('img'), 'gallery': [],
            'url': img_src.get('url'),
            'net': net, 'price': str(MARGIN(net)), 'synth': True,
        })
        synth += 1
report['matrix'] = synth
dump('matrix', d)

# ================= A-CLASS =================
ac = parse_aclass()
d = load('aclass')
d['items'] = [it for it in d['items'] if not it.get('synth')]
by_code = {}
for it in d['items']:
    c = str(it.get('sku', ''))
    if c: by_code.setdefault(c, []).append(it)

synth = 0
for (code, piece), net in ac.items():
    if piece is None: continue
    siblings = by_code.get(code, [])
    img_src = next((it for it in siblings if it.get('img')), None)
    if not img_src and code in AC_FOUND:
        img_src = {'img': AC_FOUND[code], 'cats': [], 'url': 'https://www.aclassfurniture.ca'}
    if not img_src: continue
    has = any(piece in str(it.get('id','')).lower() for it in siblings)
    if piece != 'set' and has: continue
    if piece == 'set' and any('3-piece' in str(it.get('name','')).lower() for it in siblings): continue
    pretty = '3-Pc Set' if piece == 'set' else piece.title()
    d['items'].append({
        'id': f'aclass-synth-{code}-{piece}',
        'name': f'{code} — {pretty}',
        'sku': code, 'cats': ['sofa' if piece in ('set','sofa') else piece],
        'img': img_src.get('img'), 'gallery': [],
        'url': img_src.get('url'),
        'net': net, 'price': str(MARGIN(net)), 'synth': True,
    })
    synth += 1
report['aclass'] = synth
dump('aclass', d)

# ================= MAZIN =================
parse_mazin()                      # populates parse_mazin.detail
detail = parse_mazin.detail
d = load('mazin')
d['items'] = [it for it in d['items'] if not it.get('synth')]
by_base = {}
for it in d['items']:
    m = re.match(r'(\d{3,5})', str(it.get('sku', '')))
    if m: by_base.setdefault(m.group(1), []).append(it)

synth = 0
for base, descs in detail.items():
    siblings = by_base.get(base, [])
    img_src = next((it for it in siblings if it.get('img')), None)
    if not img_src: continue                       # collection unknown to the site
    coll = re.sub(r'^\S+\s+\w+ — ', '', str(img_src.get('name','')))
    coll = re.sub(r'\s*Collection\s*$', '', coll).strip()[:36]
    seen_labels = set()
    for desc, net in list(descs.items())[:8]:      # cap per collection
        lab = short_label(desc)
        if not lab or lab in seen_labels: continue
        seen_labels.add(lab)
        d['items'].append({
            'id': f'mazin-synth-{base}-{label_slug(lab)}',
            'name': f'{coll} — {lab}',
            'sku': base, 'cats': list(img_src.get('cats') or []),
            'img': img_src.get('img'), 'gallery': [],
            'url': img_src.get('url'),
            'net': net, 'price': str(MARGIN(net)), 'synth': True,
        })
        synth += 1
report['mazin'] = synth
dump('mazin', d)

print('synthesized purchasable configurations:', report)
