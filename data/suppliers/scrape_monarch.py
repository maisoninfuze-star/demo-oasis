#!/usr/bin/env python3
"""Scrape Monarch Specialties catalog: SKU, description, image URL, per subcategory."""
import html
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request

BASE = "https://www.monarchspec.com/"
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0 Safari/537.36"
OUT = os.path.dirname(os.path.abspath(__file__)) + "/data"


def get(url, tries=6):
    """Fetch with backoff.  Transient DNS blips are common on long runs and a
    silent empty page here means missing products, so retry generously."""
    for n in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=90) as r:
                return r.read().decode("utf-8", "ignore")
        except Exception as e:
            if n == tries - 1:
                raise RuntimeError(f"giving up on {url}: {e}")
            time.sleep(2 ** n)


# Each product anchor is immediately followed by its <img>, carrying alt=description.
PROD_RE = re.compile(
    r'filter_websku=([^"&]+)"[^>]*class="prod-(?:main-img|item-link)"\s*>\s*'
    r'<img[^>]*?src="([^"]+)"[^>]*?alt="([^"]*)"',
    re.S,
)
# Some blocks order attributes as src then data-item-url then alt; also handle alt before src.
PROD_RE_ALT = re.compile(
    r'filter_websku=([^"&]+)"[^>]*class="prod-(?:main-img|item-link)"\s*>\s*'
    r'<img[^>]*?alt="([^"]*)"[^>]*?src="([^"]+)"',
    re.S,
)


def parse(page):
    found = {}
    for sku, src, alt in PROD_RE.findall(page):
        found.setdefault(sku.strip(), (html.unescape(alt).strip(), src.split("?")[0]))
    for sku, alt, src in PROD_RE_ALT.findall(page):
        found.setdefault(sku.strip(), (html.unescape(alt).strip(), src.split("?")[0]))
    return found


def main():
    index = get(BASE + "ms_index.asp")
    pairs = []
    seen = set()
    for m in re.finditer(
        r'filter_webcategory=([^"&]+)&filter_websubcategory=([^"]+)"', index
    ):
        cat = urllib.parse.unquote(m.group(1)).strip()
        sub = urllib.parse.unquote(m.group(2)).strip()
        if not cat.isupper():
            continue
        key = (cat, sub)
        if key not in seen:
            seen.add(key)
            pairs.append(key)

    print(f"{len(pairs)} category/subcategory pages to scrape")
    catalog = []
    for i, (cat, sub) in enumerate(pairs, 1):
        url = (
            BASE
            + "ms_productcategory_inquiry_R4.asp?filter_webcategory="
            + urllib.parse.quote(cat)
            + "&filter_websubcategory="
            + urllib.parse.quote(sub)
            + "&pageno=1&pageSize=2000"
        )
        page = get(url)
        items = parse(page)
        total = re.findall(r"intTotalCount = (\d+)", page)
        for sku, (desc, img) in items.items():
            catalog.append(
                {
                    "category": cat,
                    "subcategory": sub,
                    "sku": sku,
                    "description": desc,
                    "image": img,
                }
            )
        print(
            f"[{i:>3}/{len(pairs)}] {cat} > {sub}: {len(items)} skus "
            f"(site total {total[0] if total else '?'})"
        )
        time.sleep(0.6)

    # Department-level sweep.  Monarch's NEW arrivals (and anything else not yet
    # filed under a subcategory) appear only on the department page, so scraping
    # the 82 subcategory pages alone silently misses them.  Their furniture type
    # is taken from the description head, which is the same vocabulary the
    # subcategory names use.
    have = {row["sku"] for row in catalog}
    depts = sorted({cat for cat, _ in pairs} | {"NEW"})
    print(f"\nsweeping {len(depts)} department pages for unfiled products")
    for cat in depts:
        url = (
            BASE
            + "ms_productcategory_inquiry_R4.asp?filter_webcategory="
            + urllib.parse.quote(cat)
            + "&pageno=1&pageSize=3000"
        )
        items = parse(get(url))
        added = 0
        for sku, (desc, img) in items.items():
            if sku in have:
                continue
            have.add(sku)
            catalog.append(
                {
                    "category": cat,
                    "subcategory": desc.partition(" - ")[0].strip(),
                    "sku": sku,
                    "description": desc,
                    "image": img,
                }
            )
            added += 1
        if added:
            print(f"  {cat}: +{added} unfiled products")
        time.sleep(0.6)

    with open(f"{OUT}/catalog.json", "w") as f:
        json.dump(catalog, f, indent=1)
    uniq = {c["sku"] for c in catalog}
    print(f"\nDONE: {len(catalog)} rows, {len(uniq)} unique SKUs")


main()
