/* ===========================================================
   Cart + purchase flow for PRICED items.
   Today: order request through the lead pipeline (availability
   confirmed, payment taken by phone/in-store).
   Later: Stripe drops in at submitOrder() — see OASIS_CONFIG.
   =========================================================== */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const CFG = window.OASIS_CONFIG || {};
  const L = () => (document.body.dataset.lang === 'fr' ? 'fr' : 'en');
  const T = (en, fr) => (L() === 'fr' ? fr : en);
  const money = n => { n = parseFloat(n); return isNaN(n) ? '' : '$' + (n % 1 ? n.toFixed(2) : n.toLocaleString('en-CA')); };

  const KEY = 'go_cart_v1';
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } };
  const save = c => { try { localStorage.setItem(KEY, JSON.stringify(c)); } catch (e) {} badge(); };
  let cart = load();

  /* ---------- header cart icon (injected on every page) ---------- */
  const actions = $('.head-actions');
  if (actions && !$('.head-cartlink')) {
    const a = document.createElement('a');
    a.className = 'head-cartlink';
    a.href = 'purchase.html';
    a.setAttribute('aria-label', 'Your order');
    a.innerHTML = `<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M6 7h12l-1 13H7L6 7z"/><path d="M9 7a3 3 0 0 1 6 0"/></svg><i class="head-cartlink__n" hidden>0</i>`;
    actions.insertBefore(a, actions.querySelector('.burger'));
  }
  function badge() {
    const n = cart.reduce((s, it) => s + it.qty, 0);
    const el = $('.head-cartlink__n');
    if (el) { el.textContent = n; el.hidden = n === 0; }
  }
  badge();

  window.OasisCart = {
    add(item) {
      const hit = cart.find(x => x.id === item.id);
      if (hit) hit.qty += 1; else cart.push({ ...item, qty: 1 });
      save(cart);
      const el = $('.head-cartlink');
      el?.classList.add('bump'); setTimeout(() => el?.classList.remove('bump'), 500);
    }
  };

  /* ---------- add-to-cart buttons on priced collection cards ---------- */
  document.addEventListener('click', e => {
    const btn = e.target.closest('.pcard__add');
    if (!btn) return;
    e.preventDefault(); e.stopPropagation();
    window.OasisCart.add({
      id: btn.dataset.id, name: btn.dataset.name, sku: btn.dataset.sku || '',
      brand: btn.dataset.brand || '', price: btn.dataset.price,
      from: btn.dataset.from === '1', img: btn.dataset.img
    });
    btn.classList.add('done');
    btn.textContent = T('Added ✓', 'Ajouté ✓');
    setTimeout(() => { btn.classList.remove('done'); btn.textContent = T('Add to order', 'Ajouter'); }, 1400);
  });

  /* ---------- purchase page ---------- */
  const body = $('#purchBody');
  if (!body) return;

  const DELIVERY = CFG.delivery || { freeOver: 500, fee: 99 };

  function render() {
    if (!cart.length) {
      body.innerHTML = `
        <div class="purch__empty">
          <p>${T('Nothing here yet. Pieces with a live price can be added to your order from any collection page.',
                 'Rien pour l’instant. Les pièces à prix affiché peuvent être ajoutées depuis les collections.')}</p>
          <a class="btn btn--gold" href="collection.html">${T('Browse the collection', 'Parcourir la collection')}</a>
        </div>`;
      return;
    }
    const sub = cart.reduce((s, it) => s + parseFloat(it.price) * it.qty, 0);
    const delivery = sub >= DELIVERY.freeOver ? 0 : DELIVERY.fee;
    const hasFrom = cart.some(it => it.from);

    body.innerHTML = `
      <div class="purch__grid">
        <div class="purch__items">
          ${cart.map((it, i) => `
            <div class="pline">
              <img src="${it.img}" alt="" loading="lazy">
              <div class="pline__info">
                <b>${it.name}</b>
                <span>${it.sku ? 'SKU ' + it.sku + ' · ' : ''}${it.brand}</span>
                <div class="pline__qty">
                  <button data-q="-1" data-i="${i}" aria-label="less">−</button>
                  <i>${it.qty}</i>
                  <button data-q="1" data-i="${i}" aria-label="more">+</button>
                  <button class="pline__rm" data-rm="${i}">${T('Remove', 'Retirer')}</button>
                </div>
              </div>
              <p class="pline__price">${it.from ? T('From ', 'Dès ') : ''}${money(parseFloat(it.price) * it.qty)}</p>
            </div>`).join('')}
        </div>
        <aside class="purch__sum">
          <h3>${T('Summary', 'Sommaire')}</h3>
          <dl>
            <div><dt>${T('Subtotal', 'Sous-total')}</dt><dd>${money(sub)}</dd></div>
            <div><dt>${T('Delivery', 'Livraison')}</dt><dd>${delivery === 0
              ? `<b class="free">${T('FREE', 'GRATUITE')}</b>` : money(delivery)}</dd></div>
            <div><dt>${T('Taxes', 'Taxes')}</dt><dd>${T('At payment', 'Au paiement')}</dd></div>
            <div class="tot"><dt>${T('Estimated total', 'Total estimé')}</dt><dd>${money(sub + delivery)}</dd></div>
          </dl>
          <p class="purch__area">${(DELIVERY.area || {})[L()] || ''}</p>
          ${hasFrom ? `<p class="purch__note">${T('“From” prices are confirmed with your configuration before payment.',
                                                  'Les prix « Dès » sont confirmés selon votre configuration avant paiement.')}</p>` : ''}
          <form class="purch__form" novalidate>
            <input name="name" required placeholder="${T('Full name', 'Nom complet')}" autocomplete="name">
            <input name="email" type="email" required placeholder="${T('Email', 'Courriel')}" autocomplete="email">
            <input name="phone" type="tel" required placeholder="${T('Phone', 'Téléphone')}" autocomplete="tel">
            <input name="address" required placeholder="${T('Delivery address (Greater Montréal)', 'Adresse de livraison (Grand Montréal)')}" autocomplete="street-address">
            <button class="btn btn--gold" type="submit"><span>${T('Place order', 'Passer la commande')}</span></button>
            <p class="purch__fine">${T('We confirm availability and finalize payment with you — secure online card payment (Stripe) is coming soon. No charge is taken now.',
                                       'Nous confirmons la disponibilité et finalisons le paiement avec vous — le paiement en ligne sécurisé (Stripe) arrive bientôt. Aucun montant n’est prélevé maintenant.')}</p>
          </form>
        </aside>
      </div>`;

    body.querySelectorAll('[data-q]').forEach(b => b.addEventListener('click', () => {
      const i = +b.dataset.i; cart[i].qty = Math.max(1, cart[i].qty + (+b.dataset.q));
      save(cart); render();
    }));
    body.querySelectorAll('[data-rm]').forEach(b => b.addEventListener('click', () => {
      cart.splice(+b.dataset.rm, 1); save(cart); render();
    }));
    body.querySelector('.purch__form').addEventListener('submit', submitOrder);
  }

  async function submitOrder(e) {
    e.preventDefault();
    const f = e.currentTarget;
    const data = Object.fromEntries(new FormData(f).entries());
    if (!data.name?.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email || '') || !data.phone?.trim() || !data.address?.trim()) {
      f.classList.add('shake'); setTimeout(() => f.classList.remove('shake'), 500); return;
    }
    const sub = cart.reduce((s, it) => s + parseFloat(it.price) * it.qty, 0);
    const payload = {
      type: 'order', language: L(), source: 'galerieoasis.ca', ...data,
      items: cart.map(it => `${it.qty}x ${it.name}${it.sku ? ' [' + it.sku + ']' : ''} (${it.brand}) — $${it.price}`).join(' | '),
      subtotal: sub.toFixed(2),
      delivery: sub >= DELIVERY.freeOver ? 'free' : DELIVERY.fee,
      page: location.href
    };
    /* >>> Stripe integration point: replace the block below with a
       redirect to the Stripe Checkout session once keys are configured. */
    const btn = f.querySelector('button'); btn.disabled = true;
    let ok = false;
    if (CFG.leadWebhook) {
      try { ok = (await fetch(CFG.leadWebhook, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })).ok; }
      catch (err) { ok = false; }
    }
    if (!ok) {
      const lines = [`${T('Order', 'Commande')}:`, ...cart.map(it => ` - ${it.qty}x ${it.name}${it.sku ? ' [' + it.sku + ']' : ''} — $${it.price}`),
        '', `${T('Subtotal', 'Sous-total')}: $${sub.toFixed(2)}`, `Name: ${data.name}`, `Email: ${data.email}`, `Phone: ${data.phone}`, `Address: ${data.address}`].join('\n');
      location.href = `mailto:${CFG.storeEmail}?subject=${encodeURIComponent(T('New order — ', 'Nouvelle commande — ') + data.name)}&body=${encodeURIComponent(lines)}`;
    }
    cart = []; save(cart);
    body.innerHTML = `
      <div class="purch__done">
        <span class="lead__tick">✓</span>
        <h2>${T('Order received — thank you.', 'Commande reçue — merci.')}</h2>
        <p>${T('We confirm availability and delivery, then finalize payment with you the same day.',
               'Nous confirmons la disponibilité et la livraison, puis finalisons le paiement avec vous le jour même.')}</p>
        <a class="btn btn--gold" href="collection.html">${T('Continue browsing', 'Continuer')}</a>
      </div>`;
    try { window.dataLayer?.push({ event: 'order_submit', value: sub }); } catch (err) {}
  }

  render();
  $('#langToggle')?.addEventListener('click', () => setTimeout(render, 10));
})();
