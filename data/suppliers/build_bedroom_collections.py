#!/usr/bin/env python3
"""Rebuild Monarch's bedroom collections as sellable sets.

fix_monarch_piece_types.py corrected 88 records that Monarch had labelled
"BEDROOM SET" but which are individual pieces. That fixed the lie, but left a
gap: the collections those pieces belong to stopped existing, so a shopper who
wants the whole room had nothing to click.

Monarch numbers a collection in blocks of five -- I 5200Q bed, I 5201 dresser,
I 5202 mirror, I 5203 nightstand, I 5204 chest. A block only becomes a
collection when all five distinct piece types are present: I 5210-5213 are four
variants of the same bed and are correctly NOT a set. That rule yields 16
collections, matching what the Budget Liquidation build found independently on
the same feed.

The set price is the honest sum of its five pieces. No invented bundle discount
-- if the owner wants one, it belongs in the pricelist, not in a build script.

Each set carries `members` (what is in it) and each piece gains `partOf` (where
it belongs), so both directions are navigable.
"""
import json, os, re, collections

HERE = os.path.dirname(os.path.abspath(__file__))
PATH = os.path.join(HERE, 'monarch.json')
NEEDED = {'beds', 'dressers', 'mirrors', 'nightstands', 'chests'}
LABEL = {'beds': 'Queen Bed', 'dressers': 'Dresser', 'mirrors': 'Wall Mirror',
         'nightstands': 'Nightstand', 'chests': 'Chest'}
ORDER = ['beds', 'dressers', 'mirrors', 'nightstands', 'chests']


def series(sku):
    m = re.match(r'I\s*(\d+)', str(sku or ''))
    return (int(m.group(1)) // 5) * 5 if m else None


def descriptor(name):
    """'6 Drawer Dresser — Walnut Finish' -> 'Walnut'."""
    tail = name.split('—', 1)[1].strip() if '—' in name else ''
    tail = re.sub(r'\bfinish\b', '', tail, flags=re.I)
    return re.sub(r'\s+', ' ', tail).strip(' /') or 'Wood'


d = json.load(open(PATH))
items = d['items'] if isinstance(d, dict) else d
items = [i for i in items if not str(i.get('id', '')).startswith('monarch-bset-')]

groups = collections.defaultdict(list)
for it in items:
    if it.get('force_sub'):
        s = series(it.get('sku'))
        if s:
            groups[s].append(it)

built = []
for s, members in sorted(groups.items()):
    by = {m['force_sub']: m for m in members}
    if not NEEDED <= set(by):
        continue                        # bed variants, not a collection
    if any(not by[k].get('price') for k in ORDER):
        continue                        # never publish a partial total
    dresser = by['dressers']
    finish = descriptor(dresser.get('name', ''))
    total = sum(round(float(by[k]['price'])) for k in ORDER)
    sid = f'monarch-bset-{s}'

    rows = []
    for k in ORDER:
        m = by[k]
        rows.append({'id': m.get('id'), 'sku': m.get('sku'), 'piece': LABEL[k],
                     'name': m.get('name'), 'price': str(round(float(m['price']))),
                     'img': m.get('img')})
        m['partOf'] = {'id': sid, 'name': f'{finish} 5-Piece Bedroom Collection'}

    built.append({
        'id': sid, 'sku': f'BSET-{s}',
        'name': f'{finish} 5-Piece Bedroom Collection',
        'cats': ['bedroom-sets'],
        'force_top': 'bed-room', 'force_sub': 'bedroom-sets',
        'desc': (f'Complete bedroom in {finish.lower()}: queen bed, dresser, wall mirror, '
                 f'nightstand and chest, all the same finish. Buy the room together, '
                 f'or any piece on its own.'),
        'img': by['beds'].get('img'),
        'price': str(total),
        'members': rows,
        'finish': finish,
        'pieces': len(rows),
    })

# Two blocks can share a finish (Bleached Oak is both 5200 and 5220). Add the
# series only where it is needed to tell them apart, so most names stay clean.
_dupe = {n for n, c in collections.Counter(b['name'] for b in built).items() if c > 1}
for b in built:
    if b['name'] in _dupe:
        b['name'] = f"{b['name']} · Series {b['sku'].split('-')[1]}"
        if b.get('partOf_name_refs'):
            pass
# keep each piece's backlink label in step with the final set name
_by_id = {b['id']: b['name'] for b in built}
for it in items:
    po = it.get('partOf')
    if po and po.get('id') in _by_id:
        po['name'] = _by_id[po['id']]

items.extend(built)
if isinstance(d, dict):
    d['items'] = items
    d['count'] = len(items)
else:
    d = items
json.dump(d, open(PATH, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

print(f'built {len(built)} bedroom collections from {sum(len(g) for g in groups.values())} pieces')
for b in built:
    print(f"  {b['sku']:11} ${int(b['price']):>6,}  {b['name']:44} "
          f"{' · '.join(m['piece'] for m in b['members'])}")
