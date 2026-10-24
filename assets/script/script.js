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

    if (cover && !root.classList.contains('is-covered')) cover.remove();

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
    const mqMobile = window.matchMedia('(max-width: 640px)');
    const mqTablet = window.matchMedia('(min-width: 641px) and (max-width: 1024px)');
    const canHover = window.matchMedia('(hover: hover)').matches;
    function perPage() { return mqMobile.matches ? 1 : (mqTablet.matches ? 2 : 3); }
    function rotateMs() { return mqMobile.matches ? 8000 : 20000; }

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
        let pp = perPage();
        let pages = Math.ceil(TRADES.length / pp);
        let current = 0, swapping = false, elapsed = 0, hovered = false, inView = false, maxHeight = 0;
        let dots = [];

        const pager = doc.createElement('div');
        pager.className = 'services-pager';
        pager.setAttribute('role', 'group');
        pager.setAttribute('aria-label', 'Szakmák oldalai');
        const count = doc.createElement('span');
        count.className = 'pager-count';
        servicesGrid.insertAdjacentElement('afterend', pager);

        function buildPager() {
            pager.innerHTML = '';
            dots = [];
            pager.classList.toggle('is-compact', mqMobile.matches);
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
            pager.appendChild(count);
        }

        function markActive() {
            dots.forEach(function (d, k) {
                d.classList.toggle('is-active', k === current);
                d.setAttribute('aria-current', k === current ? 'true' : 'false');
                d.firstChild.style.transform = 'scaleX(0)';
            });
            count.textContent = (current + 1) + ' / ' + pages;
        }

        function holdHeight() {
            const h = servicesGrid.offsetHeight;
            if (h > maxHeight) { maxHeight = h; servicesGrid.style.minHeight = maxHeight + 'px'; }
        }

        function renderPage(page, cls) {
            servicesGrid.innerHTML = '';
            TRADES.slice(page * pp, page * pp + pp).forEach(function (t, k) {
                const card = doc.createElement('div');
                card.className = 'service-card' + (cls ? ' ' + cls : '');
                card.style.setProperty('--sd', (k * 0.12) + 's');
                card.innerHTML = cardHtml(t);
                servicesGrid.appendChild(card);
            });
        }

        function isSlide() { return mqMobile.matches || mqTablet.matches; }
        function slideTo(page, dir, fromX, fromOpacity) {
            if (swapping || page === current) return;
            swapping = true;
            elapsed = 0;
            holdHeight();
            const w = servicesGrid.offsetWidth;
            const dur = reduceMotion ? 0 : 240;
            const op0 = (fromOpacity === undefined || fromOpacity === '') ? 1 : parseFloat(fromOpacity);
            const out = servicesGrid.animate([
                { transform: 'translateX(' + (fromX || 0) + 'px)', opacity: op0 },
                { transform: 'translateX(' + (-dir * w * 0.5) + 'px)', opacity: 0 }
            ], { duration: dur, easing: 'ease-in', fill: 'forwards' });
            servicesGrid.style.transform = '';
            servicesGrid.style.opacity = '';
            out.onfinish = function () {
                current = page;
                renderPage(page);
                holdHeight();
                markActive();
                const inn = servicesGrid.animate([
                    { transform: 'translateX(' + (dir * w * 0.5) + 'px)', opacity: 0 },
                    { transform: 'translateX(0)', opacity: 1 }
                ], { duration: dur * 1.2, easing: 'ease-out' });
                out.cancel();
                inn.onfinish = function () { swapping = false; };
            };
        }

        function goTo(page, dir) {
            if (swapping || page === current) return;
            if (isSlide()) { slideTo(page, dir || (page > current ? 1 : -1), 0); return; }
            swapping = true;
            elapsed = 0;
            holdHeight();
            Array.from(servicesGrid.children).forEach(function (card, k) {
                card.removeAttribute('data-reveal');
                card.style.setProperty('--sd', (k * 0.1) + 's');
                card.classList.add('swap-out');
            });
            setTimeout(function () {
                current = page;
                renderPage(page, 'swap-in');
                holdHeight();
                markActive();
                setTimeout(function () { swapping = false; }, reduceMotion ? 0 : 1000);
            }, reduceMotion ? 0 : 750);
        }
        function relayout() {
            pp = perPage();
            pages = Math.ceil(TRADES.length / pp);
            current = 0; elapsed = 0; maxHeight = 0; swapping = false;
            servicesGrid.style.minHeight = '';
            renderPage(0);
            buildPager();
            markActive();
            holdHeight();
        }
        mqMobile.addEventListener('change', relayout);
        mqTablet.addEventListener('change', relayout);

        if (pp !== 3) renderPage(0);
        buildPager();
        markActive();

        let drag = null, justDragged = false;
        servicesGrid.addEventListener('pointerdown', function (e) {
            if (!isSlide() || swapping || (e.pointerType === 'mouse' && e.button !== 0)) return;
            drag = { x: e.clientX, y: e.clientY, dx: 0, active: false };
        });
        servicesGrid.addEventListener('pointermove', function (e) {
            if (!drag) return;
            const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
            if (!drag.active) {
                if (Math.abs(dx) < 10 || Math.abs(dx) < Math.abs(dy)) return;
                drag.active = true;
                try { servicesGrid.setPointerCapture(e.pointerId); } catch (_) {}
            }
            drag.dx = dx;
            servicesGrid.style.transform = 'translateX(' + dx + 'px)';
            servicesGrid.style.opacity = String(1 - Math.min(Math.abs(dx) / servicesGrid.offsetWidth, 0.6));
        });
        function endDrag() {
            if (!drag) return;
            const d = drag;
            drag = null;
            if (!d.active) return;
            justDragged = true;
            setTimeout(function () { justDragged = false; }, 60);
            if (Math.abs(d.dx) > Math.min(80, servicesGrid.offsetWidth * 0.2) && pages > 1) {
                const dir = d.dx < 0 ? 1 : -1;
                slideTo((current + dir + pages) % pages, dir, d.dx, servicesGrid.style.opacity);
            } else {
                servicesGrid.style.transition = 'transform .25s ease, opacity .25s ease';
                servicesGrid.style.transform = '';
                servicesGrid.style.opacity = '';
                setTimeout(function () { servicesGrid.style.transition = ''; }, 260);
            }
        }
        servicesGrid.addEventListener('pointerup', endDrag);
        servicesGrid.addEventListener('pointercancel', endDrag);
        servicesGrid.addEventListener('click', function (e) {
            if (justDragged) { e.preventDefault(); e.stopPropagation(); }
        }, true);

        new IntersectionObserver(function (entries) {
            inView = entries[0].isIntersecting;
            if (inView) holdHeight();
        }, { threshold: 0.35 }).observe(servicesGrid);

        if (canHover) {
            ['mouseenter', 'focusin'].forEach(function (ev) {
                servicesGrid.addEventListener(ev, function () { hovered = true; });
                pager.addEventListener(ev, function () { hovered = true; });
            });
            ['mouseleave', 'focusout'].forEach(function (ev) {
                servicesGrid.addEventListener(ev, function () { hovered = false; });
                pager.addEventListener(ev, function () { hovered = false; });
            });
        }

        let last = performance.now();
        (function tick(now) {
            const dt = Math.min(now - last, 100);
            last = now;
            if (inView && !hovered && !drag && !swapping && !doc.hidden && !doc.querySelector('.modal:not([hidden])')) {
                elapsed += dt;
                const fill = dots[current] && dots[current].firstChild;
                const ms = rotateMs();
                if (fill) fill.style.transform = 'scaleX(' + Math.min(elapsed / ms, 1) + ')';
                if (elapsed >= ms) goTo((current + 1) % pages, 1);
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

const services = document.getElementById("servicesGrid");

services.addEventListener("mousemove", function(event) {
        const card = event.target.closest(".service-card");
        if (card) {
                const rect = card.getBoundingClientRect();
                const x = event.clientX - rect.left;
                const y = event.clientY - rect.top;
                card.style.setProperty("--x", x + "px");
                card.style.setProperty("--y", y + "px");
        }
});

(function () {
    'use strict';

    const doc = document;
    const root = doc.documentElement;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function isAuth() { return false; }
    function closeResults() { results.classList.remove('is-open'); }

    const PROS = [
        { n: 'Szabó Gergely', t: 'Villanyszerelés', k: 'villanyszerelő villany', c: 'Budapest', r: 4.9, j: 126, p: '25 000 Ft / kiállás' },
        { n: 'Tóth Bence', t: 'Villanyszerelés', k: 'villanyszerelő villany', c: 'Debrecen', r: 4.8, j: 84, p: '24 000 Ft / kiállás' },
        { n: 'Kiss Dávid', t: 'Vízvezeték', k: 'vízvezeték-szerelő víz csap', c: 'Szeged', r: 4.9, j: 97, p: '30 000 Ft / pont' },
        { n: 'Horváth Péter', t: 'Vízvezeték', k: 'vízvezeték-szerelő víz csap', c: 'Győr', r: 4.7, j: 61, p: '28 000 Ft / pont' },
        { n: 'Varga Zsolt', t: 'Festés', k: 'festő mázoló tapéta', c: 'Szombathely', r: 5.0, j: 143, p: '15 000 Ft / m²' },
        { n: 'Molnár Ádám', t: 'Festés', k: 'festő mázoló tapéta', c: 'Pécs', r: 4.8, j: 72, p: '14 500 Ft / m²' },
        { n: 'Nagy László', t: 'Kőművesmunka', k: 'kőműves vakolás', c: 'Miskolc', r: 4.7, j: 58, p: '12 000 Ft / m²' },
        { n: 'Farkas Imre', t: 'Burkolás', k: 'burkoló csempe járólap', c: 'Kecskemét', r: 4.9, j: 88, p: '9 500 Ft / m²' },
        { n: 'Balogh Márton', t: 'Asztalos', k: 'asztalos bútor', c: 'Veszprém', r: 4.8, j: 49, p: '8 000 Ft / óra' },
        { n: 'Papp Tamás', t: 'Fűtésszerelés', k: 'fűtésszerelő kazán radiátor', c: 'Székesfehérvár', r: 4.6, j: 41, p: '18 000 Ft / radiátor' },
        { n: 'Takács Norbert', t: 'Klímaszerelés', k: 'klímaszerelő klíma', c: 'Budapest', r: 4.9, j: 112, p: '45 000 Ft / db' },
        { n: 'Juhász Attila', t: 'Tetőfedés', k: 'tetőfedő tető', c: 'Zalaegerszeg', r: 4.7, j: 37, p: '11 000 Ft / m²' },
        { n: 'Simon Roland', t: 'Nyílászárók', k: 'ablak ajtó redőny', c: 'Nyíregyháza', r: 4.8, j: 63, p: '22 000 Ft / db' },
        { n: 'Lakatos Gábor', t: 'Lakatos, zárszerelő', k: 'lakatos zár zárszerelő', c: 'Budapest', r: 4.9, j: 154, p: '18 000 Ft / kiállás' },
        { n: 'Mészáros Viktor', t: 'Kertészet', k: 'kertész kert fűnyírás', c: 'Eger', r: 4.8, j: 76, p: '3 500 Ft / m²' },
        { n: 'Oláh Katalin', t: 'Takarítás', k: 'takarító takarítás', c: 'Budapest', r: 5.0, j: 201, p: '4 500 Ft / óra' },
        { n: 'Fehér Zoltán', t: 'Költöztetés', k: 'költöztető szállítás', c: 'Szolnok', r: 4.6, j: 55, p: '9 000 Ft / óra' },
        { n: 'Kovács Anna', t: 'Magántanár', k: 'tanár korrepetálás matematika', c: 'Szombathely', r: 5.0, j: 168, p: '6 000 Ft / óra' },
        { n: 'Németh Eszter', t: 'Nyelvoktatás', k: 'nyelvtanár angol német', c: 'Budapest', r: 4.9, j: 132, p: '6 500 Ft / óra' },
        { n: 'Gál Boglárka', t: 'Zenetanár', k: 'zene zongora gitár', c: 'Pécs', r: 4.8, j: 47, p: '5 500 Ft / óra' },
        { n: 'Sípos Máté', t: 'Számítástechnika', k: 'informatikus számítógép laptop', c: 'Debrecen', r: 4.8, j: 119, p: '8 000 Ft / óra' },
        { n: 'Bíró Krisztián', t: 'Autószerelés', k: 'autószerelő autó szerviz', c: 'Győr', r: 4.7, j: 93, p: '12 000 Ft / óra' },
        { n: 'Szűcs Dóra', t: 'Fotózás', k: 'fotós fotó', c: 'Budapest', r: 4.9, j: 66, p: '40 000 Ft / alkalom' },
        { n: 'Pál Renáta', t: 'Fodrász, kozmetikus', k: 'fodrász kozmetikus haj', c: 'Szeged', r: 4.8, j: 109, p: '9 000 Ft / alkalom' },
        { n: 'Rácz Sándor', t: 'Barkács, kisjavítás', k: 'barkács szerelő javítás', c: 'Kaposvár', r: 4.7, j: 138, p: '7 000 Ft / óra' },
        { n: 'Vincze Lajos', t: 'Szárazépítés', k: 'gipszkarton álmennyezet', c: 'Tatabánya', r: 4.8, j: 52, p: '7 500 Ft / m²' }
    ];

    function esc(str) {
        return String(str).replace(/[&<>"']/g, function (ch) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
        });
    }
    function norm(v) {
        return String(v).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
            .replace(/ő/g, 'o').replace(/ű/g, 'u');
    }
    function stem(t) {
        if (t.length >= 7) return t.slice(0, -2);
        if (t.length >= 4) return t.slice(0, -1);
        return t;
    }
    function initials(name) {
        return name.split(' ').map(function (w) { return w.charAt(0); }).slice(0, 2).join('');
    }
    function stars(r) {
        return '★ ' + r.toFixed(1).replace('.', ',');
    }
    PROS.forEach(function (p) { p.hay = norm([p.n, p.t, p.k, p.c].join(' ')); });

    function searchPros(q) {
        const tokens = norm(q).split(/\s+/).filter(Boolean).map(stem);
        if (!tokens.length) return [];
        return PROS.filter(function (p) {
            return tokens.every(function (t) { return p.hay.indexOf(t) !== -1; });
        }).sort(function (a, b) { return b.r - a.r || b.j - a.j; });
    }

    const gateEyebrow = doc.getElementById('gate-eyebrow');
    const gateTitle = doc.getElementById('gate-title');
    const gateText = doc.getElementById('gate-text');
    const gateChip = doc.getElementById('gate-chip');

    function openGate(reason, data) {
        let eyebrow = 'Vágjunk bele!';
        let title = 'Lépj be a folytatáshoz';
        let text = 'Jelentkezz be vagy regisztrálj, és máris megtalálhatod a számodra megfelelő szakembert.';
        let chip = '';
        if (reason === 'search') {
            eyebrow = 'Keresés';
            title = 'A kereséshez be kell lépned';
            text = 'A keresés a regisztrált tagjaink számára érhető el. Lépj be, vagy hozz létre egy ingyenes fiókot.';
            if (data && data.q) chip = '<span class="gc-ico">🔍</span><span class="gc-main"><b>' + esc(data.q) + '</b><small>' + (data.count ? data.count + ' szakember vár erre' : 'a keresésed') + '</small></span>';
        } else if (reason === 'pick') {
            eyebrow = 'Szakember kiválasztása';
            title = 'Jelentkezz be a kiválasztáshoz';
            text = 'Lépj be, és felveheted a kapcsolatot a szakemberrel, megbeszélhetitek az időpontot és az árat.';
            if (data && data.pro) {
                const p = data.pro;
                chip = '<span class="pro-avatar">' + esc(initials(p.n)) + '</span><span class="gc-main"><b>' + esc(p.n) + '</b><small>' + esc(p.t) + ' · ' + esc(p.c) + ' · ' + stars(p.r) + '</small></span>';
            }
        }
        gateEyebrow.textContent = eyebrow;
        gateTitle.textContent = title;
        gateText.textContent = text;
        gateChip.innerHTML = chip;
        gateChip.hidden = !chip;
        window.openModal('gate');
    }

    const startBtn = doc.getElementById('startBtn');
    if (startBtn) {
        startBtn.addEventListener('click', function () {
            if (isAuth()) {
                const t = doc.getElementById('szolgaltatasok');
                if (t) t.scrollIntoView({ behavior: 'smooth' });
            } else {
                openGate('start');
            }
        });
    }

    const input = doc.getElementById('searchInput');
    const btn = doc.getElementById('searchBtn');
    const suggest = doc.getElementById('searchSuggest');
    const results = doc.getElementById('searchResults');
    const srInner = doc.getElementById('srInner');
    if (!input || !suggest || !results) return;

    let items = [];
    let active = -1;

    function mark(text, q) {
        const tokens = norm(q).split(/\s+/).filter(Boolean).map(stem);
        const plain = norm(text);
        let ranges = [];
        tokens.forEach(function (t) {
            const i = plain.indexOf(t);
            if (i !== -1) ranges.push([i, i + t.length]);
        });
        if (!ranges.length) return esc(text);
        ranges.sort(function (a, b) { return a[0] - b[0]; });
        let out = '', pos = 0;
        ranges.forEach(function (r) {
            if (r[0] < pos) return;
            out += esc(text.slice(pos, r[0])) + '<mark>' + esc(text.slice(r[0], r[1])) + '</mark>';
            pos = r[1];
        });
        return out + esc(text.slice(pos));
    }

    function openSuggest() {
        suggest.classList.add('is-open');
        input.setAttribute('aria-expanded', 'true');
    }
    function closeSuggest() {
        suggest.classList.remove('is-open');
        input.setAttribute('aria-expanded', 'false');
        active = -1;
    }

    function renderSuggest() {
        const q = input.value.trim();
        if (!q) { closeSuggest(); return; }
        const found = searchPros(q);
        items = found.slice(0, 5);
        active = -1;
        const lock = isAuth() ? '' : '<span class="suggest-lock" title="Bejelentkezés szükséges">🔒</span>';
        if (!items.length) {
            suggest.innerHTML = '<div class="suggest-empty">Erre még nincs találat. Próbáld így: <b>villanyszerelő</b>, <b>festő</b> vagy <b>magántanár</b>.</div>';
        } else {
            suggest.innerHTML = '<div class="suggest-head">Szakemberek · bemutató profilok</div>' + items.map(function (p, i) {
                return '<button type="button" class="suggest-item" role="option" data-i="' + i + '">' +
                    '<span class="pro-avatar">' + esc(initials(p.n)) + '</span>' +
                    '<span class="suggest-main"><span class="suggest-name">' + mark(p.n, q) + '</span>' +
                    '<span class="suggest-sub">' + mark(p.t, q) + ' · ' + mark(p.c, q) + '</span></span>' +
                    '<span class="suggest-rating">' + stars(p.r) + '</span>' + lock + '</button>';
            }).join('') + (found.length > items.length ? '<div class="suggest-more">+ ' + (found.length - items.length) + ' további találat</div>' : '');
        }
        openSuggest();
    }

    function setActive(i) {
        const nodes = suggest.querySelectorAll('.suggest-item');
        if (!nodes.length) return;
        active = (i + nodes.length) % nodes.length;
        nodes.forEach(function (n, k) { n.classList.toggle('is-active', k === active); });
        nodes[active].scrollIntoView({ block: 'nearest' });
    }

    function pick(p) {
        closeSuggest();
        if (!isAuth()) { openGate('pick', { pro: p }); return; }
        input.value = p.n;
        runSearch();
    }

    suggest.addEventListener('mousedown', function (e) { e.preventDefault(); });
    suggest.addEventListener('click', function (e) {
        const it = e.target.closest('.suggest-item');
        if (it) pick(items[+it.dataset.i]);
    });
    input.addEventListener('input', renderSuggest);
    input.addEventListener('focus', function () { if (input.value.trim()) renderSuggest(); });
    input.addEventListener('blur', function () { setTimeout(closeSuggest, 120); });
    input.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowDown') { e.preventDefault(); if (!suggest.classList.contains('is-open')) renderSuggest(); setActive(active + 1); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active - 1); }
        else if (e.key === 'Escape') { closeSuggest(); }
        else if (e.key === 'Enter') {
            e.preventDefault();
            if (active > -1 && items[active]) pick(items[active]);
            else runSearch();
        }
    });
    btn.addEventListener('click', runSearch);

    function shakeInput() {
        const wrap = doc.getElementById('heroSearch');
        wrap.classList.remove('is-shaking');
        void wrap.offsetWidth;
        wrap.classList.add('is-shaking');
        input.focus();
    }

    function runSearch() {
        const q = input.value.trim();
        closeSuggest();
        if (!q) { shakeInput(); return; }
        const found = searchPros(q);
        if (!isAuth()) {
            openGate('search', { q: q, count: found.length });
            return;
        }
        renderResults(q, found);
    }

    const selected = {};
    function renderResults(q, found) {
        let html = '<div class="sr-head"><h3>' + (found.length ? found.length + ' találat' : 'Nincs találat') +
            ' <span>erre: „' + esc(q) + '”</span></h3>' +
            '<button type="button" class="sr-close" id="srClose" aria-label="Találatok bezárása">✕</button></div>';
        if (!found.length) {
            html += '<p class="sr-empty">Erre még nincs szakember a rendszerben. Próbálj másik szakmát vagy várost.</p>';
        } else {
            html += '<div class="pro-grid">' + found.map(function (p, i) {
                const on = !!selected[p.n];
                return '<article class="pro-card" style="--sd:' + Math.min(i * 0.07, 0.5) + 's">' +
                    '<div class="pro-top"><span class="pro-avatar">' + esc(initials(p.n)) + '</span>' +
                    '<div class="pro-who"><h4>' + esc(p.n) + '</h4><span>' + esc(p.t) + ' · ' + esc(p.c) + '</span></div>' +
                    '<span class="pro-rating">' + stars(p.r) + '</span></div>' +
                    '<div class="pro-meta"><span>' + p.j + ' elvégzett munka</span><span>' + esc(p.p) + '</span></div>' +
                    '<button type="button" class="btn btn-teal pro-pick' + (on ? ' is-selected' : '') + '" data-name="' + esc(p.n) + '">' +
                    (on ? '✓ Kiválasztva' : 'Kiválasztom') + '</button></article>';
            }).join('') + '</div>';
        }
        srInner.innerHTML = html;
        results.classList.add('is-open');
        if (!reduceMotion) setTimeout(function () {
            const r = results.getBoundingClientRect();
            if (r.bottom > window.innerHeight) window.scrollBy({ top: r.bottom - window.innerHeight + 24, behavior: 'smooth' });
        }, 350);
    }

    results.addEventListener('click', function (e) {
        if (e.target.closest('#srClose')) { closeResults(); return; }
        const b = e.target.closest('.pro-pick');
        if (!b) return;
        const p = PROS.find(function (x) { return x.n === b.dataset.name; });
        if (!p) return;
        if (!isAuth()) { openGate('pick', { pro: p }); return; }
        selected[p.n] = !selected[p.n];
        b.classList.toggle('is-selected', !!selected[p.n]);
        b.textContent = selected[p.n] ? '✓ Kiválasztva' : 'Kiválasztom';
    });
})();