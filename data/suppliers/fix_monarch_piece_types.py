#!/usr/bin/env python3
"""Give Monarch's bedroom pieces their real product type.

Monarch names a record by the TYPE field of its spec string. For these SKUs
that field reads "BEDROOM SET", meaning "belongs to the bedroom-set range" --
the actual piece is named after the dash:

    I 5203   BEDROOM SET - 2 DRAWER NIGHTSTAND / BLEACHED OAK FINISH
    I 5202   BEDROOM SET - WALL MIRROR / BLEACHED OAK FINISH

Both were published as "Bedroom Set - Bleached Oak Finish" and filed under
Complete Sets, so a $205 wall mirror and a $331 nightstand appeared as bedroom
sets. That is read off the supplier's own spec, not inferred from the name,
image, SKU family or price -- the tail after the dash IS the product type.

A record stays a set only when its spec says so explicitly (3PCS SET, 5PCS SET).

Fixing the feed rather than the filter means the type is right everywhere at
once: department pages, the Complete Sets filter, search, related items, the
product page and its JSON-LD.
"""
import json, os, re, collections

HERE = os.path.dirname(os.path.abspath(__file__))
PATH = os.path.join(HERE, 'monarch.json')

SET_PREFIX = re.compile(r'^\s*(?:BED\s*ROOM|DINING|LIVING|SOFA)\s+SET\s*[-–—]\s*(.+)$', re.I)
BUNDLE = re.compile(r'\b\d+\s*PCS?\b|\b\d+\s*PIECE\b', re.I)

# ordered: the first pattern that matches the spec tail wins
RULES = [
    (r'\bNIGHT\s*STAND\b', 'bed-room', 'nightstands', 'Nightstand'),
    (r'\bDRESSER\b',       'bed-room', 'dressers',    'Dresser'),
    (r'\bCHEST\b',         'bed-room', 'chests',      'Chest'),
    (r'\bMIRROR\b',        'bed-room', 'mirrors',     'Mirror'),
    (r'\bHEADBOARD\b',     'bed-room', 'headboards',  'Headboard'),
    (r'\bQUEEN\b.*\bBED\b', 'bed-room', 'beds',       'Queen Bed'),
    (r'\bKING\b.*\bBED\b',  'bed-room', 'beds',       'King Bed'),
    (r'\bTWIN\b.*\bBED\b',  'bed-room', 'beds',       'Twin Bed'),
    (r'\bFULL\b.*\bBED\b',  'bed-room', 'beds',       'Full Bed'),
    (r'\bBED\b',            'bed-room', 'beds',       'Bed'),
]
KEEP_CAPS = {'USB', 'LED', 'PU', 'TV'}


def titled(s):
    out = []
    for w in re.split(r'(\s+|/)', s.strip()):
        if not w.strip() or w == '/':
            out.append(w)
        elif w.upper().strip('.,') in KEEP_CAPS:
            out.append(w.upper())
        else:
            out.append(w.capitalize() if not w[0].isdigit() else w.lower())
    return re.sub(r'\s+', ' ', ''.join(out)).strip(' /')


d = json.load(open(PATH))
items = d['items'] if isinstance(d, dict) else d
done = collections.Counter()
log = []

for it in items:
    m = SET_PREFIX.match(str(it.get('desc') or ''))
    if not m:
        continue
    tail = m.group(1).strip()
    if BUNDLE.search(tail):
        done['left as a set (spec says N-PCS SET)'] += 1
        continue
    rule = next((r for r in RULES if re.search(r[0], tail, re.I)), None)
    if not rule:
        done['UNRESOLVED — left untouched'] += 1
        continue
    _, top, sub, label = rule

    parts = [p.strip() for p in tail.split('/') if p.strip()]
    phrase = re.sub(r'\bSIZE\b', ' ', parts[0], flags=re.I)      # "QUEEN SIZE BED" -> "QUEEN BED"
    phrase = titled(re.sub(r'\s+', ' ', phrase).strip()) or label
    desc_rest = ' / '.join(titled(p) for p in parts[1:])
    new_name = f'{phrase} — {desc_rest}' if desc_rest else phrase

    before = it.get('name')
    it['name'] = new_name
    it['force_top'] = top
    it['force_sub'] = sub
    it['desc'] = tail            # specs table should describe the piece, not the range
    done[f'-> {sub}'] += 1
    log.append(dict(sku=it.get('sku'), price=it.get('price'),
                    was=before, now=new_name, sub=sub))

json.dump(d, open(PATH, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
json.dump(log, open(os.path.join(HERE, 'monarch_type_changes.json'), 'w'), indent=1)
print(f'{len(log)} Monarch records retyped from their own spec')
for k, n in sorted(done.items()):
    print(f'  {n:5}  {k}')
