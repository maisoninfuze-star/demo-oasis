# Quote SLA — improved prompt for GHL "Build using AI"

## Why v1 needed redoing

- The trigger is the step the AI gets wrong most often. v2 states it three times
  and tells the AI what *not* to pick.
- v1 asked the AI to *write* the emails. An AI writing copy for a furniture
  store will invent delivery prices, lead times and discounts. v2 supplies the
  exact text so nothing is invented.
- v1 was 9 steps with branching escalation. Build the core first, verify it,
  then add escalation as a second pass.
- A **Draft** workflow accepts the webhook and enrols nobody. Publishing is part
  of the job, not an afterthought.

---

## PROMPT — paste this whole block

```
Build a workflow named "Quote Request — Same Day SLA".

TRIGGER — this is the most important part, do not substitute anything else:
Use the trigger type "Inbound Webhook".
Do NOT use "Form Submitted", "Contact Created", "Contact Changed" or any
calendar or funnel trigger. The workflow must be started by an external HTTP
POST of JSON.
Add one filter on the trigger: only continue when the incoming field "type"
equals exactly "quote".

CONTEXT — the JSON that will arrive looks like this:
{
  "type": "quote",
  "language": "en",
  "full_name": "Marie Tremblay",
  "first_name": "Marie",
  "last_name": "Tremblay",
  "email": "marie@example.com",
  "phone": "+15145550123",
  "product": "Duke Sofa",
  "sku": "MX-1714",
  "fabric": "",
  "configuration": "",
  "message": "Is this available in grey?",
  "page": "https://galerieoasis.ca/collection.html",
  "submitted_at": "2026-08-09T21:00:00.000Z"
}

ACTIONS, in this exact order:

1. Create or update a contact using first_name, last_name, email and phone.
   Add the tag: quote-request

2. Add an If/Else branch on the incoming field "language".
   Branch A when language = fr. Branch B for everything else.

3. In Branch B (English), send an EMAIL to the contact.
   Subject: We're confirming your price — Galerie Oasis
   Body:
   Hi {{contact.first_name}},

   Thank you for your interest in {{inboundWebhookRequest.product}}.

   Our team is confirming the exact price for you and will come back to you
   today. Prices on these pieces depend on the fabric, finish and size you
   choose, which is why we confirm them personally rather than post a number
   that might be wrong.

   If you'd like to see it in person, our showroom is at 1877 Bd du
   Curé-Labelle, Laval — open Monday to Wednesday 10am–6pm, Thursday and Friday
   10am–8pm, Saturday 10am–5pm, Sunday 11am–5pm.

   Galerie Oasis
   1877 Bd du Curé-Labelle, Laval, QC H7T 1K2
   +1 (450) 973-0000

4. In Branch A (French), send an EMAIL to the contact.
   Subject: Nous confirmons votre prix — Galerie Oasis
   Body:
   Bonjour {{contact.first_name}},

   Merci de votre intérêt pour {{inboundWebhookRequest.product}}.

   Notre équipe confirme le prix exact et vous revient aujourd'hui. Le prix de
   ces pièces dépend du tissu, du fini et de la taille choisis, c'est pourquoi
   nous le confirmons personnellement plutôt que d'afficher un montant qui
   pourrait être inexact.

   Pour le voir en personne, notre salle d'exposition est au 1877 Bd du
   Curé-Labelle, Laval — ouverte du lundi au mercredi de 10h à 18h, jeudi et
   vendredi de 10h à 20h, samedi de 10h à 17h et dimanche de 11h à 17h.

   Galerie Oasis
   1877 Bd du Curé-Labelle, Laval, QC H7T 1K2
   +1 (450) 973-0000

5. After the branches rejoin, send an internal EMAIL to
   galerieoasis@bellnet.ca
   Subject: QUOTE — {{contact.full_name}} — {{inboundWebhookRequest.product}}
   Body:
   New price-on-request enquiry.

   Name: {{contact.full_name}}
   Email: {{contact.email}}
   Phone: {{contact.phone}}
   Language: {{inboundWebhookRequest.language}}

   Product: {{inboundWebhookRequest.product}}
   SKU: {{inboundWebhookRequest.sku}}
   Fabric: {{inboundWebhookRequest.fabric}}
   Configuration: {{inboundWebhookRequest.configuration}}
   Message: {{inboundWebhookRequest.message}}

   Page: {{inboundWebhookRequest.page}}

   Reply to this customer today.

RULES:
- Send EMAIL only. Do not add any SMS, WhatsApp or voice step anywhere.
- Do not write any copy of your own. Use the text above exactly as written.
- Do not state any price, delivery cost, discount, lead time or stock level
  anywhere in this workflow.
- Do not add any step I have not listed.

When you are finished, tell me which trigger type you used and what the
inbound webhook URL is.
```

---

## After it builds — checklist

1. **Confirm the trigger really is "Inbound Webhook"** and the filter is
   `type equals quote`. If there is no webhook URL on the trigger, it built the
   wrong trigger type — delete and redo.
2. **Publish it.** Draft accepts the POST and enrols nobody. This is what
   happened on the first attempt.
3. **Copy the webhook URL** — it must end in a UUID, not `undefined`. If it
   still says `undefined`, it wasn't published.
4. Send me the URL. If it differs from the one already in `js/config.js`
   (`quoteWebhook`), I'll update it.
5. I submit a real quote through the website form; we confirm **Total enrolled
   goes 0 → 1**. That is the only real proof — a `200` response is not, because
   GHL returns `200 Success` even for a webhook that points at nothing.

## Merge fields

`{{inboundWebhookRequest.fieldname}}` is the usual syntax for custom webhook
payload fields. If the test email shows the literal text instead of the value,
open the email step — GHL's field picker will list the actual available tokens
once the workflow has received at least one real POST. Send one test through
the site form first, then build the emails.

## Add only after the core is verified working

- Create an Opportunity in a "Quotes" pipeline at stage "New request"
- Wait 4 hours → if still in "New request", email galerieoasis@bellnet.ca with
  subject starting "OVERDUE QUOTE"
- Wait until next day → if still unanswered, add tag `quote-at-risk`
- 48h after the quote is sent, if no reply, invite them to the showroom
