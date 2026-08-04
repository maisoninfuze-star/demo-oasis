#!/usr/bin/env python3
"""Crop real fabric swatch tiles from the owner's sample-book photos."""
import os
from PIL import Image, ImageEnhance

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'assets', 'reference', 'fabric-books')
OUT = os.path.join(ROOT, 'assets', 'fabrics')
os.makedirs(OUT, exist_ok=True)

P = lambda n: os.path.join(SRC, n)

# (out_name, source file, crop box in ORIGINAL px (l,t,r,b))
JOBS = [
    # --- Ennis Fabrics ---
    ('harper-cinder',    '9.09.28 PM-3', (300, 900, 1150, 1500)),    # Harper — textured weave
    ('franklin-petrol',  '9.09.29 PM-2', (330, 800, 1200, 1450)),    # Franklin 2nd Ed — velvet
    ('heavenly-teal',    '9.09.28 PM-2', (170, 800, 1150, 1500)),    # Heavenly 3rd Ed — plush
    # --- ACU Iconic Vol. II (performance velvet) ---
    ('acu-velvet-sage',  '9.09.30 PM-2', (490, 800, 1040, 1340)),
    ('acu-velvet-camel', '9.09.30 PM-2', (405, 1650, 575, 1845)),
    ('acu-velvet-cream', '9.09.30 PM-2', (604, 1536, 1020, 1780)),
    # --- ACU Iconic Vol. I (performance woven) ---
    ('acu-tweed-sable',  '9.09.27 PM-2', (220, 820, 1080, 1500)),
    ('acu-geo-olive',    '9.09.30 PM',   (640, 980, 1140, 1430)),
    ('acu-navy',         '9.09.30 PM',   (115, 1700, 700, 1938)),
]

def find(stub):
    target = f'WhatsApp Image 2026-08-03 at {stub}.jpeg'
    if os.path.exists(P(target)):
        return P(target)
    raise SystemExit(f'missing source for {stub}')

for name, stub, box in JOBS:
    im = Image.open(find(stub)).convert('RGB')
    w, h = im.size
    l, t, r, b = box
    l, t = max(0, l), max(0, t)
    r, b = min(w, r), min(h, b)
    crop = im.crop((l, t, r, b))
    # square-ish center crop then resize
    side = min(crop.size)
    cx, cy = crop.size[0] // 2, crop.size[1] // 2
    crop = crop.crop((cx - side // 2, cy - side // 2, cx + side // 2, cy + side // 2))
    crop = crop.resize((420, 420), Image.LANCZOS)
    # gentle cleanup: the samples sit under glossy plastic
    crop = ImageEnhance.Color(crop).enhance(1.06)
    crop = ImageEnhance.Contrast(crop).enhance(1.04)
    dest = os.path.join(OUT, f'{name}.jpg')
    crop.save(dest, 'JPEG', quality=86, optimize=True)
    print(f'{name}.jpg  <- {os.path.basename(find(stub))}  {os.path.getsize(dest)//1024}KB')

print('done ->', OUT)
