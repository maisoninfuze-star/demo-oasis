# Galerie Oasis — Quote SLA workflow (GHL build spec)

Build this in **Automation → Workflows → Create workflow → Start from scratch**.
Name: `Quote Request — Same-Day SLA`. Leave it in **Draft** until tested.

Why it matters: 4,693 of 7,897 catalogue items are price-on-request (59%).
The website and the Conversation AI bot both promise pricing "the same day".
Nothing currently enforces that promise.

---

## Trigger

**Inbound Webhook** — the site already POSTs here:
`https://services.leadconnectorhq.com/hooks/3WZJmfyOZdm174uTBbc8/webhook-trigger/6beda3ad-3cf8-419b-b759-10afe76dd602`

Add filter: `type` **is equal to** `quote`

> The same webhook also receives `order`, `visit` and `newsletter`, so the
> `type` filter is what keeps the workflows separate. Every payload also
> carries: `first_name`, `last_name`, `full_name`, `email`, `phone`,
> `language` (en/fr), `product`, `sku`, `fabric`, `configuration`, `page`,
> `source`, `submitted_at`, and any `utm_*`.

---

## Steps

### 1. Create/Update Contact
Map `first_name`, `last_name`, `email`, `phone`.
Add tag: `quote-request`, plus `lang-{{inboundWebhookRequest.language}}`.

### 2. If/Else — language branch
Condition: `{{inboundWebhookRequest.language}}` equals `fr`

#### 2a. FR branch — Email to customer
Subject: `Votre demande de prix — Galerie Oasis`

```
Bonjour {{contact.first_name}},

Merci pour votre demande concernant {{inboundWebhookRequest.product}}.

Notre équipe confirme le prix exact aujourd'hui même — nous vérifions le
tissu, la finition et la disponibilité avant de vous répondre, pour que le
prix que vous recevez soit le bon.

Si vous préférez voir la pièce en personne, notre salle d'exposition est au
1877 Bd du Curé-Labelle, Laval. Nous sommes ouverts du lundi au mercredi de
10 h à 18 h, jeudi et vendredi jusqu'à 20 h, samedi de 10 h à 17 h et
dimanche de 11 h à 17 h.

À très bientôt,
Galerie Oasis
450 973-0000
```

#### 2b. EN branch — Email to customer
Subject: `Your price request — Galerie Oasis`

```
Hello {{contact.first_name}},

Thank you for your request about {{inboundWebhookRequest.product}}.

Our team is confirming the exact price for you today. We check the fabric,
finish and availability before we reply, so the price you get is the right
one.

If you'd rather see the piece in person, our showroom is at 1877 Bd du
Curé-Labelle, Laval. We're open Monday to Wednesday 10am–6pm, Thursday and
Friday until 8pm, Saturday 10am–5pm and Sunday 11am–5pm.

Talk soon,
Galerie Oasis
450 973-0000
```

### 3. Internal notification — Email
To: `galerieoasis@bellnet.ca`
Subject: `NEW QUOTE — {{contact.full_name}} — {{inboundWebhookRequest.product}}`

```
Quote request received {{inboundWebhookRequest.submitted_at}}

Customer : {{contact.full_name}}
Phone    : {{contact.phone}}
Email    : {{contact.email}}
Language : {{inboundWebhookRequest.language}}

Item     : {{inboundWebhookRequest.product}}
SKU      : {{inboundWebhookRequest.sku}}
Fabric   : {{inboundWebhookRequest.fabric}}
Config   : {{inboundWebhookRequest.configuration}}
Page     : {{inboundWebhookRequest.page}}

>>> We promised this customer a price TODAY. <<<
```

### 4. Create Opportunity
Pipeline: `Quotes` (create it if it doesn't exist)
Stage: `New request` · Name: `{{inboundWebhookRequest.product}} — {{contact.full_name}}`

### 5. Wait — 4 hours
(Use *Wait until* with business hours if you only want it during opening hours.)

### 6. If/Else — still unanswered?
Condition: contact tag `quote-sent` **is not** present

→ **Email** `galerieoasis@bellnet.ca`
Subject: `⚠ QUOTE OVERDUE (4h) — {{contact.full_name}}`
Body: same details as step 3 + "This quote is past the 4-hour target."

### 7. Wait — until next day, then If/Else
If tag `quote-sent` still absent → add tag `sla-missed`, notify owner.
(Use `sla-missed` in a monthly report to see how often the promise breaks.)

### 8. Follow-up branch (after quote is sent)
Trigger this from tag `quote-sent` — either here or as a separate workflow:
- **Wait 48h** → if no reply: gentle nudge email (bilingual, same branch logic)
- **Wait 5 days** → invite to the showroom, mention the current promotion
  (always say **in store only**)

---

## Manual step the team must do

When staff send the price, they must add the tag **`quote-sent`** to the
contact. Everything downstream keys off that tag. Without it the escalation
fires on customers who were already served.

---

## Blockers / notes

- **No users exist in this sub-account.** That's why alerts go to the store
  email rather than to an assigned task with an owner. Add a GHL user and
  step 3 becomes *Assign Task* with real accountability, and Conversation AI
  Human Handover can be switched on too (it's currently unusable for the
  same reason).
- **SMS steps deliberately omitted** until A2P/10DLC is confirmed approved.
  Once it is, add an SMS in step 3 to the store's mobile — a text gets read
  far faster than email, which is the whole point of a same-day promise.
- **Existing "Order Confirmation Email" workflow shows 0 enrolled** despite
  test orders being POSTed to the webhook — it is almost certainly not wired
  to this inbound webhook. Check its trigger before relying on it.
