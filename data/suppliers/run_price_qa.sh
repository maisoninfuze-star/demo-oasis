#!/bin/bash
# Audit -> fix -> rebuild, repeated to a fixed point.
# One pass is not enough: moving a set out of Dining Tables into Dining Sets is
# what reveals that it is also carrying the table's price. Each pass can only
# see the defects the previous pass uncovered.
set -e
cd "$(dirname "$0")/../.."
SP="${1:?scratch dir required}"
for i in 1 2 3 4 5; do
  python3 data/suppliers/audit_prices.py "$SP" > "$SP/audit_pass_$i.txt"
  n=$(python3 data/suppliers/fix_price_identity.py "$SP" | head -1 | grep -o '^[0-9]*')
  python3 data/suppliers/categorize.py > /dev/null 2>&1
  echo "pass $i: $n feed edits"
  [ "$n" = "0" ] && break
done
python3 data/suppliers/audit_prices.py "$SP"
