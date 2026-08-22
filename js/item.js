/* ===========================================================
   Item page for catalogue pieces.

   Curated products are handled by custom.js (fabric programme, swatches).
   Everything else — the 4,631 priced supplier pieces — lands here: real photo,
   specifications parsed out of the supplier description, price, delivery terms
   and an order button. A shopper clicking a product expects a page, not a
   popup.
   =========================================================== */
(() => {
  const V = '?v=' + ((window.OASIS_CONFIG || {}).dataVersion || '1');
  const CFG = window.OASIS_CONFIG || {};
  const $ = (s, c = document) => c.querySelector(s);
  const L = () => (document.body.dataset.lang === 'fr' ? 'fr' : 'en');
  const T = (en, fr) => (L() === 'fr' ? fr : en);
  /* Same rule as the cards and the cart: a price with cents shows both digits.
     Plain toLocaleString rendered 503.70 as "$503.7". */
  const money = n => { n = parseFloat(n); return isNaN(n) ? '' : '$' + (n % 1 ? n.toFixed(2) : n.toLocaleString('en-CA')); };

  const id = new URLSearchParams(location.search).get('id');
  const host = $('#itemPage');
  if (!host) return;
  /* Landing on product.html with no id used to leave a blank page under the
     header. Send the shopper somewhere useful instead. */
  if (!id) {
    host.innerHTML = `<p class="item__missing">${T(
      'Choose a piece from the collection to see its details.',
      'Choisissez une pièce dans la collection pour voir ses détails.')}
      <a class="btn btn--gold" href="collection.html">${T('Browse the collection','Parcourir la collection')}</a></p>`;
    return;
  }

  const SUB = {
    sofas: ['Sofas', 'Canapés'], sectionals: ['Sectionals', 'Sectionnels'], loveseats: ['Loveseats', 'Causeuses'],
    chairs: ['Chairs', 'Fauteuils'], chaises: ['Chaises', 'Chaises longues'], ottomans: ['Ottomans', 'Poufs'],
    'coffee-tables': ['Coffee tables', 'Tables à café'], 'end-tables': ['End tables', 'Tables d’appoint'],
    'accent-tables': ['Accent tables', 'Tables accent'], 'tv-media': ['TV & media', 'Télé et média'],
    'dining-sets': ['Dining sets', 'Ensembles'], 'dining-tables': ['Dining tables', 'Tables'],
    'dining-chairs': ['Dining chairs', 'Chaises'], buffets: ['Buffets', 'Buffets'],
    beds: ['Beds', 'Lits'], 'bedroom-sets': ['Bedroom sets', 'Ensembles'], nightstands: ['Nightstands', 'Tables de nuit'],
    dressers: ['Dressers', 'Commodes'], chests: ['Chests', 'Coffres'], mirrors: ['Mirrors', 'Miroirs'],
    headboards: ['Headboards', 'Têtes de lit'], mattresses: ['Mattresses', 'Matelas'], youth: ['Youth', 'Jeunesse'],
    desks: ['Desks', 'Bureaux'], bookcases: ['Bookcases', 'Bibliothèques'], lighting: ['Lighting', 'Luminaires'],
    'hand-knotted': ['Hand-knotted rugs', 'Tapis noués main'], 'machine-made': ['Machine-made rugs', 'Tapis mécaniques'],
  };
  const subLabel = s => (SUB[s] ? SUB[s][L() === 'fr' ? 1 : 0] : String(s || '').replace(/-/g, ' '));

  /* Supplier descriptions are terse spec strings:
     'ACCENT CHAIR - 31"H / SILVER FABRIC'  ->  Height 31", Material Silver fabric
     'DINING TABLE - 36"X 60" / GREY'       ->  Size 36" x 60", Finish Grey       */
  function specs(it) {
    const out = [];
    const desc = String(it.desc || '');
    const tail = desc.includes('-') ? desc.split('-').slice(1).join('-') : '';
    const size = desc.match(/(\d+(?:\.\d+)?)"\s*[xX]\s*(\d+(?:\.\d+)?)"/);
    const height = desc.match(/(\d+(?:\.\d+)?)"\s*H/i);
    const dia = desc.match(/(\d+(?:\.\d+)?)"\s*DIA/i);
    const len = desc.match(/(\d+(?:\.\d+)?)"\s*L/i);
    if (size) out.push([T('Size', 'Dimensions'), `${size[1]}" × ${size[2]}"`]);
    if (dia) out.push([T('Diameter', 'Diamètre'), `${dia[1]}"`]);
    if (height) out.push([T('Height', 'Hauteur'), `${height[1]}"`]);
    if (len && !size) out.push([T('Length', 'Longueur'), `${len[1]}"`]);
    const mat = tail.split('/').map(s => s.trim())
      .filter(s => s && !/^\d|"|CTN|PCS?$/i.test(s));
    if (mat.length) out.push([T('Finish / material', 'Fini / matériau'), mat.join(', ').toLowerCase()
      .replace(/\b\w/g, m => m.toUpperCase())]);
    if (it.sku) out.push([T('Model', 'Modèle'), it.sku]);
    out.push([T('Category', 'Catégorie'), subLabel(it.sub)]);
    return out;
  }

  function render(it) {
    const fr = L() === 'fr';
    const d = CFG.delivery || {};
    const rows = specs(it).map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
    const gallery = [it.hi || it.img].concat(it.gallery || []).filter(Boolean).slice(0, 4);

    host.innerHTML = `
      <nav class="crumb item__crumb">
        <a href="index.html">${T('Home', 'Accueil')}</a> /
        <a href="collection.html">${T('Collections', 'Collections')}</a> /
        <a href="${TOPFILE[it._top] || 'collection.html'}">${it._topLabel}</a> /
        <span>${it.name}</span>
      </nav>
      <div class="item">
        <div class="item__media">
          <img id="itemHero" src="${gallery[0] || it.img}" alt="${it.name}">
          ${gallery.length > 1 ? `<div class="item__thumbs">${gallery.map((g, i) =>
            `<button class="item__thumb${i === 0 ? ' is-on' : ''}" data-src="${g}"><img src="${g}" alt=""></button>`
          ).join('')}</div>` : ''}
        </div>
        <div class="item__info">
          <p class="item__cat">${subLabel(it.sub)}</p>
          <h1>${it.name}</h1>
          ${it.sku ? `<p class="item__sku">${T('Model', 'Modèle')} ${it.sku}</p>` : ''}
          ${it.price ? `<p class="item__price">${money(it.price)}</p>` : `
            <p class="item__price item__price--ask">${T('Price on request', 'Prix sur demande')}</p>`}

          ${it.price ? `
          <button class="btn btn--gold pcard__add item__add" data-id="${it.id}"
            data-name="${it.name.replace(/"/g, '&quot;')}" data-sku="${it.sku || ''}"
            data-brand="${subLabel(it.sub)}" data-price="${it.price}" data-from="0"
            data-img="${it.img}">${T('Add to order', 'Ajouter à la commande')}</button>` : `
          <button class="btn btn--gold item__askbtn">${T('Request a price', 'Demander un prix')}</button>`}

          <dl class="item__specs">${rows}</dl>

          <div class="item__terms">
            <p><b>${T('Delivery', 'Livraison')}</b> ${T(
              `$${d.fee || 99} within about 20 km of the showroom, $199 North and South Shore. Free over $${d.freeOver || 500}.`,
              `${d.fee || 99} $ dans un rayon d’environ 20 km, 199 $ Rive-Nord et Rive-Sud. Gratuite au-delà de ${d.freeOver || 500} $.`)}</p>
            <p><b>${T('Lead time', 'Délai')}</b> ${(d.leadTime || {})[L()] || ''}</p>
            <p><b>${T('White glove', 'Service gantée')}</b> ${T(
              'Carried in, placed in your room, assembled, packaging taken away.',
              'Monté chez vous, placé dans la pièce, assemblé, emballage retiré.')}</p>
            <p><b>${T('See it in person', 'Voir en personne')}</b> ${CFG.storeAddress || ''}</p>
          </div>
        </div>
      </div>`;

    host.querySelectorAll('.item__thumb').forEach(b => b.addEventListener('click', () => {
      host.querySelectorAll('.item__thumb').forEach(x => x.classList.remove('is-on'));
      b.classList.add('is-on');
      $('#itemHero').src = b.dataset.src;
    }));
    host.querySelector('.item__askbtn')?.addEventListener('click', () => {
      let g = $('#catGhostTitle');
      if (!g) { g = document.createElement('span'); g.id = 'catGhostTitle'; g.className = 'pdp-title';
        g.style.display = 'none'; document.body.appendChild(g); }
      g.textContent = it.name;
      window.OasisLead?.open('quote');
    });
    /* "Annabelle Sofa | Galerie Oasis Laval" beats the static
       "Product — Galerie Oasis, Laval" every product page shipped with. */
    document.title = `${it.name} | Galerie Oasis Laval`;
    const md = document.querySelector('meta[name="description"]');
    if (md) md.setAttribute('content', [it.name, subLabel(it.sub),
      it.price ? money(it.price) : T('Price on request', 'Prix sur demande'),
      T('at Galerie Oasis, Laval. White-glove delivery across Greater Montréal.',
        'chez Galerie Oasis, Laval. Livraison gantée dans le Grand Montréal.')].join(' · '));
    const can = document.querySelector('link[rel="canonical"]');
    if (can) can.setAttribute('href', `https://galerieoasis.ca/product.html?id=${encodeURIComponent(it.id)}`);

    /* Product structured data so a listing can carry a price in search. */
    document.getElementById('itemLd')?.remove();
    const ld = document.createElement('script');
    ld.type = 'application/ld+json'; ld.id = 'itemLd';
    ld.textContent = JSON.stringify({
      '@context': 'https://schema.org', '@type': 'Product',
      name: it.name, sku: it.sku || undefined, image: it.img ? [it.img] : undefined,
      category: subLabel(it.sub),
      brand: { '@type': 'Brand', name: 'Galerie Oasis' },
      offers: it.price ? {
        '@type': 'Offer', priceCurrency: 'CAD', price: String(it.price),
        availability: 'https://schema.org/InStock',
        url: `https://galerieoasis.ca/product.html?id=${encodeURIComponent(it.id)}`,
        seller: { '@type': 'Organization', name: 'Galerie Oasis' }
      } : undefined
    });
    document.head.appendChild(ld);
  }

  /* Departments have their own pages now; the breadcrumb links to those. */
  const TOPFILE = { 'living-room': 'living-room.html', 'dining-room': 'dining.html',
    'bed-room': 'bedroom.html', office: 'office.html', decor: 'decor.html',
    carpets: 'rugs.html', 'custom-studio': 'custom.html' };
  const TOPS = ['living-room', 'dining-room', 'bed-room', 'office', 'decor', 'carpets', 'custom-studio'];
  const TOPLBL = { 'living-room': ['Living Room', 'Salon'], 'dining-room': ['Dining', 'Salle à manger'],
    'bed-room': ['Bedroom', 'Chambre'], office: ['Office', 'Bureau'], decor: ['Décor', 'Décor'],
    carpets: ['Rugs', 'Tapis'], 'custom-studio': ['Custom Studio', 'Atelier'] };

  /* Every product page uses this template. The fabric-selection programme was
     removed: choosing a fabric is a showroom conversation with the real swatch
     books, not something to simulate on a screen. */
  boot();

  function boot() {
  Promise.all(TOPS.map(t => fetch(`data/cat/${t}.json${V}`).then(r => r.ok ? r.json() : null).catch(() => null)))
    .then(sets => {
      let found = null;
      sets.forEach(s => {
        if (!s || found) return;
        const hit = (s.items || []).find(x => String(x.id) === String(id));
        if (hit) { hit._top = s.top; hit._topLabel = (TOPLBL[s.top] || [s.top])[L() === 'fr' ? 1 : 0]; found = hit; }
      });
      if (!found) {
        host.innerHTML = `<p class="item__missing">${T(
          'That piece is no longer listed. Browse the collection or call us and we will find it for you.',
          'Cette pièce n’est plus au catalogue. Parcourez la collection ou appelez-nous.')}
          <a class="btn btn--gold" href="collection.html">${T('Browse the collection', 'Parcourir la collection')}</a></p>`;
        return;
      }
      render(found);
      $('#langToggle')?.addEventListener('click', () => setTimeout(() => render(found), 10));
    });
  }
})();
