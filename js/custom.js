/* ===========================================================
   Custom-made programme — real supplier fabric books.
   Renders on products listed in data/custom.json and drives
   the live fabric preview with a real swatch texture.
   =========================================================== */
(() => {
  const V = '?v=' + ((window.OASIS_CONFIG||{}).dataVersion || '1');
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const L = () => (document.body.dataset.lang === 'fr' ? 'fr' : 'en');
  const tr = o => (o && typeof o === 'object' ? o[L()] : o);

  const pid = new URLSearchParams(location.search).get('id');
  if (!pid) return;

  fetch('data/custom.json' + V).then(r => r.json()).then(data => {
    const entry = data.products[pid];
    if (!entry) return;
    const prog = data.programs[entry.program];
    if (!prog) return;
    window.__customVariants = entry.variants || null;
    build(prog);
    /* Rebuild on language switch. Registered ONCE here — registering it
       inside build() made every toggle add another listener, which then
       called build() again: .fab-meta doubled 1→2→4→8→16 on the page. */
    $('#langToggle')?.addEventListener('click', () => setTimeout(() => build(prog), 10));
  }).catch(() => {});

  function build(prog) {
    const optBlock = $('#swatches')?.closest('.opt');
    if (!optBlock) return;

    /* Idempotent: clear anything a previous build left behind so repeated
       language switches replace the blocks instead of stacking them up. */
    $$('.fab-meta').forEach(el => el.remove());
    $('.custom-band')?.remove();
    $('.custom-badge')?.remove();

    /* ---------- badge under the title ---------- */
    const sub = $('.pdp-sub');
    if (sub && !$('.custom-badge')) {
      const b = document.createElement('p');
      b.className = 'custom-badge';
      b.innerHTML = `<i></i><span data-cm="badge">${L() === 'fr'
        ? `Sur mesure · ${prog.fabrics.length}+ tissus au choix`
        : `Made to order · ${prog.fabrics.length}+ fabrics to choose from`}</span>`;
      sub.after(b);
    }

    /* ---------- replace generic swatches with real fabric ---------- */
    const head = optBlock.querySelector('.opt__head');
    head.querySelector('.opt__label').textContent = L() === 'fr' ? 'Tissu sur mesure' : 'Your fabric';
    const nameEl = head.querySelector('.opt__value');

    const wrap = $('#swatches');
    wrap.classList.add('swatches--fabric');
    wrap.innerHTML = prog.fabrics.map((f, i) => `
      <button class="fsw${i === 0 ? ' is-active' : ''}" data-fid="${f.id}" data-tint="${f.tint}" data-img="${f.img}"
              data-name-en="${f.name.en}" data-name-fr="${f.name.fr}" data-book="${f.book}"
              title="${tr(f.name)} — ${f.book}" aria-label="${tr(f.name)}">
        <img src="${f.img}" alt="" decoding="async">
      </button>`).join('');

    /* supplier line under the swatches */
    document.querySelectorAll('.fab-meta').forEach(el => el.remove());
    const meta = document.createElement('div');
    meta.className = 'fab-meta';
    meta.innerHTML = `
      <figure class="fab-preview">
        <img class="fab-preview__img" src="${prog.fabrics[0].img}" alt="${tr(prog.fabrics[0].name)}" decoding="async">
        <figcaption>${L() === 'fr' ? 'Échantillon réel · salle d\'exposition' : 'Real swatch · from our showroom'}</figcaption>
      </figure>
      <p class="fab-meta__book"><b data-cm="book">${prog.fabrics[0].book}</b>
        <span data-cm="supplier">${prog.supplier} · ${tr(prog.supplierNote)}</span></p>
      <ul class="fab-meta__feats">${prog.features.map(f => `<li>${tr(f)}</li>`).join('')}</ul>`;
    wrap.after(meta);

    /* ---------- swatch behaviour ---------- */
    const setFabric = btn => {
      $$('.fsw').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      if (nameEl) nameEl.textContent = btn.dataset['name' + (L() === 'fr' ? 'Fr' : 'En')];
      const bk = meta.querySelector('[data-cm="book"]');
      if (bk) bk.textContent = btn.dataset.book;
      /* drive the live preview tint — only when the photo was knocked out
         to a transparent PNG (mask present), otherwise we'd wash the whole room */
      const tint = $('#ptint');
      const masked = tint && (tint.style.webkitMaskImage || tint.style.maskImage);
      if (tint && masked) {
        tint.style.background = btn.dataset.tint;
        tint.style.opacity = '0.62';
      }
      /* always show the choice on the big swatch preview */
      const big = $('.fab-preview__img');
      if (big) { big.src = btn.dataset.img; big.alt = btn.dataset['name' + (L() === 'fr' ? 'Fr' : 'En')]; }

      /* THE payoff: show the actual sofa re-upholstered in this fabric.
         Variants are the same photograph with only the upholstery changed,
         so the shopper sees their piece, not a stand-in. */
      const variants = window.__customVariants;
      const vsrc = variants && variants[btn.dataset.fid];
      const main = $('#pmain');
      if (vsrc && main) {
        if (!main.dataset.origSrc) main.dataset.origSrc = main.getAttribute('src');
        main.classList.remove('is-cut');
        main.src = vsrc;
        /* keep the zoom viewer in sync with what is on screen */
        const activeThumb = $('.thumb.is-active');
        if (activeThumb) {
          if (!activeThumb.dataset.origFull) activeThumb.dataset.origFull = activeThumb.dataset.full;
          activeThumb.dataset.full = vsrc;
          const timg = activeThumb.querySelector('img');
          if (timg) timg.src = vsrc;
        }
      }
    };
    $$('.fsw').forEach(b => b.addEventListener('click', () => setFabric(b)));
    if (nameEl) nameEl.textContent = tr(prog.fabrics[0].name);

    /* ---------- custom-made explainer band ---------- */
    if (!$('.custom-band')) {
      const band = document.createElement('section');
      band.className = 'custom-band';
      const steps = L() === 'fr'
        ? [['Choisissez la pièce', 'Format, configuration et bras — adaptés à votre espace.'],
           ['Choisissez le tissu', `Parcourez les livres ${prog.books.map(b => b.name).join(' et ')} en salle d'exposition.`],
           ['Nous la faisons fabriquer', `${prog.supplier} — ${tr(prog.leadTime)}, livrée et installée chez vous.`]]
        : [['Choose the piece', 'Size, configuration and arm style — sized to your room.'],
           ['Choose the fabric', `Browse the ${prog.books.map(b => b.name).join(' and ')} books in our showroom.`],
           ['We have it made', `${prog.supplier} — ${tr(prog.leadTime)}, delivered and placed in your home.`]];
      band.innerHTML = `
        <div class="custom-band__head">
          <p class="eyebrow">${L() === 'fr' ? 'Sur mesure' : 'Custom made'}</p>
          <h2>${L() === 'fr' ? 'Fait pour votre pièce, dans votre tissu.' : 'Built for your room, in your fabric.'}</h2>
          <p class="custom-band__lede">${L() === 'fr'
            ? `Cette pièce est fabriquée sur commande. Choisissez parmi les livres de tissus ${prog.supplier} disponibles en salle d'exposition — plus de ${prog.fabrics.length} coloris présentés ici, des centaines en magasin.`
            : `This piece is made to order. Choose from the ${prog.supplier} fabric books we keep in the showroom — ${prog.fabrics.length} shown here, hundreds more in store.`}</p>
        </div>
        <ol class="custom-steps">${steps.map(([t, d], i) => `
          <li><span class="custom-steps__n">0${i + 1}</span><h3>${t}</h3><p>${d}</p></li>`).join('')}</ol>
        <div class="custom-books">${prog.books.map(b => `
          <div class="custom-book"><b>${b.name}</b><span>${tr(b.kind)}</span></div>`).join('')}</div>
        <div class="custom-gallery">
          <figure><img src="assets/gen/custom/same-sofa-fabrics.jpg" alt="" loading="lazy"><figcaption>${L() === 'fr' ? 'Le même canapé, quatre tissus' : 'The same sofa, four fabrics'}</figcaption></figure>
          <figure><img src="assets/gen/custom/wood-finishes.jpg" alt="" loading="lazy"><figcaption>${L() === 'fr' ? 'Plusieurs couleurs de bois' : 'Multiple wood colours'}</figcaption></figure>
          <figure><img src="assets/gen/custom/swatch-fan.jpg" alt="" loading="lazy"><figcaption>${L() === 'fr' ? 'Des centaines d’échantillons en salle' : 'Hundreds of swatches in store'}</figcaption></figure>
        </div>
        <p class="custom-gallery__fine">${L() === 'fr' ? 'Images concept — votre pièce est fabriquée selon vos choix réels de tissu et de bois.' : 'Concept renderings — your piece is built from your actual fabric and wood choices.'}</p>
        <a class="btn btn--gold magnetic" href="index.html#visit">${L() === 'fr' ? 'Réserver une consultation tissu' : 'Book a fabric consultation'}</a>`;
      const details = $('.pdp-details');
      details ? details.before(band) : $('main').append(band);
    }

  }
})();
