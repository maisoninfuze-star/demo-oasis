#!/usr/bin/env python3
"""Carry derived fields across a re-scrape.

The scrapers rebuild each supplier JSON from scratch. Everything that makes the
catalogue sellable is computed afterwards and lives only in that same file:

    net, price, from    prices from the supplier PDFs (x3.15)
    force_top/force_sub corrected product type (Monarch's "BEDROOM SET - <piece>")
    hi, img_src         full-resolution photo references
    delisted            discontinued, confirmed against the dealer portal

The PDFs are gitignored owner documents, so CI CANNOT recompute prices. Left
alone, a scheduled sync would publish 4,435 priced products as price-on-request
and put 88 individual pieces back under Complete Sets.

So: after scraping, read the previous committed copy and re-attach those fields
by product id. New products legitimately arrive bare and stay price-on-request
until someone runs the pricing pipeline locally with the PDFs to hand.
"""
import json, os, subprocess, sys, collections

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
DERIVED = ('net', 'price', 'from', 'force_top', 'force_sub', 'hi', 'img_src', 'delisted')
FEEDS = ['matrix', 'monarch', 'aclass', 'mazin', 'rugsnetwork',
         'titus', 'creative', 'glory', 'sofabyfancy', 'wt']


def previous(rel):
    """The committed version of a file, before this run's scrape overwrote it."""
    try:
        blob = subprocess.run(['git', 'show', f'HEAD:{rel}'], cwd=ROOT,
                              capture_output=True, text=True, timeout=60)
        if blob.returncode != 0:
            return None
        return json.loads(blob.stdout)
    except Exception:
        return None


def key(it):
    return str(it.get('id') or '') or f"sku:{it.get('sku') or ''}"


total = collections.Counter()
for slug in FEEDS:
    path = os.path.join(HERE, f'{slug}.json')
    rel = os.path.relpath(path, ROOT)
    if not os.path.exists(path):
        continue
    old = previous(rel)
    if not old:
        print(f'  {slug}: no committed copy to carry forward — skipped')
        continue
    cur = json.load(open(path))
    old_items = old['items'] if isinstance(old, dict) else old
    cur_items = cur['items'] if isinstance(cur, dict) else cur
    prior = {key(i): i for i in old_items}

    carried = fresh = 0
    for it in cur_items:
        was = prior.get(key(it))
        if not was:
            fresh += 1
            continue
        touched = False
        for f in DERIVED:
            if f in was and f not in it:
                it[f] = was[f]
                touched = True
        carried += bool(touched)
    json.dump(cur, open(path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    total['carried'] += carried
    total['new'] += fresh
    print(f'  {slug}: carried {carried}, {fresh} genuinely new')

print(f'\ncarried derived fields onto {total["carried"]:,} products; '
      f'{total["new"]:,} new products await pricing')
