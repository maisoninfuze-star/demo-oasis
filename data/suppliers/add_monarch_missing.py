#!/usr/bin/env python3
"""Add Monarch products that are in the dealer portal but were never scraped.

The public-site crawl missed 46 dining tables that the portal sells. Each gets
its own photo from Monarch's own image CDN, keyed on the SKU — the same pattern
every other Monarch item uses — so no product borrows another's picture.
"""
import json, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
MARGIN = lambda net: round(net * 3.15)
IMG = 'https://www.monarchspec.com/images/lifestyle_WEBQ50/{}.jpg'

# sku ~ portal description ~ net dealer price
RAW = """I 1059~DINING TABLE - 36"X 48" / GREY / CHROME METAL~170
I 1088~DINING TABLE - 36"X 60" / TAUPE RECLAIMED WOOD-LOOK~175
I 1089~DINING TABLE - 36"X 60" / BLACK RECLAIMED WOOD-LOOK~175
I 1090~DINING TABLE - 35"X 60" / HIGH GLOSSY WHITE~265
I 1119~DINING TABLE - 36"X 60" / GREY CEMENT / CHROME METAL~165
I 1120~DINING TABLE - 36"X 60" / GREY / CHROME METAL~165
I 1128~DINING TABLE - 36"X 60" / WHITE STONE TOP / BLACK BASE~260
I 1129~DINING TABLE - 36"X 60" / DARK GREY STONE TOP / BLACK BASE~260
I 1132~DINING TABLE - 32"X 48"X 63" / 15" BUTTERFLY / WHITE STONE~295
I 1133~DINING TABLE - 32"X 48"X 63" / 15" BUTTERFLY / GREY STONE~295
I 1136~DINING TABLE - 36"X 60" / GREY / BLACK METAL~140
I 1137~DINING TABLE - 36"X 60" / DARK TAUPE / BLACK METAL~140
I 1140~DINING TABLE - 30"X 48" / GREY / BLACK METAL~75
I 1141~DINING TABLE - 30"X 48" / DARK TAUPE / BLACK METAL~75
I 1164~DINING TABLE - 32"X 48" / GREY RECLAIMED WOOD-LOOK~125
I 1166~DINING TABLE - 32"X 48" / BLACK RECLAIMED WOOD-LOOK~125
I 1202~DINING TABLE - 24"X 48" / WHITE COUNTER HEIGHT~85
I 1203~DINING TABLE - 24"X 48" / DARK TAUPE COUNTER HEIGHT~85
I 1204~DINING TABLE - 24"X 48" / GREY COUNTER HEIGHT~85
I 1217~DINING TABLE - WALNUT VENEER 36"X 60"~179
I 1226~DINING TABLE - 38"X 70" / WHITE FAUX MARBLE TOP / BLACK BASE~395
I 1227~DINING TABLE - 48"DIA / WHITE FAUX MARBLE TOP / BLACK BASE~320
I 1240~DINING TABLE - 24"X 32" / BLACK-BLACK METAL COUNTER HEIGHT~49
I 1241~DINING TABLE - 24"X 32" / GREY-WHITE METAL COUNTER HEIGHT~49
I 1255~DINING TABLE - ANTIQUE GREY VENEER 36"X 60"~219
I 1264~DINING TABLE - ANTIQUE WHITE VENEER 36"X 60"~219
I 1320~DINING CHAIR - 2PCS / 36"H WHITE~115
I 1323~DINING TABLE - 36"X 48" / WHITE VENEER TOP~165
I 1327~DINING TABLE - 30"X 48"/ CREAM / OAK TOP 9" DROP LEAF~150
I 1330~DINING TABLE - ESPRESSO VENEER 36"X 60"~170
I 1331~DINING TABLE - ESPRESSO VENEER 42"X 78"/ 18" EXTENSION~250
I 1335~DINING TABLE - ANTIQUE WHITE / LIGHT BROWN VENEER 36"X 60"~199
I 1341~DINING TABLE - ANTIQUE BROWN VENEER 36"X 60"~199
I 1346~DINING TABLE - ANTIQUE GREY VENEER 36"X 60"~199
I 1348~DINING TABLE - ANTIQUE GREY VENEER 48"X 48"~189
I 1354~DINING TABLE - ANTIQUE CHERRY VENEER 36"X 60"~199
I 1363~DINING TABLE - BROWN WALNUT VENEER / 48" DIA.~199
I 1364~DINING TABLE - BROWN WALNUT VENEER / 36"X 72"~225
I 1370~DINING TABLE - BROWN VENEER 36"X 60"~170
I 1371~DINING TABLE - BROWN VENEER 42"X 78"/ 18" EXTENSION PANEL~250
I 1375~DINING TABLE - GREY VENEER 36"X 72" / 18" EXTENSION PANEL~225
I 1381~DINING TABLE - ANTIQUE GREY VENEER 36"X 72"COUNTER HEIGHT~239
I 1384~DINING TABLE - LIGHT WALNUT VENEER / 36"X 72"~225
I 1387~DINING TABLE - DARK WALNUT VENEER 36"X 72"COUNTER HEIGHT~289
I 1390~DINING TABLE - ANTIQUE GREY VENEER 36"X 60"~225
I 1391~DINING TABLE - ANTIQUE GREY VENEER 42"X 78"/18" EXTENSION~295"""


def pretty(desc):
    """'DINING TABLE - 36"X 60" / GREY' -> ('Dining Table', 'Grey 36"X 60"')."""
    head, _, tail = desc.partition('-')
    base = head.strip().title()
    detail = re.sub(r'\s+', ' ', tail.replace('/', ' ')).strip().title()
    return base, detail[:38]


def main():
    path = os.path.join(HERE, 'monarch.json')
    d = json.load(open(path))
    have = {str(i.get('sku', '')).strip() for i in d['items']}

    added = 0
    for line in RAW.strip().split('\n'):
        sku, desc, net = line.split('~')
        sku, net = sku.strip(), float(net)
        if sku in have:
            continue
        base, detail = pretty(desc)
        d['items'].append({
            'id': f"monarch-{sku.replace(' ', '')}",
            'sku': sku,
            'name': f'{base} — {detail}' if detail else base,
            'desc': desc,
            'dept': 'DINING',
            'cats': ['dining-chair'] if 'CHAIR' in desc else ['dining-table'],
            # own photo, keyed on its own SKU — never a sibling's
            'img': IMG.format(sku.replace(' ', '_')),
            'gallery': [],
            'url': 'https://www.monarchspec.com',
            'net': net,
            'price': str(MARGIN(net)),
            'from': True,
        })
        added += 1

    d['count'] = len(d['items'])
    json.dump(d, open(path, 'w'), ensure_ascii=False, indent=1)
    print(f'added {added} Monarch items from the portal; total {len(d["items"])}')


if __name__ == '__main__':
    main()
