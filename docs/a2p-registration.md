# A2P 10DLC Registration — Galerie Oasis (GoHighLevel)

Everything to paste into GHL → Settings → Phone Numbers → Trust Center.
Carriers verify the WEBSITE, so privacy.html + terms.html (now live) carry the
required SMS language: STOP/HELP, "consent not a condition of purchase",
"no mobile data shared with third parties for marketing".

## Brand registration
| Field | Value |
|---|---|
| Legal business name | Galerie Oasis (confirm exact legal name/NEQ with owner) |
| Business type | Private company · Retail — Furniture & Home Furnishings |
| Address | 1877 Bd du Curé-Labelle, Laval, QC H7T 1K2, Canada |
| Phone | +1 450 973 0000 |
| Email | galerieoasis@bellnet.ca |
| Website | https://galerieoasis.ca |
| Privacy policy URL | https://galerieoasis.ca/privacy.html |
| Terms URL | https://galerieoasis.ca/terms.html |
| Vertical | Retail |
> Needed from owner before submitting: NEQ (Registraire des entreprises) or
> federal BN + legal entity type. Sole-prop registers as Sole Proprietor brand.

## Campaign registration
| Field | Value |
|---|---|
| Use case | Low Volume Mixed (or Customer Care + Marketing) |
| Description | Furniture showroom in Laval, QC. We text customers who submitted an enquiry on our website: quote follow-ups, order/delivery updates, appointment reminders, and occasional promotions. Opt-in is an unchecked checkbox on our website forms; every message supports STOP/HELP. |
| Opt-in type | Website form (checkbox, not pre-checked) |
| Opt-in description | Customer submits a quote/visit form on galerieoasis.ca and optionally checks: "Text me updates about my request (reply STOP anytime)". Consent language links to the privacy policy. Screenshot the lead modal with the checkbox for the submission. |
| Opt-in URL | https://galerieoasis.ca (any product page → Request a quote) |
| Embedded link? | Yes (links to galerieoasis.ca pages only) |
| Embedded phone? | Yes |
| Age-gated / Direct lending | No / No |

## Sample messages (submit 2–5)
1. "Galerie Oasis: Hi {{name}}, your quote for the {{product}} is ready — {{link}}. Questions? Call 450-973-0000. Reply STOP to opt out, HELP for help."
2. "Galerie Oasis: your delivery is confirmed for {{date}} between {{window}}. White-glove service included. Reply STOP to opt out."
3. "Galerie Oasis : rappel de votre visite en salle d'exposition {{date}}. 1877 Bd du Curé-Labelle, Laval. Répondez STOP pour vous désabonner."
4. "Galerie Oasis: this week's liquidation pieces are in — floor models up to 50% off, in store only. Reply STOP to opt out."

## Compliance on the site — verified 2026-08-10
- privacy.html: SMS section with STOP/HELP, frequency, rates,
  no-third-party-marketing clause. Law 25 named. **English is complete; the
  French section is a ~100-word summary against ~365 English words.** A carrier
  will accept it, but Québec Law 25 expects equivalent French. Have the owner's
  notary or lawyer supply the French text: machine-translating a privacy policy
  and presenting it as authoritative is not appropriate.
- terms.html: SMS terms section. Same French shortfall (~93 vs ~344 words).
- Lead modal: unchecked consent checkbox linking to the privacy policy.
- Footer links to privacy and terms: **added 2026-08-10.** They did not exist
  before; this doc previously claimed they did.

## BLOCKER before submitting
The URLs below are the ones carriers verify. Both currently 404 on the live
domain because galerieoasis.ca still serves the OLD site; the new build is only
on the Vercel URL. **Point the domain at the new site before submitting, or the
campaign will be rejected.**

## Submission order in GHL
1. Business Profile (EIN/NEQ) → wait for TCR brand approval (1–3 days)
2. Campaign (fields above) → carrier review (1–7 days)
3. Buy/assign the phone number to the campaign
4. Test STOP/HELP keywords before real sends
