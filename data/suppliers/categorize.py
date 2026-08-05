#!/usr/bin/env python3
"""Merge the curated store + all 10 supplier feeds into ONE categorized
catalogue, split per top-category for fast page loads.

Outputs:
  data/cat/<top>.json   items for that department (curated pieces first)
  data/cat/index.json   counts per top / sub / brand for the filter UI

Canonical taxonomy (top -> subs) is what the site's nav uses. Supplier
category slugs map here; anything unmapped falls back to name keywords.
"""
import json, os, re
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
OUT = os.path.join(ROOT, 'data', 'cat')
os.makedirs(OUT, exist_ok=True)

TOPS = ['living-room', 'dining-room', 'bed-room', 'office', 'decor', 'carpets', 'custom-studio']

# ---- supplier slug -> (top, sub) ----
M = {
    # shared / woo suppliers
    'sofa': ('living-room', 'sofas'), 'sofas': ('living-room', 'sofas'),
    'sectional': ('living-room', 'sectionals'), 'sectional-set': ('living-room', 'sectionals'),
    'sofa-bed': ('living-room', 'sofa-beds'), 'sofa-beds': ('living-room', 'sofa-beds'),
    'loveseat': ('living-room', 'loveseats'),
    'chair': ('living-room', 'chairs'), 'chairs': ('living-room', 'chairs'),
    'accent-chair': ('living-room', 'chairs'), 'chair-chaise': ('living-room', 'chairs'),
    'chaise': ('living-room', 'chaises'), 'ottoman': ('living-room', 'ottomans'), 'ottomans': ('living-room', 'ottomans'),
    'motion': ('living-room', 'recliners'), 'motion-seating': ('living-room', 'recliners'),
    'recliner': ('living-room', 'recliners'),
    'living-room-set': ('living-room', 'living-sets'), 'sofa-sets': ('living-room', 'living-sets'),
    'living': ('living-room', 'living-sets'),
    'coffee-table': ('living-room', 'coffee-tables'), 'coffee-tables': ('living-room', 'coffee-tables'),
    'end-tables': ('living-room', 'end-tables'), 'end-table': ('living-room', 'end-tables'),
    'accent-table': ('living-room', 'accent-tables'), 'occasional-tables': ('living-room', 'accent-tables'),
    'occasional': ('living-room', 'accent-tables'),
    'console-tables': ('living-room', 'console-tables'), 'console-table': ('living-room', 'console-tables'),
    'tv-stand': ('living-room', 'tv-media'), 'media': ('living-room', 'tv-media'), 'tv-media': ('living-room', 'tv-media'),
    # dining
    'dining': ('dining-room', 'dining-sets'), 'dining-room': ('dining-room', 'dining-sets'),
    'dining-set': ('dining-room', 'dining-sets'), 'dining-sets': ('dining-room', 'dining-sets'),
    'dining-furniture': ('dining-room', 'dining-sets'),
    'dining-table': ('dining-room', 'dining-tables'), 'dining-tables': ('dining-room', 'dining-tables'),
    'dining-chair': ('dining-room', 'dining-chairs'), 'dining-chairs': ('dining-room', 'dining-chairs'),
    'buffet': ('dining-room', 'buffets'), 'buffets': ('dining-room', 'buffets'),
    'bar-stool': ('dining-room', 'bar'), 'counter-stool': ('dining-room', 'bar'), 'bar-table': ('dining-room', 'bar'),
    'dining-catalog': ('dining-room', 'dining-sets'),
    # bedroom
    'bed': ('bed-room', 'beds'), 'beds': ('bed-room', 'beds'), 'beds-catalog': ('bed-room', 'beds'),
    'bedroom': ('bed-room', 'bedroom-sets'), 'bedroom-sets': ('bed-room', 'bedroom-sets'),
    'bed-room': ('bed-room', 'bedroom-sets'), 'bed-room-sets': ('bed-room', 'bedroom-sets'),
    'headboards-beds': ('bed-room', 'headboards'), 'headboard': ('bed-room', 'headboards'),
    'nightstand': ('bed-room', 'nightstands'), 'nightstands': ('bed-room', 'nightstands'),
    'dressers-and-mirrors': ('bed-room', 'dressers'), 'dresser': ('bed-room', 'dressers'),
    'chest': ('bed-room', 'chests'), 'mattresses': ('bed-room', 'mattresses'),
    'youth': ('bed-room', 'youth'),
    # office
    'computer-desk': ('office', 'desks'), 'desk': ('office', 'desks'), 'office': ('office', 'desks'),
    'office-chair': ('office', 'office-chairs'), 'bookcase': ('office', 'bookcases'),
    # decor
    'lighting': ('decor', 'lighting'), 'home-decor': ('decor', 'decor-objects'),
    'wall-decor': ('decor', 'wall-decor'), 'figurines': ('decor', 'figurines'),
    'artificial-plant': ('decor', 'plants'), 'vase': ('decor', 'vases'),
    'mirror': ('decor', 'mirrors'), 'mirrors': ('decor', 'mirrors'),
    'accent': ('decor', 'accent-furniture'), 'accent-furniture': ('decor', 'accent-furniture'),
    'accents-fireplace': ('decor', 'fireplaces'), 'fireplace': ('decor', 'fireplaces'),
    # rugs
    'hand-knotted': ('carpets', 'hand-knotted'), 'hand-made-carpets': ('carpets', 'hand-knotted'),
    'machine-woven': ('carpets', 'machine-made'), 'machine-made': ('carpets', 'machine-made'),
    'clearance': ('carpets', 'clearance'), 'carpets': ('carpets', 'machine-made'),
    # wt studio
    'custom-banquette': ('custom-studio', 'banquettes'), 'banquette-by-the-foot': ('custom-studio', 'banquettes'),
    'table': ('custom-studio', 'tables'), 'storage': ('custom-studio', 'storage'),
    'showcase-piece': ('custom-studio', 'showcase'),
}

# name-keyword fallback, first match wins
KEYWORDS = [
    (r'\brug\b|\bcarpet\b|\btapis\b', ('carpets', 'machine-made')),
    (r'\bsectional', ('living-room', 'sectionals')),
    (r'\bsofa bed|\bsleeper\b|\bfuton\b', ('living-room', 'sofa-beds')),
    (r'\bloveseat', ('living-room', 'loveseats')),
    (r'\bsofa\b|\bcouch\b', ('living-room', 'sofas')),
    (r'\brecliner|\bmotion\b|\bglider\b', ('living-room', 'recliners')),
    (r'\bottoman|\bbench\b|\bpouf\b', ('living-room', 'ottomans')),
    (r'\bchaise\b', ('living-room', 'chaises')),
    (r'\bcoffee table|\bcocktail table', ('living-room', 'coffee-tables')),
    (r'\bend table|\bside table|\blamp table', ('living-room', 'end-tables')),
    (r'\bconsole\b|\bsofa table', ('living-room', 'console-tables')),
    (r'\btv\b|\bmedia\b|\bentertainment', ('living-room', 'tv-media')),
    (r'\bdining set|\bdinette', ('dining-room', 'dining-sets')),
    (r'\bdining table', ('dining-room', 'dining-tables')),
    (r'\bdining chair|\bside chair|\bparson', ('dining-room', 'dining-chairs')),
    (r'\bbuffet|\bserver\b|\bsideboard|\bcurio\b|\bwine\b', ('dining-room', 'buffets')),
    (r'\bbar stool|\bcounter stool|\bpub\b|\bbar table|\bbar unit|\bstool\b', ('dining-room', 'bar')),
    (r'\bbedroom set|\bbedroom\b', ('bed-room', 'bedroom-sets')),
    (r'\bheadboard', ('bed-room', 'headboards')),
    (r'\bnightstand|\bnight stand', ('bed-room', 'nightstands')),
    (r'\bdresser|\bmirror.*dresser|\barmoire\b', ('bed-room', 'dressers')),
    (r'\bchest\b', ('bed-room', 'chests')),
    (r'\bmattress', ('bed-room', 'mattresses')),
    (r'\bbunk\b|\btrundle\b|\byouth\b|\bkids\b|\btwin bed', ('bed-room', 'youth')),
    (r'\bbed\b|\bdaybed\b', ('bed-room', 'beds')),
    (r'\bdesk\b|\bworkstation', ('office', 'desks')),
    (r'\boffice chair', ('office', 'office-chairs')),
    (r'\bbookcase|\bbook shelf|\bshelf\b|\bshelving|\betagere', ('office', 'bookcases')),
    (r'\blamp\b|\blight|\bchandelier|\bsconce|\bpendant', ('decor', 'lighting')),
    (r'\bmirror\b', ('decor', 'mirrors')),
    (r'\bvase\b|\burn\b', ('decor', 'vases')),
    (r'\bplant\b|\btree\b|\bfloral|\bflower', ('decor', 'plants')),
    (r'\bwall\b|\bart\b|\bcanvas|\bframe', ('decor', 'wall-decor')),
    (r'\bfigurine|\bsculpture|\bstatue|\bdecor\b|\bornament|\bcandle|\bbowl\b|\btray\b|\bclock\b|\bbox\b', ('decor', 'decor-objects')),
    (r'\baccent chair|\barm chair|\barmchair|\bwing\b|\bclub chair|\bchair\b', ('living-room', 'chairs')),
    (r'\baccent table|\bpedestal|\bplant stand|\bnesting', ('living-room', 'accent-tables')),
    (r'\bcabinet\b|\baccent\b', ('decor', 'accent-furniture')),
    (r'\btable\b', ('living-room', 'accent-tables')),
]

def classify(cats, name):
    for c in cats or []:
        if c in M:
            return M[c]
    n = (name or '').lower()
    for pat, tgt in KEYWORDS:
        if re.search(pat, n):
            return tgt
    return ('decor', 'decor-objects')   # last resort — never lose an item

BRANDS = {
    'oasis': 'Galerie Oasis', 'rugsnetwork': 'Rugs Network', 'monarch': 'Monarch Specialties',
    'matrix': 'Matrix Furniture', 'creative': 'Creative Home Décor', 'titus': 'Titus Furniture',
    'glory': 'Glory Home Furniture', 'sofabyfancy': 'Sofa by Fancy', 'aclass': 'A Class Upholstery',
    'mazin': 'Mazin / Homelegance', 'wt': 'WT Studio',
}

buckets = defaultdict(list)

# ---- 1. curated store first (they lead every listing) ----
cur = json.load(open(os.path.join(ROOT, 'data', 'catalog.json')))
CUR_MAP = {'stationary': ('living-room','sofas'), 'sectional': ('living-room','sectionals'),
           'chair-chaise': ('living-room','chairs'), 'sofa-bed': ('living-room','sofa-beds'),
           'motion-seating': ('living-room','recliners'), 'ottomans': ('living-room','ottomans'),
           'living-room': ('living-room','sofas'), 'dining-room': ('dining-room','dining-sets'),
           'bed-room-sets': ('bed-room','bedroom-sets'), 'bed-room': ('bed-room','bedroom-sets'),
           'mattresses': ('bed-room','mattresses'),
           'hand-made-carpets': ('carpets','hand-knotted'), 'machine-made': ('carpets','machine-made'),
           'carpets': ('carpets','machine-made')}
for p in cur:
    if not p.get('img'):
        continue
    top = sub = None
    for c in p['cats']:
        if c in CUR_MAP:
            top, sub = CUR_MAP[c]
            break
    if not top:
        top, sub = classify(p['cats'], p.get('short') or p['name'])
    buckets[top].append({
        'id': p['id'], 'name': p.get('short') or p['name'], 'sub': sub,
        'brand': 'oasis', 'img': p.get('thumb') or p['img'], 'link': f'product.html?id={p["id"]}',
        'sale': p.get('sale', False),
    })

# ---- 2. supplier feeds ----
FILES = ['rugsnetwork', 'monarch', 'matrix', 'creative', 'titus', 'glory',
         'sofabyfancy', 'aclass', 'mazin', 'wt']
for slug in FILES:
    path = os.path.join(HERE, f'{slug}.json')
    if not os.path.exists(path):
        continue
    d = json.load(open(path))
    for it in d.get('items', []):
        img = it.get('thumb') or it.get('img')
        if not img:
            continue
        cats = it.get('cats') or ([it['cat']] if it.get('cat') else [])
        top, sub = classify(cats, it.get('name'))
        row = {
            'id': it.get('id') or f"{slug}-{it.get('pid','x')}", 'name': it.get('name'),
            'sub': sub, 'brand': slug, 'img': img,
        }
        if it.get('hi'): row['hi'] = it['hi']
        if it.get('sku'): row['sku'] = it['sku']
        if slug == 'rugsnetwork':
            row['price'] = it.get('price')
            row['retail'] = it.get('retail')
            if it.get('clearance'): row['clearance'] = True
        buckets[top].append(row)

# ---- 3. write per-top files + index ----
index = {'tops': [], 'brands': BRANDS}
for top in TOPS:
    items = buckets.get(top, [])
    subs, brands = defaultdict(int), defaultdict(int)
    for it in items:
        subs[it['sub']] += 1
        brands[it['brand']] += 1
    json.dump({'top': top, 'count': len(items), 'items': items},
              open(os.path.join(OUT, f'{top}.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
    index['tops'].append({'slug': top, 'count': len(items),
                          'subs': dict(sorted(subs.items(), key=lambda x: -x[1])),
                          'brands': dict(sorted(brands.items(), key=lambda x: -x[1]))})
    print(f'{top:14s} {len(items):5d} items  subs={len(subs)}  brands={len(brands)}')
json.dump(index, open(os.path.join(OUT, 'index.json'), 'w'), ensure_ascii=False, indent=1)
print('total:', sum(t['count'] for t in index['tops']))
