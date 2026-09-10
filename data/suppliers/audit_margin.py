#!/usr/bin/env python3
"""Check every published price is exactly round(dealer cost x 3.15).

Rugs Network is excluded by design: those are the client's OWN retail prices
with the margin already inside them. Multiplying again would roughly triple the
shelf price of 1,462 rugs.

Set records are checked against the sum of their pieces instead, since they have
no dealer cost of their own.
"""
import json, glob, os, collections

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
MARGIN = 3.15
NO_MARGIN = {'rugsnetwork'}          # own retail, margin already included

cost = {}
for f in sorted(glob.glob(os.path.join(HERE, '*.json'))):
    slug = os.path.basename(f)[:-5]
    if slug in ('manifest', 'monarch_pricelist', 'monarch_type_changes',
                'price_identity_changes'):
        continue
    try:
        d = json.load(open(f))
    except Exception:
        continue
    items = d.get('items') if isinstance(d, dict) else d
    if not isinstance(items, list):
        continue
    for it in items:
        if it.get('net'):
            cost[str(it.get('id'))] = (slug, float(it['net']))

rows, agg = [], collections.Counter()
for f in sorted(glob.glob(os.path.join(ROOT, 'data/cat/*.json'))):
    if f.endswith('index.json'):
        continue
    for it in json.load(open(f))['items']:
        if not it.get('price'):
            continue
        brand = it.get('brand')
        shown = float(it['price'])
        if brand in NO_MARGIN:
            agg['excluded (own retail, no margin)'] += 1
            continue
        if it.get('members'):
            want = sum(float(m['price']) for m in it['members'])
            kind = 'set = sum of pieces'
        else:
            c = cost.get(str(it.get('id')))
            if not c:
                agg['no dealer cost on file — cannot verify'] += 1
                continue
            want = round(c[1] * MARGIN)
            kind = f'{c[1]:,.2f} x {MARGIN}'
        if abs(shown - want) <= 1:
            agg['correct at x3.15'] += 1
        else:
            agg['WRONG'] += 1
            rows.append((brand, it.get('sku') or it.get('ref') or '',
                         (it.get('name') or '')[:42], shown, want, kind,
                         round(shown / (want / MARGIN), 3) if want else 0))

print(f'{"":3}checked against margin {MARGIN}')
for k, n in agg.most_common():
    print(f'  {n:6,}  {k}')
if rows:
    print(f'\n{len(rows)} priced items do not match:\n')
    print(f'  {"brand":11} {"sku":11} {"name":42} {"shown":>9} {"expected":>9}  implied')
    for r in sorted(rows, key=lambda x: -abs(x[3] - x[4]))[:25]:
        print(f'  {r[0]:11} {str(r[1]):11} {r[2]:42} {r[3]:>9,.0f} {r[4]:>9,.0f}  x{r[6]}')
    if len(rows) > 25:
        print(f'  ... and {len(rows) - 25} more')
json.dump([dict(brand=r[0], sku=r[1], name=r[2], shown=r[3], expected=r[4],
                basis=r[5], implied_margin=r[6]) for r in rows],
          open(os.path.join(ROOT, 'data/export/margin-audit.json'), 'w'), indent=1)
