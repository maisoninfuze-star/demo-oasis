/* ===========================================================
   Collection page — driven by data/catalog.json (real store data)
   URL: collection.html?cat=<slug>  (living-room | dining-room |
        bed-room | carpets | ... or omit for everything)
   =========================================================== */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const lang = () => document.body.dataset.lang || 'en';

  const SECTIONS = {
    'living-room': {
      en: ['Living', 'Room'], fr: ['Le', 'Salon'],
      subEn: 'Sofas, sectionals and armchairs built on solid hardwood — upholstered in velvet, leather and performance fabric.',
      subFr: 'Canapés, sectionnels et fauteuils sur bois massif — velours, cuir et tissus performants.',
      kids: ['stationary', 'sectional', 'chair-chaise', 'sofa-bed', 'motion-seating', 'ottomans']
    },
    'dining-room': {
      en: ['Dining', 'Room'], fr: ['Salle à', 'manger'],
      subEn: 'Tables and seating made to host — solid woods, marble and brass, built for years of long dinners.',
      subFr: 'Tables et chaises faites pour recevoir — bois massifs, marbre et laiton.',
      kids: []
    },
    'bed-room': {
      en: ['Bed', 'Room'], fr: ['La', 'Chambre'],
      subEn: 'Bedroom sets and mattresses composed for rest — upholstered headboards, solid frames, quiet luxury.',
      subFr: 'Ensembles de chambre et matelas pensés pour le repos.',
      kids: ['bed-room-sets', 'mattresses']
    },
    'carpets': {
      en: ['The', 'Rugs'], fr: ['Les', 'Tapis'],
      subEn: 'Hand-knotted and machine-made carpets — wool, silk and natural dyes, chosen to ground a room.',
      subFr: 'Tapis noués main et mécaniques — laine, soie et teintures naturelles.',
      kids: ['hand-made-carpets', 'machine-made']
    },
    'all': {
      en: ['The', 'Collection'], fr: ['La', 'Collection'],
      subEn: 'Every piece on the floor at Galerie Oasis — furniture, rugs and décor, chosen piece by piece.',
      subFr: 'Toutes les pièces en salle chez Galerie Oasis — mobilier, tapis et décor.',
      kids: ['living-room', 'dining-room', 'bed-room', 'carpets']
    }
  };
  const CHIP_LABELS = {
    'all': { en: 'All', fr: 'Tout' },
    'stationary': { en: 'Sofas', fr: 'Canapés' },
    'sectional': { en: 'Sectionals', fr: 'Sectionnels' },
    'chair-chaise': { en: 'Chairs & chaises', fr: 'Fauteuils' },
    'sofa-bed': { en: 'Sofa beds', fr: 'Canapés-lits' },
    'motion-seating': { en: 'Motion', fr: 'Inclinables' },
    'ottomans': { en: 'Ottomans', fr: 'Poufs' },
    'bed-room-sets': { en: 'Bedroom sets', fr: 'Ensembles' },
    'mattresses': { en: 'Mattresses', fr: 'Matelas' },
    'hand-made-carpets': { en: 'Hand-made', fr: 'Noués main' },
    'machine-made': { en: 'Machine-made', fr: 'Mécaniques' },
    'living-room': { en: 'Living room', fr: 'Salon' },
    'dining-room': { en: 'Dining', fr: 'Salle à manger' },
    'bed-room': { en: 'Bedroom', fr: 'Chambre' },
    'carpets': { en: 'Rugs', fr: 'Tapis' }
  };
  const TYPE_LABEL = {
    'stationary': { en: 'Sofa', fr: 'Canapé' },
    'sectional': { en: 'Sectional', fr: 'Sectionnel' },
    'chair-chaise': { en: 'Armchair', fr: 'Fauteuil' },
    'sofa-bed': { en: 'Sofa bed', fr: 'Canapé-lit' },
    'motion-seating': { en: 'Motion seating', fr: 'Inclinable' },
    'ottomans': { en: 'Ottoman', fr: 'Pouf' },
    'bed-room-sets': { en: 'Bedroom set', fr: 'Ensemble chambre' },
    'bed-room': { en: 'Bedroom', fr: 'Chambre' },
    'mattresses': { en: 'Mattress', fr: 'Matelas' },
    'hand-made-carpets': { en: 'Hand-made rug', fr: 'Tapis noué main' },
    'machine-made': { en: 'Machine-made rug', fr: 'Tapis mécanique' },
    'carpets': { en: 'Rug', fr: 'Tapis' },
    'dining-room': { en: 'Dining', fr: 'Salle à manger' },
    'living-room': { en: 'Living room', fr: 'Salon' }
  };
  const typeOf = p => {
    const pref = ['stationary','sectional','chair-chaise','sofa-bed','motion-seating','ottomans',
                  'bed-room-sets','mattresses','hand-made-carpets','machine-made',
                  'dining-room','bed-room','carpets','living-room'];
    for (const k of pref) if (p.cats.includes(k)) return k;
    return p.cats[0] || 'living-room';
  };

  const params = new URLSearchParams(location.search);
  const cat = SECTIONS[params.get('cat')] ? params.get('cat') : 'all';
  const conf = SECTIONS[cat];

  /* hero text */
  const t = $('.col-hero__title');
  if (t) {
    const pair = conf[lang()] || conf.en;
    t.innerHTML = `<span>${pair[0]}</span> <em>${pair[1]}</em>`;
  }
  const sub = $('.col-hero__sub');
  if (sub) sub.textContent = lang() === 'fr' ? conf.subFr : conf.subEn;
  const crumbLast = $('.crumb span');
  if (crumbLast) crumbLast.textContent = (CHIP_LABELS[cat] || CHIP_LABELS.all)[lang()];

  /* chips */
  const chipsWrap = $('.toolbar__chips');
  const grid = $('#pgrid');
  const count = $('#pcount');
  let catalog = [];
  let active = 'all';

  function chipHTML(slug) {
    const l = CHIP_LABELS[slug] || { en: slug, fr: slug };
    return `<button class="chip${slug === 'all' ? ' is-active' : ''}" data-filter="${slug}">${l[lang()]}</button>`;
  }
  function buildChips() {
    if (!chipsWrap) return;
    chipsWrap.innerHTML = chipHTML('all') + conf.kids.map(chipHTML).join('');
    chipsWrap.querySelectorAll('.chip').forEach(ch => ch.addEventListener('click', () => {
      chipsWrap.querySelectorAll('.chip').forEach(c => c.classList.remove('is-active'));
      ch.classList.add('is-active');
      active = ch.dataset.filter;
      render();
    }));
  }

  function inCat(p, slug) {
    if (slug === 'all') return cat === 'all' ? true : p.cats.includes(cat);
    return p.cats.includes(slug);
  }

  function cardHTML(p) {
    const tl = TYPE_LABEL[typeOf(p)] || TYPE_LABEL['living-room'];
    const img = p.img ? `<img src="${p.img}" alt="${p.short || p.name}" loading="lazy" />` : '';
    const sale = p.sale ? `<span class="pcard__tag">${lang() === 'fr' ? 'Promotion' : 'On promotion'}</span>` : '';
    return `<a class="pcard" href="product.html?id=${p.id}">
      <div class="pcard__media">${img}${sale}</div>
      <div class="pcard__info"><div><h3>${p.short || p.name}</h3><span>${tl[lang()]}</span></div>
      <p>${lang() === 'fr' ? 'Sur demande' : 'On request'}</p></div></a>`;
  }

  function render() {
    if (!grid) return;
    const items = catalog.filter(p => inCat(p, active) && p.img);
    grid.innerHTML = items.map(cardHTML).join('');
    if (count) count.textContent = items.length;
    /* stagger-in without depending on the scroll observer */
    [...grid.children].forEach((el, i) => {
      el.classList.add('reveal');
      setTimeout(() => el.classList.add('in'), 40 + (i % 12) * 55);
    });
    if (window.ScrollTrigger) ScrollTrigger.refresh();
  }

  fetch('data/catalog.json')
    .then(r => r.json())
    .then(data => { catalog = data; buildChips(); render(); })
    .catch(() => { /* leave static fallback grid */ });

  /* re-render labels on language switch */
  $('#langToggle')?.addEventListener('click', () => setTimeout(() => {
    const pair = conf[lang()] || conf.en;
    if (t) t.innerHTML = `<span>${pair[0]}</span> <em>${pair[1]}</em>`;
    if (sub) sub.textContent = lang() === 'fr' ? conf.subFr : conf.subEn;
    if (crumbLast) crumbLast.textContent = (CHIP_LABELS[cat] || CHIP_LABELS.all)[lang()];
    buildChips(); render();
  }, 0));
})();
