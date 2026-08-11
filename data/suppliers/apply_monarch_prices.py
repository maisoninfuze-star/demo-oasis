#!/usr/bin/env python3
"""Apply Monarch Direct dealer-portal prices to the Monarch feed.

Prices come from the Galerie Oasis dealer login at monarchdirect.ca (the public
monarchspec.com site shows none). They are net dealer cost, so the owner's
standard margin applies: retail = net x 3.15, same rule as the PDF suppliers.

Items the portal no longer lists keep no price and stay on the site as
price-on-request — Monarch has discontinued them, so inventing a number would
be wrong in both directions.

Refresh the source file by re-exporting the portal price list, see
docs/monarch-price-refresh.md.
"""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
MARGIN = lambda net: round(net * 3.15)

def load_pricelist():
    pl = json.load(open(os.path.join(HERE, 'monarch_pricelist.json')))
    # portal SKUs look like "I 8090"; the feed is inconsistent about the space
    norm = {}
    for k, v in pl.items():
        k = k.strip()
        norm[k] = v
        norm[k.replace(' ', '')] = v
    return norm

def main():
    prices = load_pricelist()
    path = os.path.join(HERE, 'monarch.json')
    d = json.load(open(path))

    priced = onreq = 0
    for it in d['items']:
        sku = str(it.get('sku') or '').strip()
        net = prices.get(sku) or prices.get(sku.replace(' ', ''))
        if net:
            it.pop('delisted', None)
            it['net'] = net
            it['price'] = str(MARGIN(net))
            it['from'] = True          # colour/finish variants share a price
            priced += 1
        else:
            # Not in the dealer portal any more, so Monarch has dropped it and we
            # cannot order it. Delisted rather than shown price-on-request: a
            # customer requesting a quote for a discontinued piece wastes their
            # time and the team's. Kept in this file so a future portal export
            # can revive it.
            it['delisted'] = True
            it.pop('price', None); it.pop('net', None); it.pop('from', None)
            onreq += 1

    json.dump(d, open(path, 'w'), ensure_ascii=False, indent=1)
    print(f'monarch  priced {priced}, delisted (not in portal) {onreq}, total {len(d["items"])}')

if __name__ == '__main__':
    main()
