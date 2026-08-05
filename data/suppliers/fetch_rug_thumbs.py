#!/usr/bin/env python3
"""Download rugsnetwork thumbnails locally as WebP.

Their images are served over plain HTTP, which browsers block as mixed
content once our site is on HTTPS — so hotlinking is not an option.
480px WebP keeps 1,462 rugs to roughly 25 MB.
"""
import json, os, time, urllib.request, io
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'rugsnetwork.json')
OUT = os.path.join(ROOT, 'assets', 'rugs')
os.makedirs(OUT, exist_ok=True)
UA = {'User-Agent': 'Mozilla/5.0'}

data = json.load(open(SRC))
ok = fail = skip = 0
for it in data['items']:
    if not it.get('img'):
        continue
    name = f"{it['pid']}.webp"
    dest = os.path.join(OUT, name)
    rel = f"assets/rugs/{name}"
    if os.path.exists(dest):
        it['thumb'] = rel
        skip += 1
        continue
    try:
        req = urllib.request.Request(it['img'], headers=UA)
        with urllib.request.urlopen(req, timeout=40) as r:
            raw = r.read()
        im = Image.open(io.BytesIO(raw)).convert('RGB')
        if im.width > 480:
            im = im.resize((480, round(im.height * 480 / im.width)), Image.LANCZOS)
        im.save(dest, 'WEBP', quality=72, method=6)
        it['thumb'] = rel
        ok += 1
    except Exception:
        fail += 1
    if (ok + fail) % 100 == 0 and (ok + fail):
        print(f'  {ok+fail+skip}/{len(data["items"])} (ok={ok} fail={fail})', flush=True)
    time.sleep(0.15)

json.dump(data, open(SRC, 'w'), ensure_ascii=False, indent=1)
print(f'done: ok={ok} reused={skip} fail={fail}')
