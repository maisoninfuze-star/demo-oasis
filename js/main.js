/* ===========================================================
   GALERIE OASIS — motion engine
   =========================================================== */
(() => {
  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGSAP = window.gsap;
  if (hasGSAP && window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

  /* ---------- white knockout (studio cutouts on dark) ---------- */
  function floodKnockout(img, maxW = 1500) {
    try {
      const scale = Math.min(1, maxW / img.naturalWidth);
      const w = Math.round(img.naturalWidth * scale);
      const h = Math.round(img.naturalHeight * scale);
      const cv = document.createElement('canvas');
      cv.width = w; cv.height = h;
      const ctx = cv.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      const id = ctx.getImageData(0, 0, w, h);
      const d = id.data;
      const near = i => d[i] > 236 && d[i + 1] > 236 && d[i + 2] > 236;
      const visited = new Uint8Array(w * h);
      const stack = [];
      const push = (x, y) => {
        if (x < 0 || y < 0 || x >= w || y >= h) return;
        const p = y * w + x;
        if (visited[p]) return;
        visited[p] = 1;
        if (near(p * 4)) stack.push(p);
      };
      for (let x = 0; x < w; x++) { push(x, 0); push(x, h - 1); }
      for (let y = 0; y < h; y++) { push(0, y); push(w - 1, y); }
      while (stack.length) {
        const p = stack.pop();
        d[p * 4 + 3] = 0;                       // transparent
        const x = p % w, y = (p / w) | 0;
        push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1);
      }
      // soft edge: fade pixels adjacent to transparency that are still light
      ctx.putImageData(id, 0, 0);
      img.src = cv.toDataURL('image/png');
      img.classList.add('is-cut');
    } catch (e) { /* CORS or other — leave original */ }
  }
  function knockWhenReady(img) {
    if (!img) return;
    if (img.complete && img.naturalWidth) floodKnockout(img);
    else img.addEventListener('load', () => floodKnockout(img), { once: true });
  }
  knockWhenReady($('#heroPiece'));
  knockWhenReady($('.feature__piece'));
  knockWhenReady($('.col-hero__piece'));

  /* ---------- hero title → word slices (BMS-style reveal) ---------- */
  const titleEl = $('.hero__title');
  let armSlices = () => {};
  if (titleEl && !reduced) {
    const walk = (node, out) => {
      [...node.childNodes].forEach(child => {
        if (child.nodeType === 3) {
          child.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) { out.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span'); w.className = 'w';
            for (let i = 1; i <= 3; i++) {
              const s = document.createElement('span'); s.className = 'slice s' + i;
              s.textContent = part; if (i > 1) s.setAttribute('aria-hidden', 'true');
              w.appendChild(s);
            }
            out.appendChild(w);
          });
        } else if (child.nodeType === 1) {
          const clone = child.cloneNode(false); out.appendChild(clone); walk(child, clone);
        }
      });
    };
    const host = document.createElement('span');
    walk(titleEl, host);
    titleEl.textContent = '';
    titleEl.appendChild(host);
    titleEl.classList.add('is-slicing');
    armSlices = () => {
      const words = titleEl.querySelectorAll('.w');
      words.forEach((w, i) => { w.style.setProperty('--wd', (0.08 + i * 0.075).toFixed(2) + 's'); w.classList.add('armed'); });
      const total = 120 + (words.length - 1) * 75 + 620 + 150;
      setTimeout(() => { titleEl.classList.remove('is-slicing'); titleEl.classList.add('slice-done'); }, total);
    };
  }

  function revealHero() {
    document.body.classList.add('loaded');
    document.body.classList.remove('is-loading');
    armSlices();
    $$('.hero .reveal-line').forEach((el, i) => setTimeout(() => el.classList.add('in'), 120 + i * 130));
  }

  /* ---------- splash lifecycle ---------- */
  (() => {
    const splashEl = $('#splash');
    const introSkip = document.documentElement.classList.contains('intro-skip');
    const splashActive = !!splashEl && !introSkip && !reduced;
    let lifted = false;
    const lift = () => {
      if (lifted) return; lifted = true;
      if (splashEl) { splashEl.classList.add('done'); setTimeout(() => splashEl.remove(), 1050); }
      revealHero();
    };
    const hold = location.hash === '#introhold'; /* freeze splash for review */
    if (splashEl && !splashActive) splashEl.remove();
    if (splashActive) {
      try { sessionStorage.setItem('go_intro', '1'); } catch (e) {}
      if (!hold) {
        setTimeout(lift, 2600);
        setTimeout(() => { if (!lifted) lift(); }, 4600); // failsafe
      }
      splashEl.addEventListener('click', lift);
    } else {
      revealHero();
    }
  })();

  /* ---------- Lenis smooth scroll ---------- */
  let lenis;
  if (window.Lenis && !reduced) {
    lenis = new Lenis({ duration: 1.15, lerp: 0.09, wheelMultiplier: 1, smoothWheel: true });
    window.lenis = lenis;
    const raf = t => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
    if (hasGSAP && window.ScrollTrigger) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(t => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    }
    /* marquee leans with scroll velocity — the band feels physical */
    const marqueeEl = $('.marquee');
    if (marqueeEl) {
      let skT = 0, skC = 0, skR = null;
      const skTick = () => {
        skC += (skT - skC) * 0.12;
        marqueeEl.style.transform = `skewX(${skC.toFixed(2)}deg)`;
        if (Math.abs(skT - skC) > 0.02 || Math.abs(skC) > 0.02) skR = requestAnimationFrame(skTick);
        else { marqueeEl.style.transform = ''; skR = null; }
      };
      lenis.on('scroll', e => {
        skT = Math.max(-5, Math.min(5, (e.velocity || 0) * 0.35));
        if (!skR) skR = requestAnimationFrame(skTick);
      });
    }
  }
  // anchor links
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    const t = $(id);
    if (!t) return;
    e.preventDefault();
    lenis ? lenis.scrollTo(t, { offset: -20 }) : t.scrollIntoView({ behavior: 'smooth' });
    closeMenu();
  }));

  /* ---------- reveals ---------- */
  const revealTargets = [...$$('.reveal'), ...$$('.iw'), ...$$('.reveal-line').filter(el => !el.closest('.hero'))];
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(en => {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    revealTargets.forEach(el => io.observe(el));
    // safety net: nothing stays invisible if the observer never fires
    setTimeout(() => revealTargets.forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.top < innerHeight && r.bottom > 0) el.classList.add('in');
    }), 1200);
  } else {
    revealTargets.forEach(el => el.classList.add('in'));
  }

  /* ---------- word-by-word reveal (manifesto, quote) ---------- */
  $$('.reveal-words').forEach(block => {
    const words = block.textContent.trim().split(/\s+/);
    block.innerHTML = words.map(w => `<span class="word">${w}</span>`).join(' ');
    if (hasGSAP && window.ScrollTrigger && !reduced) {
      gsap.to(block.querySelectorAll('.word'), {
        opacity: 1, stagger: 0.06, ease: 'none',
        scrollTrigger: { trigger: block, start: 'top 78%', end: 'bottom 55%', scrub: true }
      });
    } else {
      block.querySelectorAll('.word').forEach(w => w.style.opacity = 1);
    }
  });

  /* ---------- parallax ---------- */
  if (hasGSAP && window.ScrollTrigger && !reduced) {
    /* Homepage-only targets — guarded because collection/product pages
       don't have them and GSAP warned on every load there. */
    if ($('#hero') && $('#heroPiece')) {
      gsap.to('#heroPiece', { yPercent: 14, ease: 'none',
        scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true } });
      gsap.to('.hero__content', { yPercent: -18, opacity: .3, ease: 'none',
        scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true } });
    }
    if ($('.feature') && $('.feature__piece')) {
      gsap.fromTo('.feature__piece', { yPercent: 8 }, { yPercent: -8, ease: 'none',
        scrollTrigger: { trigger: '.feature', start: 'top bottom', end: 'bottom top', scrub: true } });
    }

    /* in-image parallax: media drifts inside its frame while you scroll */
    $$('.col-card__media img, .rugs__media img, .ed-band__media img').forEach(img => {
      img.classList.add('plx');
      gsap.fromTo(img, { yPercent: -7, scale: 1.16 }, {
        yPercent: 7, scale: 1.16, ease: 'none',
        scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });

    /* section titles ease up as they arrive */
    $$('.section-title, .rugs__title, .feature__title').forEach(t => {
      t.classList.add('plx');
      gsap.fromTo(t, { yPercent: 26 }, { yPercent: 0, ease: 'none',
        scrollTrigger: { trigger: t, start: 'top 96%', end: 'top 58%', scrub: true } });
    });
  }

  /* ---------- count-up ---------- */
  const countIO = new IntersectionObserver((entries) => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      const el = en.target, target = +el.dataset.target, suffix = el.dataset.suffix || '';
      const dur = 1600, t0 = performance.now();
      const step = now => {
        const p = Math.min(1, (now - t0) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.floor(eased * target).toLocaleString() + (p === 1 ? suffix : '');
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
      countIO.unobserve(el);
    });
  }, { threshold: 0.6 });
  $$('.count').forEach(el => countIO.observe(el));

  /* ---------- custom cursor ---------- */
  const cursor = $('#cursor'), cLabel = $('#cursorLabel');
  if (cursor && matchMedia('(hover:hover)').matches) {
    let cx = innerWidth / 2, cy = innerHeight / 2, tx = cx, ty = cy;
    addEventListener('mousemove', e => { tx = e.clientX; ty = e.clientY; });
    const loop = () => { cx += (tx - cx) * .18; cy += (ty - cy) * .18;
      cursor.style.transform = `translate(${cx}px,${cy}px) translate(-50%,-50%)`; requestAnimationFrame(loop); };
    loop();
    const hoverables = [
      ['a.prod', 'View'], ['.col-card', 'Open'], ['.hotspot', '+'],
      ['a', ''], ['button', ''], ['.magnetic', '']
    ];
    $$('a, button, .col-card, .prod, .hotspot').forEach(el => {
      const label = el.matches('.prod') ? 'View' : el.matches('.col-card') ? 'Open' : el.matches('.hotspot') ? '+' : '';
      el.addEventListener('mouseenter', () => { cursor.classList.add('is-hover'); cLabel.textContent = label; });
      el.addEventListener('mouseleave', () => { cursor.classList.remove('is-hover'); cLabel.textContent = ''; });
    });
  }

  /* ---------- magnetic buttons ---------- */
  if (matchMedia('(hover:hover)').matches && !reduced) {
    $$('.magnetic').forEach(el => {
      const strength = 22;
      el.addEventListener('mousemove', e => {
        const r = el.getBoundingClientRect();
        const mx = (e.clientX - r.left - r.width / 2) / r.width;
        const my = (e.clientY - r.top - r.height / 2) / r.height;
        el.style.transform = `translate(${mx * strength}px, ${my * strength}px)`;
      });
      el.addEventListener('mouseleave', () => { el.style.transform = ''; });
    });
  }

  /* ---------- header behaviour ---------- */
  const head = $('#siteHead');
  const progressBar = $('#scrollProgress');
  let lastY = 0;
  const onScroll = () => {
    const y = window.scrollY;
    head.classList.toggle('scrolled', y > 40);
    if (y > lastY && y > 400) head.classList.add('hide'); else head.classList.remove('hide');
    lastY = y;
    if (progressBar) {
      const max = document.documentElement.scrollHeight - innerHeight;
      progressBar.style.transform = 'scaleX(' + (max > 0 ? y / max : 0) + ')';
    }
  };
  addEventListener('scroll', onScroll, { passive: true });
  // header colour over light sections
  const lightSections = $$('.collections, .arrivals');
  const headIO = new IntersectionObserver((entries) => {
    entries.forEach(en => {
      if (en.isIntersecting && en.intersectionRatio > 0) head.classList.add('on-light');
      else {
        // only remove if no light section overlaps the header band
        const overlap = lightSections.some(s => {
          const r = s.getBoundingClientRect(); return r.top < 90 && r.bottom > 0;
        });
        head.classList.toggle('on-light', overlap);
      }
    });
  }, { rootMargin: '-1px 0px -99% 0px', threshold: 0 });
  lightSections.forEach(s => headIO.observe(s));

  /* ---------- mobile menu ---------- */
  const burger = $('#burger');
  function closeMenu() { document.body.classList.remove('menu-open'); }
  burger?.addEventListener('click', () => document.body.classList.toggle('menu-open'));
  $$('.mobile-menu a').forEach(a => a.addEventListener('click', closeMenu));

  /* ---------- language toggle ---------- */
  const langToggle = $('#langToggle');
  function setLang(lang) {
    document.documentElement.lang = lang;
    document.body.dataset.lang = lang;
    $$('[data-en]').forEach(el => {
      const v = el.dataset[lang]; if (v != null) el.innerHTML = v;
    });
    $$('[data-en-ph]').forEach(el => {
      const v = el.dataset[lang + 'Ph']; if (v != null) el.placeholder = v;
    });
    $$('.lang__opt').forEach(o => o.classList.toggle('is-active', o.dataset.set === lang));
    try { localStorage.setItem('go_lang', lang); } catch (e) {}
  }
  langToggle?.addEventListener('click', () => {
    setLang(document.body.dataset.lang === 'en' ? 'fr' : 'en');
  });
  try { const saved = localStorage.getItem('go_lang'); if (saved && saved !== 'en') setLang(saved); } catch (e) {}

  /* ---------- WebGL cinematic hero ---------- */
  initHeroGL();
  function initHeroGL() {
    const canvas = $('#heroGL');
    if (!canvas || reduced) return;
    const gl = canvas.getContext('webgl', { antialias: false, alpha: true });
    if (!gl) return;

    const vsrc = `attribute vec2 p; void main(){ gl_Position = vec4(p,0.,1.); }`;
    const fsrc = `
      precision highp float;
      uniform vec2 u_res; uniform float u_t; uniform vec2 u_mouse;
      // hash / noise
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
      float noise(vec2 p){
        vec2 i=floor(p), f=fract(p);
        float a=hash(i), b=hash(i+vec2(1.,0.)), c=hash(i+vec2(0.,1.)), d=hash(i+vec2(1.,1.));
        vec2 u=f*f*(3.-2.*f);
        return mix(a,b,u.x)+(c-a)*u.y*(1.-u.x)+(d-b)*u.x*u.y;
      }
      float fbm(vec2 p){ float v=0.,a=.5; for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.02; a*=.5;} return v; }
      void main(){
        vec2 uv = gl_FragCoord.xy/u_res.xy;
        vec2 asp = vec2(u_res.x/u_res.y,1.);
        vec2 p = (uv-0.5)*asp;

        // base warm-black
        vec3 col = mix(vec3(0.035,0.030,0.026), vec3(0.09,0.075,0.055), uv.y*0.6);

        // drifting fog / dust
        float fog = fbm(p*2.2 + vec2(u_t*0.03, -u_t*0.05));
        fog += 0.5*fbm(p*4.5 - vec2(u_t*0.02, u_t*0.04));
        col += vec3(0.10,0.08,0.05) * smoothstep(0.4,1.2,fog) * 0.5;

        // moving warm spotlight
        vec2 lc = vec2(sin(u_t*0.12)*0.18 + (u_mouse.x-0.5)*0.3, 0.14 + (u_mouse.y-0.5)*0.2);
        float d = length((p-lc));
        float spot = smoothstep(0.95,0.0,d);
        col += vec3(0.78,0.62,0.32) * spot * 0.28;

        // vertical god-ray
        float ray = smoothstep(0.14,0.0,abs(p.x - lc.x*0.6)) * smoothstep(0.9,-0.2,p.y);
        col += vec3(0.7,0.55,0.28) * ray * 0.05;

        // vignette
        float vig = smoothstep(1.25,0.35,length(p));
        col *= vig;

        // faint grain
        col += (hash(uv*u_t)-0.5)*0.02;

        gl_FragColor = vec4(col,1.);
      }`;

    const compile = (type, src) => {
      const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s;
    };
    const prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, vsrc));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fsrc));
    gl.linkProgram(prog); gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, 'u_res');
    const uT = gl.getUniformLocation(prog, 'u_t');
    const uM = gl.getUniformLocation(prog, 'u_mouse');
    let mouse = [0.5, 0.5];
    addEventListener('mousemove', e => { mouse = [e.clientX / innerWidth, 1 - e.clientY / innerHeight]; });

    const dpr = Math.min(1.5, devicePixelRatio || 1);
    function resize() {
      const r = canvas.getBoundingClientRect();
      canvas.width = r.width * dpr; canvas.height = r.height * dpr;
      gl.viewport(0, 0, canvas.width, canvas.height);
    }
    resize(); addEventListener('resize', resize);

    const t0 = performance.now();
    let visible = true;
    document.addEventListener('visibilitychange', () => visible = !document.hidden);
    (function draw() {
      requestAnimationFrame(draw);
      if (!visible) return;
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uT, (performance.now() - t0) / 1000);
      gl.uniform2f(uM, mouse[0], mouse[1]);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    })();
  }

})();
