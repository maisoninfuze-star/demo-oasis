#!/usr/bin/env python3
"""Generate card-sized WebP thumbnails for the collection grids.

The grids were loading full 1000px catalogue photos into ~300px cards:
Living Room 10 MB, Rugs 14.7 MB, full collection 30 MB. Cards now use
assets/thumbs/<slug>.webp (~480px) while the product page and lightbox
keep the full-resolution originals for zooming.
"""
import json, os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets', 'thumbs')
os.makedirs(OUT, exist_ok=True)

WIDTH = 480          # cards render <= ~380px CSS; 480 covers 1.5x DPR at grid size
QUALITY = 72

catalog = json.load(open(os.path.join(ROOT, 'data', 'catalog.json')))

made = skipped = 0
before = after = 0
for p in catalog:
    src_rel = p.get('img')
    if not src_rel:
        continue
    src = os.path.join(ROOT, src_rel)
    if not os.path.exists(src):
        continue
    name = os.path.splitext(os.path.basename(src_rel))[0] + '.webp'
    dest = os.path.join(OUT, name)
    p['thumb'] = f'assets/thumbs/{name}'
    before += os.path.getsize(src)
    if os.path.exists(dest):
        after += os.path.getsize(dest)
        skipped += 1
        continue
    im = Image.open(src).convert('RGB')
    if im.width > WIDTH:
        im = im.resize((WIDTH, round(im.height * WIDTH / im.width)), Image.LANCZOS)
    im.save(dest, 'WEBP', quality=QUALITY, method=6)
    after += os.path.getsize(dest)
    made += 1

json.dump(catalog, open(os.path.join(ROOT, 'data', 'catalog.json'), 'w'),
          ensure_ascii=False, indent=1)

print(f'thumbs made: {made}, reused: {skipped}')
print(f'card imagery: {before/1024/1024:.1f} MB -> {after/1024/1024:.1f} MB '
      f'({100 - after/before*100:.0f}% smaller)')
