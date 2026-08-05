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
  dataVersion: '2026-08-06'
};
