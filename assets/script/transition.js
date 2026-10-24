(function () {
    'use strict';

    var root = document.documentElement;
    var overlay = document.getElementById('pt');
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var EASE = 'cubic-bezier(0.77, 0, 0.18, 1)';
    var FLAG = 'maszek_pt';
    var leaving = false;

    var DIR = {
        fwd: {
            from: { transform: 'translateY(100%)', borderRadius: '50% 50% 0 0 / 18vh 18vh 0 0' },
            out: { transform: 'translateY(-105%)', borderRadius: '0 0 50% 50% / 0 0 18vh 18vh' }
        },
        back: {
            from: { transform: 'translateY(-100%)', borderRadius: '0 0 50% 50% / 0 0 18vh 18vh' },
            out: { transform: 'translateY(105%)', borderRadius: '50% 50% 0 0 / 18vh 18vh 0 0' }
        }
    };
    var CLOSED = { transform: 'translateY(0)', borderRadius: '0' };

    function go(url, dir) {
        if (leaving) return;
        leaving = true;
        dir = dir === 'back' ? 'back' : 'fwd';
        if (!overlay || reduce || !overlay.animate) { window.location.href = url; return; }
        try { sessionStorage.setItem(FLAG, dir); } catch (e) {}

        overlay.classList.add('is-on');
        var logo = overlay.querySelector('.pt-inner');
        if (logo) {
            logo.animate(
                [{ opacity: 0, transform: 'translateY(18px) scale(0.94)' }, { opacity: 1, transform: 'none' }],
                { duration: 650, delay: 380, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'both' }
            );
        }
        var a = overlay.animate([DIR[dir].from, CLOSED], { duration: 850, easing: EASE, fill: 'forwards' });
        a.finished.then(function () {
            setTimeout(function () { window.location.href = url; }, 260);
        }, function () { window.location.href = url; });
    }
    window.maszekGo = go;

    function finish() {
        root.classList.add('pt-go', 'pt-done');
        if (!overlay) return;
        overlay.getAnimations({ subtree: true }).forEach(function (x) { x.cancel(); });
        overlay.classList.remove('is-on');
    }

    function arrive() {
        var dir = root.classList.contains('pt-back') ? 'back' : 'fwd';
        if (!overlay || reduce || !overlay.animate) { finish(); return; }
        var t0 = Date.now();
        var ready = new Promise(function (resolve) {
            if (document.readyState === 'complete') resolve();
            else window.addEventListener('load', resolve, { once: true });
            setTimeout(resolve, 1600);
        });
        ready.then(function () {
            setTimeout(function () {
                root.classList.add('pt-go');
                var a = overlay.animate([CLOSED, DIR[dir].out], { duration: 1050, easing: EASE, fill: 'forwards' });
                a.finished.then(finish, finish);
            }, Math.max(0, 520 - (Date.now() - t0)));
        });
    }

    if (root.classList.contains('pt-arrive')) arrive();

    document.addEventListener('click', function (e) {
        var el = e.target.closest && e.target.closest('[data-go]');
        if (!el || e.defaultPrevented) return;
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button > 0) return;
        e.preventDefault();
        go(el.getAttribute('data-go'), el.getAttribute('data-dir'));
    });

    window.addEventListener('pageshow', function (e) {
        if (!e.persisted) return;
        leaving = false;
        finish();
    });
})();