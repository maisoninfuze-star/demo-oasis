/* ===========================================================
   Product page — driven by data/catalog.json (?id=<woo id>)
   Falls back to the Émeraude flagship demo without an id.
   Keeps: live fabric preview (white-knockout + tint), config,
   gallery, add-to-cart, 360 flourish.
   =========================================================== */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const lang = () => document.body.dataset.lang || 'en';

  const pmain = $('#pmain');
  const ptint = $('#ptint');
  let currentTint = '';

  /* ---- white knockout → transparent PNG dataURL ---- */
  function knockout(img, maxW = 1400) {
    const scale = Math.min(1, maxW / img.naturalWidth);
    const w = Math.round(img.naturalWidth * scale), h = Math.round(img.naturalHeight * scale);
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const ctx = cv.getContext('2d'); ctx.drawImage(img, 0, 0, w, h);
    const id = ctx.getImageData(0, 0, w, h), d = id.data;
    const near = i => d[i] > 236 && d[i + 1] > 236 && d[i + 2] > 236;
    const visited = new Uint8Array(w * h), stack = [];
    const push = (x, y) => { if (x < 0 || y < 0 || x >= w || y >= h) return; const p = y * w + x; if (visited[p]) return; visited[p] = 1; if (near(p * 4)) stack.push(p); };
    for (let x = 0; x < w; x++) { push(x, 0); push(x, h - 1); }
    for (let y = 0; y < h; y++) { push(0, y); push(w - 1, y); }
    let cleared = 0;
    while (stack.length) { const p = stack.pop(); d[p * 4 + 3] = 0; cleared++; const x = p % w, y = (p / w) | 0; push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1); }
    if (cleared < w * h * 0.04) return null; /* not a studio white-bg shot — keep original */
    ctx.putImageData(id, 0, 0);
    return cv.toDataURL('image/png');
  }

  function applyTint() {
    if (!ptint) return;
    if (!currentTint) { ptint.style.opacity = '0'; return; }
    ptint.style.background = currentTint;
    ptint.style.opacity = '0.62';
  }

  function processMain() {
    if (!pmain || !pmain.naturalWidth) return;
    try {
      const url = knockout(pmain);
      if (!url) { if (ptint) ptint.style.opacity = '0'; return; }
      pmain.src = url;
      pmain.classList.add('is-cut');
      if (ptint) { ptint.style.webkitMaskImage = `url(${url})`; ptint.style.maskImage = `url(${url})`; }
      applyTint();
    } catch (e) { /* leave original */ }
  }
  function loadMain(url) {
    if (!pmain) return;
    pmain.classList.remove('is-cut');
    pmain.onload = () => { pmain.onload = null; processMain(); };
    pmain.src = url;
  }

  /* ---- interactions (independent of data source) ---- */
  function bindSwatches() {
    $$('.sw').forEach(sw => sw.addEventListener('click', () => {
      $$('.sw').forEach(s => s.classList.remove('is-active'));
      sw.classList.add('is-active');
      currentTint = sw.dataset.tint || '';
      applyTint();
      const nm = $('#fabricName'); if (nm) nm.textContent = sw.dataset['name' + (lang() === 'fr' ? 'Fr' : 'En')] || '';
    }));
  }
  function bindConfig() {
    $$('.cchip').forEach(ch => ch.addEventListener('click', () => {
      $$('.cchip').forEach(c => c.classList.remove('is-active'));
      ch.classList.add('is-active');
      $('#dimVal').textContent = ch.dataset.dim;
      const nm = $('#cfgName'); if (nm) nm.textContent = ch.dataset[lang() === 'fr' ? 'fr' : 'en'];
    }));
  }
  function bindThumbs() {
    $$('.thumb').forEach(t => t.addEventListener('click', () => {
      $$('.thumb').forEach(x => x.classList.remove('is-active'));
      t.classList.add('is-active');
      loadMain(t.dataset.full);
    }));
  }
  $('#spin360')?.addEventListener('click', () => {
    const stage = $('.viewer__stage');
    if (!stage || stage.classList.contains('spinning')) return;
    stage.classList.add('spinning');
    setTimeout(() => stage.classList.remove('spinning'), 1200);
  });
  $('#addBtn')?.addEventListener('click', () => {
    const c = $('.head-cart__count');
    if (c) c.textContent = (+c.textContent || 0) + 1;
    const btn = $('#addBtn'), span = btn.querySelector('span');
    const prev = span.textContent;
    span.textContent = lang() === 'fr' ? 'Ajouté ✓' : 'Added ✓';
    btn.classList.add('added');
    setTimeout(() => { span.textContent = prev; btn.classList.remove('added'); }, 1600);
  });
  $('#langToggle')?.addEventListener('click', () => {
    setTimeout(() => {
      const asw = $('.sw.is-active'); const nm = $('#fabricName');
      if (asw && nm) nm.textContent = asw.dataset['name' + (lang() === 'fr' ? 'Fr' : 'En')];
      const ach = $('.cchip.is-active'); const cn = $('#cfgName');
      if (ach && cn) cn.textContent = ach.dataset[lang() === 'fr' ? 'fr' : 'en'];
    }, 0);
  });

  /* ---- catalog hydration ---- */
  const TYPE_LABEL = {
    'stationary': { en: 'Sofa', fr: 'Canapé' }, 'sectional': { en: 'Sectional', fr: 'Sectionnel' },
    'chair-chaise': { en: 'Armchair', fr: 'Fauteuil' }, 'sofa-bed': { en: 'Sofa bed', fr: 'Canapé-lit' },
    'motion-seating': { en: 'Motion seating', fr: 'Inclinable' }, 'ottomans': { en: 'Ottoman', fr: 'Pouf' },
    'bed-room-sets': { en: 'Bedroom set', fr: 'Ensemble chambre' }, 'mattresses': { en: 'Mattress', fr: 'Matelas' },
    'hand-made-carpets': { en: 'Hand-made rug', fr: 'Tapis noué main' }, 'machine-made': { en: 'Machine-made rug', fr: 'Tapis mécanique' },
    'carpets': { en: 'Rug', fr: 'Tapis' }, 'dining-room': { en: 'Dining', fr: 'Salle à manger' },
    'bed-room': { en: 'Bedroom', fr: 'Chambre' }, 'living-room': { en: 'Living room', fr: 'Salon' }
  };
  const PARENT = { 'stationary': 'living-room', 'sectional': 'living-room', 'chair-chaise': 'living-room',
    'sofa-bed': 'living-room', 'motion-seating': 'living-room', 'ottomans': 'living-room',
    'bed-room-sets': 'bed-room', 'mattresses': 'bed-room', 'hand-made-carpets': 'carpets', 'machine-made': 'carpets' };
  const typeOf = p => {
    const pref = ['stationary','sectional','chair-chaise','sofa-bed','motion-seating','ottomans',
                  'bed-room-sets','mattresses','hand-made-carpets','machine-made','dining-room','bed-room','carpets','living-room'];
    for (const k of pref) if (p.cats.includes(k)) return k;
    return p.cats[0] || 'living-room';
  };
  const isRug = p => p.cats.includes('carpets');

  const params = new URLSearchParams(location.search);
  const pid = parseInt(params.get('id'), 10);

  function hydrate(p, catalog) {
    const L = lang();
    const type = typeOf(p);
    const tl = TYPE_LABEL[type] || TYPE_LABEL['living-room'];
    document.title = `${p.short || p.name} — Galerie Oasis`;
    $('.pdp-title').textContent = p.short || p.name;
    $('.pdp-sub').textContent = tl[L];
    const eyebrow = $('.pdp-eyebrow');
    if (eyebrow) eyebrow.textContent = (p.sale ? (L === 'fr' ? 'Promotion · ' : 'On promotion · ') : '') + tl[L];
    const crumb = $('.pdp-info .crumb');
    if (crumb) {
      const parent = PARENT[type] || type;
      const SECTION_LABEL = {
        'living-room': { en: 'Living Room', fr: 'Salon' }, 'dining-room': { en: 'Dining', fr: 'Salle à manger' },
        'bed-room': { en: 'Bedroom', fr: 'Chambre' }, 'carpets': { en: 'Rugs', fr: 'Tapis' }
      };
      const pl = SECTION_LABEL[parent] || TYPE_LABEL[parent] || tl;
      crumb.innerHTML = `<a href="index.html">${L === 'fr' ? 'Accueil' : 'Home'}</a><b>/</b>` +
        `<a href="collection.html?cat=${parent}">${pl[L]}</a><b>/</b><span>${p.short || p.name}</span>`;
    }
    const desc = $('.pdp-desc');
    if (desc) desc.textContent = p.desc && p.desc.length > 30 ? p.desc :
      (L === 'fr'
        ? 'Pièce sélectionnée par Galerie Oasis. Visitez la salle d’exposition à Laval pour la voir, la toucher et l’essayer — notre équipe vous guidera.'
        : 'A piece hand-picked by Galerie Oasis. Visit the Laval showroom to see it, feel it and try it — our design team will guide you.');

    /* gallery */
    const imgs = [p.img, ...(p.gallery || [])].filter(Boolean);
    const thumbs = $('#thumbs');
    if (thumbs && imgs.length) {
      thumbs.innerHTML = imgs.map((u, i) =>
        `<button class="thumb${i === 0 ? ' is-active' : ''}" data-full="${u}"><img src="${u}" alt=""></button>`).join('');
      bindThumbs();
      loadMain(imgs[0]);
    }

    /* rugs: relabel fabric → colourway, hide sofa config */
    if (isRug(p)) {
      const optLabel = $('.opt__label');
      if (optLabel) optLabel.textContent = L === 'fr' ? 'Coloris (aperçu)' : 'Colourway (preview)';
      const cfg = $('#cfg')?.closest('.opt');
      if (cfg) cfg.style.display = 'none';
      const ar = $('.pdp-ar'); if (ar) ar.style.display = 'none';
    }

    /* related: same parent category */
    const parent = PARENT[type] || type;
    const rel = catalog.filter(x => x.id !== p.id && x.img && x.cats.includes(parent)).slice(0, 4);
    const row = $('.related__row');
    if (row && rel.length) {
      row.innerHTML = rel.map(r => {
        const rtl = TYPE_LABEL[typeOf(r)] || tl;
        return `<a class="prod reveal in" href="product.html?id=${r.id}">
          <div class="prod__media"><img src="${r.img}" alt="${r.short || r.name}" loading="lazy"></div>
          <div class="prod__foot"><h3>${r.short || r.name}</h3><span>${rtl[L]}</span></div></a>`;
      }).join('');
    }
  }

  if (pid) {
    fetch('data/catalog.json').then(r => r.json()).then(catalog => {
      const p = catalog.find(x => x.id === pid);
      if (p) hydrate(p, catalog);
      else if (pmain) { if (pmain.complete && pmain.naturalWidth) processMain(); else pmain.addEventListener('load', processMain, { once: true }); }
      bindSwatches(); bindConfig();
    }).catch(() => { bindSwatches(); bindConfig(); bindThumbs(); });
  } else {
    /* static Émeraude flagship demo */
    if (pmain) { if (pmain.complete && pmain.naturalWidth) processMain(); else pmain.addEventListener('load', processMain, { once: true }); }
    bindSwatches(); bindConfig(); bindThumbs();
  }
})();
