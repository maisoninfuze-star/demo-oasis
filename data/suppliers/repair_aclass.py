#!/usr/bin/env python3
"""Repair A-Class items: real per-model images and real names.

The original scrape took a nav heading as the name ("Collections" x156) and
picked the first product_images/* on the page — which is a sidebar
"similar products" thumbnail, so 330 items shared one photo. A-Class names
its products by model code, and each page carries its own zoomImage set
(1280.jpg, 1280D.jpg, 1280E1.jpg...). This re-fetches each product page and
takes only images whose filename starts with that model code.
"""
import json, os, re, time, urllib.request, concurrent.futures

HERE = os.path.dirname(os.path.abspath(__file__))
UA = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'}
BASE = 'https://www.aclassfurniture.ca'

def get(url, tries=3):
    for a in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=40) as r:
                return r.read().decode('utf-8', 'ignore')
        except Exception:
            time.sleep(1.5 + a)
    return ''

d = json.load(open(os.path.join(HERE, 'aclass.json')))
base_items = [it for it in d['items'] if not it.get('synth')]
print(f'{len(base_items)} base A-Class items to repair', flush=True)

def fix(it):
    url = it.get('url') or ''
    code = str(it.get('sku') or '')
    if not url or not code:
        return None
    b = get(url)
    if not b:
        return None
    full = lambda name: f'https://www.aclassfurniture.ca/uploads/product_images/{name}'
    # The main product photo is the FIRST cloudzoom image (shown as -400x0);
    # strip the size suffix for the full-size file. Anything after it in the
    # cloudzoom list is a real alternate view; the "similar products" sidebar
    # uses a different (cat_name) markup, so we never pull those.
    covers = re.findall(r'class="cloudzoom"\s*src="[^"]*product_images/([^"]+?)(?:-400x0)?\.(jpg|jpeg|png)"', b)
    seen, own = set(), []
    for base_name, ext in covers:
        f = full(f'{base_name}.{ext}')
        if f not in seen:
            seen.add(f); own.append(f)
    # prefer a code-named cover if one exists, else keep document order (cover first)
    coded = [u for u in own if re.match(rf'{re.escape(code)}[^0-9]', u.rsplit('/', 1)[-1])
             or u.rsplit('/', 1)[-1].startswith(code + '.')]
    if coded:
        own = coded + [u for u in own if u not in coded]
    slug = url.rsplit('/', 1)[-1]
    piece = ''
    m = re.search(r'-(sofa|sectional|chair|chaise|ottoman|sofa-bed|loveseat)$', slug)
    if m:
        piece = ' ' + m.group(1).replace('-', ' ').title()
    return {'name': f'{code}{piece}'.strip(), 'imgs': own}

fixed = names = imgs = 0
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as ex:
    for it, res in zip(base_items, ex.map(fix, base_items)):
        if not res:
            continue
        if res['name'] and it.get('name', '').strip().lower() in ('collections', 'a class upholstery', ''):
            it['name'] = res['name']; names += 1
        if res['imgs']:
            it['img'] = res['imgs'][0]
            it['gallery'] = res['imgs'][1:5]
            imgs += 1
        fixed += 1

json.dump(d, open(os.path.join(HERE, 'aclass.json'), 'w'), ensure_ascii=False, indent=1)
print(f'repaired {fixed}: {names} names, {imgs} image sets')
