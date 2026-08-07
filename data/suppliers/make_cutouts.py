#!/usr/bin/env python3
"""Remove suppliers' own photo backgrounds behind priced items.

Detects photos whose corners are not studio-white, cuts the furniture out
with fal-ai/birefnet/v2 (fal cannot fetch some supplier servers, so images
are sent base64), trims the transparent border, and saves
assets/cutouts/<md5>.webp (alpha kept — the card's cream shows through).
Then remaps matrix/aclass/mazin items: img -> local cutout, original kept
as img_src. Resume-safe on the fal step.
"""
import json, os, re, io, base64, hashlib, time, urllib.request, concurrent.futures
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
OUT = os.path.join(ROOT, 'assets', 'cutouts')
os.makedirs(OUT, exist_ok=True)
KEY = [l.split('=', 1)[1].strip() for l in
       open('/Users/inder/Claude/Projects/shared-keys/fal.env') if l.startswith('FAL_KEY=')][0]
UA = {'User-Agent': 'Mozilla/5.0'}
md5 = lambda s: hashlib.md5(s.encode()).hexdigest()[:16]

# ---- collect distinct photos behind priced items ----
urls = {}
for slug in ('matrix', 'aclass', 'mazin'):
    d = json.load(open(os.path.join(HERE, f'{slug}.json')))
    for it in d['items']:
        if it.get('price') and it.get('img') and not it.get('delisted') and str(it['img']).startswith('http'):
            urls.setdefault(it['img'], slug)
print(f'{len(urls)} distinct photos to inspect', flush=True)

def fetch(url):
    fn = os.path.join('/tmp', 'bg2_' + md5(url))
    if not os.path.exists(fn):
        raw = urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60).read()
        open(fn, 'wb').write(raw)
    return open(fn, 'rb').read()

def needs_cut(raw):
    im = Image.open(io.BytesIO(raw)).convert('RGB')
    w, h = im.size
    corners = [im.getpixel(p) for p in [(3, 3), (w - 4, 3), (3, h - 4), (w - 4, h - 4)]]
    return sum(1 for c in corners if all(v > 232 for v in c)) < 3

def one(url):
    dest = os.path.join(OUT, md5(url) + '.webp')
    if os.path.exists(dest):
        return ('cut', url)
    try:
        raw = fetch(url)
        if not needs_cut(raw):
            return ('white', url)
    except Exception as e:
        return ('fail', url)
    for attempt in (1, 2, 3):
        try:
            uri = 'data:image/jpeg;base64,' + base64.b64encode(raw).decode()
            body = json.dumps({"image_url": uri}).encode()
            r = urllib.request.Request("https://fal.run/fal-ai/birefnet/v2", data=body,
                headers={"Authorization": "Key " + KEY, "Content-Type": "application/json"})
            resp = json.load(urllib.request.urlopen(r, timeout=240))
            png = urllib.request.urlopen(resp['image']['url'], timeout=120).read()
            im = Image.open(io.BytesIO(png)).convert('RGBA')
            bbox = im.split()[3].getbbox()
            if bbox: im = im.crop(bbox)
            if im.width > 900:
                im = im.resize((900, round(im.height * 900 / im.width)), Image.LANCZOS)
            im.save(dest, 'WEBP', quality=84, method=6)
            time.sleep(0.3)
            return ('cut', url)
        except Exception as e:
            if attempt == 3: return ('fail', url)
            time.sleep(4 * attempt)

counts = {'cut': 0, 'white': 0, 'fail': 0}
cutmap = {}
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as ex:
    for i, (status, url) in enumerate(ex.map(one, urls)):
        counts[status] += 1
        if status == 'cut':
            cutmap[url] = f'assets/cutouts/{md5(url)}.webp'
        if (i + 1) % 40 == 0:
            print(f'{i+1}/{len(urls)} {counts}', flush=True)
print('final:', counts, flush=True)

# ---- remap supplier feeds ----
for slug in ('matrix', 'aclass', 'mazin'):
    p = os.path.join(HERE, f'{slug}.json')
    d = json.load(open(p))
    n = 0
    for it in d['items']:
        src = it.get('img_src') or it.get('img')
        if src in cutmap:
            it['img_src'] = src
            it['img'] = cutmap[src]
            n += 1
    json.dump(d, open(p, 'w'), ensure_ascii=False, indent=1)
    print(f'{slug}: {n} items now use cutouts', flush=True)
