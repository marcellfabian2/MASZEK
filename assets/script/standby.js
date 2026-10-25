(function () {
    'use strict';

    const IDLE_MS = window.maszekStandbyMs || 2 * 60 * 1000;
    const EVENTS = ['mousemove', 'mousedown', 'pointerdown', 'keydown', 'touchstart', 'wheel', 'scroll'];
    const ICONS = [
        ['⚡', '9%', '16%', '0s'],
        ['💧', '86%', '12%', '1.2s'],
        ['🎨', '12%', '70%', '2.1s'],
        ['🔧', '82%', '66%', '0.7s'],
        ['🏠', '92%', '40%', '1.8s'],
        ['🛠️', '46%', '6%', '2.6s']
    ];
    const TITLE = ['Minden', 'hibára', 'van', 'egy', 'jó', '<em>mester.</em>'];

    const doc = document;
    let timer = 0;
    let clockTimer = 0;
    let active = false;
    let overlay = null;
    let clockTime = null;
    let clockDate = null;

    function sparks() {
        let html = '';
        for (let i = 0; i < 28; i++) {
            const x = (i * 37 + 11) % 100;
            const size = 2 + (i % 4);
            const dur = 9 + (i % 7) * 1.6;
            const delay = -((i * 1.7) % dur);
            html += '<i style="--x:' + x + '%;--s:' + size + 'px;--t:' + dur + 's;--d:' + delay + 's"></i>';
        }
        return html;
    }

    function build() {
        overlay = doc.createElement('div');
        overlay.className = 'standby';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-label', 'Készenléti mód');
        overlay.setAttribute('aria-hidden', 'true');
        overlay.innerHTML =
            '<div class="standby-sparks" aria-hidden="true">' + sparks() + '</div>' +
            '<div class="standby-icons" aria-hidden="true">' +
            ICONS.map(function (i, k) {
                return '<span style="--x:' + i[1] + ';--y:' + i[2] + ';--d:' + i[3] + ';--k:' + (k % 3) + '">' + i[0] + '</span>';
            }).join('') +
            '</div>' +
            '<div class="standby-clock" aria-hidden="true"><b class="standby-time"></b><span class="standby-date"></span></div>' +
            '<div class="standby-inner">' +
            '<div class="standby-top">' +
            '<img class="standby-logo" src="assets/image/maszek_fullLogo.png" alt="MASZEK">' +
            '<span class="standby-tag">Magyar Szakember Kereső</span>' +
            '</div>' +
            '<h2 class="standby-title" aria-label="Minden hibára van egy jó mester.">' +
            TITLE.map(function (w, i) {
                return '<span class="standby-word" aria-hidden="true" style="--w:' + i + '"><span>' + w + '</span></span>';
            }).join(' ') +
            '</h2>' +
            '<div class="standby-bottom">' +
            '<p class="standby-hint">Nyomj meg egy gombot vagy mozdítsd az egeret a folytatáshoz</p>' +
            '</div>' +
            '</div>';
        doc.body.appendChild(overlay);

        clockTime = overlay.querySelector('.standby-time');
        clockDate = overlay.querySelector('.standby-date');

        const logo = overlay.querySelector('.standby-logo');
        logo.addEventListener('error', function () {
            const w = doc.createElement('span');
            w.className = 'standby-word-mark';
            w.textContent = 'MASZEK';
            logo.replaceWith(w);
        });
    }

    function tickClock() {
        const now = new Date();
        clockTime.textContent = now.toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' });
        clockDate.textContent = now.toLocaleDateString('hu-HU', { month: 'long', day: 'numeric', weekday: 'long' });
    }

    function enter() {
        if (active) return;
        if (!overlay) build();
        active = true;
        overlay.setAttribute('aria-hidden', 'false');
        tickClock();
        clockTimer = setInterval(tickClock, 1000);
        void overlay.offsetWidth;
        overlay.classList.add('is-on');
        if (doc.activeElement && doc.activeElement.blur) doc.activeElement.blur();
    }

    function leave() {
        active = false;
        clearInterval(clockTimer);
        overlay.classList.remove('is-on');
        overlay.setAttribute('aria-hidden', 'true');
    }

    function arm() {
        clearTimeout(timer);
        timer = setTimeout(enter, IDLE_MS);
    }

    function onActivity(e) {
        if (active) {
            e.preventDefault();
            e.stopPropagation();
            leave();
        }
        arm();
    }

    EVENTS.forEach(function (type) {
        window.addEventListener(type, onActivity, { capture: true, passive: false });
    });

    doc.addEventListener('click', function (e) {
        if (active) {
            e.preventDefault();
            e.stopPropagation();
        }
    }, true);

    doc.addEventListener('visibilitychange', function () {
        if (!doc.hidden) arm();
    });

    window.maszekStandby = { enter: enter, leave: leave };
    arm();
})();