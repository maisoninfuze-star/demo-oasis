#!/usr/bin/env python3
"""Scrape matrixfurnituregroup.ca (custom storefront, server-rendered).

Category pages at /product-list/<slug> render the full list (no pagination);
tiles link to /product-detail/<slug>. Prices are dealer-only, so everything
imports as price-on-request. Requires browser-like Accept headers (plain
requests get 500).
"""
import json, os, re, time, urllib.request, html as H

OUT = os.path.dirname(os.path.abspath(__file__))
BASE = 'https://matrixfurnituregroup.ca'
HDRS = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html', 'Accept-Language': 'en'}

# leaf categories (parents like /bedroom aggregate the same items)
CATS = ['bedroom-sets', 'beds', 'chest', 'nightstands', 'dressers-and-mirrors',
        'dining-set', 'dining-table', 'dining-chair', 'buffet',
        'living-room-set', 'sofa', 'loveseat', 'chairs', 'motion', 'sectional-set',
        'coffee-tables', 'end-tables', 'accent', 'accents-fireplace']

def get(url, tries=3):
    for a in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=HDRS), timeout=40) as r:
                return r.read().decode('utf-8', 'ignore')
        except Exception:
            time.sleep(1.5 + a)
    return ''

TILE = re.compile(
    r'<a href="(https://matrixfurnituregroup\.ca/product-detail/([^"]+))">\s*'
    r'(?:<figure>\s*)?(?:<img[^>]+src="([^"]+)")?.*?'
    r'<div class="product-title">([^<]+)</div>', re.S)
IMG_NEAR = re.compile(r'<img[^>]+src="(https://matrixfurnituregroup\.ca/uploads/[^"]+)"')

def pretty(raw):
    # L1425-ISABELLA-SOFA-SILVER-GOLD -> Isabella Sofa — Silver Gold (L1425)
    parts = raw.split('-')
    sku = parts[0]
    words = [w.capitalize() for w in parts[1:]]
    return (' '.join(words) or raw).strip(), sku

if __name__ == '__main__':
    items, seen = [], set()
    for cat in CATS:
        b = get(f'{BASE}/product-list/{cat}')
        # pair each product link with the nearest preceding upload image
        chunks = re.split(r'(?=<div class="product-details)', b)
        n = 0
        for ch in chunks[1:]:
            link = re.search(r'<a href="(https://matrixfurnituregroup\.ca/product-detail/([^"]+))"', ch)
            if not link:
                continue
            slug = link.group(2)
            if slug in seen:
                continue
            title = re.search(r'<div class="product-title">([^<]+)</div>', ch)
            img = IMG_NEAR.search(ch)
            if not title:
                continue
            seen.add(slug)
            name, sku = pretty(H.unescape(title.group(1)).strip())
            items.append({
                'id': f'matrix-{slug[:50]}',
                'sku': sku,
                'name': name,
                'cats': [cat],
                'desc': '',
                'img': img.group(1) if img else None,
                'gallery': [],
                'url': link.group(1),
            })
            n += 1
        print(f'{cat}: +{n} (total {len(items)})', flush=True)
        time.sleep(0.5)
    dest = os.path.join(OUT, 'matrix.json')
    json.dump({'supplier': 'matrix', 'source': BASE, 'count': len(items), 'items': items},
              open(dest, 'w'), ensure_ascii=False, indent=1)
    withimg = sum(1 for i in items if i['img'])
    print(f'matrix: {len(items)} products ({withimg} with image) -> {dest}')
