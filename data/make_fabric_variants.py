#!/usr/bin/env python3
"""Re-upholster a real product photo in each fabric of its custom programme.

Uses fal-ai/nano-banana/edit, which preserves the subject while changing only
what the prompt names (see memory rule 12). Output:
  assets/gen/variants/<product-slug>-<fabric-id>.jpg
Resume-safe: skips variants that already exist.
"""
import json, base64, os, io, urllib.request, concurrent.futures

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets', 'gen', 'variants')
os.makedirs(OUT, exist_ok=True)
KEY = [l.split('=', 1)[1].strip() for l in
       open('/Users/inder/Claude/Projects/shared-keys/fal.env') if l.startswith('FAL_KEY=')][0]
from PIL import Image

KEEP = ("KEEP EVERYTHING ELSE IDENTICAL: the same sofa silhouette and proportions, the same "
        "quilted pattern, the same gold metal trim and gold base band, the same cushions, the "
        "same room, wall, artwork, floor and rug, the same camera angle and lighting. "
        "Change ONLY the upholstery material and colour. Photorealistic furniture catalogue photography.")

# product slug -> (source image, {fabric_id: fabric description})
JOBS = {
    'annabelle': ('assets/catalog/annabelle.jpg', {
        'sage':  'soft sage green velvet with a gentle sheen',
        'camel': 'warm camel / caramel velvet',
        'navy':  'deep navy blue woven fabric with a subtle textured weave',
        'sable': 'dark sable brown tweed with a visible woven texture',
        'geo':   'olive green and beige geometric jacquard patterned fabric',
    }),
}

def one(args):
    slug, src, fid, desc = args
    dest = os.path.join(OUT, f'{slug}-{fid}.jpg')
    if os.path.exists(dest):
        return f'skip {slug}-{fid}'
    uri = 'data:image/jpeg;base64,' + base64.b64encode(open(os.path.join(ROOT, src), 'rb').read()).decode()
    prompt = f"Re-upholster this exact sofa in {desc}. {KEEP}"
    body = json.dumps({"prompt": prompt, "image_urls": [uri],
                       "num_images": 1, "aspect_ratio": "3:2"}).encode()
    for attempt in (1, 2, 3):
        try:
            r = urllib.request.Request("https://fal.run/fal-ai/nano-banana/edit", data=body,
                headers={"Authorization": "Key " + KEY, "Content-Type": "application/json"})
            resp = json.load(urllib.request.urlopen(r, timeout=300))
            png = urllib.request.urlopen(resp['images'][0]['url'], timeout=120).read()
            Image.open(io.BytesIO(png)).convert('RGB').save(dest, quality=88, optimize=True)
            return f'ok   {slug}-{fid}'
        except Exception as e:
            if attempt == 3:
                return f'FAIL {slug}-{fid} {e}'
            import time; time.sleep(5 * attempt)

tasks = [(slug, src, fid, desc) for slug, (src, fabs) in JOBS.items() for fid, desc in fabs.items()]
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as ex:
    for line in ex.map(one, tasks):
        print(line, flush=True)
print('done ->', OUT)
