/* ===========================================================
   Product photo lightbox — zoom, pan, pinch, swipe, arrows.
   Reads the photo list live from .thumb[data-full] so it works
   for both the static flagship and catalog-hydrated products.
   =========================================================== */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  const viewer = $('#viewer');
  if (!viewer) return;

  /* ---------- viewer chrome: expand button + counter ---------- */
  const expandBtn = document.createElement('button');
  expandBtn.className = 'viewer__expand';
  expandBtn.setAttribute('aria-label', 'Zoom photos');
  expandBtn.innerHTML = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M15 3h6v6M9 21H3v-15M21 3l-7 7M3 21l7-7"/></svg>';
  viewer.appendChild(expandBtn);

  const counterBadge = document.createElement('span');
  counterBadge.className = 'viewer__count';
  viewer.appendChild(counterBadge);

  const photos = () => $$('.thumb').map(t => t.dataset.full).filter(Boolean);
  const activeIndex = () => Math.max(0, $$('.thumb').findIndex(t => t.classList.contains('is-active')));

  function syncBadge() {
    const n = photos().length;
    counterBadge.textContent = n > 1 ? `${activeIndex() + 1} / ${n}` : '';
    counterBadge.style.display = n > 1 ? '' : 'none';
  }
  syncBadge();
  /* keep badge in sync with thumb clicks + catalog hydration (thumbs re-rendered) */
  new MutationObserver(syncBadge).observe($('#thumbs') || document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });

  /* ---------- lightbox DOM ---------- */
  const lb = document.createElement('div');
  lb.className = 'lb';
  lb.setAttribute('role', 'dialog');
  lb.setAttribute('aria-label', 'Photo viewer');
  lb.innerHTML = `
    <div class="lb__backdrop"></div>
    <figure class="lb__stage"><img class="lb__img" alt="" draggable="false" /></figure>
    <button class="lb__close" aria-label="Close">×</button>
    <button class="lb__nav lb__prev" aria-label="Previous photo">‹</button>
    <button class="lb__nav lb__next" aria-label="Next photo">›</button>
    <div class="lb__foot"><span class="lb__caption"></span><span class="lb__counter"></span></div>
    <span class="lb__hint"></span>`;
  document.body.appendChild(lb);

  const img = $('.lb__img', lb);
  const stage = $('.lb__stage', lb);
  let list = [], idx = 0;
  let scale = 1, tx = 0, ty = 0;

  const isTouch = matchMedia('(pointer: coarse)').matches;

  function applyTransform(animate) {
    img.style.transition = animate ? 'transform .35s cubic-bezier(.22,1,.36,1)' : 'none';
    img.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
    img.classList.toggle('is-zoomed', scale > 1.02);
  }
  function resetTransform(animate) { scale = 1; tx = 0; ty = 0; applyTransform(animate); }

  function clampPan() {
    const r = stage.getBoundingClientRect();
    const iw = img.offsetWidth * scale, ih = img.offsetHeight * scale;
    const mx = Math.max(0, (iw - r.width) / 2), my = Math.max(0, (ih - r.height) / 2);
    tx = Math.min(mx, Math.max(-mx, tx));
    ty = Math.min(my, Math.max(-my, ty));
  }

  function show(i, animate = true) {
    idx = (i + list.length) % list.length;
    img.src = list[idx];
    resetTransform(false);
    $('.lb__counter', lb).textContent = list.length > 1 ? `${idx + 1} / ${list.length}` : '';
    lb.classList.toggle('lb--single', list.length < 2);
    /* sync page thumbs so viewer follows the lightbox */
    const thumbs = $$('.thumb');
    if (thumbs[idx] && !thumbs[idx].classList.contains('is-active')) thumbs[idx].click();
  }

  function open(startIdx) {
    list = photos();
    if (!list.length) return;
    $('.lb__caption', lb).textContent = $('.pdp-title')?.textContent || '';
    $('.lb__hint', lb).textContent = isTouch
      ? (document.body.dataset.lang === 'fr' ? 'Pincez pour zoomer · glissez pour changer' : 'Pinch to zoom · swipe for more')
      : (document.body.dataset.lang === 'fr' ? 'Molette pour zoomer · double-clic' : 'Scroll to zoom · double-click');
    lb.classList.add('open');
    document.documentElement.classList.add('lb-open');
    window.lenis?.stop?.();
    show(startIdx ?? activeIndex(), false);
    setTimeout(() => $('.lb__hint', lb)?.classList.add('fade'), 2200);
  }
  function close() {
    lb.classList.remove('open');
    document.documentElement.classList.remove('lb-open');
    window.lenis?.start?.();
  }

  /* ---------- open triggers ---------- */
  expandBtn.addEventListener('click', () => open());
  $('.viewer__stage')?.addEventListener('click', e => {
    if (e.target.closest('.viewer__spin')) return;
    open();
  });

  /* ---------- close / nav ---------- */
  $('.lb__close', lb).addEventListener('click', close);
  $('.lb__backdrop', lb).addEventListener('click', close);
  $('.lb__prev', lb).addEventListener('click', () => show(idx - 1));
  $('.lb__next', lb).addEventListener('click', () => show(idx + 1));
  addEventListener('keydown', e => {
    if (!lb.classList.contains('open')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') show(idx - 1);
    if (e.key === 'ArrowRight') show(idx + 1);
  });

  /* ---------- zoom: wheel ---------- */
  stage.addEventListener('wheel', e => {
    e.preventDefault();
    const r = img.getBoundingClientRect();
    const prev = scale;
    scale = Math.min(4, Math.max(1, scale * (e.deltaY < 0 ? 1.18 : 0.85)));
    const f = scale / prev - 1;
    tx -= (e.clientX - r.left - r.width / 2) * f;
    ty -= (e.clientY - r.top - r.height / 2) * f;
    if (scale <= 1.02) { resetTransform(false); return; }
    clampPan(); applyTransform(false);
  }, { passive: false });

  /* ---------- zoom: double click / double tap ---------- */
  let lastTap = 0;
  function toggleZoom(cx, cy) {
    if (scale > 1.02) { resetTransform(true); return; }
    const r = img.getBoundingClientRect();
    scale = 2.4;
    tx = -(cx - r.left - r.width / 2) * (scale - 1);
    ty = -(cy - r.top - r.height / 2) * (scale - 1);
    clampPan(); applyTransform(true);
  }
  stage.addEventListener('dblclick', e => { e.preventDefault(); toggleZoom(e.clientX, e.clientY); });

  /* ---------- pointers: pan / pinch / swipe / double-tap ---------- */
  const pts = new Map();
  let startDist = 0, startScale = 1, panStart = null, swipeDX = 0;

  stage.addEventListener('pointerdown', e => {
    stage.setPointerCapture(e.pointerId);
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 1) {
      panStart = { x: e.clientX - tx, y: e.clientY - ty };
      swipeDX = 0;
      if (e.pointerType === 'touch') {
        const now = Date.now();
        if (now - lastTap < 320) { toggleZoom(e.clientX, e.clientY); lastTap = 0; }
        else lastTap = now;
      }
    } else if (pts.size === 2) {
      const [a, b] = [...pts.values()];
      startDist = Math.hypot(a.x - b.x, a.y - b.y);
      startScale = scale;
    }
  });
  stage.addEventListener('pointermove', e => {
    if (!pts.has(e.pointerId)) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 2) {
      const [a, b] = [...pts.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      scale = Math.min(4, Math.max(1, startScale * d / startDist));
      if (scale <= 1.02) { tx = 0; ty = 0; }
      clampPan(); applyTransform(false);
    } else if (pts.size === 1 && panStart) {
      if (scale > 1.02) {
        tx = e.clientX - panStart.x; ty = e.clientY - panStart.y;
        clampPan(); applyTransform(false);
      } else {
        swipeDX = e.clientX - (panStart.x + tx);
      }
    }
  });
  function pointerEnd(e) {
    pts.delete(e.pointerId);
    if (pts.size === 0) {
      if (scale <= 1.02 && Math.abs(swipeDX) > 60 && list.length > 1) {
        show(idx + (swipeDX < 0 ? 1 : -1));
      }
      panStart = null; swipeDX = 0;
    }
  }
  stage.addEventListener('pointerup', pointerEnd);
  stage.addEventListener('pointercancel', pointerEnd);
})();
