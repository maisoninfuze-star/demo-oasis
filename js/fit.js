/* ===========================================================
   "Will it fit?" — delivery reality check.

   Furniture sites list dimensions. Almost none answer the question that
   actually stops the sale: will it get through my door, and will it leave
   room to walk? Failed deliveries cost the store money and the customer
   trust, so this runs the real geometry before anyone orders.

   Only shown where genuine dimensions exist (the made-to-order programme
   reads them from the configuration chips) — never on guessed data.
   =========================================================== */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const L = () => (document.body.dataset.lang === 'fr' ? 'fr' : 'en');
  const T = (en, fr) => (L() === 'fr' ? fr : en);

  const CLEARANCE = 2;        // cm of slack we insist on before calling it a fit
  const WALKWAY  = 75;        // cm a person needs to pass comfortably

  /* Dimensions come from the active configuration chip: "W 208 · D 102 · H 76 cm" */
  function pieceDims() {
    const raw = $('#dimVal')?.textContent || '';
    const nums = raw.match(/\d+/g);
    if (!nums || nums.length < 3) return null;
    return { W: +nums[0], D: +nums[1], H: +nums[2] };
  }

  /* A sofa goes through a doorway lengthways, so the opening has to clear its
     cross-section (depth x height) in one of two orientations — or, tilted,
     the smaller side plus the opening's diagonal. */
  function doorVerdict(p, door) {
    if (!door.w || !door.h) return null;
    const upright = p.D <= door.w - CLEARANCE && p.H <= door.h - CLEARANCE;
    const onSide  = p.H <= door.w - CLEARANCE && p.D <= door.h - CLEARANCE;
    if (upright || onSide) {
      const spare = Math.round(Math.max(door.w - p.D, door.w - p.H));
      return { level: 'ok', spare,
        title: T('Fits through your door', 'Passe dans votre porte'),
        detail: T(`About ${spare} cm to spare, carried ${upright ? 'upright' : 'on its side'}.`,
                  `Environ ${spare} cm de jeu, porté ${upright ? 'debout' : 'sur le côté'}.`) };
    }
    const smallest = Math.min(p.D, p.H);
    const tiltable = smallest <= door.w - 1 &&
      Math.hypot(p.D, p.H) <= Math.hypot(door.w, door.h);
    if (tiltable) {
      return { level: 'tight',
        title: T('Tight — but our team can tilt it through', 'Juste — notre équipe peut l’incliner'),
        detail: T('Only a centimetre or two of slack. We measure on site before delivery day so there are no surprises.',
                  'Un ou deux centimètres de jeu seulement. Nous mesurons sur place avant la livraison, sans surprise.') };
    }
    return { level: 'no',
      title: T('Not through that opening in one piece', 'Ne passe pas d’un seul tenant'),
      detail: T('Good news: this piece is made to order, so the legs — and on most models the back — come off for delivery. Tell us your access and we will confirm before you commit.',
                'Bonne nouvelle : cette pièce est fabriquée sur commande. Les pieds — et sur la plupart des modèles le dossier — se retirent pour la livraison. Décrivez-nous l’accès et nous confirmerons avant l’achat.') };
  }

  function wallVerdict(p, wall) {
    if (!wall) return null;
    const spare = wall - p.W;
    if (spare < 0) return { level: 'no',
      title: T('Wider than your wall', 'Plus large que votre mur'),
      detail: T(`This is ${Math.abs(spare)} cm too wide. A smaller configuration above may suit the room better.`,
                `Il dépasse de ${Math.abs(spare)} cm. Une configuration plus petite conviendrait mieux.`) };
    if (spare < 20) return { level: 'tight',
      title: T('Fits the wall — only just', 'Tient au mur — de justesse'),
      detail: T(`${spare} cm left over. It will read as built-in, which can look intentional, but leaves no room either side.`,
                `${spare} cm de reste. L’effet sera encastré — voulu ou non, sans dégagement latéral.`) };
    return { level: 'ok',
      title: T('Sits well on that wall', 'S’installe bien sur ce mur'),
      detail: T(`${spare} cm to spare — roughly ${Math.round(spare / 2)} cm each side.`,
                `${spare} cm de jeu — environ ${Math.round(spare / 2)} cm de chaque côté.`) };
  }

  function roomVerdict(p, depth) {
    if (!depth) return null;
    const left = depth - p.D;
    if (left < WALKWAY) return { level: 'tight',
      title: T('Walkway will be snug', 'Passage restreint'),
      detail: T(`${left} cm of floor left in front. Under ${WALKWAY} cm starts to feel tight to walk past.`,
                `${left} cm devant le canapé. En dessous de ${WALKWAY} cm, la circulation devient serrée.`) };
    return { level: 'ok',
      title: T('Comfortable to walk around', 'Circulation confortable'),
      detail: T(`${left} cm of clear floor in front of it.`, `${left} cm de dégagement devant.`) };
  }

  function render(host) {
    const p = pieceDims();
    if (!p) return;
    const door = { w: +$('#fitDoorW', host)?.value || 0, h: +$('#fitDoorH', host)?.value || 0 };
    const wall = +$('#fitWall', host)?.value || 0;
    const depth = +$('#fitDepth', host)?.value || 0;

    const results = [wallVerdict(p, wall), doorVerdict(p, door), roomVerdict(p, depth)].filter(Boolean);
    const out = $('.fit__out', host);
    if (!results.length) {
      out.innerHTML = `<p class="fit__idle">${T('Enter what you know — every field is optional.',
                                                'Entrez ce que vous savez — tous les champs sont optionnels.')}</p>`;
      return;
    }
    const worst = results.some(r => r.level === 'no') ? 'no'
                : results.some(r => r.level === 'tight') ? 'tight' : 'ok';
    out.innerHTML = results.map(r => `
      <div class="fit__row fit__row--${r.level}">
        <span class="fit__dot"></span>
        <div><b>${r.title}</b><p>${r.detail}</p></div>
      </div>`).join('') + (worst !== 'ok' ? `
      <a class="fit__help" href="tel:+14509730000">${T('Talk it through with us · (450) 973-0000',
                                                       'Parlons-en · (450) 973-0000')}</a>` : '');
  }

  function build() {
    if ($('.fit')) return;
    if (!pieceDims()) return;                    // no genuine dimensions — no tool
    const anchor = $('#cfg')?.closest('.opt');
    if (!anchor) return;

    const sec = document.createElement('div');
    sec.className = 'fit';
    sec.innerHTML = `
      <button class="fit__toggle" type="button" aria-expanded="false">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M3 21h18M6 21V8l6-5 6 5v13"/><path d="M10 21v-6h4v6"/></svg>
        <span>${T('Will it fit? Check your doorway', 'Va-t-il entrer ? Vérifiez votre porte')}</span>
        <i class="fit__chev">+</i>
      </button>
      <div class="fit__panel" hidden>
        <p class="fit__lede">${T('The most common reason a delivery fails is the door, not the room. Enter what you know and we will do the geometry.',
                                 'La livraison échoue plus souvent à cause de la porte que de la pièce. Entrez ce que vous savez, nous faisons le calcul.')}</p>
        <div class="fit__grid">
          <label><span>${T('Doorway width', 'Largeur de porte')}</span><i>cm</i><input id="fitDoorW" type="number" min="30" max="300" inputmode="numeric" placeholder="81"></label>
          <label><span>${T('Doorway height', 'Hauteur de porte')}</span><i>cm</i><input id="fitDoorH" type="number" min="100" max="300" inputmode="numeric" placeholder="203"></label>
          <label><span>${T('Wall length', 'Longueur du mur')}</span><i>cm</i><input id="fitWall" type="number" min="50" max="2000" inputmode="numeric" placeholder="300"></label>
          <label><span>${T('Floor depth in front', 'Profondeur devant')}</span><i>cm</i><input id="fitDepth" type="number" min="50" max="2000" inputmode="numeric" placeholder="250"></label>
        </div>
        <div class="fit__out"></div>
        <p class="fit__fine">${T('Guidance only — we always measure on site before delivery day.',
                                 'À titre indicatif — nous mesurons toujours sur place avant la livraison.')}</p>
      </div>`;
    anchor.after(sec);

    const toggle = $('.fit__toggle', sec), panel = $('.fit__panel', sec);
    toggle.addEventListener('click', () => {
      const open = !panel.hidden;
      panel.hidden = open;
      toggle.setAttribute('aria-expanded', String(!open));
      $('.fit__chev', sec).textContent = open ? '+' : '−';
      if (!open) render(sec);
    });
    $$('input', sec).forEach(i => i.addEventListener('input', () => render(sec)));
    /* re-run when the configuration (and therefore the dimensions) changes */
    $$('.cchip').forEach(c => c.addEventListener('click', () => setTimeout(() => render(sec), 20)));
    render(sec);
  }

  const start = () => setTimeout(build, 900);
  document.readyState === 'loading' ? addEventListener('DOMContentLoaded', start) : start();
  $('#langToggle')?.addEventListener('click', () => setTimeout(() => { $('.fit')?.remove(); build(); }, 60));
})();
