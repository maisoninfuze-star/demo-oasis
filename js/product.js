/* ===========================================================
   Product page — driven by data/catalog.json (?id=<woo id>)
   Falls back to the Émeraude flagship demo without an id.
   Keeps: live fabric preview (white-knockout + tint), config,
   gallery, add-to-cart, 360 flourish.
   =========================================================== */
(() => {
  const V = '?v=' + ((window.OASIS_CONFIG||{}).dataVersion || '1');
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

  /* ---- delivery promise (real zones from config) ---- */
  function renderAssurance() {
    const ul = $('#pdpAssure');
    const D = (window.OASIS_CONFIG || {}).delivery;
    if (!ul || !D) return;
    const L2 = lang();
    ul.innerHTML = `
      <li><b>$${D.local.fee} · ${D.local[L2]}</b><span>${D.included[L2]}</span></li>
      <li><b>$${D.shores.fee} · ${D.shores[L2]}</b><span>${D.note[L2]}</span></li>`;
    /* financing & easy payments */
    if (!document.querySelector('.pay-row')) {
      const pr = document.createElement('div');
      pr.className = 'pay-row';
      ul.after(pr);
    }
    const pr = document.querySelector('.pay-row');
    pr.innerHTML = `
      <p class="pay-row__title">${L2 === 'fr' ? 'Financement et paiements faciles' : 'Financing & easy payments'}</p>
      <div class="pay-row__badges"><span class="pay-badge">Flexiti</span><span class="pay-badge">Klarna</span><span class="pay-badge">Afterpay</span><span class="pay-badge">Visa · Mastercard · Interac</span></div>
      <p class="pay-row__fine">${L2 === 'fr'
        ? 'Financement Flexiti disponible en salle d\'exposition. Klarna et Afterpay pour payer en plusieurs versements. Prix sur demande · disponibilité variable selon la pièce.'
        : 'Flexiti financing available in the showroom. Klarna and Afterpay for easy instalments. Prices on request · availability varies by piece.'}</p>`;
  }
  renderAssurance();
  $('#langToggle')?.addEventListener('click', () => setTimeout(renderAssurance, 10));

  const params = new URLSearchParams(location.search);
  const pid = parseInt(params.get('id'), 10);

  /* Every product shared product.html's static canonical, so all 240 looked
     like duplicates of one page to search engines. Point the canonical, OG
     tags and Product schema at the actual product instead. */
  function setSeo(p, tl) {
    const CFG = window.OASIS_CONFIG || {};
    const base = (CFG.siteUrl || location.origin).replace(/\/$/, '');
    const url = `${base}/product.html?id=${p.id}`;
    const img = p.img ? `${base}/${p.img}` : null;
    const name = p.short || p.name;
    const desc = (p.desc && p.desc.length > 30 ? p.desc
      : `${name} — ${tl.en} available at Galerie Oasis, Laval.`).slice(0, 300);

    const set = (sel, attr, val) => { const el = document.querySelector(sel); if (el && val) el.setAttribute(attr, val); };
    set('link[rel="canonical"]', 'href', url);
    set('meta[property="og:url"]', 'content', url);
    set('meta[property="og:title"]', 'content', `${name} — Galerie Oasis`);
    set('meta[property="og:description"]', 'content', desc);
    set('meta[name="twitter:title"]', 'content', `${name} — Galerie Oasis`);
    set('meta[name="twitter:description"]', 'content', desc);
    if (img) { set('meta[property="og:image"]', 'content', img); set('meta[name="twitter:image"]', 'content', img); }
    const md = document.querySelector('meta[name="description"]');
    if (md) md.setAttribute('content', desc);
    document.querySelectorAll('link[hreflang]').forEach(l => l.setAttribute('href', url));

    const old = document.getElementById('productSchema');
    if (old) old.remove();
    const s = document.createElement('script');
    s.type = 'application/ld+json';
    s.id = 'productSchema';
    s.textContent = JSON.stringify({
      '@context': 'https://schema.org', '@type': 'Product',
      name, description: desc, image: img || undefined, sku: String(p.id),
      category: tl.en, url,
      brand: { '@type': 'Brand', name: 'Galerie Oasis' },
      offers: {
        '@type': 'Offer', url, priceCurrency: 'CAD',
        availability: 'https://schema.org/InStock',
        seller: { '@type': 'FurnitureStore', name: 'Galerie Oasis' }
      }
    });
    document.head.appendChild(s);
  }

  /* Replace the flagship sofa's hardcoded spec tables with what is actually
     known about this piece, plus a clear route to the real numbers. */
  function applyHonestSpecs(p, tl, L) {
    $('#swatches')?.closest('.opt')?.remove();
    $('#cfg')?.closest('.opt')?.remove();

    const details = $('.pdp-details');
    if (!details) return;
    const isRugPiece = p.cats.includes('carpets');
    if (isRugPiece) { details.remove(); return; }

    const custom = p.cats.some(c => ['stationary', 'sectional', 'chair-chaise', 'sofa-bed', 'ottomans'].includes(c));
    details.innerHTML = `
      <div class="det">
        <h3>${L === 'fr' ? 'Cette pièce' : 'This piece'}</h3>
        <ul>
          <li><span>${L === 'fr' ? 'Catégorie' : 'Category'}</span><b>${tl[L]}</b></li>
          <li><span>${L === 'fr' ? 'Référence' : 'Reference'}</span><b>${p.id}</b></li>
          <li><span>${L === 'fr' ? 'Prix' : 'Price'}</span><b>${L === 'fr' ? 'Sur demande' : 'On request'}</b></li>
          ${custom ? `<li><span>${L === 'fr' ? 'Sur mesure' : 'Made to order'}</span><b>${L === 'fr' ? 'Tissus au choix' : 'Fabric options available'}</b></li>` : ''}
        </ul>
      </div>
      <div class="det">
        <h3>${L === 'fr' ? 'Dimensions et matériaux' : 'Dimensions & materials'}</h3>
        <p class="det__note">${L === 'fr'
          ? 'Les dimensions exactes, les matériaux et les délais varient selon le fabricant. Nous vous les confirmons par écrit avant toute commande — demandez la fiche technique.'
          : 'Exact dimensions, materials and lead time vary by maker. We confirm them in writing before any order — ask us for the spec sheet.'}</p>
        <a class="det__cta" href="mailto:${(window.OASIS_CONFIG||{}).storeEmail || ''}?subject=${encodeURIComponent((L==='fr'?'Fiche technique — ':'Spec sheet — ') + (p.short||p.name))}">${L === 'fr' ? 'Demander la fiche technique' : 'Request the spec sheet'}</a>
      </div>
      <div class="det">
        <h3>${L === 'fr' ? 'Voir en personne' : 'See it in person'}</h3>
        <p class="det__note">${L === 'fr'
          ? 'Cette pièce est en salle d’exposition à Laval. Venez la voir, la toucher et l’essayer.'
          : 'This piece is on the floor in our Laval showroom. Come see it, feel it and try it.'}</p>
        <ul>
          <li><span>${L === 'fr' ? 'Adresse' : 'Address'}</span><b>1877 Bd du Curé-Labelle</b></li>
          <li><span>${L === 'fr' ? 'Téléphone' : 'Phone'}</span><b><a href="tel:+14509730000">(450) 973-0000</a></b></li>
        </ul>
      </div>`;
  }

  function hydrate(p, catalog) {
    const L = lang();
    const type = typeOf(p);
    const tl = TYPE_LABEL[type] || TYPE_LABEL['living-room'];
    document.title = `${p.short || p.name} — Galerie Oasis`;
    setSeo(p, tl);
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

    /* product.html ships the flagship sofa's demo specs. Left in place they
       claimed 8-way hand-tied springs, "3-Seater W 208 · D 102 · H 76" and
       performance velvet on beds, mattresses, ottomans and rugs alike.
       Only keep them where they are true: the custom programme (which
       supplies real fabrics + configurations from data/custom.json).
       Everything else gets what we actually know, and an invitation to ask. */
    fetch('data/custom.json' + V).then(r => r.json()).then(cj => {
      if (cj.products && cj.products[String(p.id)]) return;   // real specs — leave alone
      applyHonestSpecs(p, tl, L);
    }).catch(() => applyHonestSpecs(p, tl, L));

    /* Rugs are one-of-a-kind woven pieces, not upholstered furniture.
       Offering six "colourways" implied you could order this rug in other
       colours, which isn't true — hide the fabric and size selectors and
       show the weave facts instead. */
    if (isRug(p)) {
      $('#swatches')?.closest('.opt')?.remove();
      $('#cfg')?.closest('.opt')?.remove();
      const ar = $('.pdp-ar'); if (ar) ar.style.display = 'none';
      const badge = $('.viewer__badge');
      if (badge) badge.textContent = L === 'fr' ? 'Pièce unique' : 'One-of-a-kind piece';
      const info = $('.pdp-desc');
      if (info && !$('.rug-facts')) {
        const hand = p.cats.includes('hand-made-carpets');
        const ul = document.createElement('ul');
        ul.className = 'rug-facts';
        const facts = hand
          ? [[L === 'fr' ? 'Fabrication' : 'Construction', L === 'fr' ? 'Noué main' : 'Hand-knotted'],
             [L === 'fr' ? 'Pièce' : 'Piece', L === 'fr' ? 'Unique — un seul exemplaire' : 'Unique — one only'],
             [L === 'fr' ? 'Voir en salle' : 'See in store', L === 'fr' ? 'Laval' : 'Laval']]
          : [[L === 'fr' ? 'Fabrication' : 'Construction', L === 'fr' ? 'Tissé mécaniquement' : 'Machine-made'],
             [L === 'fr' ? 'Voir en salle' : 'See in store', L === 'fr' ? 'Laval' : 'Laval']];
        ul.innerHTML = facts.map(([k, v]) => `<li><span>${k}</span><b>${v}</b></li>`).join('');
        info.after(ul);
      }
    }

    /* related: same parent category */
    const parent = PARENT[type] || type;
    const rel = catalog.filter(x => x.id !== p.id && x.img && x.cats.includes(parent)).slice(0, 4);
    const row = $('.related__row');
    if (row && rel.length) {
      row.innerHTML = rel.map(r => {
        const rtl = TYPE_LABEL[typeOf(r)] || tl;
        return `<a class="prod reveal in" href="product.html?id=${r.id}">
          <div class="prod__media"><img src="${r.thumb || r.img}" alt="${r.short || r.name}" loading="lazy"></div>
          <div class="prod__foot"><h3>${r.short || r.name}</h3><span>${rtl[L]}</span></div></a>`;
      }).join('');
    }
  }

  if (pid) {
    fetch('data/catalog.json' + V).then(r => r.json()).then(catalog => {
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
