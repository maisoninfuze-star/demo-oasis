/* ===========================================================
   Site configuration — edit these, not the code.
   =========================================================== */
window.OASIS_CONFIG = {
  /* Where enquiries are sent.
     Galerie Oasis's own GoHighLevel inbound webhook. Every form (quote,
     visit, newsletter, account, order) POSTs JSON here and GHL creates or
     updates the contact. If the request ever fails, the form falls back to
     opening the customer's mail app addressed to the store — no lead is lost.
     Note: an inbound webhook URL is public by design (it ships in the page),
     so keep spam filtering / required fields on the GHL side. */
  leadWebhook: 'https://services.leadconnectorhq.com/hooks/3WZJmfyOZdm174uTBbc8/webhook-trigger/6beda3ad-3cf8-419b-b759-10afe76dd602',

  /* Account signups go to their own GHL workflow so they can be tagged and
     nurtured separately from orders and quote requests. Falls back to
     leadWebhook if left null. */
  accountWebhook: 'https://services.leadconnectorhq.com/hooks/3WZJmfyOZdm174uTBbc8/webhook-trigger/c66f431d-82df-4e8f-b9b5-43e3673acf74',

  /* Price-on-request enquiries have their own workflow (same-day quote SLA),
     so they route to a dedicated webhook rather than the general lead one. */
  quoteWebhook: 'https://services.leadconnectorhq.com/hooks/3WZJmfyOZdm174uTBbc8/webhook-trigger/be0d87e6-0f90-47cd-a90a-f7ae267b2b76',

  storeEmail: 'galerieoasis@bellnet.ca',
  storePhone: '+14509730000',
  storePhoneDisplay: '+1 (450) 973-0000',
  storeAddress: '1877 Bd du Curé-Labelle, Laval, QC H7T 1K2',

  /* Set once the site has a live domain — used for canonical/OG/sitemap. */
  siteUrl: 'https://galerieoasis.ca',

  /* Bump when catalogue data changes so returning visitors don't get a
     cached copy of catalog.json / custom.json. */
  /* Delivery — Greater Montréal ONLY. Free over $500, $99 below. */
  delivery: {
    freeOver: 500,
    fee: 99,
    area: { en: 'Montréal, Laval and nearby — Greater Montréal only',
            fr: 'Montréal, Laval et les environs — Grand Montréal seulement' },
    outside: { en: 'We do not deliver outside the Greater Montréal area.',
               fr: 'Nous ne livrons pas à l\'extérieur du Grand Montréal.' },
    included: { en: 'Carried in, placed in your room, assembled, packaging taken away',
                fr: 'Monté chez vous, placé dans la pièce, assemblé, emballage retiré' },
    note: { en: 'Stairs, elevators and hoisting are quoted after we confirm access.',
            fr: 'Escaliers, ascenseurs et levage sont estimés après confirmation des accès.' },
    /* Owner-confirmed 2026-08-10. Applies to catalogue pieces we order in.
       Custom-made work is quoted separately — do not imply 5-10 days for it. */
    leadTime: { en: '5 to 10 days from order to delivery.',
                fr: 'De 5 à 10 jours entre la commande et la livraison.' }
  },

  /* Site-wide promotion. Set enabled:false to remove everywhere at once. */
  promo: {
    enabled: true,
    en: 'WE PAY THE TAXES',
    fr: 'NOUS PAYONS LES TAXES',
    subEn: 'On everything — for a limited time. In store only.',
    subFr: 'Sur tout — pour un temps limité. Seulement en magasin.',
    fineEn: 'In store only. Equivalent to a discount equal to both sales taxes (GST + QST). Cannot be combined with certain offers. Details in store.',
    fineFr: 'Seulement en magasin. Équivaut à un rabais égal aux deux taxes de vente (TPS + TVQ). Ne peut être jumelé à certaines offres. Détails en magasin.',
    ctaEn: 'Shop the event', ctaFr: 'Profiter de l’offre'
  },

  dataVersion: '20260910c'
};
