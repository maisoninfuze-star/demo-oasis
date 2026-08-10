# GHL "Build using AI" — prompts for Galerie Oasis

One prompt per automation. Paste into Automation → **Build using AI**, then
review every step before publishing. Build them all as **Draft** first.

## Facts the AI needs (already included in each prompt below)

- Showroom: 1877 Bd du Curé-Labelle, Laval, QC H7T 1K2 · +1 (450) 973-0000
- Hours: Mon–Wed 10–6, Thu–Fri 10–8, Sat 10–5, Sun 11–5
- Delivery: $99 within ~20 km · $199 North/South Shore · FREE over $500 ·
  Greater Montréal only · white-glove
- Promo: "We pay the taxes" (GST+QST) — **in store only**
- Internal alerts go to **galerieoasis@bellnet.ca**

## Merge fields

The site posts custom JSON to the inbound webhook. In GHL those are referenced
as `{{inboundWebhookRequest.fieldname}}` — e.g.
`{{inboundWebhookRequest.product}}`, `{{inboundWebhookRequest.language}}`.
Standard contact fields (`{{contact.first_name}}`) work as normal once the
contact is created. Confirm the exact merge syntax after the AI builds it.

---

## 1. Quote SLA  ⭐ build this first

```
Create a workflow called "Quote Request — Same Day SLA".

Trigger: Inbound Webhook. Only continue if the field "type" equals "quote".

Steps:
1. Create or update the contact from first_name, last_name, email, phone.
   Add tag "quote-request".
2. Branch on the field "language". If it is "fr" send the French version of
   every customer message below, otherwise send English.
3. Immediately email the customer confirming we received their request and that
   we confirm pricing the same day. Mention the item they asked about using the
   "product" and "sku" fields. Warm, brief, no hard sell. Sign as Galerie Oasis,
   1877 Bd du Curé-Labelle, Laval.
4. Email galerieoasis@bellnet.ca an internal alert with the customer's name,
   email, phone, the product, sku, fabric and configuration fields, and the page
   they came from. Subject line should start with "QUOTE".
5. Create an Opportunity in a pipeline called "Quotes", stage "New request".
6. Wait 4 hours.
7. If the opportunity is still in stage "New request", email
   galerieoasis@bellnet.ca again with subject starting "OVERDUE QUOTE".
8. Wait until the next day. If still in "New request", add tag "quote-at-risk".
9. Separately, 48 hours after the quote is sent, if the customer has not
   replied, send a short follow-up asking if they'd like to see the piece in the
   Laval showroom.

Do not send any SMS in this workflow — email only for now.
```

---

## 2. Order received

**Before building:** open the existing "Order Confirmation Email" workflow and
check its trigger. It shows 0 enrolled despite test orders, so it is probably
not fired by the inbound webhook. Fix or replace it rather than adding a
duplicate.

```
Create a workflow called "Order Received".

Trigger: Inbound Webhook. Only continue if the field "type" equals "order".

Steps:
1. Create or update the contact from first_name, last_name, email, phone.
   Add tag "order".
2. Branch on the field "language" — French if "fr", otherwise English.
3. Immediately email the customer: we have their order, we will confirm
   availability and delivery, then finalise payment with them. List their items
   using the "items" field and the total using "subtotal". Explain delivery:
   $99 within about 20 km of our Laval showroom, $199 North and South Shore,
   free over $500, Greater Montréal only, white-glove including assembly.
4. Email galerieoasis@bellnet.ca with subject starting "NEW ORDER", including
   name, email, phone, address, items and subtotal.
5. Create an Opportunity in a pipeline called "Orders", stage "To confirm".
6. Wait 24 hours. If the opportunity is still in "To confirm", email
   galerieoasis@bellnet.ca with subject starting "ORDER NOT CONFIRMED".

Email only, no SMS.
```

---

## 3. Showroom visit

```
Create a workflow called "Showroom Visit".

Trigger: Inbound Webhook. Only continue if the field "type" equals "visit".

Steps:
1. Create or update the contact. Add tag "showroom-visit".
2. Branch on "language" — French if "fr", otherwise English.
3. Email the customer confirming we received their visit request, with our
   address (1877 Bd du Curé-Labelle, Laval, QC H7T 1K2), phone
   +1 (450) 973-0000 and hours: Monday to Wednesday 10am–6pm, Thursday and
   Friday 10am–8pm, Saturday 10am–5pm, Sunday 11am–5pm. Mention that our tax
   promotion is in store only.
4. Email galerieoasis@bellnet.ca with subject starting "SHOWROOM VISIT".
5. If an appointment is booked, send a reminder 24 hours before and again
   2 hours before.
6. If the appointment is marked no-show, send a friendly note the next morning
   offering to rebook.
```

---

## 4. Missed-call text-back

**Do not publish until A2P/10DLC is approved.**

```
Create a workflow called "Missed Call Text Back".

Trigger: a missed inbound call to the business number.

Steps:
1. Within one minute, send an SMS: sorry we missed your call, we're with a
   customer in the showroom, how can we help? Include that we're at 1877 Bd du
   Curé-Labelle in Laval.
2. Send it in French if the contact's language is French, otherwise English.
3. Email galerieoasis@bellnet.ca with subject starting "MISSED CALL".
4. If the contact replies, stop the workflow.
```

---

## 5. Post-delivery — review and photos

```
Create a workflow called "After Delivery".

Trigger: an Opportunity in the "Orders" pipeline moves to stage "Delivered".

Steps:
1. Wait 2 days.
2. Email the customer in their language thanking them and asking how the piece
   is settling in.
3. Wait 2 more days. If they have not replied negatively, send a Google review
   request with a direct review link.
4. Wait 1 week. Ask if they'd share a photo of the piece in their home, and say
   we love featuring real customer rooms.
5. Add tag "past-customer".
```

---

## 6. Quote didn't close — long nurture

```
Create a workflow called "Quote Nurture".

Trigger: contact has tag "quote-at-risk" or the Quotes opportunity is marked
lost.

Steps:
1. Wait 5 days, then email inspiration for the room they asked about.
2. Wait 2 weeks, then email about our custom-made service — choice of fabric,
   wood colour and size, with real fabric books in the showroom.
3. Wait 3 weeks, then email a reminder that our tax promotion is in store only
   and invite them to visit.
4. Remove the contact from this workflow immediately if they reply, book a
   visit, or place an order.

Space the emails out. Do not send "just checking in" messages.
```

---

## 7. Room-by-room upsell

```
Create a workflow called "Next Room".

Trigger: contact gains tag "past-customer".

Steps:
1. Wait 75 days.
2. Look at the "interests" field on the contact. Email them about a room they
   have NOT bought yet — if they bought a bedroom, feature dining and living
   room; if they bought rugs, feature furniture.
3. Send in their language.
4. Wait 6 months and repeat once with a different room.
```

---

## 8. Designer / trade

```
Create a workflow called "Designer Trade Enquiry".

Trigger: Inbound Webhook where "type" equals "account" and the "interests"
field contains "trade".

Steps:
1. Add tag "designer-trade".
2. Email galerieoasis@bellnet.ca with subject starting "TRADE ENQUIRY" — these
   buyers repeat and buy at volume and should get a personal call, not a drip.
3. Email the customer that a member of our team will contact them personally
   about trade terms.
4. Create an Opportunity in a pipeline called "Trade".
```

---

## After the AI builds each one

- Check the trigger really is the inbound webhook and the `type` filter is set —
  this is the step most likely to be wrong.
- Check the French branch actually sends French.
- Send yourself a test through the real website form, not just GHL's test button.
- Leave it in **Draft** until you've seen a test run end to end.
