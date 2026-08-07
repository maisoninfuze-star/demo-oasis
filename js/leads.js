/* ===========================================================
   Lead capture — quote requests, showroom bookings, newsletter.
   Every form posts to OASIS_CONFIG.leadWebhook; if that isn't set
   yet it falls back to a pre-filled email so no enquiry is lost.
   =========================================================== */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const CFG = window.OASIS_CONFIG || {};
  const L = () => (document.body.dataset.lang === 'fr' ? 'fr' : 'en');
  const T = (en, fr) => (L() === 'fr' ? fr : en);

  /* ---------- modal shell ---------- */
  const modal = document.createElement('div');
  modal.className = 'lead';
  modal.innerHTML = `
    <div class="lead__backdrop"></div>
    <div class="lead__panel" role="dialog" aria-modal="true">
      <button class="lead__close" aria-label="Close">×</button>
      <div class="lead__body"></div>
    </div>`;
  document.body.appendChild(modal);
  const body = $('.lead__body', modal);
  const close = () => {
    modal.classList.remove('open');
    document.documentElement.classList.remove('lead-open');
    window.lenis?.start?.();
  };
  $('.lead__close', modal).addEventListener('click', close);
  $('.lead__backdrop', modal).addEventListener('click', close);
  addEventListener('keydown', e => { if (e.key === 'Escape' && modal.classList.contains('open')) close(); });

  /* ---------- context from the current product ---------- */
  function productContext() {
    const title = $('.pdp-title')?.textContent?.trim();
    if (!title) return null;
    const fabric = $('.opt__value')?.textContent?.trim();
    const config = $('#cfgName')?.textContent?.trim();
    const dims = $('#dimVal')?.textContent?.trim();
    return { product: title, fabric, config, dims, url: location.href };
  }

  /* ---------- open ---------- */
  function open(kind) {
    const ctx = productContext();
    const isQuote = kind === 'quote';
    const heading = isQuote
      ? T('Request a quote', 'Demander un devis')
      : T('Book a showroom visit', 'Réserver une visite');
    const lede = isQuote
      ? T('Tell us what you have in mind. We reply with pricing, fabric options and lead time — usually the same day.',
          'Dites-nous ce que vous avez en tête. Nous répondons avec le prix, les tissus et le délai — souvent le jour même.')
      : T('Pick a time that suits you and our design team will walk you through the floor.',
          'Choisissez un moment qui vous convient et notre équipe vous guidera en salle.');

    const piece = isQuote && ctx ? `
      <div class="lead__piece">
        <span>${T('Your selection', 'Votre sélection')}</span>
        <b>${ctx.product}</b>
        <i>${[ctx.fabric, ctx.config].filter(Boolean).join(' · ')}</i>
      </div>` : '';

    body.innerHTML = `
      <p class="eyebrow">${T('Galerie Oasis · Laval', 'Galerie Oasis · Laval')}</p>
      <h2>${heading}</h2>
      <p class="lead__lede">${lede}</p>
      ${piece}
      <form class="lead__form" novalidate>
        <label><span>${T('Name', 'Nom')}</span><input name="name" required autocomplete="name"></label>
        <label><span>${T('Email', 'Courriel')}</span><input name="email" type="email" required autocomplete="email"></label>
        <label><span>${T('Phone (optional)', 'Téléphone (optionnel)')}</span><input name="phone" type="tel" autocomplete="tel"></label>
        ${isQuote ? '' : `<label><span>${T('Preferred day', 'Jour souhaité')}</span><input name="day" type="date"></label>`}
        <label class="lead__consent lead__full"><input type="checkbox" name="smsConsent" value="yes">
          <span>${T('Text me updates about my request (reply STOP anytime). See our <a href="privacy.html" target="_blank">Privacy Policy</a>.',
                    'Textez-moi le suivi de ma demande (répondez STOP en tout temps). Voir la <a href="privacy.html" target="_blank">Politique de confidentialité</a>.')}</span></label>
        <label class="lead__full"><span>${T('Message', 'Message')}</span><textarea name="message" rows="3" placeholder="${
          isQuote ? T('Sizes, fabrics, delivery timing…', 'Dimensions, tissus, délais…')
                  : T('Anything you would like to see?', 'Ce que vous aimeriez voir ?')}"></textarea></label>
        <button class="btn btn--gold lead__submit" type="submit"><span>${T('Send request', 'Envoyer')}</span></button>
        <p class="lead__fine">${T('We never share your details. Reply usually within one business day.',
                                  'Vos informations restent confidentielles. Réponse sous un jour ouvrable.')}</p>
      </form>
      <div class="lead__alt">
        <a href="tel:${CFG.storePhone}">${CFG.storePhoneDisplay}</a>
        <a href="mailto:${CFG.storeEmail}">${CFG.storeEmail}</a>
      </div>`;

    $('.lead__form', body).addEventListener('submit', e => submit(e, kind, ctx));
    modal.classList.add('open');
    document.documentElement.classList.add('lead-open');
    window.lenis?.stop?.();
    setTimeout(() => $('input[name="name"]', body)?.focus(), 260);
  }

  /* ---------- submit ---------- */
  async function submit(e, kind, ctx) {
    e.preventDefault();
    const form = e.currentTarget;
    const btn = $('.lead__submit', form);
    const span = btn.querySelector('span');
    const data = Object.fromEntries(new FormData(form).entries());

    if (!data.name?.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email || '')) {
      form.classList.add('shake');
      setTimeout(() => form.classList.remove('shake'), 500);
      return;
    }

    const payload = {
      ...data,
      type: kind,
      language: L(),
      product: ctx?.product || null,
      sku: window.__pdpSku || null,
      fabric: ctx?.fabric || null,
      configuration: ctx?.config || null,
      page: location.href,
      source: 'galerieoasis.ca'
    };

    btn.disabled = true;
    span.textContent = T('Sending…', 'Envoi…');

    let ok = false;
    if (CFG.leadWebhook) {
      try {
        const r = await fetch(CFG.leadWebhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        ok = r.ok;
      } catch (err) { ok = false; }
    }

    if (ok) {
      done(kind);
    } else {
      /* No endpoint configured (or it failed) — hand the enquiry to the
         customer's mail app rather than dropping it. */
      const subject = encodeURIComponent(
        (kind === 'quote' ? T('Quote request', 'Demande de devis') : T('Showroom visit', 'Visite en salle')) +
        (ctx?.product ? ` — ${ctx.product}` : ''));
      const lines = [
        `${T('Name', 'Nom')}: ${data.name}`,
        `${T('Email', 'Courriel')}: ${data.email}`,
        data.phone ? `${T('Phone', 'Téléphone')}: ${data.phone}` : '',
        data.day ? `${T('Preferred day', 'Jour souhaité')}: ${data.day}` : '',
        ctx?.product ? `${T('Piece', 'Pièce')}: ${ctx.product}` : '',
        ctx?.fabric ? `${T('Fabric', 'Tissu')}: ${ctx.fabric}` : '',
        ctx?.config ? `${T('Configuration', 'Configuration')}: ${ctx.config}` : '',
        '', data.message || ''
      ].filter(Boolean).join('\n');
      location.href = `mailto:${CFG.storeEmail}?subject=${subject}&body=${encodeURIComponent(lines)}`;
      done(kind);
    }
  }

  function done(kind) {
    body.innerHTML = `
      <div class="lead__done">
        <span class="lead__tick">✓</span>
        <h2>${T('Thank you — request sent.', 'Merci — demande envoyée.')}</h2>
        <p>${kind === 'quote'
          ? T('We’ll come back to you with pricing and fabric options, usually within one business day.',
              'Nous revenons vers vous avec le prix et les options de tissu, généralement sous un jour ouvrable.')
          : T('We’ll confirm your visit shortly. We look forward to meeting you in Laval.',
              'Nous confirmons votre visite sous peu. Au plaisir de vous rencontrer à Laval.')}</p>
        <a class="btn btn--gold" href="#" data-lead-close>${T('Continue browsing', 'Continuer')}</a>
      </div>`;
    $('[data-lead-close]', body).addEventListener('click', e => { e.preventDefault(); close(); });
    try { window.dataLayer?.push({ event: 'lead_submit', lead_type: kind }); } catch (e) {}
  }

  /* ---------- wire triggers ---------- */
  function wire() {
    /* Only real call-to-action buttons open the modal. Plain nav links
       (header "Visit", mobile menu) must still scroll to the section —
       matching on text alone hijacked them. */
    $$('a.btn[href="index.html#visit"], a.btn[href="#visit"]').forEach(a => {
      if (a.dataset.leadWired) return;
      if (a.closest('.nav, .mobile-menu, .site-foot')) return;
      a.dataset.leadWired = '1';
      a.addEventListener('click', e => { e.preventDefault(); open('visit'); });
    });
    /* product page: Request a quote */
    $$('.pdp-actions a').forEach(a => {
      if (a.dataset.leadWired) return;
      a.dataset.leadWired = '1';
      a.addEventListener('click', e => { e.preventDefault(); open('quote'); });
    });
    /* visit section CTA */
    $$('.visit .btn--gold, .cta-band .btn--gold').forEach(a => {
      if (a.dataset.leadWired) return;
      a.dataset.leadWired = '1';
      a.addEventListener('click', e => { e.preventDefault(); open('visit'); });
    });
  }
  wire();
  /* custom.js injects its own CTA later */
  new MutationObserver(wire).observe(document.body, { childList: true, subtree: true });

  /* ---------- newsletter inline ---------- */
  $$('.news-form').forEach(f => f.addEventListener('submit', async e => {
    e.preventDefault();
    const input = f.querySelector('input');
    const btn = f.querySelector('button');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.value)) { input.focus(); return; }
    btn.disabled = true;
    const payload = { email: input.value, type: 'newsletter', language: L(), source: 'galerieoasis.ca' };
    if (CFG.leadWebhook) {
      try { await fetch(CFG.leadWebhook, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); } catch (err) {}
    }
    f.innerHTML = `<p class="news-done">${T('You’re on the list — welcome.', 'Vous êtes inscrit — bienvenue.')}</p>`;
  }));

  window.OasisLead = { open, close };
})();
