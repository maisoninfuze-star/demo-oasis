#!/usr/bin/env python3
"""Universal WooCommerce Store API scraper for supplier catalogues.

Public endpoints only — no API keys. Images are hotlinked from the
supplier's own CDN so the repo stays small and pictures track the source.
Usage: python3 scrape_woo.py <slug> <base_url>
"""
import json, os, re, sys, time, html, urllib.request, urllib.parse

OUT = os.path.dirname(os.path.abspath(__file__))
UA = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'}

def get_json(url, tries=3):
    for a in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=45) as r:
                return json.load(r)
        except Exception as e:
            code = getattr(e, 'code', None)
            if code == 429:
                time.sleep(5 * (a + 1))
            else:
                time.sleep(2)
    return None

def strip(s):
    return html.unescape(re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', s or ''))).strip()

def scrape(slug, base):
    base = base.rstrip('/')
    items, page = [], 1
    while True:
        batch = get_json(f'{base}/wp-json/wc/store/v1/products?per_page=100&page={page}')
        if not batch:
            break
        for p in batch:
            imgs = [i.get('src') for i in (p.get('images') or []) if i.get('src')]
            cats = [c.get('slug') for c in (p.get('categories') or [])]
            items.append({
                'id': f'{slug}-{p["id"]}',
                'name': strip(p.get('name')),
                'cats': cats,
                'desc': strip(p.get('short_description') or p.get('description'))[:300],
                'img': imgs[0] if imgs else None,
                'gallery': imgs[1:6],
                'url': p.get('permalink'),
            })
        print(f'  page {page}: +{len(batch)} (total {len(items)})', flush=True)
        if len(batch) < 100:
            break
        page += 1
        time.sleep(0.6)
    return items

if __name__ == '__main__':
    slug, base = sys.argv[1], sys.argv[2]
    items = scrape(slug, base)
    out = os.path.join(OUT, f'{slug}.json')
    json.dump({'supplier': slug, 'source': base, 'count': len(items), 'items': items},
              open(out, 'w'), ensure_ascii=False, indent=1)
    print(f'{slug}: {len(items)} products -> {out}')
