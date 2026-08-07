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
  /* Delivery — flat zones, white-glove included. */
  delivery: {
    local:  { fee: 99,  en: 'Within 20 km of the showroom', fr: 'Dans un rayon de 20 km de la salle' },
    shores: { fee: 199, en: 'North Shore & South Shore',    fr: 'Rive-Nord et Rive-Sud' },
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
    subEn: 'On everything in store and in our catalogues — for a limited time.',
    subFr: 'Sur tout en magasin et dans nos catalogues — pour un temps limité.',
    fineEn: 'Equivalent to a discount equal to both sales taxes (GST + QST). Cannot be combined with certain offers. Details in store.',
    fineFr: 'Équivaut à un rabais égal aux deux taxes de vente (TPS + TVQ). Ne peut être jumelé à certaines offres. Détails en magasin.',
    ctaEn: 'Shop the event', ctaFr: 'Profiter de l’offre'
  },

  dataVersion: '20260806f'
};
