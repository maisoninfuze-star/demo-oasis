#!/usr/bin/env python3
"""Price the WooCommerce feeds that publish a dealer price.

Matrix, A-Class and Mazin are priced from owner PDFs at x3.15. Those PDFs are
gitignored, so a scheduled sync can never recompute them -- which left every
Titus / Creative product as price-on-request even though their Store API returns
a wholesale figure.

Owner rule: retail = dealer price x 3.15, the same margin as the PDF suppliers.

Deliberately narrow:
  - only feeds listed in FEEDS. Rugs Network is EXCLUDED -- those are the
    client's own retail prices with the margin already in them, and multiplying
    again would roughly triple the shelf price of 1,462 rugs.
  - re-prices its own feeds on every run so a margin change actually lands;
    prices from the PDF pipeline belong to other feeds and are never touched.
  - a feed that publishes 0 (Glory, Sofa by Fancy quote on request) yields no
    `net`, so those products stay on request rather than being priced at $0.
"""
import json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))

FEED_MARGIN = 3.15         # owner: one margin across the catalogue (set 2026-09-10,
                           # replacing a brief 3.5 on these feeds)
PDF_MARGIN = 3.15          # unchanged: Matrix / A-Class / Mazin / Monarch
FEEDS = ['titus', 'creative', 'glory', 'sofabyfancy']

priced = skipped = norate = 0
for slug in FEEDS:
    path = os.path.join(HERE, f'{slug}.json')
    if not os.path.exists(path):
        continue
    d = json.load(open(path))
    items = d['items'] if isinstance(d, dict) else d
    n = s = 0
    for it in items:
        net = it.get('net')
        if not net or float(net) <= 0:
            it.pop('price', None)      # no dealer price -> stays on request
            continue
        want = str(round(float(net) * FEED_MARGIN))
        # These feeds are priced solely from their own dealer figure, so the
        # margin is reapplied every run. Anything else would leave an old
        # multiplier frozen into the catalogue.
        if it.get('price') == want:
            s += 1
        else:
            it['price'] = want
            n += 1
    json.dump(d, open(path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    unp = sum(1 for i in items if not i.get('price'))
    priced += n
    skipped += s
    norate += unp
    print(f'  {slug:12} priced {n:4}   already priced {s:4}   still on request {unp:4}')

print(f'\npriced {priced:,} products at dealer x {FEED_MARGIN} '
      f'({skipped:,} existing prices untouched, {norate:,} remain on request)')
