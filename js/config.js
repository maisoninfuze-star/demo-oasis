/* ===========================================================
   Site configuration — edit these, not the code.
   =========================================================== */
window.OASIS_CONFIG = {
  /* Where enquiries are sent.
     Set to Galerie Oasis's OWN GoHighLevel webhook (or any endpoint that
     accepts a JSON POST). Leave null and forms fall back to opening the
     customer's mail app addressed to the store — no lead is ever lost. */
  leadWebhook: null,

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
            fr: 'Escaliers, ascenseurs et levage sont estimés après confirmation des accès.' }
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

  dataVersion: '20260807p'
};
