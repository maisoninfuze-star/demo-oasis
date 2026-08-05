/* ===========================================================
   Brands catalogue — renders every supplier feed in one page.
   Rugs Network (the store's own warehouse) shows live prices;
   supplier pieces show "price on request" since customization
   changes the number. Batched rendering keeps 5,800 items smooth.
   =========================================================== */
(() => {
  const V = '?v=' + ((window.OASIS_CONFIG || {}).dataVersion || '1');
  const $ = (s, c = document) => c.querySelector(s);
  const L = () => (document.body.dataset.lang === 'fr' ? 'fr' : 'en');
  const T = (en, fr) => (L() === 'fr' ? fr : en);

  const grid = $('#bgrid');
  const chipsWrap = $('#brandChips');
  const searchBox = $('#brandSearch');
  const countEl = $('#bcount');
  const moreBtn = $('#bmore');
  if (!grid) return;

  const BATCH = 60;
  let manifest = null, all = [], view = [], shown = 0;
  let activeBrand = new URLSearchParams(location.search).get('brand') || 'all';
  let q = '';

  const money = n => '$' + n.toFixed(2).replace(/\.00$/, '');

  fetch('data/suppliers/manifest.json' + V).then(r => r.json()).then(async man => {
    manifest = man;
    const loads = man.suppliers.map(s =>
      fetch(s.file + V).then(r => r.json()).then(d => (d.items || []).map(it => ({
        ...it,
        __brand: s.slug, __brandName: s.name, __pricing: s.pricing
      }))).catch(() => []));
    const chunks = await Promise.all(loads);
    all = chunks.flat();
    buildChips();
    apply();
  });

  function buildChips() {
    const counts = {};
    all.forEach(it => counts[it.__brand] = (counts[it.__brand] || 0) + 1);
    chipsWrap.innerHTML =
      `<button class="chip${activeBrand === 'all' ? ' is-active' : ''}" data-b="all">${T('All brands', 'Toutes les marques')}</button>` +
      manifest.suppliers.map(s =>
        `<button class="chip${activeBrand === s.slug ? ' is-active' : ''}" data-b="${s.slug}">${s.name} · ${counts[s.slug] || 0}</button>`).join('');
    chipsWrap.querySelectorAll('.chip').forEach(ch => ch.addEventListener('click', () => {
      chipsWrap.querySelectorAll('.chip').forEach(c => c.classList.remove('is-active'));
      ch.classList.add('is-active');
      activeBrand = ch.dataset.b;
      history.replaceState(null, '', activeBrand === 'all' ? 'brands.html' : `brands.html?brand=${activeBrand}`);
      apply();
    }));
  }

  function apply() {
    const needle = q.trim().toLowerCase();
    view = all.filter(it =>
      (activeBrand === 'all' || it.__brand === activeBrand) &&
      (!needle || (it.name + ' ' + (it.desc || '') + ' ' + (it.sku || '')).toLowerCase().includes(needle)));
    grid.innerHTML = '';
    shown = 0;
    countEl.textContent = view.length.toLocaleString();
    renderMore();
  }

  function cardHTML(it) {
    const img = it.thumb || it.img;
    const price = it.__pricing === 'price' && it.price
      ? `<p class="bcard__price">${money(it.price)}${it.retail && it.retail > it.price
          ? ` <s>${money(it.retail)}</s>` : ''}</p>`
      : `<p class="bcard__price bcard__price--req">${T('Price on request', 'Prix sur demande')}</p>`;
    const clr = it.clearance ? `<span class="pcard__tag">${T('Clearance', 'Liquidation')}</span>` : '';
    const srcset = it.hi && it.thumb ? ` srcset="${it.thumb} 1x, ${it.hi} 2x"` : '';
    return `<div class="bcard">
      <div class="bcard__media">${img ? `<img src="${img}"${srcset} alt="${it.name}" loading="lazy" decoding="async">` : ''}${clr}</div>
      <div class="bcard__info">
        <h3>${it.name}</h3>
        <span>${it.__brandName}${it.sku ? ' · ' + it.sku : ''}</span>
        ${price}
        <button class="bcard__ask" data-name="${it.name.replace(/"/g, '&quot;')}" data-brand="${it.__brandName}">${T('Enquire', 'Demander')}</button>
      </div></div>`;
  }

  function renderMore() {
    const next = view.slice(shown, shown + BATCH);
    grid.insertAdjacentHTML('beforeend', next.map(cardHTML).join(''));
    shown += next.length;
    moreBtn.style.display = shown < view.length ? '' : 'none';
    moreBtn.querySelector('i').textContent = `${shown} / ${view.length}`;
  }
  moreBtn?.addEventListener('click', renderMore);

  /* infinite-ish scroll: auto-load when the button nears the viewport */
  new IntersectionObserver(es => {
    if (es[0].isIntersecting && shown < view.length) renderMore();
  }, { rootMargin: '900px' }).observe(moreBtn);

  let deb;
  searchBox?.addEventListener('input', e => {
    clearTimeout(deb);
    deb = setTimeout(() => { q = e.target.value; apply(); }, 220);
  });

  /* enquiries reuse the lead modal with the item carried in */
  grid.addEventListener('click', e => {
    const b = e.target.closest('.bcard__ask');
    if (!b) return;
    const t = $('.pdp-title');    /* leads.js reads this for context */
    let ghost = $('#brandGhostTitle');
    if (!ghost) {
      ghost = document.createElement('span');
      ghost.id = 'brandGhostTitle';
      ghost.className = 'pdp-title';
      ghost.style.display = 'none';
      document.body.appendChild(ghost);
    }
    ghost.textContent = `${b.dataset.name} (${b.dataset.brand})`;
    window.OasisLead?.open('quote');
  });

  $('#langToggle')?.addEventListener('click', () => setTimeout(() => { buildChips(); apply(); }, 10));
})();
