#!/usr/bin/env python3
"""Regenerate sitemap.xml from the live catalogue.

The hand-written sitemap listed 239 curated products and none of the 4,631
priced supplier pieces — the pages that actually earn search traffic for
"queen bed Laval" and the like. Re-run this after any catalogue rebuild.

Priced items rank above price-on-request ones: a page a shopper can buy from is
worth more than a page that asks them to enquire.
"""
import json, glob, os
from datetime import date
from xml.sax.saxutils import escape

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = 'https://galerieoasis.ca'
TODAY = date.today().isoformat()

STATIC = [
    ('/', '1.0', 'weekly'),
    ('/collection.html', '0.9', 'daily'),
    ('/collection.html?price=request', '0.6', 'weekly'),
    ('/account.html', '0.4', 'monthly'),
    ('/purchase.html', '0.3', 'monthly'),
    ('/privacy.html', '0.3', 'yearly'),
    ('/terms.html', '0.3', 'yearly'),
]
DEPTS = ['living-room', 'dining-room', 'bed-room', 'office', 'decor', 'carpets', 'custom-studio']

urls = [(BASE + p, pr, cf) for p, pr, cf in STATIC]
urls += [(f'{BASE}/collection.html?cat={d}', '0.8', 'daily') for d in DEPTS]

priced = unpriced = 0
for f in sorted(glob.glob(os.path.join(ROOT, 'data/cat/*.json'))):
    if 'index' in f:
        continue
    for it in json.load(open(f))['items']:
        iid = it.get('id')
        if not iid:
            continue
        if it.get('price'):
            urls.append((f'{BASE}/product.html?id={iid}', '0.7', 'weekly')); priced += 1
        else:
            urls.append((f'{BASE}/product.html?id={iid}', '0.5', 'monthly')); unpriced += 1

body = '\n'.join(
    f'  <url><loc>{escape(u)}</loc><lastmod>{TODAY}</lastmod>'
    f'<changefreq>{cf}</changefreq><priority>{pr}</priority></url>'
    for u, pr, cf in urls)

open(os.path.join(ROOT, 'sitemap.xml'), 'w', encoding='utf-8').write(
    '<?xml version="1.0" encoding="UTF-8"?>\n'
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    f'{body}\n</urlset>\n')

print(f'sitemap.xml: {len(urls):,} urls '
      f'({len(STATIC) + len(DEPTS)} pages, {priced:,} priced, {unpriced:,} on request)')
