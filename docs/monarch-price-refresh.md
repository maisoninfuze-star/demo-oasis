# Refreshing Monarch prices

Monarch publishes no prices publicly — `monarchspec.com` returns 404/302 to a
logged-out visitor. They live behind the Galerie Oasis dealer login at
**monarchdirect.ca**, so refreshing them means re-exporting from the portal.

Do this whenever Monarch issues a new price list (they change a few times a
year), or if the owner reports a price on the site that doesn't match an invoice.

## 1. Sign in

Log into monarchdirect.ca as Galerie Oasis. Nothing below places an order — it
only reads listing pages. **Never click ADD TO ORDER.**

## 2. Sweep every category

The listing URL takes both a category and a page size:

```
http://www.monarchdirect.ca/md_productcategory_inquiry_R4.asp?selwebcategory=<CAT>&pageno=<N>&pagesize=200
```

`pagesize` caps at **200**. Categories, with item counts as of 2026-08-10:

| Category | Items | Pages @200 |
|---|---|---|
| ACCENTS | 560 | 3 |
| BEDROOM | 990 | 5 |
| HOME DECOR | 490 | 3 |
| TABLES | 423 | 3 |
| OFFICE | 403 | 3 |
| DINING | 179 | 1 |
| LIVING ROOM | 157 | 1 |
| YOUTH | 93 | 1 |
| ENTERTAINMENT | 77 | 1 |
| BAR | 59 | 1 |
| OUTDOOR | 55 | 1 |
| CLOSE-OUTS | 0 | — |

Spaces are URL-encoded: `HOME%20DECOR`, `LIVING%20ROOM`.

**"DIRECT IMPORT / UPHOLSTERY" is not a category.** It lives at `/directimport/`
and carries no prices at all — it is quote-by-phone container stock. Nothing to
export.

## 3. Extract on each page

Run in the browser console on each listing page. It accumulates across pages in
localStorage, so navigate and re-run:

```js
(() => {
  const txt = document.body.innerText;
  const re = /SKU:\s*([A-Z0-9 ]+?)\s*\n([^\n]+)\n[^\n]*INVENTORY STATUS:[^\n]*\n\s*\n?\$([\d,]+\.?\d*)/g;
  const out = []; let m;
  while ((m = re.exec(txt)) !== null) out.push([m[1].trim(), parseFloat(m[3].replace(/,/g, ''))]);
  const s = JSON.parse(localStorage.getItem('__mdprices') || '{}');
  out.forEach(([k, v]) => s[k] = v);
  localStorage.setItem('__mdprices', JSON.stringify(s));
  return { page: out.length, stored: Object.keys(s).length };
})()
```

Expect roughly **1,988 unique SKUs** from ~3,486 listings — Monarch lists the
same product under several categories, so pages yielding zero new SKUs are
normal, not a sign of broken pagination.

## 4. Export and apply

```js
const s = localStorage.getItem('__mdprices');
const a = document.createElement('a');
a.href = URL.createObjectURL(new Blob([s], {type:'application/json'}));
a.download = 'monarch-prices.json'; document.body.appendChild(a); a.click();
```

Chrome blocks a second automatic download from the same tab — reload before
re-exporting.

Then:

```bash
cp ~/Downloads/monarch-prices.json data/suppliers/monarch_pricelist.json
python3 data/suppliers/apply_monarch_prices.py
python3 data/suppliers/categorize.py
```

Retail is **net × 3.15**, the owner's standard margin.

## 5. Sanity checks

- `apply_monarch_prices.py` prints priced vs on-request. Priced should be near
  1,942+; a large drop means the export is short.
- SKUs with no portal price keep no price and stay on the site as
  price-on-request — Monarch has dropped them.
- If the portal lists SKUs the site doesn't have, add them the way
  `add_monarch_missing.py` does: photo URL is
  `https://www.monarchspec.com/images/lifestyle_WEBQ50/<SKU with _ for space>.jpg`.
