#!/usr/bin/env python3
"""Scrape rugsnetwork.com (the client's own store) WITH real prices.

nopCommerce storefront, HTTP only (the HTTPS vhost serves a Plesk
placeholder). Tiles carry name, SKU, prices and thumbnail; product pages
add the full-size image. We keep suggested-retail + our-price so the site
can show the same numbers as rugsnetwork.com.
"""
import json, os, re, sys, time, urllib.request, html

OUT = os.path.dirname(os.path.abspath(__file__))
UA = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'}
BASE = 'http://www.rugsnetwork.com'

CATALOGS = [
    ('hand-knotted', '/all-hand-knotted-rugs'),
    ('machine-woven', '/all-machine-woven-rugs'),
    ('clearance', '/clearance-rugs'),
]

def get(url, tries=3):
    for a in range(tries):
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=45) as r:
                return r.read().decode('utf-8', 'ignore')
        except Exception:
            time.sleep(2 + a)
    return ''

TILE = re.compile(
    r'data-productid="(\d+)".*?<a href="(/[^"]+)" title="[^"]*">\s*'
    r'<img alt="[^"]*" src="([^"]+)"', re.S)
NAME = re.compile(r'<h2 class="product-title">\s*<a href="[^"]*">([^<]+)</a>')
SKU = re.compile(r'<div class="sku">\s*.*?<span[^>]*>([^<]+)</span>', re.S)
OLD = re.compile(r'old-price">Sug\. Retail:\s*\$?([\d,.]+)')
NOW = re.compile(r'actual-price">(?:Our Price:)?\s*<span>\$?([\d,.]+)')

def money(s):
    try: return float(s.replace(',', ''))
    except Exception: return None

def parse_page(html_text):
    items = []
    # split per item-box for reliable pairing
    chunks = html_text.split('class="item-box"')[1:]
    for ch in chunks:
        pid = re.search(r'data-productid="(\d+)"', ch)
        link = re.search(r'<a href="(/[^"]+)" title="Show details', ch)
        img = re.search(r'<img alt="[^"]*" src="([^"]+)"', ch)
        name = NAME.search(ch)
        old = OLD.search(ch)
        now = NOW.search(ch)
        if not (pid and link and name):
            continue
        items.append({
            'pid': pid.group(1),
            'url': BASE + link.group(1),
            'slug': link.group(1).strip('/'),
            'name': html.unescape(name.group(1)).strip().title(),
            'img': (img.group(1) if img else None),
            'hi': ('https://images.weserv.nl/?url=' +
                   re.sub(r'_510(\.[a-z]+)$', r'\1', (img.group(1) if img else ''))
                     .replace('http://','').replace('https://','') +
                   '&w=1100&output=webp&q=80') if img else None,
            'retail': money(old.group(1)) if old else None,
            'price': money(now.group(1)) if now else None,
        })
    return items

def scrape_catalog(slug, path):
    all_items, page = [], 1
    while True:
        b = get(f'{BASE}{path}?pagenumber={page}')
        items = parse_page(b)
        if not items:
            break
        all_items += items
        print(f'  {slug} p{page}: +{len(items)} (total {len(all_items)})', flush=True)
        # stop when the pager has no higher page
        pages = [int(m) for m in re.findall(r'pagenumber=(\d+)', b)]
        if not pages or page >= max(pages):
            break
        page += 1
        time.sleep(0.5)
    for it in all_items:
        it['cat'] = slug
    return all_items

if __name__ == '__main__':
    out, seen = [], set()
    for slug, path in CATALOGS:
        for it in scrape_catalog(slug, path):
            if it['pid'] in seen:
                # clearance overlaps the main catalogs — keep first, tag clearance
                for prev in out:
                    if prev['pid'] == it['pid']:
                        prev['clearance'] = True
                continue
            seen.add(it['pid'])
            it['clearance'] = slug == 'clearance'
            out.append(it)
    dest = os.path.join(OUT, 'rugsnetwork.json')
    json.dump({'supplier': 'rugsnetwork', 'source': BASE, 'count': len(out), 'items': out},
              open(dest, 'w'), ensure_ascii=False, indent=1)
    withprice = sum(1 for i in out if i['price'])
    print(f'rugsnetwork: {len(out)} rugs ({withprice} with price) -> {dest}')
