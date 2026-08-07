/* ===========================================================
   Collection pages — ONE unified, categorized catalogue.
   Curated showroom pieces + all supplier items merged into real
   departments (data/cat/<top>.json, built by categorize.py).
   Filters: subcategory chips, brand, price, sort, search.
   =========================================================== */
(() => {
  const V = '?v=' + ((window.OASIS_CONFIG || {}).dataVersion || '1');
  const $ = (s, c = document) => c.querySelector(s);
  const L = () => (document.body.dataset.lang === 'fr' ? 'fr' : 'en');
  const T = (en, fr) => (L() === 'fr' ? fr : en);

  const TOP_LABEL = {
    'living-room': { en: ['Living', 'Room'], fr: ['Le', 'Salon'] },
    'dining-room': { en: ['Dining', 'Room'], fr: ['Salle à', 'manger'] },
    'bed-room':    { en: ['Bed', 'Room'], fr: ['La', 'Chambre'] },
    'office':      { en: ['The', 'Office'], fr: ['Le', 'Bureau'] },
    'decor':       { en: ['Décor &', 'Accents'], fr: ['Décor et', 'accents'] },
    'carpets':     { en: ['The', 'Rugs'], fr: ['Les', 'Tapis'] },
    'custom-studio': { en: ['Custom', 'Studio'], fr: ['Atelier', 'sur mesure'] },
    'all':         { en: ['The', 'Collection'], fr: ['La', 'Collection'] },
  };
  const TOP_SUB = {
    'living-room': { en: 'Sofas, sectionals, chairs and tables — from our showroom floor and every partner catalogue.', fr: 'Canapés, sectionnels, fauteuils et tables — de notre salle et de tous nos catalogues partenaires.' },
    'dining-room': { en: 'Dining sets, tables, chairs and buffets to host every long dinner.', fr: 'Ensembles, tables, chaises et buffets pour recevoir.' },
    'bed-room':    { en: 'Beds, bedroom sets, dressers and mattresses composed for rest.', fr: 'Lits, ensembles, commodes et matelas pensés pour le repos.' },
    'office':      { en: 'Desks, office chairs and bookcases that work as hard as you.', fr: 'Bureaux, chaises et bibliothèques qui travaillent autant que vous.' },
    'decor':       { en: 'Lighting, mirrors, art and accents — the finishing layer.', fr: 'Luminaires, miroirs, art et accents — la touche finale.' },
    'carpets':     { en: 'Hand-knotted and machine-made rugs — including 1,400+ from our own warehouse with live prices.', fr: 'Tapis noués main et mécaniques — dont 1 400+ de notre entrepôt à prix affichés.' },
    'custom-studio': { en: 'Banquettes, tables and storage, designed and made to order.', fr: 'Banquettes, tables et rangements, faits sur mesure.' },
    'all':         { en: 'Everything — our showroom floor plus every partner catalogue, in one place.', fr: 'Tout — notre salle d’exposition et tous les catalogues partenaires.' },
  };
  const SUB_LABEL = {
    'sofas': {en:'Sofas',fr:'Canapés'}, 'sectionals': {en:'Sectionals',fr:'Sectionnels'},
    'sofa-beds': {en:'Sofa beds',fr:'Canapés-lits'}, 'loveseats': {en:'Loveseats',fr:'Causeuses'},
    'chairs': {en:'Chairs',fr:'Fauteuils'}, 'chaises': {en:'Chaises',fr:'Chaises longues'},
    'ottomans': {en:'Ottomans',fr:'Poufs'}, 'recliners': {en:'Recliners',fr:'Inclinables'},
    'living-sets': {en:'Living sets',fr:'Ensembles'}, 'coffee-tables': {en:'Coffee tables',fr:'Tables à café'},
    'end-tables': {en:'End tables',fr:'Tables d’appoint'}, 'accent-tables': {en:'Accent tables',fr:'Tables accent'},
    'console-tables': {en:'Consoles',fr:'Consoles'}, 'tv-media': {en:'TV & media',fr:'Télé et média'},
    'dining-sets': {en:'Dining sets',fr:'Ensembles'}, 'dining-tables': {en:'Tables',fr:'Tables'},
    'dining-chairs': {en:'Chairs',fr:'Chaises'}, 'buffets': {en:'Buffets',fr:'Buffets'},
    'bar': {en:'Bar',fr:'Bar'}, 'beds': {en:'Beds',fr:'Lits'},
    'bedroom-sets': {en:'Bedroom sets',fr:'Ensembles'}, 'headboards': {en:'Headboards',fr:'Têtes de lit'},
    'nightstands': {en:'Nightstands',fr:'Tables de nuit'}, 'dressers': {en:'Dressers',fr:'Commodes'},
    'chests': {en:'Chests',fr:'Coffres'}, 'mattresses': {en:'Mattresses',fr:'Matelas'},
    'youth': {en:'Youth',fr:'Jeunesse'}, 'desks': {en:'Desks',fr:'Bureaux'},
    'office-chairs': {en:'Chairs',fr:'Chaises'}, 'bookcases': {en:'Bookcases',fr:'Bibliothèques'},
    'lighting': {en:'Lighting',fr:'Luminaires'}, 'mirrors': {en:'Mirrors',fr:'Miroirs'},
    'wall-decor': {en:'Wall décor',fr:'Décor mural'}, 'vases': {en:'Vases',fr:'Vases'},
    'plants': {en:'Plants',fr:'Plantes'}, 'figurines': {en:'Figurines',fr:'Figurines'},
    'decor-objects': {en:'Objects',fr:'Objets'}, 'accent-furniture': {en:'Accent furniture',fr:'Meubles accent'},
    'fireplaces': {en:'Fireplaces',fr:'Foyers'}, 'hand-knotted': {en:'Hand-knotted',fr:'Noués main'},
    'machine-made': {en:'Machine-made',fr:'Mécaniques'}, 'banquettes': {en:'Banquettes',fr:'Banquettes'},
    'tables': {en:'Tables',fr:'Tables'}, 'storage': {en:'Storage',fr:'Rangement'},
    'showcase': {en:'Showcase',fr:'Vitrine'},
  };
  const subLabel = s => (SUB_LABEL[s] ? SUB_LABEL[s][L()] : s);

  const grid = $('#pgrid');
  const chipsWrap = $('.toolbar__chips');
  const count = $('#pcount');
  if (!grid) return;

  const params = new URLSearchParams(location.search);
  const top = TOP_LABEL[params.get('cat')] ? params.get('cat') : 'all';

  /* hero text */
  const t = $('.col-hero__title');
  const heroPair = () => { const p = TOP_LABEL[top][L()]; if (t) t.innerHTML = `<span>${p[0]}</span> <em>${p[1]}</em>`; };
  const sub = $('.col-hero__sub');
  const heroSub = () => { if (sub) sub.textContent = TOP_SUB[top][L()]; };
  const crumbLast = $('.crumb span');
  const heroCrumb = () => { if (crumbLast) crumbLast.textContent = TOP_LABEL[top][L()].join(' '); };
  heroPair(); heroSub(); heroCrumb();

  /* ---------- state ---------- */
  let index = null, items = [], view = [], shown = 0;
  const BATCH = 48;
  const state = { sub: params.get('sub') || 'all', brand: params.get('brand') || 'all',
                  price: 'all', sort: 'featured', q: '' };
  let customIds = new Set();

  /* ---------- filter bar (built once) ---------- */
  const meta = $('.toolbar__meta');
  function buildControls() {
    if ($('#fltBrand')) { syncControlLabels(); return; }
    meta.innerHTML = `
      <input type="search" id="fltSearch" class="bsearch" />
      <select id="fltBrand" class="fsel"></select>
      <select id="fltPrice" class="fsel"></select>
      <select id="fltSort" class="fsel"></select>
      <span class="toolbar__count"><i id="pcount">…</i>&nbsp;<span id="pcountLbl"></span></span>`;
    $('#fltSearch').addEventListener('input', e => { clearTimeout(window.__fd);
      window.__fd = setTimeout(() => { state.q = e.target.value; apply(); }, 200); });
    $('#fltBrand').addEventListener('change', e => { state.brand = e.target.value; apply(); });
    $('#fltPrice').addEventListener('change', e => { state.price = e.target.value; apply(); });
    $('#fltSort').addEventListener('change', e => { state.sort = e.target.value; apply(); });
    syncControlLabels();
  }
  function syncControlLabels() {
    $('#fltSearch').placeholder = T('Search…', 'Chercher…');
    $('#pcountLbl').textContent = T('pieces', 'pièces');
    const topInfo = index.tops.find(x => x.slug === top);
    const brands = topInfo ? topInfo.brands : {};
    const bOpts = [`<option value="all">${T('All brands', 'Toutes les marques')}</option>`]
      .concat(Object.entries(brands).map(([b, n]) =>
        `<option value="${b}"${state.brand === b ? ' selected' : ''}>${index.brands[b] || b} (${n})</option>`));
    $('#fltBrand').innerHTML = bOpts.join('');
    $('#fltPrice').innerHTML = `
      <option value="all"${state.price==='all'?' selected':''}>${T('Any price', 'Tout prix')}</option>
      <option value="priced"${state.price==='priced'?' selected':''}>${T('Displayed prices', 'Prix affichés')}</option>
      <option value="clearance"${state.price==='clearance'?' selected':''}>${T('Clearance', 'Liquidation')}</option>
      <option value="request"${state.price==='request'?' selected':''}>${T('On request', 'Sur demande')}</option>`;
    $('#fltSort').innerHTML = `
      <option value="featured"${state.sort==='featured'?' selected':''}>${T('Featured', 'En vedette')}</option>
      <option value="name"${state.sort==='name'?' selected':''}>${T('Name A–Z', 'Nom A–Z')}</option>
      <option value="price-asc"${state.sort==='price-asc'?' selected':''}>${T('Price ↑', 'Prix ↑')}</option>
      <option value="price-desc"${state.sort==='price-desc'?' selected':''}>${T('Price ↓', 'Prix ↓')}</option>`;
  }

  function buildChips() {
    if (top === 'all') {
      /* the flat 43-chip wall was overwhelming — the all view now offers
         the departments; subcategories live on each department page */
      const DEPT = { 'living-room': {en:'Living Room',fr:'Salon'}, 'dining-room': {en:'Dining',fr:'Salle à manger'},
        'bed-room': {en:'Bedroom',fr:'Chambre'}, 'carpets': {en:'Rugs',fr:'Tapis'}, 'decor': {en:'Décor',fr:'Décor'},
        'office': {en:'Office',fr:'Bureau'}, 'custom-studio': {en:'Custom Studio',fr:'Atelier'} };
      chipsWrap.innerHTML = `<span class="chip is-active">${T('Everything','Tout')}</span>` +
        index.tops.filter(ti => ti.slug !== 'all').map(ti =>
          `<a class="chip" href="collection.html?cat=${ti.slug}">${(DEPT[ti.slug]||{})[L()] || ti.slug} · ${ti.count.toLocaleString()}</a>`).join('');
      return;
    }
    const topInfo = index.tops.find(x => x.slug === top);
    const subs = topInfo ? topInfo.subs : {};
    chipsWrap.innerHTML =
      `<button class="chip${state.sub==='all' ? ' is-active' : ''}" data-f="all">${T('All','Tout')}</button>` +
      Object.entries(subs).map(([s, n]) =>
        `<button class="chip${state.sub===s ? ' is-active' : ''}" data-f="${s}">${subLabel(s)} · ${n}</button>`).join('');
    chipsWrap.querySelectorAll('.chip').forEach(ch => ch.addEventListener('click', () => {
      chipsWrap.querySelectorAll('.chip').forEach(c => c.classList.remove('is-active'));
      ch.classList.add('is-active');
      state.sub = ch.dataset.f;
      apply();
    }));
  }

  /* ---------- filtering ---------- */
  function apply() {
    const q = state.q.trim().toLowerCase();
    view = items.filter(it =>
      (state.sub === 'all' || it.sub === state.sub) &&
      (state.brand === 'all' || it.brand === state.brand) &&
      (state.price === 'all' ||
        (state.price === 'priced' && it.price) ||
        (state.price === 'clearance' && it.clearance) ||
        (state.price === 'request' && !it.price)) &&
      (!q || (it.name + ' ' + (it.sku || '')).toLowerCase().includes(q)));
    if (state.sort === 'featured') view.sort((a, b) =>
      ((b.brand === 'oasis') - (a.brand === 'oasis')) || ((!!b.price) - (!!a.price)));
    if (state.sort === 'name') view.sort((a, b) => a.name.localeCompare(b.name));
    if (state.sort === 'price-asc') view.sort((a, b) => (parseFloat(a.price ?? 1e9)) - (parseFloat(b.price ?? 1e9)));
    if (state.sort === 'price-desc') view.sort((a, b) => (parseFloat(b.price ?? -1)) - (parseFloat(a.price ?? -1)));
    /* featured = curated first, then priced rugs, then the rest (build order) */
    grid.innerHTML = '';
    shown = 0;
    $('#pcount').textContent = view.length.toLocaleString();
    renderMore();
  }

  const money = n => { n = parseFloat(n); return isNaN(n) ? '' : '$' + (n % 1 ? n.toFixed(2) : n.toLocaleString('en-CA')); };
  function cardHTML(it) {
    const isCustom = customIds.has(parseInt(it.id, 10));
    const brandName = index.brands[it.brand] || '';
    const tag = isCustom
      ? `<span class="pcard__tag pcard__tag--custom">${T('Custom made','Sur mesure')}</span>`
      : it.clearance ? `<span class="pcard__tag">${T('Clearance','Liquidation')}</span>`
      : it.sale ? `<span class="pcard__tag">${T('On promotion','Promotion')}</span>` : '';
    const price = it.price
      ? `${it.from ? (L() === 'fr' ? 'Dès ' : 'From ') : ''}${money(it.price)}${it.retail && parseFloat(it.retail) > parseFloat(it.price) ? ` <s>${money(it.retail)}</s>` : ''}`
      : T('On request', 'Sur demande');
    const srcset = it.hi ? ` srcset="${it.img} 1x, ${it.hi} 2x"` : '';
    const inner = `
      <div class="pcard__media"><img src="${it.img}"${srcset} alt="${it.name}" loading="lazy" decoding="async" width="480" height="480">${tag}</div>
      <div class="pcard__info"><div><h3>${it.name}</h3><span class="pcard__sku">${it.sku ? 'SKU ' + it.sku : (it.ref ? (L()==='fr'?'Réf ':'Ref ') + it.ref : '')}</span><span>${it.brand === 'oasis' ? subLabel(it.sub) : brandName}</span></div>
      <p>${price}</p></div>`;
    return it.link
      ? `<a class="pcard" href="${it.link}">${inner}</a>`
      : `<a class="pcard pcard--ask" href="#" data-name="${it.name.replace(/"/g,'&quot;')}" data-brand="${brandName}">${inner}</a>`;
  }

  function renderMore() {
    const next = view.slice(shown, shown + BATCH);
    grid.insertAdjacentHTML('beforeend', next.map(cardHTML).join(''));
    shown += next.length;
    [...grid.children].slice(-next.length).forEach((el, i) => {
      el.classList.add('reveal');
      setTimeout(() => el.classList.add('in'), 30 + (i % 12) * 45);
    });
    sentinel.style.display = shown < view.length ? '' : 'none';
  }

  /* sentinel for auto-load */
  const sentinel = document.createElement('div');
  sentinel.className = 'grid-sentinel';
  grid.after(sentinel);
  new IntersectionObserver(es => { if (es[0].isIntersecting && shown < view.length) renderMore(); },
    { rootMargin: '1000px' }).observe(sentinel);

  /* supplier cards → enquiry modal with context */
  grid.addEventListener('click', e => {
    const a = e.target.closest('.pcard--ask');
    if (!a) return;
    e.preventDefault();
    let ghost = $('#catGhostTitle');
    if (!ghost) {
      ghost = document.createElement('span');
      ghost.id = 'catGhostTitle'; ghost.className = 'pdp-title'; ghost.style.display = 'none';
      document.body.appendChild(ghost);
    }
    ghost.textContent = `${a.dataset.name} (${a.dataset.brand})`;
    window.OasisLead?.open('quote');
  });

  /* ---------- load ---------- */
  const files = top === 'all'
    ? ['living-room','dining-room','bed-room','office','decor','carpets','custom-studio']
    : [top];
  Promise.all([
    fetch('data/cat/index.json' + V).then(r => r.json()),
    fetch('data/custom.json' + V).then(r => r.json()).catch(() => null),
    ...files.map(f => fetch(`data/cat/${f}.json` + V).then(r => r.json()).catch(() => ({items:[]}))),
  ]).then(([idx, custom, ...cats]) => {
    index = idx;
    if (top === 'all') {
      /* synthesize an aggregate index entry for chips/brands */
      const subs = {}, brands = {};
      idx.tops.forEach(ti => {
        Object.entries(ti.subs).forEach(([k, v]) => subs[k] = (subs[k] || 0) + v);
        Object.entries(ti.brands).forEach(([k, v]) => brands[k] = (brands[k] || 0) + v);
      });
      index.tops.push({ slug: 'all', subs, brands });
    }
    if (custom) customIds = new Set(Object.keys(custom.products).map(Number));
    items = cats.flatMap(c => c.items || []);
    buildChips();
    buildControls();
    apply();
  });

  $('#langToggle')?.addEventListener('click', () => setTimeout(() => {
    heroPair(); heroSub(); heroCrumb(); buildChips(); syncControlLabels(); apply();
  }, 10));
})();
