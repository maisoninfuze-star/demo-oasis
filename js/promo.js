/* ===========================================================
   Site-wide promotion — "We pay the taxes".
   Driven entirely by OASIS_CONFIG.promo; disable there to
   remove the ribbon and the homepage banner everywhere.
   =========================================================== */
(() => {
  const P = (window.OASIS_CONFIG || {}).promo;
  if (!P || !P.enabled) return;
  const L = () => (document.body.dataset.lang === 'fr' ? 'fr' : 'en');

  /* ---- ribbon on every page, above the header ---- */
  const ribbon = document.createElement('a');
  ribbon.className = 'promo-ribbon';
  ribbon.href = 'collection.html';
  document.body.prepend(ribbon);
  document.documentElement.classList.add('has-promo');

  /* ---- big banner on the homepage only ---- */
  let band = null;
  if (document.querySelector('.hero')) {
    band = document.createElement('section');
    band.className = 'taxfree';
    document.querySelector('.hero').after(band);
  }

  function render() {
    const fr = L() === 'fr';
    ribbon.innerHTML = `<b>${fr ? P.fr : P.en}</b><span>${fr ? P.subFr : P.subEn}</span>`;
    if (band) band.innerHTML = `
      <div class="taxfree__inner">
        <p class="taxfree__kicker">${fr ? 'Événement en cours' : 'Limited-time event'}</p>
        <h2 class="taxfree__title">${fr ? P.fr : P.en}</h2>
        <p class="taxfree__sub">${fr ? P.subFr : P.subEn}</p>
        <a class="btn btn--gold magnetic" href="collection.html">${fr ? P.ctaFr : P.ctaEn}</a>
        <p class="taxfree__fine">${fr ? P.fineFr : P.fineEn}</p>
      </div>`;
  }
  render();
  document.getElementById('langToggle')?.addEventListener('click', () => setTimeout(render, 10));
})();
