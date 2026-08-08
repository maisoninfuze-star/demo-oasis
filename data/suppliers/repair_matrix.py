#!/usr/bin/env python3
"""Repair Matrix items that show a category thumbnail instead of their photo.

152 base items were scraped with img = uploads/categories/<generic>.png (the
category tile), so 62+ distinct SKUs shared one picture. The real product photo
sits in a <img class="js-qv-product-cover" src=".../uploads/items/....jpg">.
Re-fetch each product page and take that. Run BEFORE expand_pdf_configs.py so
the synthesized configs inherit the corrected photo.
"""
import json, os, re, time, urllib.request, concurrent.futures

HERE = os.path.dirname(os.path.abspath(__file__))
UA = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'}
COVER = re.compile(r'js-qv-product-cover"\s*src="([^"]+/uploads/items/[^"]+)"')
ITEMS = re.compile(r'(https://matrixfurnituregroup\.ca/uploads/items/[^"\']+\.(?:jpg|jpeg|png|webp))')

def get(url, tries=3):
    for a in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=40) as r:
                return r.read().decode('utf-8', 'ignore')
        except Exception:
            time.sleep(1.5 + a)
    return ''

d = json.load(open(os.path.join(HERE, 'matrix.json')))
# only base items whose image is a category tile (the bug) or missing
bad = [it for it in d['items'] if not it.get('synth')
       and ('uploads/categories' in str(it.get('img_src', ''))
            or 'uploads/categories' in str(it.get('img', '')))]
print(f'{len(bad)} Matrix items to re-image', flush=True)

def fix(it):
    b = get(it.get('url') or '')
    if not b:
        return None
    m = COVER.search(b)
    cover = m.group(1) if m else None
    gallery = [u for u in dict.fromkeys(ITEMS.findall(b)) if u != cover]
    return (cover, gallery[:4])

fixed = 0
with concurrent.futures.ThreadPoolExecutor(max_workers=5) as ex:
    for it, res in zip(bad, ex.map(fix, bad)):
        if not res or not res[0]:
            continue
        it['img'] = res[0]
        it.pop('img_src', None)          # drop the stale category-tile source
        if res[1]:
            it['gallery'] = res[1]
        fixed += 1

d['count'] = len(d['items'])
json.dump(d, open(os.path.join(HERE, 'matrix.json'), 'w'), ensure_ascii=False, indent=1)
print(f'matrix images repaired: {fixed}/{len(bad)}')
