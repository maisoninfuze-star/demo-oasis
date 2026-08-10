#!/usr/bin/env python3
"""Name Matrix collection-landing items for what they are: the full set.

Matrix lists a collection page (e.g. "Duke", sku L2475, cats ['motion']) next to
its individual pieces (Duke Sofa / Love seat / Chair). The collection page
carries the 3-pc set price, so on the site it read as a $5,352 sofa. The price
was right; the name was not.

An item only counts as a collection page when NOTHING about it names a piece —
not the name, not the cats, not the id. That is the same signal apply_pricelists
uses to choose a price line, so the two stay consistent: if we priced it off the
set line, we call it a set.

Idempotent: strips any suffix it added before re-deciding.
Run AFTER apply_pricelists.py and AFTER expand_pdf_configs.py, so the duplicate
synthesized set can be removed in the same pass.
"""
import json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from apply_pricelists import parse_matrix, PIECE_WORDS

HERE = os.path.dirname(os.path.abspath(__file__))
SUFFIX = re.compile(r'\s+—\s+(3-Pc Set|Queen Set|King Set|Set)$')

def names_a_piece(it):
    """Same blob apply_pricelists uses to pick a price line."""
    blob = (str(it.get('name', '')) + ' ' +
            ' '.join(it.get('cats') or []) + ' ' +
            str(it.get('id', ''))).lower()
    import re as _re
    return any(_re.search(rf'\b{_re.escape(piece)}\b', blob) for piece, _ in PIECE_WORDS)

def set_label(lines):
    keys = ' '.join(lines).lower()
    if 'queen complete' in keys or 'queen set' in keys: return 'Queen Set'
    if 'king complete' in keys or 'king set' in keys:   return 'King Set'
    if '3 pc' in keys or '3pc' in keys:                 return '3-Pc Set'
    return 'Set'

def main():
    mx = parse_matrix()
    path = os.path.join(HERE, 'matrix.json')
    d = json.load(open(path))

    # undo previous runs so this is safe to re-run
    for it in d['items']:
        if it.get('is_set'):
            it['name'] = SUFFIX.sub('', str(it.get('name') or ''))
            it.pop('is_set', None)

    renamed, set_codes = 0, set()
    for it in d['items']:
        if it.get('synth') or not it.get('price'):
            continue
        if names_a_piece(it):
            continue                       # it's a real piece, leave it alone
        code = re.sub(r'[A-Z]', '', str(it.get('sku') or ''))
        lines = mx['codes'].get(code)
        if not lines:
            continue
        it['name'] = f"{it['name']} — {set_label(lines)}"
        it['is_set'] = True
        set_codes.add(code)
        renamed += 1

    # the synthesized set for those codes duplicates the real product page
    keep, dropped = [], 0
    for it in d['items']:
        if (it.get('synth')
                and re.sub(r'[A-Z]', '', str(it.get('sku') or '')) in set_codes
                and re.search(r'\bset\b', str(it.get('name') or ''), re.I)):
            dropped += 1
            continue
        keep.append(it)
    d['items'] = keep
    d['count'] = len(keep)

    json.dump(d, open(path, 'w'), ensure_ascii=False, indent=1)
    print(f'renamed {renamed} collection pages as sets; dropped {dropped} duplicate synth sets')

if __name__ == '__main__':
    main()
