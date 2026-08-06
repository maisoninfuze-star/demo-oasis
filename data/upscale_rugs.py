#!/usr/bin/env python3
"""Upscale all Rugs Network photos with fal.ai AuraSR (4x, texture-preserving).

Their server only stores 510px thumbnails — no larger originals exist — so
this is the only route to zoom-quality imagery. Resume-safe: skips rugs whose
output already exists. Output: assets/rugs-hi/<pid>.webp (max 1200px wide).
"""
import json, os, time, urllib.request, io, threading, queue

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets', 'rugs-hi')
os.makedirs(OUT, exist_ok=True)
LOG = os.path.join(ROOT, 'data', 'upscale.log')

KEY = None
for line in open('/Users/inder/Claude/Projects/shared-keys/fal.env'):
    if line.startswith('FAL_KEY='):
        KEY = line.split('=', 1)[1].strip()
if not KEY:
    raise SystemExit('no FAL_KEY')

from PIL import Image

items = json.load(open(os.path.join(ROOT, 'data', 'suppliers', 'rugsnetwork.json')))['items']
todo = [it for it in items if it.get('img') and not os.path.exists(os.path.join(OUT, f"{it['pid']}.webp"))]
print(f"{len(items)} rugs total, {len(todo)} to upscale", flush=True)

q = queue.Queue()
for it in todo:
    q.put(it)
done = fails = 0
lock = threading.Lock()

def log(msg):
    with lock:
        with open(LOG, 'a') as f:
            f.write(msg + '\n')

def worker():
    global done, fails
    while True:
        try:
            it = q.get_nowait()
        except queue.Empty:
            return
        pid = it['pid']
        ok = False
        for attempt in (1, 2, 3, 4):
            try:
                body = json.dumps({"image_url": it['img']}).encode()
                r = urllib.request.Request("https://fal.run/fal-ai/aura-sr", data=body,
                    headers={"Authorization": "Key " + KEY, "Content-Type": "application/json"})
                resp = json.load(urllib.request.urlopen(r, timeout=300))
                if not resp.get('image', {}).get('url'):
                    raise RuntimeError(f'no url: {str(resp)[:60]}')
                png = urllib.request.urlopen(resp['image']['url'], timeout=120).read()
                time.sleep(0.4)  # stay under the concurrency throttle
                im = Image.open(io.BytesIO(png)).convert('RGB')
                if im.width > 1200:
                    im = im.resize((1200, round(im.height * 1200 / im.width)), Image.LANCZOS)
                im.save(os.path.join(OUT, f"{pid}.webp"), 'WEBP', quality=82, method=6)
                ok = True
                break
            except Exception as e:
                if attempt == 4:
                    log(f"FAIL {pid} {e}")
                else:
                    time.sleep(4 * attempt * attempt)  # 4s, 16s, 36s — ride out throttling
        with lock:
            if ok:
                done += 1
            else:
                fails += 1
            n = done + fails
            if n % 25 == 0:
                print(f"progress: {n}/{len(todo)} (ok={done} fail={fails})", flush=True)
        q.task_done()

threads = [threading.Thread(target=worker, daemon=True) for _ in range(2)]
for t in threads: t.start()
for t in threads: t.join()
print(f"DONE: ok={done} fail={fails} of {len(todo)}", flush=True)
