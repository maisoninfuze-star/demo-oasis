#!/usr/bin/env python3
"""Retry failed catalog image downloads politely (slow, with backoff + URL quoting)."""
import json, os, time, urllib.request, urllib.parse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'data')
IMGDIR = os.path.join(ROOT, 'assets', 'catalog')

products = []
for p in (1, 2, 3):
    products += json.load(open(os.path.join(DATA, f'products-p{p}.json')))

jobs = []
for pr in products:
    imgs = pr.get('images') or []
    slug = pr['slug'][:60]
    for idx, im in enumerate(imgs[:10]):
        name = f"{slug}.jpg" if idx == 0 else f"{slug}-{idx+1}.jpg"
        dest = os.path.join(IMGDIR, name)
        if not os.path.exists(dest):
            jobs.append((im['src'], dest))

print(f"missing: {len(jobs)}")
ok = fail = 0
for url, dest in jobs:
    # percent-encode non-ascii path chars
    sp = urllib.parse.urlsplit(url)
    safe = urllib.parse.urlunsplit((sp.scheme, sp.netloc, urllib.parse.quote(sp.path), sp.query, sp.fragment))
    done = False
    for attempt in range(4):
        try:
            req = urllib.request.Request(safe, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=60) as r, open(dest, 'wb') as f:
                f.write(r.read())
            done = True
            break
        except Exception as e:
            code = getattr(e, 'code', None)
            if code == 429:
                time.sleep(4 * (attempt + 1))
            else:
                time.sleep(1.5)
    if done:
        ok += 1
    else:
        fail += 1
        print("STILL FAILING:", url[:120])
    time.sleep(0.35)  # be polite
print(f"retry done: {ok} ok, {fail} fail")
