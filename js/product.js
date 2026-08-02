/* ===========================================================
   Product page — live fabric preview, configurator, gallery
   =========================================================== */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const lang = () => document.body.dataset.lang || 'en';

  const pmain = $('#pmain');
  const ptint = $('#ptint');
  let currentTint = '';   // '' = original fabric

  /* ---- white knockout, returns transparent PNG dataURL ---- */
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
    while (stack.length) { const p = stack.pop(); d[p * 4 + 3] = 0; const x = p % w, y = (p / w) | 0; push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1); }
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
      pmain.src = url;
      pmain.classList.add('is-cut');
      if (ptint) { ptint.style.webkitMaskImage = `url(${url})`; ptint.style.maskImage = `url(${url})`; }
      applyTint();
    } catch (e) { /* leave original on failure */ }
  }
  function loadMain(url) {
    if (!pmain) return;
    pmain.classList.remove('is-cut');
    pmain.onload = () => { pmain.onload = null; processMain(); };
    pmain.src = url;
  }
  if (pmain) { if (pmain.complete && pmain.naturalWidth) processMain(); else pmain.addEventListener('load', processMain, { once: true }); }

  /* ---- fabric swatches ---- */
  $$('.sw').forEach(sw => sw.addEventListener('click', () => {
    $$('.sw').forEach(s => s.classList.remove('is-active'));
    sw.classList.add('is-active');
    currentTint = sw.dataset.tint || '';
    applyTint();
    const nm = $('#fabricName'); if (nm) nm.textContent = sw.dataset['name' + (lang() === 'fr' ? 'Fr' : 'En')] || '';
  }));

  /* ---- configuration chips ---- */
  $$('.cchip').forEach(ch => ch.addEventListener('click', () => {
    $$('.cchip').forEach(c => c.classList.remove('is-active'));
    ch.classList.add('is-active');
    $('#dimVal').textContent = ch.dataset.dim;
    const nm = $('#cfgName'); if (nm) nm.textContent = ch.dataset[lang() === 'fr' ? 'fr' : 'en'];
  }));

  /* ---- thumbnails ---- */
  $$('.thumb').forEach(t => t.addEventListener('click', () => {
    $$('.thumb').forEach(x => x.classList.remove('is-active'));
    t.classList.add('is-active');
    loadMain(t.dataset.full);
  }));

  /* ---- 360 spin flourish ---- */
  $('#spin360')?.addEventListener('click', () => {
    const stage = $('.viewer__stage');
    if (!stage || stage.classList.contains('spinning')) return;
    stage.classList.add('spinning');
    setTimeout(() => stage.classList.remove('spinning'), 1200);
  });

  /* ---- add to cart ---- */
  $('#addBtn')?.addEventListener('click', () => {
    const c = $('.head-cart__count');
    if (c) c.textContent = (+c.textContent || 0) + 1;
    const btn = $('#addBtn'), span = btn.querySelector('span');
    const prev = span.textContent;
    span.textContent = lang() === 'fr' ? 'Ajouté ✓' : 'Added ✓';
    btn.classList.add('added');
    setTimeout(() => { span.textContent = prev; btn.classList.remove('added'); }, 1600);
  });

  /* keep fabric/config labels correct after a language switch */
  $('#langToggle')?.addEventListener('click', () => {
    setTimeout(() => {
      const asw = $('.sw.is-active'); const nm = $('#fabricName');
      if (asw && nm) nm.textContent = asw.dataset['name' + (lang() === 'fr' ? 'Fr' : 'En')];
      const ach = $('.cchip.is-active'); const cn = $('#cfgName');
      if (ach && cn) cn.textContent = ach.dataset[lang() === 'fr' ? 'fr' : 'en'];
    }, 0);
  });
})();
