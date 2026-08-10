# Galerie Oasis — GHL automation plan

What to build, in priority order, and why. Quote SLA has its own click-by-click
spec in `ghl-quote-sla-workflow.md`; this is the full map.

## What the website already sends you

Every form POSTs to the GHL inbound webhook through `js/ghl.js`, normalized to
the fields GHL maps onto a contact. You trigger off these — no custom mapping
needed.

| Field | Values / example | Use as |
|---|---|---|
| `type` | `quote`, `visit`, `order`, `account`, `newsletter` | **the main trigger filter** |
| `language` | `en`, `fr` | branch every customer-facing message |
| `first_name` / `last_name` / `full_name` | split from the name field | contact record |
| `email`, `phone` | lowercased email | contact record |
| `page`, `submitted_at` | source URL, ISO timestamp | context in alerts |
| `utm_source` … `utm_term` | when present | attribution |
| `product`, `sku`, `fabric`, `configuration` | quote requests | what they asked about |
| `items`, `subtotal`, `delivery` | orders | order contents |
| `interests`, `newsletter_opt_in` | account signups | segmentation |

Account signups go to a **second** webhook (`accountWebhook`) so they can be
tagged separately.

---

## Tier 1 — build first

### 1. Quote SLA  ⭐ highest value
**Why:** 4,693 of 7,897 catalogue items are price-on-request — 59%. The site and
the bot both promise "confirmed the same day." Nothing currently enforces that,
so the highest-intent action in the business depends on someone happening to
check an inbox.

Trigger `type = quote` → instant bilingual ack → internal alert → opportunity in
a Quotes pipeline → 4h escalation if untouched → 48h and 5-day follow-ups.

Full spec: `ghl-quote-sla-workflow.md`.

### 2. Order received — and fix what's there
**Why:** Stripe isn't wired, so `type = order` arrives as a lead that needs a
human to take payment. Until Stripe exists, this workflow *is* the checkout.

**Check first:** the existing "Order Confirmation Email" workflow is Published
but shows **0 total enrolled** despite test orders being POSTed to the webhook.
Its trigger is almost certainly not the inbound webhook. Open it and confirm
before building anything new — right now a real order may notify nobody.

Trigger `type = order` → customer confirmation that sets expectations ("we
confirm availability and delivery, then finalise payment") → internal alert with
`items` and `subtotal` → payment link → chase at 24h if unpaid.

### 3. Showroom visit
**Why:** high-ticket furniture closes in person. Reminders on a $3,000 sofa
appointment pay for the entire build.

Trigger `type = visit` → confirmation → 24h reminder → 2h reminder → no-show
rescue the next morning.

### 4. Missed-call text-back
**Why:** cheapest win available. Someone calls the showroom, nobody picks up,
they call the next store.

Trigger: missed inbound call → SMS within 60s: "Sorry we missed you — how can we
help?" **Needs A2P approved before it can go live.**

---

## Tier 2 — margin and repeat business

### 5. Post-delivery sequence
Thank you → Google review request (48h) → photo request. Customer photos of
their own rooms are the best content this store will ever get, and reviews are
what wins the local search fight.

### 6. Quote-didn't-close nurture
Furniture has a long consideration cycle. Room inspiration, fabric books, promo
reminders — spaced over weeks, not "just checking in." Exit the sequence the
moment they reply or book a visit.

### 7. Room-by-room upsell
Bought a bedroom set → dining nurture 60–90 days later. The `interests` field
from the account form already segments this.

### 8. Designer / trade program
"Designer / trade" is one of the interest options on the account form. These
buyers repeat and buy at volume — they deserve their own tag, pipeline and
pricing conversation, not the retail drip.

---

## Tier 3 — housekeeping that prevents mistakes

### 9. Promotion expiry
"We pay the taxes" is time-limited. Needs a scheduled last-call campaign **and a
kill switch** — when it ends, someone must flip `promo.enabled` to false in
`js/config.js` and the bot's Business Context must be updated, or the site and
the AI will keep promising it.

### 10. Catalogue re-sync alert
The supplier scrape is a scheduled re-run, not a live feed. Monthly: run the
scrapers, diff the counts, and alert if a supplier's item count moves sharply —
that usually means their site changed and the scraper broke.

### 11. Review response
Alert on any new Google review; auto-draft a reply for approval. Never
auto-post.

---

## Blockers to clear first

1. **No users in the sub-account.** Task assignment, ownership, escalation and
   the bot's Human Handover all need a user. This is the single biggest blocker
   — right now "I want to talk to a human" goes nowhere. Interim: send internal
   alerts to `galerieoasis@bellnet.ca` (no accountability, but nothing is lost).
2. **A2P not confirmed approved.** Every SMS step is dead until it is. Build
   them, leave them off.
3. **No Stripe.** The order workflow stays manual-payment until it's wired.
4. **Bilingual.** Every customer-facing message needs FR and EN. `language` is
   in every payload so it's a simple if/else, but it doubles the copy. Bill 96
   makes it non-optional.
5. **Domain.** `galerieoasis.ca` still serves the old site; the new build is on
   the Vercel URL. Don't put links in automation emails until the domain is
   switched, or re-crawl the bot's knowledge base after it is.

---

## Suggested order of work

Quote SLA → verify/fix Order → missed-call text-back → showroom reminders.
That's roughly a day and covers the three places the client is losing money now.
