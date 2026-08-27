#!/usr/bin/env python3
"""Build the price-QA report: one row per customer-facing priced product."""
import json, os, csv, sys, glob, collections

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SC = sys.argv[1]
rows = json.load(open(os.path.join(SC, 'audit_rows.json')))
changes = {c['id']: c for c in
           json.load(open(os.path.join(ROOT, 'data/suppliers/price_identity_changes.json')))}

SUPPLIER = {'matrix': 'Matrix', 'aclass': 'A-Class', 'mazin': 'Mazin',
            'monarch': 'Monarch', 'rugsnetwork': 'Rugs Network', 'oasis': 'Galerie Oasis'}
DEPT = {'living-room': 'Living Room', 'dining-room': 'Dining Room', 'bed-room': 'Bedroom',
        'carpets': 'Rugs', 'decor': 'Décor', 'office': 'Office', 'custom-studio': 'Custom Studio'}

# every current catalogue item, so on-request rows appear too
cur = {}
for f in glob.glob(os.path.join(ROOT, 'data/cat/*.json')):
    if 'index' in f:
        continue
    d = json.load(open(f))
    for it in d['items']:
        it['_top'] = d['top']
        cur[str(it.get('id'))] = it

ACTION = {
    'delist': 'Removed from the storefront — collection heading, not a sellable product',
    'unprice': 'Price withdrawn — now Price on request (no supplier line proves it)',
    'flag': 'FLAGGED for owner — left unchanged, needs confirmation',
    'move:living-sets': 'Reclassified to Living Sets',
    'move:bedroom-sets': 'Reclassified to Bedroom Sets',
    'move:dining-sets': 'Reclassified to Dining Sets',
}

out = []
for r in rows:
    it = cur.get(str(r['id']))
    ch = changes.get(r['id'])
    # the audit row's own verdict is authoritative for status; the change log
    # only says what was DONE about it
    act = r.get('action') or (ch['action'] if ch else '')
    if act.startswith('setprice:'):
        corr = f"Price corrected ${float(ch['before'] or 0):,.0f} -> ${float(ch['after']):,.0f}"
    else:
        corr = ACTION.get(act, '')
    out.append(dict(
        product=r['name'], sku=r['sku'], supplier=SUPPLIER.get(r['brand'], r['brand']),
        department=DEPT.get(r['dept'], r['dept']), type=r['sub'],
        displayed_price=(f"${float(it['price']):,.0f}" if it and it.get('price') else 'On request'),
        expected_price=(f"${r['expected']:,}" if r.get('expected') else ''),
        pricelist_line=r.get('expected_label') or '',
        status=('PASS' if r['status'] == 'PASS' else
                'FLAG' if act == 'flag' else 'FAIL'),
        issue=r['reason'], correction=corr))

# Items withdrawn from the priced set (delisted / now on request) no longer
# appear in the audit, but they are exactly what the owner needs to see.
audited_ids = {str(r['id']) for r in rows}
for cid, ch in changes.items():
    if str(cid) in audited_ids:
        continue
    it = cur.get(str(cid))
    act = ch['action']
    out.append(dict(
        product=ch['name'], sku=ch['sku'] or '', supplier=SUPPLIER.get(ch['brand'], ch['brand']),
        department=DEPT.get(it['_top'], '') if it else '', type=(it or {}).get('sub', ''),
        displayed_price=(f"${float(it['price']):,.0f}" if it and it.get('price')
                         else ('Removed' if act == 'delist' else 'On request')),
        expected_price='', pricelist_line='',
        status='FAIL', issue=ch['reason'],
        correction=(f"Price corrected ${float(ch['before'] or 0):,.0f} -> ${float(ch['after']):,.0f}"
                    if act.startswith('setprice:') else ACTION.get(act, act))))

out.sort(key=lambda r: (r['status'] == 'PASS', r['status'], r['department'], r['product']))
path = os.path.join(ROOT, 'data/export/price-qa-report.csv')
os.makedirs(os.path.dirname(path), exist_ok=True)
with open(path, 'w', newline='', encoding='utf-8') as fh:
    w = csv.DictWriter(fh, fieldnames=list(out[0].keys()))
    w.writeheader()
    w.writerows(out)

c = collections.Counter(r['status'] for r in out)
print(f"data/export/price-qa-report.csv — {len(out):,} rows")
for k in ('FAIL', 'FLAG', 'PASS'):
    print(f"   {k:5} {c[k]:,}")
