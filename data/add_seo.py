#!/usr/bin/env python3
"""Inject SEO head tags + LocalBusiness/Breadcrumb schema into each page,
and generate sitemap.xml / robots.txt from the real catalogue."""
import json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = 'https://galerieoasis.ca'

PAGES = {
    'index.html': {
        'title': 'Galerie Oasis — Furniture & Hand-Knotted Rugs in Laval',
        'desc': 'High-end sofas, sectionals, dining, bedrooms and hand-knotted rugs in Laval, Québec. Custom-made pieces in your choice of fabric. Visit our showroom on Bd du Curé-Labelle.',
        'path': '/', 'img': '/assets/img/scene-sofa-1.jpg'
    },
    'collection.html': {
        'title': 'The Collection — Galerie Oasis, Laval',
        'desc': 'Browse 240+ pieces: sofas, sectionals, armchairs, dining, bedroom sets and hand-knotted rugs. Made-to-order options available.',
        'path': '/collection.html', 'img': '/assets/img/scene-sofa-2.jpg'
    },
    'product.html': {
        'title': 'Custom Furniture — Galerie Oasis, Laval',
        'desc': 'Made-to-order furniture in your choice of performance fabric. Real swatches from our Laval showroom.',
        'path': '/product.html', 'img': '/assets/img/scene-sofa-1.jpg'
    },
}

LOCAL_BUSINESS = {
    "@context": "https://schema.org",
    "@type": "FurnitureStore",
    "name": "Galerie Oasis",
    "image": f"{SITE}/assets/img/logo.png",
    "@id": f"{SITE}/#store",
    "url": SITE,
    "telephone": "+1-450-973-0000",
    "email": "galerieoasis@bellnet.ca",
    "priceRange": "$$$",
    "address": {
        "@type": "PostalAddress",
        "streetAddress": "1877 Bd du Curé-Labelle",
        "addressLocality": "Laval",
        "addressRegion": "QC",
        "postalCode": "H7T 1K2",
        "addressCountry": "CA"
    },
    "geo": {"@type": "GeoCoordinates", "latitude": 45.5793, "longitude": -73.7444},
    "areaServed": ["Laval", "Montréal", "Rosemère", "Blainville", "Boisbriand", "Terrebonne"],
    "openingHoursSpecification": [
        {"@type": "OpeningHoursSpecification", "dayOfWeek": ["Monday", "Tuesday", "Wednesday"],
         "opens": "10:00", "closes": "18:00"},
        {"@type": "OpeningHoursSpecification", "dayOfWeek": ["Thursday", "Friday"],
         "opens": "10:00", "closes": "20:00"},
        {"@type": "OpeningHoursSpecification", "dayOfWeek": "Saturday", "opens": "10:00", "closes": "17:00"},
        {"@type": "OpeningHoursSpecification", "dayOfWeek": "Sunday", "opens": "11:00", "closes": "17:00"},
    ],
    "makesOffer": [
        {"@type": "Offer", "itemOffered": {"@type": "Service", "name": "Custom-made upholstered furniture"}},
        {"@type": "Offer", "itemOffered": {"@type": "Service", "name": "Hand-knotted rugs"}},
        {"@type": "Offer", "itemOffered": {"@type": "Service", "name": "Interior design consultation"}},
    ],
}

def head_block(cfg, page):
    url = SITE + cfg['path']
    tags = f'''<link rel="canonical" href="{url}" />
<link rel="alternate" hreflang="en-CA" href="{url}" />
<link rel="alternate" hreflang="fr-CA" href="{url}" />
<link rel="alternate" hreflang="x-default" href="{url}" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="Galerie Oasis" />
<meta property="og:locale" content="en_CA" />
<meta property="og:locale:alternate" content="fr_CA" />
<meta property="og:title" content="{cfg['title']}" />
<meta property="og:description" content="{cfg['desc']}" />
<meta property="og:url" content="{url}" />
<meta property="og:image" content="{SITE}{cfg['img']}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="{cfg['title']}" />
<meta name="twitter:description" content="{cfg['desc']}" />
<meta name="twitter:image" content="{SITE}{cfg['img']}" />
<meta name="theme-color" content="#100E0C" />
<meta name="geo.region" content="CA-QC" />
<meta name="geo.placename" content="Laval" />
<link rel="icon" href="/assets/img/logo.png" />
<link rel="apple-touch-icon" href="/assets/img/logo.png" />'''
    if page == 'index.html':
        tags += '\n<script type="application/ld+json">' + json.dumps(LOCAL_BUSINESS, ensure_ascii=False) + '</script>'
    return tags

for page, cfg in PAGES.items():
    path = os.path.join(ROOT, page)
    s = open(path).read()
    s = re.sub(r'\n<link rel="canonical".*?(?=\n<link rel="stylesheet")', '', s, flags=re.S)
    if 'og:title' in s:
        print(f'{page}: already has SEO tags, skipping')
        continue
    s = re.sub(r'(<meta name="description"[^>]*/>)',
               lambda m: f'<meta name="description" content="{cfg["desc"]}" />\n' + head_block(cfg, page), s, count=1)
    s = re.sub(r'<title>.*?</title>', f'<title>{cfg["title"]}</title>', s, count=1)
    open(path, 'w').write(s)
    print(f'{page}: SEO head injected')

# ---------- sitemap ----------
catalog = json.load(open(os.path.join(ROOT, 'data', 'catalog.json')))
urls = [(SITE + '/', '1.0'), (SITE + '/collection.html', '0.9')]
for c in ['living-room', 'dining-room', 'bed-room', 'carpets']:
    urls.append((f'{SITE}/collection.html?cat={c}', '0.8'))
for p in catalog:
    if p.get('img'):
        urls.append((f'{SITE}/product.html?id={p["id"]}', '0.7'))

sm = ['<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemap.org/schemas/sitemap/0.9">'.replace('sitemap.org', 'sitemaps.org')]
for u, pr in urls:
    sm.append(f'  <url><loc>{u.replace("&", "&amp;")}</loc><priority>{pr}</priority></url>')
sm.append('</urlset>')
open(os.path.join(ROOT, 'sitemap.xml'), 'w').write('\n'.join(sm))

open(os.path.join(ROOT, 'robots.txt'), 'w').write(
    f'User-agent: *\nAllow: /\n\nSitemap: {SITE}/sitemap.xml\n')

print(f'sitemap.xml: {len(urls)} urls')
print('robots.txt written')
