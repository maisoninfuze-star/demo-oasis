#!/usr/bin/env python3
"""Owner deliverable: priced catalogue — photo + name + SKU + price per item.

Localizes every image to a small JPEG thumb so the PDF stays emailable, then
render with:

  chrome --headless --no-pdf-header-footer --virtual-time-budget=180000 \
         --print-to-pdf=Galerie-Oasis-Priced-Catalogue.pdf file://<out>

Lives in the repo (not a temp dir) so it survives scratchpad cleanup.
"""
import json, glob, os, hashlib, io, urllib.request, concurrent.futures
from PIL import Image, ImageOps

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'build')
TH = os.path.join(OUT, 'pdfthumbs')
os.makedirs(TH, exist_ok=True)
UA = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'}
md5 = lambda s: hashlib.md5(s.encode()).hexdigest()[:16]

BR = {'rugsnetwork': 'Rugs Network — our warehouse', 'matrix': 'Matrix Furniture',
      'aclass': 'A-Class Upholstery', 'mazin': 'Mazin / Homelegance',
      'monarch': 'Monarch Specialties'}
ORDER = ['rugsnetwork', 'matrix', 'aclass', 'mazin', 'monarch']

groups = {}
for f in glob.glob(os.path.join(ROOT, 'data/cat/*.json')):
    if 'index' in f:
        continue
    for it in json.load(open(f))['items']:
        if it.get('price'):
            groups.setdefault(it.get('brand'), []).append(it)


def thumb(img):
    if not img:
        return None
    key = os.path.join(TH, md5(str(img)) + '.jpg')
    if os.path.exists(key):
        return key
    data = src = None
    if str(img).startswith('http'):
        try:
            data = urllib.request.urlopen(urllib.request.Request(img, headers=UA), timeout=25).read()
        except Exception:
            return None
    else:
        src = os.path.join(ROOT, img)
        if not os.path.exists(src):
            return None
    try:
        im = Image.open(src) if src else Image.open(io.BytesIO(data))
        im = ImageOps.exif_transpose(im).convert('RGB')
        im.thumbnail((150, 150))
        im.save(key, 'JPEG', quality=64, optimize=True)
        return key
    except Exception:
        return None


uniq = {it.get('img') for its in groups.values() for it in its if it.get('img')}
print(f'{len(uniq)} unique images to localize…', flush=True)
done = {}
with concurrent.futures.ThreadPoolExecutor(max_workers=12) as ex:
    for img, res in zip(uniq, ex.map(thumb, uniq)):
        done[img] = res
print(f'localized {sum(1 for v in done.values() if v)}/{len(uniq)}', flush=True)

total = withimg = 0
sections = []
for b in ORDER:
    items = sorted(groups.get(b, []), key=lambda x: (str(x.get('sku') or ''), x['name']))
    if not items:
        continue
    cards = []
    for it in items:
        total += 1
        t = done.get(it.get('img'))
        if t:
            withimg += 1
        cell = f'<img src="file://{t}">' if t else '<div class="ni">photo pending</div>'
        price = ('From ' if it.get('from') else '') + f"${float(it['price']):,.0f}"
        retail = f' <s>${float(it["retail"]):,.0f}</s>' if it.get('retail') else ''
        sku = it.get('sku') or it.get('ref') or ''
        cards.append(f'<div class="c">{cell}<b>{it["name"][:42]}</b>'
                     f'<span>{sku}</span><p>{price}{retail}</p></div>')
    sections.append(f'<h2>{BR.get(b, b)} — {len(items):,} items</h2><div class="g">{"".join(cards)}</div>')

html = f'''<meta charset="utf-8"><style>
@page{{size:Letter;margin:9mm}}
*{{margin:0;padding:0;box-sizing:border-box;font-family:Helvetica,Arial,sans-serif}}
h1{{font-size:19px}} .sub{{color:#867659;font-size:10px;margin:3px 0 10px}}
h2{{font-size:13px;margin:13px 0 5px;border-bottom:2px solid #C6A662;padding-bottom:3px;page-break-after:avoid}}
.g{{display:grid;grid-template-columns:repeat(5,1fr);gap:5px}}
.c{{border:1px solid #e4e4e4;border-radius:3px;padding:4px;page-break-inside:avoid}}
.c img{{width:100%;height:72px;object-fit:contain;background:#faf7f1}}
.ni{{width:100%;height:72px;background:#f1f1f1;color:#b3b3b3;display:flex;align-items:center;justify-content:center;font-size:7px}}
.c b{{display:block;font-size:7.5px;line-height:1.2;height:18px;overflow:hidden;margin-top:2px}}
.c span{{color:#8a8a8a;font-size:6.5px}} .c p{{font-size:9px;font-weight:bold;margin-top:1px}}
.c s{{color:#b0b0b0;font-weight:normal;font-size:6.5px}}
</style>
<h1>Galerie Oasis — Priced Catalogue</h1>
<p class="sub">{total:,} items with live retail prices · {withimg:,} with photo · retail = supplier net &times; 3.15 (rugs at our own warehouse prices)</p>
{''.join(sections)}'''

path = os.path.join(OUT, 'priced_catalogue.html')
open(path, 'w').write(html)
print(f'HTML written: {total} items, {withimg} with photos -> {path}', flush=True)
