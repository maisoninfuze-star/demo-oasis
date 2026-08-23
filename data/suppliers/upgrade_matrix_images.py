#!/usr/bin/env python3
"""Point Matrix products at their full-size photo instead of the 390px thumbnail.

The crawl captured whatever <img> the listing page used, which for Matrix is
/uploads/thumbs/<file> — a 390px thumbnail. The identical filename also exists
under /uploads/items/, at 1536-7680px. The item page renders ~1000px wide, so
the thumbnail was being blown up roughly 5x and looked soft on every Matrix
product.

Every rewrite is verified with a HEAD request first: a handful of files exist
only under /thumbs/, and pointing those at a 404 would be worse than soft.
Re-runnable; already-upgraded URLs are left alone.
"""
import json, os, sys, urllib.request, concurrent.futures as cf

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
THUMB, FULL = '/uploads/thumbs/', '/uploads/items/'
UA = {'User-Agent': 'Mozilla/5.0'}


def full_size_exists(url):
    try:
        r = urllib.request.urlopen(
            urllib.request.Request(url, method='HEAD', headers=UA), timeout=25)
        return r.status == 200
    except Exception:
        return False


def collect(obj, out):
    """Every /thumbs/ URL anywhere in the tree (img, img_src, gallery[])."""
    if isinstance(obj, dict):
        for v in obj.values():
            collect(v, out)
    elif isinstance(obj, list):
        for v in obj:
            collect(v, out)
    elif isinstance(obj, str) and THUMB in obj:
        out.add(obj)


def rewrite(obj, ok):
    if isinstance(obj, dict):
        return {k: rewrite(v, ok) for k, v in obj.items()}
    if isinstance(obj, list):
        return [rewrite(v, ok) for v in obj]
    if isinstance(obj, str) and obj in ok:
        return obj.replace(THUMB, FULL)
    return obj


targets = [os.path.join(HERE, 'matrix.json')] + [
    os.path.join(ROOT, 'data', 'cat', f)
    for f in sorted(os.listdir(os.path.join(ROOT, 'data', 'cat')))
    if f.endswith('.json') and f != 'index.json']

urls = set()
loaded = {}
for path in targets:
    loaded[path] = json.load(open(path))
    collect(loaded[path], urls)

if not urls:
    print('nothing to upgrade — all Matrix images already point at /uploads/items/')
    sys.exit(0)

print(f'verifying {len(urls)} thumbnail URLs have a full-size twin...')
with cf.ThreadPoolExecutor(12) as ex:
    ok = {u for u, good in zip(urls, ex.map(
        lambda u: full_size_exists(u.replace(THUMB, FULL)), urls)) if good}

skipped = len(urls) - len(ok)
for path, data in loaded.items():
    before = json.dumps(data)
    data = rewrite(data, ok)
    after = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
    if before == json.dumps(data):
        continue
    open(path, 'w', encoding='utf-8').write(after)
    print(f'  wrote {os.path.relpath(path, ROOT)}')

print(f'\nupgraded {len(ok)} URLs (390px -> 1536px+); '
      f'left {skipped} alone (no full-size twin)')
