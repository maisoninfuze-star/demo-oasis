#!/usr/bin/env python3
"""Distill Woo Store API dumps into catalog.json + download images locally."""
import json, os, re, html, urllib.request, concurrent.futures, subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'data')
IMGDIR = os.path.join(ROOT, 'assets', 'catalog')
os.makedirs(IMGDIR, exist_ok=True)

def strip_html(s):
    s = re.sub(r'<[^>]+>', ' ', s or '')
    return html.unescape(re.sub(r'\s+', ' ', s)).strip()

products = []
for p in (1, 2, 3):
    with open(os.path.join(DATA, f'products-p{p}.json')) as f:
        products += json.load(f)

cats = json.load(open(os.path.join(DATA, 'categories-raw.json')))
cat_by_id = {c['id']: c for c in cats}

catalog = []
jobs = []
for pr in products:
    imgs = pr.get('images') or []
    main = imgs[0]['src'] if imgs else None
    gallery = [i['src'] for i in imgs[1:4]]
    slug = pr['slug'][:60]
    local_main = f"assets/catalog/{slug}.jpg" if main else None
    if main:
        jobs.append((main, os.path.join(ROOT, local_main)))
    glocal = []
    for gi, gurl in enumerate(gallery):
        gpath = f"assets/catalog/{slug}-{gi+2}.jpg"
        jobs.append((gurl, os.path.join(ROOT, gpath)))
        glocal.append(gpath)
    prices = pr.get('prices') or {}
    catalog.append({
        'id': pr['id'],
        'name': html.unescape(pr['name']).strip(),
        'slug': pr['slug'],
        'cats': [cat_by_id[c['id']]['slug'] for c in pr.get('categories', []) if c['id'] in cat_by_id],
        'price': prices.get('price'),
        'regular': prices.get('regular_price'),
        'sale': pr.get('on_sale', False),
        'currency': prices.get('currency_code', 'CAD'),
        'minor': prices.get('currency_minor_unit', 2),
        'desc': strip_html(pr.get('short_description') or pr.get('description'))[:400],
        'img': local_main,
        'gallery': glocal,
    })

def fetch(job):
    url, dest = job
    if os.path.exists(dest):
        return 'skip'
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=60) as r, open(dest, 'wb') as f:
            f.write(r.read())
        return 'ok'
    except Exception as e:
        return f'FAIL {url} {e}'

results = []
with concurrent.futures.ThreadPoolExecutor(max_workers=12) as ex:
    results = list(ex.map(fetch, jobs))
ok = sum(1 for r in results if r in ('ok', 'skip'))
fails = [r for r in results if r.startswith('FAIL')]
print(f"images: {ok} ok, {len(fails)} failed")
for f_ in fails[:8]:
    print(' ', f_[:140])

# drop image refs that failed to download
have = set(os.listdir(IMGDIR))
for c in catalog:
    if c['img'] and os.path.basename(c['img']) not in have:
        c['img'] = None
    c['gallery'] = [g for g in c['gallery'] if os.path.basename(g) in have]

with open(os.path.join(DATA, 'catalog.json'), 'w') as f:
    json.dump(catalog, f, ensure_ascii=False, indent=1)
print(f"catalog.json: {len(catalog)} products")
print("with price:", sum(1 for c in catalog if c['price'] and c['price'] != '0'))
print("with image:", sum(1 for c in catalog if c['img']))
