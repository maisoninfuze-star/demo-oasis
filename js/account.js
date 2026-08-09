/* ===========================================================
   Customer account — capture details once, send them to GHL,
   and reuse them everywhere on this device.

   IMPORTANT — this is deliberately NOT a password login. The site is
   static (no server), so there is nowhere to verify a password safely;
   a password box here would look like security while providing none.
   Instead the customer saves a profile: it creates/updates their GHL
   contact and prefills every quote, visit and order form on this device.
   If real sign-in is ever needed (order history across devices), that
   requires a backend — see notes in the handover.
   =========================================================== */
(() => {
  const KEY = 'go_customer_v1';
  const CFG = window.OASIS_CONFIG || {};
  const $ = (s, c = document) => c.querySelector(s);
  const L = () => (document.body.dataset.lang === 'fr' ? 'fr' : 'en');
  const T = (en, fr) => (L() === 'fr' ? fr : en);
  const body = $('#acctBody');

  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch (e) { return null; } };
  const save = c => { try { localStorage.setItem(KEY, JSON.stringify(c)); } catch (e) {} };
  const clear = () => { try { localStorage.removeItem(KEY); } catch (e) {} };

  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, m =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));

  const INTERESTS = [
    { v: 'living',  en: 'Living room',   fr: 'Salon' },
    { v: 'bedroom', en: 'Bedroom',       fr: 'Chambre' },
    { v: 'dining',  en: 'Dining',        fr: 'Salle à manger' },
    { v: 'rugs',    en: 'Rugs',          fr: 'Tapis' },
    { v: 'custom',  en: 'Custom-made',   fr: 'Sur mesure' },
    { v: 'trade',   en: 'Designer / trade', fr: 'Designer / pro' },
  ];

  /* ---------- views ---------- */
  function signedIn(c) {
    const intro = $('#acctIntro');
    if (intro) intro.textContent = T(
      'Your details are saved on this device — quotes, visits and orders are prefilled for you.',
      'Vos coordonnées sont enregistrées sur cet appareil — devis, visites et commandes sont préremplis.');
    body.innerHTML = `
      <div class="acct__card">
        <span class="acct__hello">${T('Welcome back', 'Bon retour')}</span>
        <h2>${esc(c.name)}</h2>
        <dl class="acct__dl">
          <div><dt>${T('Email', 'Courriel')}</dt><dd>${esc(c.email)}</dd></div>
          <div><dt>${T('Phone', 'Téléphone')}</dt><dd>${esc(c.phone)}</dd></div>
          ${c.postal ? `<div><dt>${T('Postal code', 'Code postal')}</dt><dd>${esc(c.postal)}</dd></div>` : ''}
          ${c.interests?.length ? `<div><dt>${T('Interested in', 'Intérêts')}</dt><dd>${c.interests.map(i => {
            const f = INTERESTS.find(x => x.v === i); return esc(f ? f[L()] : i); }).join(', ')}</dd></div>` : ''}
        </dl>
        <div class="acct__actions">
          <a class="btn btn--gold" href="collection.html">${T('Continue shopping', 'Continuer mes achats')}</a>
          <a class="btn btn--ghost" href="purchase.html">${T('View my order', 'Voir ma commande')}</a>
          <button class="acct__link" id="acctEdit">${T('Edit my details', 'Modifier mes coordonnées')}</button>
          <button class="acct__link" id="acctOut">${T('Forget me on this device', 'M’oublier sur cet appareil')}</button>
        </div>
      </div>`;
    $('#acctEdit').addEventListener('click', () => form(c));
    $('#acctOut').addEventListener('click', () => {
      if (!confirm(T('Remove your saved details from this device?',
                     'Retirer vos coordonnées enregistrées de cet appareil ?'))) return;
      clear(); form(null);
    });
  }

  function form(c) {
    const intro = $('#acctIntro');
    if (intro) intro.textContent = c
      ? T('Update your details.', 'Mettez à jour vos coordonnées.')
      : T('Save your details once — we prefill your quotes, showroom visits and orders, and our team can pick up where you left off.',
          'Enregistrez vos coordonnées une fois — nous préremplissons vos devis, visites et commandes, et notre équipe peut reprendre où vous en étiez.');
    body.innerHTML = `
      <form class="acct__form" id="acctForm" novalidate>
        <label><span>${T('Full name', 'Nom complet')} *</span>
          <input name="name" required autocomplete="name" value="${esc(c?.name)}"></label>
        <label><span>${T('Email', 'Courriel')} *</span>
          <input name="email" type="email" required autocomplete="email" value="${esc(c?.email)}"></label>
        <label><span>${T('Phone', 'Téléphone')} *</span>
          <input name="phone" type="tel" required autocomplete="tel" value="${esc(c?.phone)}"></label>
        <label><span>${T('Postal code', 'Code postal')}</span>
          <input name="postal" autocomplete="postal-code" value="${esc(c?.postal)}"></label>
        <fieldset class="acct__chips">
          <legend>${T('What are you furnishing?', 'Que meublez-vous ?')}</legend>
          ${INTERESTS.map(i => `<label class="acct__chip"><input type="checkbox" name="interests" value="${i.v}"${
            c?.interests?.includes(i.v) ? ' checked' : ''}><span>${i[L()]}</span></label>`).join('')}
        </fieldset>
        <label class="acct__consent"><input type="checkbox" name="consent" value="yes"${
          c?.consent ? ' checked' : ''}>
          <span>${T('Email me new arrivals and offers. You can unsubscribe anytime.',
                    'Envoyez-moi les nouveautés et les offres. Désabonnement en tout temps.')}</span></label>
        <p class="acct__note">${T(
          'No password needed — your details stay on this device and with our team.',
          'Aucun mot de passe — vos coordonnées restent sur cet appareil et avec notre équipe.')}</p>
        <button class="btn btn--gold" type="submit">${c ? T('Save changes', 'Enregistrer') : T('Create my account', 'Créer mon compte')}</button>
        <p class="acct__err" id="acctErr" hidden></p>
      </form>`;
    $('#acctForm').addEventListener('submit', submit);
  }

  async function submit(e) {
    e.preventDefault();
    const f = e.currentTarget;
    const fd = new FormData(f);
    const c = {
      name: (fd.get('name') || '').trim(),
      email: (fd.get('email') || '').trim().toLowerCase(),
      phone: (fd.get('phone') || '').trim(),
      postal: (fd.get('postal') || '').trim(),
      interests: fd.getAll('interests'),
      consent: fd.get('consent') === 'yes',
    };
    const err = $('#acctErr');
    if (!c.name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c.email) || !c.phone) {
      err.hidden = false;
      err.textContent = T('Please add your name, a valid email and a phone number.',
                          'Veuillez indiquer votre nom, un courriel valide et un téléphone.');
      f.classList.add('shake'); setTimeout(() => f.classList.remove('shake'), 500);
      return;
    }
    err.hidden = true;
    const btn = f.querySelector('button[type=submit]');
    btn.disabled = true;
    const label = btn.textContent;
    btn.textContent = T('Saving…', 'Enregistrement…');

    const ok = await (window.OasisCRM?.send({
      ...c,
      interests: c.interests.join(', '),
      type: 'account',
      newsletter_opt_in: c.consent ? 'yes' : 'no',
    }, { hook: 'account' }) ?? Promise.resolve(false));

    save(c);                       // saved locally regardless, so the site still prefills
    if (!ok) {
      /* CRM unreachable — don't lose the signup; hand it to the mail app. */
      const lines = [`${T('New account', 'Nouveau compte')}:`, `Name: ${c.name}`, `Email: ${c.email}`,
        `Phone: ${c.phone}`, c.postal ? `Postal: ${c.postal}` : '',
        c.interests.length ? `Interested in: ${c.interests.join(', ')}` : ''].filter(Boolean).join('\n');
      window.open(`mailto:${CFG.storeEmail}?subject=${encodeURIComponent(T('New account — ', 'Nouveau compte — ') + c.name)}&body=${encodeURIComponent(lines)}`, '_blank');
    }
    btn.textContent = label;
    try { window.dataLayer?.push({ event: 'account_created' }); } catch (e2) {}
    signedIn(c);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ---------- boot ---------- */
  function render() { const c = load(); c ? signedIn(c) : form(null); }
  if (body) {
    render();
    $('#langToggle')?.addEventListener('click', () => setTimeout(render, 10));
  }

  /* Prefill any lead/order form on the rest of the site. */
  window.OasisCustomer = {
    get: load,
    prefill(scope) {
      const c = load(); if (!c) return;
      (scope || document).querySelectorAll('input[name=name], input[name=email], input[name=phone]')
        .forEach(i => { if (!i.value && c[i.name]) i.value = c[i.name]; });
    }
  };
  document.addEventListener('click', () => setTimeout(() => window.OasisCustomer.prefill(), 60));
})();
