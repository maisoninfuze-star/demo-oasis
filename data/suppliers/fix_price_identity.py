#!/usr/bin/env python3
"""Apply the price-identity audit's verdicts to the supplier feeds.

Driven entirely by audit_prices.py so a correction can never drift from the
finding that justified it. Run the audit first; this consumes audit_rows.json.

Actions:
  setprice:N  the exact pricelist line for this piece is known -> use it
  unprice     no line can be proved for this piece -> price on request, stays
              listed and quotable. Never guess a number onto a $3,000 bed.
  delist      a collection heading, not a sellable product ('Sterling' $5,352
              sitting in Beds, which is the queen-set price) -> hide it
  move:X      right price, wrong aisle (a 3-Pc Set priced correctly but filed
              under Sofas) -> reclassify
  flag        ambiguous; recorded in the report for the owner, left untouched
"""
import json, os, sys, collections

HERE = os.path.dirname(os.path.abspath(__file__))
SC = sys.argv[1] if len(sys.argv) > 1 else '.'
rows = json.load(open(os.path.join(SC, 'audit_rows.json')))

by_brand = collections.defaultdict(list)
for r in rows:
    if r['status'] != 'PASS' and r.get('action'):
        by_brand[r['brand']].append(r)

done = collections.Counter()
applied = []

for brand, rs in by_brand.items():
    path = os.path.join(HERE, f'{brand}.json')
    if not os.path.exists(path):
        continue
    d = json.load(open(path))
    index = {it.get('id'): it for it in d['items']}
    for r in rs:
        it = index.get(r['id'])
        if it is None:
            done['id not found in feed'] += 1
            continue
        act = r['action']
        before = it.get('price')
        if act.startswith('setprice:'):
            it['price'] = str(int(act.split(':')[1]))
            it.pop('from', None)
            done['price corrected to the exact line'] += 1
        elif act == 'unprice':
            it.pop('price', None)
            it.pop('from', None)
            it['price_pending'] = r['reason'][:160]
            done['price withdrawn (unprovable) -> on request'] += 1
        elif act == 'delist':
            it['delisted'] = True
            done['collection heading hidden'] += 1
        elif act.startswith('move:'):
            target = act.split(':', 1)[1]
            if target != 'piece':
                it['force_sub'] = target
                done[f'reclassified -> {target}'] += 1
        elif act == 'flag':
            done['flagged for the owner (left as-is)'] += 1
        applied.append(dict(id=r['id'], name=r['name'], sku=r['sku'], brand=brand,
                            action=act, before=before, after=it.get('price'),
                            reason=r['reason']))
    json.dump(d, open(path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

LOG = os.path.join(HERE, 'price_identity_changes.json')
prior = json.load(open(LOG)) if os.path.exists(LOG) else []
seen = {(a['id'], a['action']) for a in prior}
prior += [a for a in applied if (a['id'], a['action']) not in seen]
json.dump(prior, open(LOG, 'w'), indent=1)
real = sum(n for k, n in done.items() if 'flagged' not in k)
print(f'{real} feed edits written')
for k, n in sorted(done.items()):
    print(f'  {n:5}  {k}')
