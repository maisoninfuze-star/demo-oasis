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
  const chipsWrap = $('#filtersBody');
  const count = $('#pcount');
  if (!grid) return;

  const params = new URLSearchParams(location.search);
  /* A generated department page declares itself on <body data-cat>. The
     ?cat= query string still works so old links and the sitemap keep resolving. */
  const declared = document.body.dataset.cat || params.get('cat');
  const top = TOP_LABEL[declared] ? declared : 'all';

  /* hero text — "On request" is its own destination, so it gets its own hero;
     otherwise the department decides. Priced items are NOT a category: they
     live in their real department alongside everything else. */
  const t = $('.col-hero__title');
  const REQUEST_HERO = { en: ['On', 'Request'], fr: ['Sur', 'demande'] };
  const REQUEST_SUB = {
    en: 'Pieces we price for you the same day — tell us the model and we confirm your price, fabric and lead time.',
    fr: 'Des pièces dont nous confirmons le prix le jour même — dites-nous le modèle et nous confirmons prix, tissu et délai.'
  };
  const isRequest = () => state.price === 'request';
  const heroPair = () => {
    const p = isRequest() ? REQUEST_HERO[L()] : TOP_LABEL[top][L()];
    if (t) t.innerHTML = `<span>${p[0]}</span> <em>${p[1]}</em>`;
  };
  const sub = $('.col-hero__sub');
  const heroSub = () => { if (sub) sub.textContent = isRequest() ? REQUEST_SUB[L()] : TOP_SUB[top][L()]; };
  const crumbLast = $('.crumb span');
  const heroCrumb = () => {
    if (crumbLast) crumbLast.textContent = isRequest() ? REQUEST_HERO[L()].join(' ') : TOP_LABEL[top][L()].join(' ');
  };

  /* ---------- state ---------- */
  let index = null, items = [], view = [], shown = 0;
  const BATCH = 48;
  const state = { sub: params.get('sub') || 'all', brand: params.get('brand') || 'all',
                  price: ['priced','request','clearance'].includes(params.get('price')) ? params.get('price') : 'all',
                  sort: 'featured', q: '', band: 'all' };
  let customIds = new Set();
  heroPair(); heroSub(); heroCrumb();

  /* ---------- filter rail, shop-by tiles, results bar ---------- */
  const PRICE_OPTS = [
    ['all', 'Everything', 'Tout'],
    ['priced', 'Ready to order', 'Prêt à commander'],
    ['clearance', 'Clearance', 'Liquidation'],
    ['request', 'Made to order', 'Sur mesure'],
  ];
  const SORT_OPTS = [
    ['featured', 'Featured', 'En vedette'],
    ['price-asc', 'Price: low to high', 'Prix : croissant'],
    ['price-desc', 'Price: high to low', 'Prix : décroissant'],
    ['name', 'Name A–Z', 'Nom A–Z'],
  ];

  function buildControls() { buildChips(); }
  function syncControlLabels() { buildChips(); }

  /* Counts always describe what the grid will actually render, so a filter
     never promises results it won't show. */
  function visibleUnder(pred) {
    return items.filter(it =>
      (state.price === 'request' ? !it.price
        : state.price === 'clearance' ? !!it.clearance
        : top === 'custom-studio' ? true : !!it.price) && pred(it)).length;
  }

  function buildChips() {
    if (!chipsWrap) return;
    const fr = L() === 'fr';
    const parts = [];

    /* search first: the fastest path when they know the piece */
    parts.push(`<div class="fgroup">
      <input type="search" id="fltSearch" class="fsearch"
        placeholder="${T('Search name or SKU…', 'Nom ou SKU…')}" value="${state.q.replace(/"/g, '&quot;')}">
    </div>`);

    /* category: departments at the all view, pieces inside a department */
    if (top === 'all') {
      const DEPT = { 'living-room': ['Living Room','Salon'], 'dining-room': ['Dining','Salle à manger'],
        'bed-room': ['Bedroom','Chambre'], 'carpets': ['Rugs','Tapis'], 'decor': ['Décor','Décor'],
        'office': ['Office','Bureau'], 'custom-studio': ['Custom Studio','Atelier'] };
      parts.push(`<div class="fgroup"><p class="fgroup__t">${T('Department','Département')}</p>` +
        index.tops.filter(t2 => t2.slug !== 'all').map(t2 =>
          `<a class="fopt" href="collection.html?cat=${t2.slug}">${(DEPT[t2.slug]||[t2.slug])[fr?1:0]}<i>${t2.count.toLocaleString()}</i></a>`
        ).join('') + '</div>');
    } else {
      const subs = {};
      items.forEach(it => {
        if (state.price === 'request' ? !it.price
            : state.price === 'clearance' ? !!it.clearance
            : top === 'custom-studio' ? true : !!it.price) {
          subs[it.sub] = (subs[it.sub] || 0) + 1;
        }
      });
      const ordered = Object.entries(subs).sort((a, b) => b[1] - a[1]);
      const total = ordered.reduce((n, [, v]) => n + v, 0);
      parts.push(`<div class="fgroup"><p class="fgroup__t">${T('Type','Type')}</p>` +
        `<button class="fopt${state.sub==='all'?' is-on':''}" data-f="all">${T('All','Tout')}<i>${total.toLocaleString()}</i></button>` +
        ordered.map(([sub, n]) =>
          `<button class="fopt${state.sub===sub?' is-on':''}" data-f="${sub}">${subLabel(sub)}<i>${n.toLocaleString()}</i></button>`
        ).join('') + '</div>');
    }

    /* availability */
    parts.push(`<div class="fgroup"><p class="fgroup__t">${T('Availability','Disponibilité')}</p>` +
      PRICE_OPTS.map(([v, en, frl]) =>
        `<button class="fopt${state.price===v?' is-on':''}" data-p="${v}">${fr?frl:en}</button>`
      ).join('') + '</div>');

    /* budget: real thresholds, counted against what is showing */
    const BANDS = [['all', T('Any budget','Tout budget'), () => true],
      ['u500', T('Under $500','Moins de 500 $'), it => it.price && +it.price < 500],
      ['500-1500', '$500 – $1,500', it => it.price && +it.price >= 500 && +it.price < 1500],
      ['1500-3000', '$1,500 – $3,000', it => it.price && +it.price >= 1500 && +it.price < 3000],
      ['o3000', T('$3,000 +','3 000 $ et plus'), it => it.price && +it.price >= 3000]];
    if (state.price !== 'request') {
      parts.push(`<div class="fgroup"><p class="fgroup__t">${T('Budget','Budget')}</p>` +
        BANDS.map(([v, label, pred]) => {
          const n = v === 'all' ? null : visibleUnder(pred);
          if (n === 0) return '';
          return `<button class="fopt${state.band===v?' is-on':''}" data-b="${v}">${label}${n!==null?`<i>${n.toLocaleString()}</i>`:''}</button>`;
        }).join('') + '</div>');
    }

    chipsWrap.innerHTML = parts.join('');

    chipsWrap.querySelectorAll('[data-f]').forEach(b => b.addEventListener('click', () => {
      state.sub = b.dataset.f; apply(); buildChips(); closeFilters();
    }));
    chipsWrap.querySelectorAll('[data-p]').forEach(b => b.addEventListener('click', () => {
      state.price = b.dataset.p; state.sub = 'all';
      heroPair(); heroSub(); heroCrumb(); apply(); buildChips(); buildShopBy(); closeFilters();
    }));
    chipsWrap.querySelectorAll('[data-b]').forEach(b => b.addEventListener('click', () => {
      state.band = b.dataset.b; apply(); buildChips(); closeFilters();
    }));
    const sf = $('#fltSearch');
    if (sf) sf.addEventListener('input', e => {
      clearTimeout(window.__fd);
      window.__fd = setTimeout(() => { state.q = e.target.value; apply(); }, 200);
    });
  }

  /* Shop-by tiles: a department opens with its rooms, the way a shopper thinks,
     instead of dropping them into an undifferentiated wall of results. */
  function buildShopBy() {
    const el = $('#shopby');
    if (!el) return;
    const showTiles = top !== 'all' && state.sub === 'all' && state.price !== 'request' && !state.q;
    if (!showTiles) { el.hidden = true; el.innerHTML = ''; return; }
    const groups = {};
    items.forEach(it => {
      if (!it.price && top !== 'custom-studio') return;
      (groups[it.sub] = groups[it.sub] || []).push(it);
    });
    const ordered = Object.entries(groups).sort((a, b) => b[1].length - a[1].length).slice(0, 8);
    if (ordered.length < 2) { el.hidden = true; el.innerHTML = ''; return; }
    el.innerHTML = ordered.map(([sub, list]) => {
      const pic = list.find(x => x.img);
      return `<a class="shopby__tile" href="#" data-tile="${sub}">
        ${pic ? `<img src="${pic.img}" alt="" loading="lazy">` : ''}
        <b>${subLabel(sub)}</b><span>${list.length.toLocaleString()} ${T('pieces','pièces')}</span></a>`;
    }).join('');
    el.hidden = false;
    el.querySelectorAll('[data-tile]').forEach(a => a.addEventListener('click', e => {
      e.preventDefault();
      state.sub = a.dataset.tile;
      apply(); buildChips(); buildShopBy();
      $('.results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }));
  }

  function buildResultsBar() {
    const bar = $('#resultsBar');
    if (!bar) return;
    const fr = L() === 'fr';
    bar.innerHTML = `
      <p class="results__n"><b id="pcount">…</b> <span id="pcountLbl">${T('pieces','pièces')}</span></p>
      <label class="results__sort">${T('Sort','Trier')}
        <select id="fltSort">${SORT_OPTS.map(([v, en, frl]) =>
          `<option value="${v}"${state.sort===v?' selected':''}>${fr?frl:en}</option>`).join('')}</select>
      </label>`;
    $('#fltSort').addEventListener('change', e => { state.sort = e.target.value; apply(); });
  }

  function closeFilters() {
    if (innerWidth <= 1000) $('#filters')?.classList.remove('open');
  }
  $('#filtersToggle')?.addEventListener('click', e => {
    const f = $('#filters');
    const open = f.classList.toggle('open');
    e.currentTarget.setAttribute('aria-expanded', String(open));
  });
  $('#filtersClear')?.addEventListener('click', () => {
    state.sub = 'all'; state.band = 'all'; state.q = '';
    state.price = new URLSearchParams(location.search).get('price') === 'request' ? 'request' : 'all';
    apply(); buildChips(); buildShopBy(); closeFilters();
  });

  /* ---------- filtering ---------- */
  function apply() {
    const q = state.q.trim().toLowerCase();
    view = items.filter(it =>
      (state.sub === 'all' || it.sub === state.sub) &&
      (state.brand === 'all' || it.brand === state.brand) &&
      /* An unpriced item belongs in exactly one place: the On Request page.
         Scattering them through the departments made the catalogue look
         half-finished. Custom Studio is exempt — it is made-to-order, so
         "on request" IS its price. */
      (state.price === 'request' ? !it.price
        : state.price === 'clearance' ? !!it.clearance
        : top === 'custom-studio' ? true
        : !!it.price) &&
      (state.band === 'all' || !state.band ||
        (state.band === 'u500' && it.price && +it.price < 500) ||
        (state.band === '500-1500' && it.price && +it.price >= 500 && +it.price < 1500) ||
        (state.band === '1500-3000' && it.price && +it.price >= 1500 && +it.price < 3000) ||
        (state.band === 'o3000' && it.price && +it.price >= 3000)) &&
      (!q || (it.name + ' ' + (it.sku || '')).toLowerCase().includes(q)));
    if (state.sort === 'featured') view.sort((a, b) =>
      ((b.brand === 'oasis') - (a.brand === 'oasis')) || ((!!b.price) - (!!a.price)));
    if (state.sort === 'name') view.sort((a, b) => a.name.localeCompare(b.name));
    if (state.sort === 'price-asc') view.sort((a, b) => (parseFloat(a.price ?? 1e9)) - (parseFloat(b.price ?? 1e9)));
    if (state.sort === 'price-desc') view.sort((a, b) => (parseFloat(b.price ?? -1)) - (parseFloat(a.price ?? -1)));
    /* Two sections when no price filter is active: live prices first,
       then price-on-request — each with a full-width header row. */
    /* Department view leads with complete sets, then individual pieces —
       a shopper furnishing a room wants the set; someone replacing one piece
       wants the rest. Both are one scroll apart. */
    const SETSUB = { 'bed-room': 'bedroom-sets', 'dining-room': 'dining-sets', 'living-room': 'living-sets' }[top];
    if (SETSUB && state.sub === 'all' && state.price === 'all' && !state.q) {
      const sets = view.filter(it => it.sub === SETSUB);
      const rest = view.filter(it => it.sub !== SETSUB);
      if (sets.length && rest.length) {
        view = [
          { _hdr: true, kind: 'sets', n: sets.length }, ...sets,
          { _hdr: true, kind: 'pieces', n: rest.length }, ...rest
        ];
        grid.innerHTML = ''; shown = 0;
        $('#pcount').textContent = (sets.length + rest.length).toLocaleString();
        renderMore();
        return;
      }
    }
    grid.innerHTML = '';
    shown = 0;
    $('#pcount').textContent = view.filter(it => !it._hdr).length.toLocaleString();
    renderMore();
  }

  function headerHTML(h) {
    const fr = L() === 'fr';
    if (h.kind === 'sets' || h.kind === 'pieces') {
      const t = h.kind === 'sets'
        ? (fr ? 'Ensembles complets' : 'Complete sets')
        : (fr ? 'Pièces individuelles' : 'Individual pieces');
      const sb = h.kind === 'sets'
        ? (fr ? 'Tout ce qu’il faut pour la pièce, en un seul achat.'
              : 'Everything for the room, bought once.')
        : (fr ? 'Lits, commodes, tables de nuit et coffres — vendus séparément.'
              : 'Beds, dressers, nightstands and chests — sold individually.');
      return `<div class="grid-sec"><h3>${t} · ${h.n.toLocaleString()}</h3><p>${sb}</p></div>`;
    }
    return '';
  }

  const money = n => { n = parseFloat(n); return isNaN(n) ? '' : '$' + (n % 1 ? n.toFixed(2) : n.toLocaleString('en-CA')); };
  function cardHTML(it) {
    const isCustom = customIds.has(parseInt(it.id, 10));
    /* Supplier names stay off the storefront — printing "Monarch Specialties"
       on a card tells the customer exactly who to buy from instead of us. */
    const brandName = '';
    const tag = isCustom
      ? `<span class="pcard__tag pcard__tag--custom">${T('Custom made','Sur mesure')}</span>`
      : it.clearance ? `<span class="pcard__tag">${T('Clearance','Liquidation')}</span>`
      : it.sale ? `<span class="pcard__tag">${T('On promotion','Promotion')}</span>` : '';
    const price = it.price
      ? `${money(it.price)}${it.retail && parseFloat(it.retail) > parseFloat(it.price) ? ` <s>${money(it.retail)}</s>` : ''}`
      : T('On request', 'Sur demande');
    const srcset = it.hi ? ` srcset="${it.img} 1x, ${it.hi} 2x"` : '';
    const inner = `
      <div class="pcard__media"><img src="${it.img}"${srcset} alt="${it.name}" loading="lazy" decoding="async" width="480" height="480">${tag}</div>
      <div class="pcard__info"><div><h3>${it.name}</h3><span class="pcard__sku">${it.sku ? 'SKU ' + it.sku : (it.ref ? (L()==='fr'?'Réf ':'Ref ') + it.ref : '')}</span><span>${subLabel(it.sub)}</span></div>
      <p>${price}</p>${it.price ? `<button class="pcard__add" data-id="${it.id}" data-name="${it.name.replace(/"/g,'&quot;')}" data-sku="${it.sku || ''}" data-brand="${subLabel(it.sub)}" data-price="${it.price}" data-from="${it.from ? 1 : 0}" data-img="${it.img}">${L() === 'fr' ? 'Ajouter' : 'Add to order'}</button>` : ''}</div>`;
    // Curated items link to their detail page. A PRICED supplier item is a
    // buy card — never a request card — so its body must not open the enquiry
    // modal; only its "Add to order" button acts. Unpriced items stay "ask".
    return it.link
      ? `<a class="pcard" href="${it.link}">${inner}</a>`
      : it.price
      ? `<a class="pcard pcard--buy" href="product.html?id=${encodeURIComponent(it.id)}">${inner}</a>`
      : `<a class="pcard pcard--ask" href="#" data-name="${it.name.replace(/"/g,'&quot;')}" data-brand="${subLabel(it.sub)}">${inner}</a>`;
  }

  function renderMore() {
    const next = view.slice(shown, shown + BATCH);
    grid.insertAdjacentHTML('beforeend', next.map(it => it._hdr ? headerHTML(it) : cardHTML(it)).join(''));
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
    if (e.target.closest('.pcard__add')) return;  // Add-to-order wins, no enquiry modal
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
    buildResultsBar();
    buildChips();
    buildShopBy();
    apply();
  });

  $('#langToggle')?.addEventListener('click', () => setTimeout(() => {
    heroPair(); heroSub(); heroCrumb(); buildResultsBar(); buildChips(); buildShopBy(); apply();
  }, 10));
})();
