#!/usr/bin/env python3
"""Point each rug's hi-res reference at the local AuraSR upscale when one
exists (falls back to the weserv proxy otherwise), then rebuild cat files.
Run AFTER data/upscale_rugs.py finishes."""
import json, os, subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HI = os.path.join(ROOT, 'assets', 'rugs-hi')
path = os.path.join(ROOT, 'data', 'suppliers', 'rugsnetwork.json')
d = json.load(open(path))
swapped = kept = 0
for it in d['items']:
    local = f"assets/rugs-hi/{it['pid']}.webp"
    if os.path.exists(os.path.join(ROOT, local)):
        it['hi'] = local
        swapped += 1
    else:
        kept += 1
json.dump(d, open(path, 'w'), ensure_ascii=False, indent=1)
print(f"hi-res wired: {swapped} local AuraSR, {kept} still proxy")
subprocess.run(['python3', os.path.join(ROOT, 'data', 'suppliers', 'categorize.py')], check=True)
print('cat files rebuilt')
