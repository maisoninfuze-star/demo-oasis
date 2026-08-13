# What we need from Galerie Oasis to finish the setup

Everything below is blocking or unverified. Ordered by what it unblocks, not by
how hard it is to answer. Most of these are five-minute answers from the owner.

## 1. Blocking right now — the site or CRM is broken without these

| # | What we need | What it unblocks |
|---|---|---|
| 1 | **A user added to the Galerie Oasis GoHighLevel sub-account** | Nothing can be assigned to a person today. The AI bot's "talk to a human" goes nowhere, no task can be owned, no escalation can fire. This is the single biggest blocker. |
| 2 | **Publish the "Quote Request" workflow** (it is in Draft) | A Draft workflow accepts the webhook and enrols nobody. Quote requests currently reach GHL and vanish. |
| 3 | **Fix or confirm the "Order Confirmation Email" trigger** | Published but 0 enrolled after real test orders. Its trigger is probably not the inbound webhook, so a real order today notifies nobody. |
| 4 | **Point galerieoasis.ca at the new site** | The domain still serves the old site. The new build is only on the Vercel URL, so the AI bot cites that link to customers and the new catalogue is invisible to anyone typing the domain. |
| 5 | **A2P / 10DLC approval status** | Every SMS automation is built but must stay off until this is confirmed approved. |

## 2. Policies — the bot and the website both need these in writing

The AI bot is live on six channels and is currently instructed to hand these to
a human rather than guess. Every one of these is a question customers ask daily.

| # | What we need | Why |
|---|---|---|
| 6 | **Return and exchange policy** | Window in days, restocking fee, who pays return delivery, condition required. |
| 7 | **Warranty terms** | Length, what is covered, manufacturer vs store, how a claim is started. |
| 8 | **Lead times** | Typical delivery time for in-stock vs special order vs custom. The site promises same-day *pricing*, not delivery, and must not imply otherwise. |
| 9 | **Deposit policy** | Percentage required to place an order, and whether it is refundable. |
| 10 | **Cancellation policy** | Before delivery, after delivery, and for custom orders specifically. |
| 11 | **Damage / claims process** | What the customer does if a piece arrives damaged, and the time limit. |
| 12 | **Custom-order rules** | Custom pieces are usually final sale. If so we must say it before the order, not after. |
| 13 | **Terms & Conditions and Privacy Policy text** | Québec Law 25 requires a privacy policy for a site collecting names, emails and phone numbers. We are collecting all three today. |
| 14 | **Legal business name, NEQ, GST/QST numbers** | Needed on terms, invoices and any receipt. |

## 3. Pricing — 1,894 products cannot be sold without these

| # | What we need | Value |
|---|---|---|
| 15 | **Pricelist or portal login: Creative Home Décor** | 542 products |
| 16 | **Pricelist or portal login: Titus** | 469 products |
| 17 | **Pricelist or portal login: Glory Home** | 350 products |
| 18 | **Pricelist or portal login: Sofa by Fancy** | 174 products |
| 19 | **Pricelist or portal login: WT Studio** | 120 products |
| 20 | **Prices for the 239 own curated pieces** | These are the showroom hero pieces and they have no price. |
| 21 | **Confirm the ×3.15 margin applies to every supplier** | It is applied uniformly today. If any supplier has a different markup, prices are wrong for that supplier. |
| 22 | **Clearance rules** | Which items, what discount, and whether clearance still gets free delivery over $500. |

## 4. Payments

| # | What we need | Why |
|---|---|---|
| 23 | **Stripe account access** | The order flow is built with the Stripe hand-off point marked. Until then every order is a manual payment call. |
| 24 | **Deposit vs full payment at checkout** | Determines what the Stripe step actually charges. |
| 25 | **Financing terms (Flexiti / Klarna)** | These appear on the site. We need the real terms before the bot or the pages describe them. |

## 5. Marketing and content

| # | What we need | Why |
|---|---|---|
| 26 | **Real customer testimonials** | The site currently carries a placeholder testimonial that was written, not collected. It must be replaced or removed. |
| 27 | **Google Business Profile access** | Needed for the review-request automation and to respond to reviews. |
| 28 | **GA4 and Meta Pixel IDs** | No analytics today, so we cannot tell which pages or products convert. |
| 29 | **Showroom photography** | Interior shots for the visit and about pages. |
| 30 | **Delivery zone confirmation** | Exact limit of the $99 zone and the $199 zone, ideally by postal code prefix, so the site and bot quote the same thing. |
| 31 | **Business hours confirmation** | The site publishes Mon–Wed 10–6, Thu–Fri 10–8, Sat 10–5, Sun 11–5. Confirm, including holidays. |

## 6. Nice to have

| # | What we need | Why |
|---|---|---|
| 32 | **Showroom appointment calendar in GHL** | Turns the visit request into a booked slot with reminders. |
| 33 | **After-hours handling for the bot** | What it should say outside business hours. |
| 34 | **Designer / trade programme terms** | The account form already segments these buyers; we need the terms to nurture them. |
| 35 | **Supplier lead-time table** | Per supplier, so quotes carry a realistic date. |

---

## The five that matter most

1. **Add a GHL user** — unblocks handover, tasks and escalation.
2. **Publish the quote workflow** — quote requests currently go nowhere.
3. **Point the domain at the new site** — the new catalogue is invisible today.
4. **Return, warranty and lead-time policies** — the bot is answering customers now.
5. **Pricelists for Creative, Titus and Glory** — 1,361 sellable products waiting.
