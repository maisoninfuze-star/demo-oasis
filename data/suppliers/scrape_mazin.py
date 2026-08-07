#!/usr/bin/env python3
"""Scrape Mazin Furniture (Homelegance Canada).

mazinfurniture.com is a PDF portal; the real product data lives on
homelegance.com as server-rendered collection pages (<section>_<x>collections/
listings -> one .htm page per collection). Each collection imports as one
item — that is how the brand is sold. Price on request.
"""
import json, os, re, time, urllib.request, html as H

OUT = os.path.dirname(os.path.abspath(__file__))
BASE = 'https://www.homelegance.com'
UA = {'User-Agent': 'Mozilla/5.0', 'Accept': 'text/html'}

# Sections are DISCOVERED from the site nav, not hardcoded — the original
# hardcoded list missed seat_accentchairs, seat_chaises, seat_daybeds,
# seat_leather, occasional_sofatables, new_arrivals and more; and the
# per-section link regex dropped products cross-listed under /new_arrivals/.
SEED = ['', 'seat/', 'bedroom/', 'dining/', 'occasional/', 'office/', 'youth/', 'media/']

def get(url, tries=3):
    for a in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=45) as r:
                return r.read().decode('utf-8', 'ignore')
        except Exception:
            time.sleep(1.5 + a)
    return ''

if __name__ == '__main__':
    items, seen = [], set()
    # 1) discover every section slug from the seed/nav pages
    sections = set()
    for seed in SEED:
        nav = get(f'{BASE}/{seed}')
        sections |= set(re.findall(r'href="/([a-z]+_[a-z0-9-]+)/"', nav))
    sections = sorted(sections)
    print(f'discovered {len(sections)} sections: {sections}', flush=True)
    # 2) each section listing may link products in ANY path (incl. /new_arrivals/)
    for sec in sections:
        cat = sec.split('_')[0]
        listing = get(f'{BASE}/{sec}/')
        pages = sorted(set(re.findall(r'href="(/[a-z_]+/[^"]+\.htm)"', listing)))
        print(f'{sec}: {len(pages)} product pages', flush=True)
        for path in pages:
            slug = path.split('/')[-1].replace('.htm', '')
            if slug in seen:
                continue
            seen.add(slug)
            b = get(BASE + path)
            t = re.search(r'<title>([^<]+)</title>', b)
            name = H.unescape(t.group(1)).strip() if t else slug
            name = re.sub(r'\s*--\s*', ' — ', name)
            imgs = [i for i in re.findall(r'(?:src|href)="(/u/HMLG/[^"]+\.(?:jpg|jpeg|png))"', b)
                    if '_s.' not in i][:6] or \
                   re.findall(r'(?:src|href)="(/u/HMLG/[^"]+\.(?:jpg|jpeg|png))"', b)[:6]
            items.append({
                'id': f'mazin-{slug[:40]}',
                'sku': slug,
                'name': name[:90],
                'cats': [cat],
                'desc': 'Homelegance collection, distributed in Canada by Mazin Furniture.',
                'img': (BASE + imgs[0]) if imgs else None,
                'gallery': [BASE + i for i in imgs[1:5]],
                'url': BASE + path,
            })
            time.sleep(0.35)
    dest = os.path.join(OUT, 'mazin.json')
    json.dump({'supplier': 'mazin', 'source': 'https://www.mazinfurniture.com', 'count': len(items), 'items': items},
              open(dest, 'w'), ensure_ascii=False, indent=1)
    withimg = sum(1 for i in items if i['img'])
    print(f'mazin: {len(items)} collections ({withimg} with image) -> {dest}')
