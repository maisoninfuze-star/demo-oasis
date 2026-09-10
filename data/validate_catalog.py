#!/usr/bin/env python3
"""Catalogue invariants. Exits 1 so a bad sync cannot commit.

The scheduled sync runs unattended and pushes straight to production. These are
the failures that would be embarrassing in front of a customer and easy to miss
in a diff of 6,600 products.
"""
import collections, json, glob, os, re, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CAT = os.path.join(ROOT, 'data', 'cat')
fail = []

items = []
for f in sorted(glob.glob(os.path.join(CAT, '*.json'))):
    if f.endswith('index.json'):
        continue
    d = json.load(open(f))
    for it in d['items']:
        it['_top'] = d['top']
        items.append(it)
priced = [i for i in items if i.get('price')]
print(f'catalogue: {len(items):,} items, {len(priced):,} priced')

# 1. wholesale cost must never reach the browser
leak = [i for i in items if 'net' in i]
if leak:
    fail.append(f'{len(leak)} items expose wholesale `net` in data/cat (customer-visible)')

# 2. Complete Sets admits verified bundles only
SPEC = re.compile(r'^\s*(?:BED\s*ROOM|DINING|LIVING|SOFA)\s+SETS?\s*[-–—]\s*(.+)$', re.I)
BUNDLE = re.compile(r'\b\d+\s*PCS?\b|\b\d+\s*PIECE\b|\bCOMPLETE\s+SET\b', re.I)
PIECES = [r'\bNIGHT\s*STAND\b', r'\bDRESSER\b', r'\bCHEST\b', r'\bMIRROR\b',
          r'\bHEADBOARD\b', r'\bBED\b']
bad = []
for i in items:
    if i.get('sub') not in ('bedroom-sets', 'dining-sets', 'living-sets'):
        continue
    m = SPEC.match(str(i.get('desc') or ''))
    if not m or BUNDLE.search(m.group(1)):
        continue
    if len({p for p in PIECES if re.search(p, m.group(1), re.I)}) == 1:
        bad.append(i)
if bad:
    fail.append(f'{len(bad)} single pieces filed under a Sets category '
                f'(e.g. {bad[0].get("sku")} {bad[0].get("name","")[:40]!r})')

# 3. a sync must not silently gut the priced catalogue
try:
    prev_n = 0
    for f in sorted(glob.glob(os.path.join(CAT, '*.json'))):
        if f.endswith('index.json'):
            continue
        rel = os.path.relpath(f, ROOT)
        b = subprocess.run(['git', 'show', f'HEAD:{rel}'], cwd=ROOT,
                           capture_output=True, text=True, timeout=60)
        if b.returncode == 0:
            prev_n += sum(1 for i in json.loads(b.stdout)['items'] if i.get('price'))
    if prev_n and len(priced) < prev_n * 0.9:
        fail.append(f'priced products fell {prev_n:,} -> {len(priced):,} '
                    f'({100 - len(priced) / prev_n * 100:.0f}% lost) — pricing step likely skipped')
    else:
        print(f'priced vs committed: {prev_n:,} -> {len(priced):,}')

    # A global threshold hides a single supplier collapsing. The 2026-09-10 sync
    # emptied Mazin and lost 61% of A-Class while the total moved only 5%, so it
    # sailed through. Judge every supplier on its own.
    prev_b, cur_b = collections.Counter(), collections.Counter()
    for f in sorted(glob.glob(os.path.join(CAT, '*.json'))):
        if f.endswith('index.json'):
            continue
        b = subprocess.run(['git', 'show', f'HEAD:{os.path.relpath(f, ROOT)}'], cwd=ROOT,
                           capture_output=True, text=True, timeout=60)
        if b.returncode == 0:
            for i in json.loads(b.stdout)['items']:
                if i.get('price'):
                    prev_b[i.get('brand')] += 1
    for i in priced:
        cur_b[i.get('brand')] += 1
    for brand, was in prev_b.items():
        now = cur_b.get(brand, 0)
        if was >= 10 and now < was * 0.8:
            fail.append(f'{brand}: priced products fell {was} -> {now} '
                        f'({100 - now / was * 100:.0f}% lost) — that supplier\'s feed or '
                        f'pricing step failed')
except Exception as e:
    print(f'(could not compare against HEAD: {e})')

# 4. set links must resolve both ways, or a shopper hits a dead product page
by_id = {str(i.get('id')): i for i in items}
dangling_m = [(i.get('sku'), m.get('id')) for i in items for m in (i.get('members') or [])
              if str(m.get('id')) not in by_id]
dangling_p = [i.get('sku') for i in items
              if i.get('partOf') and str(i['partOf'].get('id')) not in by_id]
if dangling_m:
    fail.append(f'{len(dangling_m)} set members point at missing products (e.g. {dangling_m[0]})')
if dangling_p:
    fail.append(f'{len(dangling_p)} pieces link back to a missing collection (e.g. {dangling_p[0]})')
mism = [i.get('sku') for i in items if i.get('members') and i.get('price')
        and abs(sum(float(m.get('price') or 0) for m in i['members']) - float(i['price'])) > 1]
if mism:
    fail.append(f'{len(mism)} sets priced differently from the sum of their pieces (e.g. {mism[0]})')

# 5. every product needs an id, or its page cannot be reached
noid = [i for i in items if not i.get('id')]
if noid:
    fail.append(f'{len(noid)} items have no id — product.html cannot render them')

if fail:
    print('\nFAILED:')
    for f in fail:
        print(f'  - {f}')
    sys.exit(1)
print('all catalogue invariants hold')
