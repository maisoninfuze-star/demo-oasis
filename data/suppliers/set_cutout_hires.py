#!/usr/bin/env python3
"""Give background-removed cutouts a high-resolution twin for the item page.

Cutouts were generated to drop messy supplier backgrounds, but they came out
small — a median of about 330px, some as low as 84px — and a few clipped part
of the furniture. The item page renders roughly 1000px wide, so those pieces
were the blurriest thing on the site.

The cards keep the cutout: a grid of pieces on a clean background is the point.
The item page gets `hi`, the supplier's original photo, so the shopper deciding
whether to buy sees the whole piece sharply.

`hi` is only set where the source is genuinely larger than the cutout -- a few
suppliers serve a thumbnail smaller than what we already have, and swapping
those in would make the page worse. Verified over the network; re-runnable.
"""
import json, os, io, urllib.request, concurrent.futures as cf
from PIL import Image

Image.MAX_IMAGE_PIXELS = None
HERE = os.path.dirname(os.path.abspath(__file__))
UA = {'User-Agent': 'Mozilla/5.0'}
SKIP = {'manifest', 'monarch_pricelist'}


def source_width(url):
    """Width from the header bytes; falls back to the whole file if needed."""
    for headers in ({**UA, 'Range': 'bytes=0-65535'}, UA):
        try:
            data = urllib.request.urlopen(
                urllib.request.Request(url, headers=headers), timeout=25).read()
            return Image.open(io.BytesIO(data)).width
        except Exception:
            continue
    return 0


total = set_hi = kept = 0
for path in sorted(os.listdir(HERE)):
    if not path.endswith('.json') or path[:-5] in SKIP:
        continue
    full = os.path.join(HERE, path)
    data = json.load(open(full))
    items = data.get('items') if isinstance(data, dict) else data
    if not isinstance(items, list):
        continue

    jobs = []
    for it in items:
        img = it.get('img') or ''
        if not img.startswith('assets/cutouts/') or not os.path.exists(img):
            continue
        src = it.get('img_src') or (it.get('gallery') or [None])[0]
        if src and str(src).startswith('http'):
            jobs.append((it, img, src))
    if not jobs:
        continue

    with cf.ThreadPoolExecutor(14) as ex:
        widths = list(ex.map(lambda j: source_width(j[2]), jobs))

    changed = 0
    for (it, img, src), sw in zip(jobs, widths):
        total += 1
        cw = Image.open(img).width
        if sw > cw:
            if it.get('hi') != src:
                it['hi'] = src
                changed += 1
            set_hi += 1
        else:
            it.pop('hi', None)   # a previous run may have set a worse one
            kept += 1
    if changed:
        json.dump(data, open(full, 'w', encoding='utf-8'),
                  ensure_ascii=False, separators=(',', ':'))
        print(f'  {path}: set hi on {changed} cutout items')

print(f'\n{set_hi} cutouts now have a higher-resolution item-page photo; '
      f'{kept} kept the cutout (no larger source). {total} examined.')
