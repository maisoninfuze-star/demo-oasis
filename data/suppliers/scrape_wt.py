#!/usr/bin/env python3
"""Scrape wt.studio (Squarespace) — a custom banquette/table studio.

Their catalogue is portfolio galleries, not a shop, so each gallery image
imports as a made-to-order portfolio piece. Price on request.
"""
import json, os, re, time, urllib.request

OUT = os.path.dirname(os.path.abspath(__file__))
BASE = 'https://wt.studio'
UA = {'User-Agent': 'Mozilla/5.0', 'Accept': 'text/html'}

PAGES = [
    ('banquettes', 'Custom banquette'),
    ('portfolio-banquettes', 'Custom banquette'),
    ('portfolio-banquettes-1', 'Custom banquette'),
    ('new-banquette-page-1', 'Custom banquette'),
    ('banquette-by-the-foot', 'Banquette by the foot'),
    ('table-collection', 'Table'),
    ('table-collection-1', 'Table'),
    ('portfolio-tables', 'Table'),
    ('portfolio-storage', 'Storage'),
    ('showcase', 'Showcase piece'),
]

def get(url, tries=3):
    for a in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=40) as r:
                return r.read().decode('utf-8', 'ignore')
        except Exception:
            time.sleep(1.5)
    return ''

if __name__ == '__main__':
    items, seen = [], set()
    for page, kind in PAGES:
        b = get(f'{BASE}/{page}')
        imgs = list(dict.fromkeys(re.findall(
            r'(https://images\.squarespace-cdn\.com/content/[^"\s]+?\.(?:jpg|jpeg|png))', b)))
        n = 0
        for i, img in enumerate(imgs):
            key = img.split('/')[-1]
            if key in seen or 'logo' in key.lower():
                continue
            seen.add(key)
            base = re.sub(r'\.(jpg|jpeg|png)$', '', key)
            nice = re.sub(r'[_-]+', ' ', re.sub(r'\.\d.*$', '', base)).strip().title()[:50]
            items.append({
                'id': f'wt-{len(items)}',
                'name': nice or f'{kind} {len(items)+1}',
                'cats': [kind.lower().replace(' ', '-')],
                'desc': f'{kind} — designed and made to order by WT Studio. Sizes, woods and upholstery to spec.',
                'img': img + '?format=1000w',
                'gallery': [],
                'url': f'{BASE}/{page}',
            })
            n += 1
        print(f'{page}: +{n}', flush=True)
        time.sleep(0.4)
    dest = os.path.join(OUT, 'wt.json')
    json.dump({'supplier': 'wt', 'source': BASE, 'count': len(items), 'items': items},
              open(dest, 'w'), ensure_ascii=False, indent=1)
    print(f'wt.studio: {len(items)} portfolio pieces -> {dest}')
