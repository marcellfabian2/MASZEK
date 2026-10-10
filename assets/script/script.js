function switchRole(role) {
  const buttons = document.querySelectorAll('.role-btn');
  buttons.forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');
  document.querySelectorAll('.role-view').forEach(view => view.classList.remove('active'));
  document.getElementById(`view-${role}`).classList.add('active');
}
function updateCalc() {
  const price = document.getElementById('calcTrade').value;
  const amount = document.getElementById('calcAmount').value || 1;
  const total = price * amount;
  document.getElementById('calcOutput').innerText = `Becsült munkadíj: ~ ${total.toLocaleString('hu-HU')} Ft`;
}
(function () {
  'use strict';

  const doc = document;
  const root = doc.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const progress = doc.querySelector('.scroll-progress');

  root.classList.add('js-ready');

  const cover = doc.getElementById('cover');

  function scrollbarWidth() {
    const probe = doc.createElement('div');
    probe.style.cssText = 'position:absolute;top:-9999px;width:100px;height:100px;overflow:scroll';
    doc.body.appendChild(probe);
    const w = probe.offsetWidth - probe.clientWidth;
    doc.body.removeChild(probe);
    return w;
  }

  function openSite(instant) {
    if (!cover || !root.classList.contains('is-covered')) return;
    doc.body.style.paddingRight = '';
    if (instant || reduceMotion) {
      root.classList.remove('is-covered');
      cover.remove();
      return;
    }
    cover.classList.add('is-leaving');
    root.classList.remove('is-covered'); 
    setTimeout(function () { cover.remove(); }, 1400);
  }

  if (cover && root.classList.contains('is-covered')) {
    if (location.hash || window.scrollY > 8) {
      openSite(true);
    } else {
      const sw = scrollbarWidth();
      if (sw > 0) doc.body.style.paddingRight = sw + 'px';

      let touchY = null;
      const triggers = [];
      function on(target, type, handler, opts) {
        target.addEventListener(type, handler, opts);
        triggers.push(function () { target.removeEventListener(type, handler, opts); });
      }
      function go() {
        triggers.forEach(function (off) { off(); });
        openSite(false);
      }
      on(window, 'wheel', function (e) { if (e.deltaY > 4) go(); }, { passive: true });
      on(window, 'touchstart', function (e) { touchY = e.touches[0].clientY; }, { passive: true });
      on(window, 'touchmove', function (e) {
        if (touchY !== null && touchY - e.touches[0].clientY > 24) go();
      }, { passive: true });
      on(window, 'keydown', function (e) {
        if (['ArrowDown', 'PageDown', 'End', ' ', 'Spacebar'].indexOf(e.key) > -1) {
          e.preventDefault();
          go();
        }
      });
      const hint = cover.querySelector('.scroll-hint');
      if (hint) hint.addEventListener('click', go);

      window.addEventListener('load', function () {
        if (window.scrollY > 8) { triggers.forEach(function (off) { off(); }); openSite(true); }
      });
    }
  }

  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      const max = root.scrollHeight - window.innerHeight;
      if (progress) progress.style.setProperty('--p', max > 0 ? Math.min(window.scrollY / max, 1) : 0);
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  doc.querySelectorAll('[data-stagger]').forEach(function (group) {
    const variant = group.getAttribute('data-stagger') || 'up';
    Array.from(group.children).forEach(function (child) {
      if (!child.hasAttribute('data-reveal')) child.setAttribute('data-reveal', variant);
    });
  });

  const revealEls = doc.querySelectorAll('[data-reveal]');
  if (!('IntersectionObserver' in window) || reduceMotion) {
    revealEls.forEach(function (el) { el.classList.add('is-visible'); });
  } else {
    const revealObserver = new IntersectionObserver(function (entries) {
      const visible = entries
        .filter(function (e) { return e.isIntersecting; })
        .sort(function (a, b) {
          return (a.boundingClientRect.top - b.boundingClientRect.top) ||
                 (a.boundingClientRect.left - b.boundingClientRect.left);
        });
      visible.forEach(function (entry, i) {
        const el = entry.target;
        el.style.setProperty('--reveal-delay', Math.min(i * 0.12, 0.72) + 's');
        el.classList.add('is-visible');
        revealObserver.unobserve(el);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    revealEls.forEach(function (el) { revealObserver.observe(el); });
  }

  const counters = [];
  doc.querySelectorAll('.stat-item b').forEach(function (el) {
    const m = el.textContent.trim().match(/^([\d.,]+)(.*)$/);
    if (!m) return;
    const decimals = (m[1].split(/[.,]/)[1] || '').length;
    counters.push({
      el: el,
      target: parseFloat(m[1].replace(',', '.')),
      decimals: decimals,
      suffix: m[2],
      done: false
    });
  });

  function runCounter(c, delay) {
    if (c.done) return;
    c.done = true;
    const duration = 1800;
    setTimeout(function () {
      const start = performance.now();
      (function frame(now) {
        const t = Math.min((now - start) / duration, 1);
        const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
        c.el.textContent = (c.target * eased).toFixed(c.decimals) + c.suffix;
        if (t < 1) requestAnimationFrame(frame);
      })(start);
    }, delay);
  }

  if (!reduceMotion && 'IntersectionObserver' in window && counters.length) {
    counters.forEach(function (c) { c.el.textContent = (0).toFixed(c.decimals) + c.suffix; });
    const counterObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        const idx = counters.findIndex(function (c) { return c.el === entry.target; });
        if (idx > -1) runCounter(counters[idx], idx * 120);
        counterObserver.unobserve(entry.target);
      });
    }, { threshold: 0.6 });
    counters.forEach(function (c) { counterObserver.observe(c.el); });
  }

  const navLinks = Array.from(doc.querySelectorAll('.nav-links a[href^="#"]'));
  if ('IntersectionObserver' in window && navLinks.length) {
    const linkById = {};
    navLinks.forEach(function (a) { linkById[a.getAttribute('href').slice(1)] = a; });
    const sectionObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navLinks.forEach(function (l) { l.classList.remove('active'); });
        const link = linkById[entry.target.id];
        if (link) link.classList.add('active');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(linkById).concat('hero').forEach(function (id) {
      const s = doc.getElementById(id);
      if (s) sectionObserver.observe(s);
    });
  }

  let lastFocus = null;
  let closing = false;

  function focusables(modal) {
    return Array.from(modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'))
      .filter(function (el) { return !el.disabled && el.offsetParent !== null; });
  }

  window.openModal = function (name) {
    const modal = doc.getElementById('modal-' + name);
    if (!modal || !modal.hidden) return;

    lastFocus = doc.activeElement;
    const scrollbar = window.innerWidth - root.clientWidth;
    doc.body.style.overflow = 'hidden';
    if (scrollbar > 0) doc.body.style.paddingRight = scrollbar + 'px';

    modal.hidden = false;
    modal.querySelector('.modal-dialog').scrollTop = 0;
    modal.offsetHeight; 
    modal.classList.add('is-open');

    setTimeout(function () {
      const closeBtn = modal.querySelector('.modal-close');
      if (closeBtn) closeBtn.focus({ preventScroll: true });
    }, 60);
  };

  window.closeModal = function (modal, afterClose) {
    if (!modal || modal.hidden || closing) return;
    closing = true;
    modal.classList.remove('is-open');
    setTimeout(function () {
      modal.hidden = true;
      doc.body.style.overflow = '';
      doc.body.style.paddingRight = '';
      closing = false;
      if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
      if (afterClose) afterClose();
    }, reduceMotion ? 0 : 450);
  };

  doc.querySelectorAll('.modal').forEach(function (modal) {
    modal.addEventListener('click', function (e) {
      if (e.target === modal) { window.closeModal(modal); return; }
      const closer = e.target.closest('[data-close]');
      if (!closer) return;
      const goto = closer.getAttribute('data-goto');
      window.closeModal(modal, goto ? function () {
        const target = doc.querySelector(goto);
        if (target) target.scrollIntoView({ behavior: 'smooth' });
      } : null);
    });
  });

  doc.addEventListener('keydown', function (e) {
    const modal = doc.querySelector('.modal:not([hidden])');
    if (!modal) return;
    if (e.key === 'Escape') { window.closeModal(modal); return; }
    if (e.key === 'Tab') {
      const items = focusables(modal);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  const TRADES = [
    { i: '⚡', n: 'VILLANYSZERELÉS', s: 'Villanyszerelés', c: 34, p: 25000, u: 'kiállás',
      d: 'Konnektorok cseréjétől a teljes lakás hálózatkiépítéséig, hibaelhárítás és világítástechnika.' },
    { i: '💧', n: 'VÍZVEZETÉK', s: 'Vízvezeték', c: 28, p: 30000, u: 'pont',
      d: 'Csőtörések elhárítása, csaptelepek cseréje, lefolyótisztítás és komplett fürdőszoba felújítás.' },
    { i: '🎨', n: 'FESTÉS-MÁZOLÁS', s: 'Festés', c: 42, p: 15000, u: 'm²',
      d: 'Beltéri és kültéri festés, gipszkartonozás, tapétázás tiszta és precíz kivitelezéssel.' },
    { i: '🧱', n: 'KŐMŰVESMUNKA', s: 'Kőművesmunka', c: 31, p: 12000, u: 'm²',
      d: 'Falazás, vakolás, aljzatbetonozás és kisebb átalakítások megbízható, tiszta kivitelezése.' },
    { i: '🔲', n: 'BURKOLÁS', s: 'Burkolás', c: 26, p: 9500, u: 'm²',
      d: 'Csempézés, járólap- és kőburkolás konyhában, fürdőben vagy teraszon, hézagolással együtt.' },
    { i: '🪚', n: 'ASZTALOS', s: 'Asztalos', c: 22, p: 8000, u: 'óra',
      d: 'Egyedi bútorok, beépített szekrények, ajtók és lépcsők készítése, valamint bútorjavítás.' },
    { i: '🔥', n: 'FŰTÉSSZERELÉS', s: 'Fűtésszerelés', c: 19, p: 18000, u: 'radiátor',
      d: 'Radiátorok, kazánok és padlófűtés szerelése, karbantartása és a fűtési rendszer hibaelhárítása.' },
    { i: '❄️', n: 'KLÍMASZERELÉS', s: 'Klímaszerelés', c: 17, p: 45000, u: 'db',
      d: 'Klímaberendezések telepítése, tisztítása és szervizelése otthonokba és irodákba.' },
    { i: '🏠', n: 'TETŐFEDÉS', s: 'Tetőfedés', c: 14, p: 11000, u: 'm²',
      d: 'Cserép- és lemezfedés, tetőjavítás, ereszcsatorna-szerelés és tetőszigetelés.' },
    { i: '🪟', n: 'NYÍLÁSZÁRÓK', s: 'Nyílászárók', c: 21, p: 22000, u: 'db',
      d: 'Ablakok, bejárati és erkélyajtók, redőnyök beépítése, cseréje és pontos beállítása.' },
    { i: '🔑', n: 'LAKATOS-ZÁRSZERELŐ', s: 'Lakatos, zárszerelő', c: 16, p: 18000, u: 'kiállás',
      d: 'Zárcsere, ajtóbeállítás, korlátok és kapuk készítése, kizárás esetén gyors segítség.' },
    { i: '🌳', n: 'KERTÉSZET', s: 'Kertészet', c: 29, p: 3500, u: 'm²',
      d: 'Kertrendezés, fűnyírás, sövényvágás, növénytelepítés és öntözőrendszer kiépítése.' },
    { i: '🧹', n: 'TAKARÍTÁS', s: 'Takarítás', c: 38, p: 4500, u: 'óra',
      d: 'Lakás- és irodatakarítás, építkezés utáni takarítás, ablakpucolás és nagytakarítás.' },
    { i: '📦', n: 'KÖLTÖZTETÉS', s: 'Költöztetés', c: 24, p: 9000, u: 'óra',
      d: 'Bútorok és dobozok pakolása, szerelése és szállítása gyorsan, gondosan, sérülés nélkül.' },
    { i: '🧺', n: 'KISGÉP-JAVÍTÁS', s: 'Háztartásigép-javítás', c: 20, p: 14000, u: 'kiállás',
      d: 'Mosógép, hűtő, mosogatógép és más háztartási gépek hibafeltárása és javítása.' },
    { i: '🚗', n: 'AUTÓSZERELÉS', s: 'Autószerelés', c: 27, p: 12000, u: 'óra',
      d: 'Szerviz, fékek, futómű, hibakódolvasás és kisebb javítások, akár házhoz menő szereléssel.' },
    { i: '💻', n: 'SZÁMÍTÁSTECHNIKA', s: 'Számítástechnika', c: 23, p: 8000, u: 'óra',
      d: 'Számítógép- és laptopjavítás, vírusirtás, hálózat- és wifi-beállítás, adatmentés.' },
    { i: '📚', n: 'MAGÁNTANÁR', s: 'Magántanár', c: 45, p: 6000, u: 'óra',
      d: 'Korrepetálás és felkészítés az általános iskolától az érettségiig, sok tantárgyból.' },
    { i: '🎵', n: 'ZENETANÁR', s: 'Zenetanár', c: 18, p: 5500, u: 'óra',
      d: 'Hangszeres és énekoktatás minden szinten, kezdőktől a haladókig, otthon vagy online.' },
    { i: '🗣️', n: 'NYELVOKTATÁS', s: 'Nyelvoktatás', c: 25, p: 6500, u: 'óra',
      d: 'Angol, német és más nyelvek tanítása, nyelvvizsga-felkészítés egyéni órákon.' },
    { i: '📷', n: 'FOTÓZÁS', s: 'Fotózás', c: 15, p: 40000, u: 'alkalom',
      d: 'Családi, portré- és esküvői fotózás, termékfotó, valamint rendezvények megörökítése.' },
    { i: '💇', n: 'FODRÁSZ-KOZMETIKUS', s: 'Fodrász, kozmetikus', c: 14, p: 9000, u: 'alkalom',
      d: 'Hajvágás, festés, manikűr és arcápolás kényelmesen, akár házhoz menő szolgáltatással.' },
    { i: '🐕', n: 'ÁLLATGONDOZÁS', s: 'Állatgondozás', c: 13, p: 3000, u: 'alkalom',
      d: 'Kutyasétáltatás, állatfelügyelet és gondozás, amíg te nem vagy otthon.' },
    { i: '🎉', n: 'RENDEZVÉNYSZERVEZÉS', s: 'Rendezvényszervezés', c: 11, p: 60000, u: 'nap',
      d: 'Születésnapok, esküvők és céges események szervezése a helyszíntől a díszítésig.' },
    { i: '🧵', n: 'VARRÁS-SZABÁS', s: 'Varrás, szabás', c: 12, p: 5000, u: 'db',
      d: 'Ruhajavítás, átalakítás, függönyvarrás és egyedi méretre szabott darabok.' },
    { i: '🏗️', n: 'SZÁRAZÉPÍTÉS', s: 'Szárazépítés', c: 25, p: 7500, u: 'm²',
      d: 'Álmennyezetek, válaszfalak és tetőtér-beépítések gipszkartonnal, precíz glettelés.' },
    { i: '🪵', n: 'PARKETTÁZÁS', s: 'Parkettázás', c: 18, p: 6500, u: 'm²',
      d: 'Parketta és laminált padló fektetése, csiszolása, lakkozása és javítása.' },
    { i: '📹', n: 'BIZTONSÁGTECHNIKA', s: 'Biztonságtechnika', c: 10, p: 30000, u: 'kiállás',
      d: 'Riasztó-, kamera- és beléptetőrendszerek telepítése és karbantartása.' },
    { i: '🧰', n: 'BARKÁCS-JAVÍTÁS', s: 'Barkács, kisjavítás', c: 33, p: 7000, u: 'óra',
      d: 'Polcfelszerelés, bútorösszeszerelés, csepegő csap és más apró otthoni javítások.' },
    { i: '🚛', n: 'FUVAROZÁS', s: 'Fuvarozás', c: 21, p: 500, u: 'km',
      d: 'Kisteherautós és teherautós szállítás, építőanyag- és bútorfuvarozás országszerte.' }
  ];
  const PER_PAGE = 3;
  const ROTATE_MS = 60000;

  function escapeHtml(str) {
    return String(str).replace(/[&<>"]/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch];
    });
  }

  function cardHtml(t) {
    return '<div>' +
             '<div class="service-img-placeholder">' + t.i + '</div>' +
             '<h3>' + escapeHtml(t.n) + '</h3>' +
             '<p>' + escapeHtml(t.d) + '</p>' +
           '</div>' +
           '<button class="btn btn-teal" style="width: 100%;">Szakember (' + t.c + ')</button>';
  }

  const servicesGrid = doc.getElementById('servicesGrid');
  if (servicesGrid) {
    const pages = Math.ceil(TRADES.length / PER_PAGE);
    let current = 0;
    let swapping = false;
    let elapsed = 0;
    let hovered = false;
    let inView = false;
    let maxHeight = 0;

    // lapozó pontok
    const pager = doc.createElement('div');
    pager.className = 'services-pager';
    pager.setAttribute('role', 'group');
    pager.setAttribute('aria-label', 'Szakmák oldalai');
    const dots = [];
    for (let p = 0; p < pages; p++) {
      const dot = doc.createElement('button');
      dot.type = 'button';
      dot.className = 'pager-dot';
      dot.setAttribute('aria-label', (p + 1) + '. oldal');
      dot.innerHTML = '<i></i>';
      dot.addEventListener('click', function () { goTo(p); });
      pager.appendChild(dot);
      dots.push(dot);
    }
    servicesGrid.insertAdjacentElement('afterend', pager);

    function markActive() {
      dots.forEach(function (d, k) {
        d.classList.toggle('is-active', k === current);
        d.setAttribute('aria-current', k === current ? 'true' : 'false');
        d.firstChild.style.transform = 'scaleX(0)';
      });
    }

    function holdHeight() {
      const h = servicesGrid.offsetHeight;
      if (h > maxHeight) { maxHeight = h; servicesGrid.style.minHeight = maxHeight + 'px'; }
    }

    function goTo(page) {
      if (swapping || page === current) return;
      swapping = true;
      elapsed = 0;
      holdHeight();

      const oldCards = Array.from(servicesGrid.children);
      oldCards.forEach(function (card, k) {
        card.removeAttribute('data-reveal');
        card.style.setProperty('--sd', (k * 0.1) + 's');
        card.classList.add('swap-out');
      });

      const outTime = reduceMotion ? 0 : 750;
      setTimeout(function () {
        current = page;
        servicesGrid.innerHTML = '';
        TRADES.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE).forEach(function (t, k) {
          const card = doc.createElement('div');
          card.className = 'service-card swap-in';
          card.style.setProperty('--sd', (k * 0.12) + 's');
          card.innerHTML = cardHtml(t);
          servicesGrid.appendChild(card);
        });
        holdHeight();
        markActive();
        setTimeout(function () { swapping = false; }, reduceMotion ? 0 : 1000);
      }, outTime);
    }
    markActive();
    new IntersectionObserver(function (entries) {
      inView = entries[0].isIntersecting;
      if (inView) holdHeight();
    }, { threshold: 0.35 }).observe(servicesGrid);

    ['mouseenter', 'focusin'].forEach(function (ev) {
      servicesGrid.addEventListener(ev, function () { hovered = true; });
      pager.addEventListener(ev, function () { hovered = true; });
    });
    ['mouseleave', 'focusout'].forEach(function (ev) {
      servicesGrid.addEventListener(ev, function () { hovered = false; });
      pager.addEventListener(ev, function () { hovered = false; });
    });
    let last = performance.now();
    (function tick(now) {
      const dt = Math.min(now - last, 100);
      last = now;
      if (inView && !hovered && !swapping && !doc.hidden && !doc.querySelector('.modal:not([hidden])')) {
        elapsed += dt;
        const fill = dots[current] && dots[current].firstChild;
        if (fill) fill.style.transform = 'scaleX(' + Math.min(elapsed / ROTATE_MS, 1) + ')';
        if (elapsed >= ROTATE_MS) goTo((current + 1) % pages);
      }
      requestAnimationFrame(tick);
    })(last);
  }
  const calcSelect = doc.getElementById('calcTrade');
  const calcAmount = doc.getElementById('calcAmount');
  const calcUnit = doc.getElementById('calcUnitLabel');
  const calcOut = doc.getElementById('calcOutput');

  function pulseResult() {
    if (!calcOut || reduceMotion) return;
    calcOut.classList.remove('pulse');
    calcOut.offsetWidth;
    calcOut.classList.add('pulse');
  }
  function syncUnit() {
    const opt = calcSelect.options[calcSelect.selectedIndex];
    if (calcUnit && opt) calcUnit.textContent = 'Mennyiség (' + opt.dataset.unit + '):';
  }

  if (calcSelect) {
    calcSelect.innerHTML = '';
    TRADES.forEach(function (t) {
      const o = doc.createElement('option');
      o.value = t.p;
      o.dataset.unit = t.u;
      o.textContent = t.s + ' (' + t.u + ' alapon)';
      calcSelect.appendChild(o);
    });
    const paint = TRADES.findIndex(function (t) { return t.s === 'Festés'; });
    calcSelect.selectedIndex = paint > -1 ? paint : 0;
    syncUnit();
    updateCalc();

    calcSelect.addEventListener('change', function () { syncUnit(); pulseResult(); });
    if (calcAmount) calcAmount.addEventListener('input', pulseResult);
  }
})();