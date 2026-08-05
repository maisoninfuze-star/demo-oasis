#!/usr/bin/env python3
"""Scrape aclassfurniture.ca (custom WP, REST closed, server-rendered HTML).

Categories at /category/<slug>, products at /product/<model>. Pagination is
?page=N (falls back to /page/N/). Price on request — they are a manufacturer.
"""
import json, os, re, time, urllib.request, html as H

OUT = os.path.dirname(os.path.abspath(__file__))
UA = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'}
BASE = 'https://www.aclassfurniture.ca'
CATS = ['sofa', 'sectional', 'chair', 'chaise', 'ottoman', 'sofa-bed']

def get(url, tries=3):
    for a in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=40) as r:
                return r.read().decode('utf-8', 'ignore')
        except Exception:
            time.sleep(1.5 + a)
    return ''

PROD_LINK = re.compile(r'href="(https://www\.aclassfurniture\.ca/product/([^"]+))"')

def category_products(cat):
    seen, urls = set(), []
    page = 1
    while page < 30:
        # /category/<cat> and /category/<cat>/1 are the same first page
        b = get(f'{BASE}/category/{cat}' if page == 1 else f'{BASE}/category/{cat}/{page}')
        links = [(u, slug) for u, slug in PROD_LINK.findall(b)]
        new = [(u, s) for u, s in links if s not in seen]
        if not new:
            break
        for u, s in new:
            seen.add(s)
            urls.append((u, s))
        page += 1
        time.sleep(0.4)
    return urls

def product_detail(url, slug, cat):
    b = get(url)
    name = re.search(r'<h1[^>]*>([^<]+)</h1>', b) or re.search(r'<title>([^<|]+)', b)
    imgs = re.findall(r'src="(https://www\.aclassfurniture\.ca/assets/uploads/product_images/[^"]+)"', b)
    uniq = []
    for i in imgs:
        if i not in uniq:
            uniq.append(i)
    nm = H.unescape(name.group(1)).strip() if name else slug
    nm = re.sub(r'\s*\|.*$', '', nm)
    return {
        'id': f'aclass-{slug}',
        'sku': slug.split('-')[0].upper(),
        'name': nm if len(nm) > 2 else f'Model {slug}',
        'cats': [cat],
        'desc': 'Made-to-order in Mississauga, Ontario. Available in the ACU performance fabric programme.',
        'img': uniq[0] if uniq else None,
        'gallery': uniq[1:5],
        'url': url,
    }

if __name__ == '__main__':
    items, seen = [], set()
    for cat in CATS:
        urls = category_products(cat)
        print(f'{cat}: {len(urls)} products', flush=True)
        for url, slug in urls:
            if slug in seen:
                continue
            seen.add(slug)
            items.append(product_detail(url, slug, cat))
            time.sleep(0.3)
    dest = os.path.join(OUT, 'aclass.json')
    json.dump({'supplier': 'aclass', 'source': BASE, 'count': len(items), 'items': items},
              open(dest, 'w'), ensure_ascii=False, indent=1)
    withimg = sum(1 for i in items if i['img'])
    print(f'aclass: {len(items)} products ({withimg} with image) -> {dest}')
