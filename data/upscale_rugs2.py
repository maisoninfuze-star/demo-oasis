#!/usr/bin/env python3
"""Upscale Rugs Network photos via fal.ai AuraSR — curl-based driver.

v1 stalled: urllib threads hung without timing out. curl -m enforces real
wall-clock limits. 4 workers, resume-safe, FAILs logged and retried once.
"""
import json, os, subprocess, tempfile, threading, queue, io

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets', 'rugs-hi')
LOG = os.path.join(ROOT, 'data', 'upscale.log')
os.makedirs(OUT, exist_ok=True)

KEY = next(l.split('=', 1)[1].strip() for l in open('/Users/inder/Claude/Projects/shared-keys/fal.env')
           if l.startswith('FAL_KEY='))
from PIL import Image

items = json.load(open(os.path.join(ROOT, 'data', 'suppliers', 'rugsnetwork.json')))['items']
todo = [it for it in items if it.get('img') and not os.path.exists(os.path.join(OUT, f"{it['pid']}.webp"))]
print(f"{len(items)} rugs, {len(todo)} to do", flush=True)

q = queue.Queue()
for it in todo:
    q.put(it)
lock = threading.Lock()
done = fails = 0

def curl(args, timeout):
    return subprocess.run(['curl', '-s', '-m', str(timeout)] + args,
                          capture_output=True, timeout=timeout + 15)

def one(it):
    pid = it['pid']
    r = curl(['-X', 'POST', 'https://fal.run/fal-ai/aura-sr',
              '-H', f'Authorization: Key {KEY}', '-H', 'Content-Type: application/json',
              '-d', json.dumps({"image_url": it['img']})], 180)
    resp = json.loads(r.stdout or '{}')
    url = (resp.get('image') or {}).get('url')
    if not url:
        raise RuntimeError(f"no url: {str(resp)[:120]}")
    r2 = curl(['-o', '-', url], 120)
    im = Image.open(io.BytesIO(r2.stdout)).convert('RGB')
    if im.width > 1200:
        im = im.resize((1200, round(im.height * 1200 / im.width)), Image.LANCZOS)
    im.save(os.path.join(OUT, f"{pid}.webp"), 'WEBP', quality=82, method=6)

def worker():
    global done, fails
    while True:
        try:
            it = q.get_nowait()
        except queue.Empty:
            return
        ok = False
        for attempt in (1, 2):
            try:
                one(it)
                ok = True
                break
            except Exception as e:
                if attempt == 2:
                    with lock:
                        open(LOG, 'a').write(f"FAIL {it['pid']} {str(e)[:150]}\n")
        with lock:
            if ok: done += 1
            else: fails += 1
            if (done + fails) % 25 == 0:
                print(f"progress {done + fails}/{len(todo)} ok={done} fail={fails}", flush=True)

threads = [threading.Thread(target=worker, daemon=True) for _ in range(4)]
for t in threads: t.start()
for t in threads: t.join()
print(f"DONE ok={done} fail={fails} of {len(todo)}", flush=True)
