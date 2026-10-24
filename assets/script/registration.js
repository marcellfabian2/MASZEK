(function () {
    'use strict';

    const MIN_AGE = 18;
    const REDIRECT_URL = '';
    const STORAGE_KEY = 'maszek_felhasznalok';
    const NOTE_MAX = 200;

    const TYPE_LABEL = { felhasznalo: 'Felhasználó', mester: 'Mester' };
    const TYPE_RGB = { felhasznalo: '29,158,117', mester: '216,90,48' };

    const doc = document;
    const $ = function (sel, root) { return (root || doc).querySelector(sel); };
    const $$ = function (sel, root) { return Array.from((root || doc).querySelectorAll(sel)); };
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const canHover = window.matchMedia('(hover: hover)').matches;
    const wait = function (ms) { return new Promise(function (r) { setTimeout(r, reduceMotion ? 0 : ms); }); };

    const shell = $('#shell');

    let memoryUsers = [];
    function loadUsers() {
        try {
            const list = JSON.parse(localStorage.getItem(STORAGE_KEY));
            return Array.isArray(list) ? list : memoryUsers;
        } catch (e) { return memoryUsers; }
    }
    function saveUsers(list) {
        memoryUsers = list;
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch (e) {}
    }
    function findUser(name) {
        const n = String(name).trim().toLowerCase();
        return loadUsers().find(function (u) { return String(u.f_nev || '').toLowerCase() === n; });
    }
    function fixHu(v) {
        return String(v)
            .normalize('NFC')
            .replace(/õ/g, 'ő').replace(/Õ/g, 'Ő').replace(/û/g, 'ű').replace(/Û/g, 'Ű')
            .replace(/[‘’ʼ´`]/g, "'")
            .replace(/[‐-―−]/g, '-');
    }
    function cleanText(v) {
        return fixHu(v).replace(/[  -​ ]/g, ' ').replace(/\s+/g, ' ').trim();
    }
    function stripAccents(v) {
        return v.normalize('NFD').replace(/[̀-ͯ]/g, '');
    }
    function levenshtein(a, b) {
        const dp = [];
        for (let i = 0; i <= a.length; i++) { dp[i] = [i]; }
        for (let j = 1; j <= b.length; j++) { dp[0][j] = j; }
        for (let i = 1; i <= a.length; i++) {
            for (let j = 1; j <= b.length; j++) {
                dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
            }
        }
        return dp[a.length][b.length];
    }

    const TITLE_RE = /^(dr|prof|ifj|id|özv|néhai)\.?$/i;
    const PARTICLES = ['von', 'van', 'de', 'di', 'da', 'del', 'der', 'den', 'la', 'le', 'du', 'zu', 'af', 'al', 'el', 'bin', 'ibn', 'ben', 'dos', 'das'];
    const NAME_WORD_RE = /^\p{Lu}\p{Ll}*(?:[-']\p{Lu}\p{Ll}*)*$/u;
    const INITIAL_RE = /^\p{Lu}\.$/u;

    function checkFullName(v) {
        if (!v) return 'Add meg a teljes neved.';
        if (v.length > 80) return 'A név legfeljebb 80 karakter lehet.';
        if (/\d/.test(v)) return 'A név nem tartalmazhat számot.';
        if (/[^\p{L}\p{M}\-'. ]/u.test(v)) return 'Csak betűket használj (szóköz, kötőjel és pont megengedett).';
        if (/(.)\1{3,}/iu.test(v)) return 'Ez nem tűnik valódi névnek – ellenőrizd az írásmódot.';
        const tokens = v.split(' ').filter(Boolean);
        let i = 0;
        while (i < tokens.length - 1 && TITLE_RE.test(tokens[i])) i++;
        const words = tokens.slice(i);
        const real = words.filter(function (w) { return !INITIAL_RE.test(w) && PARTICLES.indexOf(w) === -1; });
        if (real.length < 2) return 'Add meg a vezeték- és a keresztneved is (pl. Kovács Péter).';
        for (let k = 0; k < words.length; k++) {
            const w = words[k];
            if (INITIAL_RE.test(w)) continue;
            if (PARTICLES.indexOf(w) !== -1 && k > 0 && k < words.length - 1) continue;
            if (w.length > 25) return 'Egy névrész legfeljebb 25 karakter lehet.';
            if (w.length < 2) return 'Egy névrész legalább 2 betűs legyen.';
            if (!/^\p{Lu}/u.test(w)) return 'Minden névrész nagybetűvel kezdődjön (pl. Kovács Péter).';
            if (!NAME_WORD_RE.test(w)) return 'Csak a névrészek első betűje lehet nagybetű (pl. Nagy-Kovács Éva).';
        }
        return '';
    }

    function ageFromISO(iso) {
        const p = iso.split('-').map(Number);
        const t = new Date();
        let age = t.getFullYear() - p[0];
        const m = t.getMonth() + 1;
        if (m < p[1] || (m === p[1] && t.getDate() < p[2])) age--;
        return age;
    }
    function checkBirth(v) {
        if (!v) return 'Add meg a születési dátumodat.';
        const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
        if (!m) return 'Kérlek, valós dátumot adj meg.';
        const y = +m[1], mo = +m[2], da = +m[3];
        const d = new Date(y, mo - 1, da);
        if (d.getFullYear() !== y || d.getMonth() !== mo - 1 || d.getDate() !== da) return 'Ez a dátum nem létezik (pl. február 30.).';
        if (d > new Date()) return 'A dátum nem lehet a jövőben.';
        const age = ageFromISO(v);
        if (y < 1900 || age > 120) return 'Kérlek, valós születési dátumot adj meg.';
        if (age < MIN_AGE) return 'A regisztrációhoz legalább ' + MIN_AGE + ' évesnek kell lenned.';
        return '';
    }

    const CITY_RE = /^\p{Lu}[\p{L}.\- ]*$/u;
    const STREET_RE = /^\p{Lu}[\p{L}.\-' ]*\s\d+(?:[\/-][0-9A-Za-z]+)?[A-Za-z]?\.?(?:[,\s]+[\p{L}0-9.\/\- ]+)?$/u;
    function checkAddress(v) {
        if (!v) return 'Add meg a lakcímedet.';
        const zm = /^(\d+)\s*(.*)$/.exec(v);
        if (!zm) return 'Az irányítószámmal kezdd (4 számjegy), pl. 9700 Szombathely, Király utca 10.';
        const zip = zm[1], rest = zm[2];
        if (zip.length < 4) return 'Az irányítószám 4 számjegyű.';
        if (zip.length > 4) return 'Az irányítószám csak 4 számjegy lehet.';
        if (+zip < 1011) return 'Ilyen irányítószám nincs (1011 és 9999 között van).';
        if (!rest) return 'Az irányítószám után add meg a település nevét.';
        const parts = rest.split(',');
        const city = parts[0].trim();
        if (!/^\p{Lu}/u.test(city)) return 'A településnév nagybetűvel kezdődjön (pl. Szombathely).';
        if (parts.length === 1 && /\d/.test(city)) return 'Vesszővel válaszd el a települést az utcától (pl. 9700 Szombathely, Király utca 10.).';
        if (!CITY_RE.test(city)) return 'A településnév csak betűket tartalmazhat.';
        const street = parts.slice(1).join(',').trim();
        if (!street) return 'Vesszővel elválasztva add meg az utcát és a házszámot (pl. 9700 Szombathely, Király utca 10.).';
        if (!/^\p{Lu}/u.test(street)) return 'Az utcanév nagybetűvel kezdődjön (pl. Király utca 10.).';
        if (!/\d/.test(street)) return 'A házszámot is add meg (pl. Király utca 10.).';
        if (!STREET_RE.test(street)) return 'Az utca és a házszám formátuma nem megfelelő. Példa: Király utca 10. vagy Fő tér 3/A.';
        return '';
    }

    const MOBILE_PREFIXES = ['20', '30', '31', '50', '70'];
    const LANDLINE_AREAS = ['22', '23', '24', '25', '26', '27', '28', '29', '32', '33', '34', '35', '36', '37', '38', '42', '44', '45', '46', '47', '48', '49', '52', '53', '54', '55', '56', '57', '59', '62', '63', '66', '68', '69', '72', '73', '74', '75', '76', '77', '78', '79', '82', '83', '84', '85', '87', '88', '89', '92', '93', '94', '95', '96', '99'];
    function nationalLength(d) {
        if (d.charAt(0) === '1') return 8;
        return MOBILE_PREFIXES.indexOf(d.slice(0, 2)) !== -1 ? 9 : 8;
    }
    function checkPhone(v) {
        if (!v) return 'Add meg a telefonszámodat.';
        if (!/^\+36/.test(v)) return 'A számot +36-tal kezdd (pl. +36 20 123 4567).';
        const d = v.replace(/\D/g, '').slice(2);
        if (!d) return 'Írd be a számot a +36 után.';
        if (d.charAt(0) === '0') return 'Az előhívó nem kezdődhet 0-val – a 06 helyett elég a +36.';
        const isBp = d.charAt(0) === '1';
        const pre = d.slice(0, 2);
        if (!isBp && d.length >= 2 && MOBILE_PREFIXES.indexOf(pre) === -1 && LANDLINE_AREAS.indexOf(pre) === -1) {
            return 'Ismeretlen előhívó. Mobil: 20, 30, 31, 50, 70 – vezetékes: pl. 1 (Budapest), 22, 94.';
        }
        if (d.length < 2 && !isBp) return 'Még hiányzik néhány számjegy (pl. +36 20 123 4567).';
        const need = nationalLength(d);
        if (d.length < need) return 'Még hiányzik ' + (need - d.length) + ' számjegy.';
        if (d.length > need) return 'Túl sok számjegy – ennek a számnak ' + need + ' jegyűnek kell lennie.';
        if (/^(\d)\1+$/.test(d.slice(isBp ? 1 : 2))) return 'Ez nem tűnik valódi telefonszámnak.';
        return '';
    }

    const EMAIL_LOCAL_RE = /^[A-Za-z0-9!#$%&'*+\/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+\/=?^_`{|}~-]+)*$/;
    const DOMAIN_LABEL_RE = /^[\p{L}\p{N}](?:[\p{L}\p{N}-]*[\p{L}\p{N}])?$/u;
    const KNOWN_DOMAINS = ['gmail.com', 'freemail.hu', 'citromail.hu', 't-online.hu', 'hotmail.com', 'outlook.com', 'outlook.hu',
        'yahoo.com', 'icloud.com', 'indamail.hu', 'vipmail.hu', 'protonmail.com', 'live.com', 'mailbox.hu', 'upcmail.hu',
        'invitel.hu', 'vodafonemail.hu', 'azet.hu', 'gmx.com', 'me.com', 'msn.com', 'freemail.com'];
    function suggestDomain(domain) {
        if (KNOWN_DOMAINS.indexOf(domain) !== -1) return '';
        let best = '', bestD = 3;
        KNOWN_DOMAINS.forEach(function (k) {
            const dist = levenshtein(domain, k);
            if (dist < bestD) { bestD = dist; best = k; }
        });
        return bestD <= 2 && domain.length >= 6 ? best : '';
    }
    function checkEmail(v) {
        if (!v) return 'Add meg az e-mail címedet.';
        if (/\s/.test(v)) return 'Az e-mail cím nem tartalmazhat szóközt.';
        const at = v.indexOf('@');
        if (at === -1) return 'Az e-mail címben szerepelnie kell egy @ jelnek.';
        if (at !== v.lastIndexOf('@')) return 'Csak egy @ jel lehet az e-mail címben.';
        const local = v.slice(0, at), domain = v.slice(at + 1);
        if (!local) return 'A @ jel előtt add meg a címed első részét (pl. nev).';
        if (!domain) return 'A @ jel után add meg a szolgáltatót (pl. gmail.com).';
        if (v.length > 254 || local.length > 64) return 'Ez az e-mail cím túl hosszú.';
        if (/[^\x00-\x7F]/.test(local)) return 'A @ előtti rész ékezet nélkül írandó (pl. ' + stripAccents(local) + ').';
        if (/^\.|\.$/.test(local)) return 'A cím eleje és vége nem lehet pont.';
        if (/\.\./.test(local)) return 'Két pont nem állhat egymás mellett.';
        if (!EMAIL_LOCAL_RE.test(local)) return 'A @ előtt nem megengedett karakter szerepel.';
        if (domain.indexOf('.') === -1) return 'A szolgáltató neve után pont és végződés kell (pl. gmail.com).';
        const labels = domain.split('.');
        if (labels.some(function (l) { return !l; })) return 'A szolgáltató neve után nem állhat üres rész vagy dupla pont.';
        if (labels.some(function (l) { return l.length > 63 || !DOMAIN_LABEL_RE.test(l); })) return 'A szolgáltató neve nem megfelelő (pl. gmail.com).';
        if (!/^\p{L}{2,}$/u.test(labels[labels.length - 1])) return 'A végződés legalább 2 betű legyen (pl. .hu, .com).';
        const sug = suggestDomain(domain.toLowerCase());
        if (sug) return { text: 'Biztosan jó? Talán erre gondoltál: ' + local + '@' + sug, warn: true };
        return '';
    }

    const RESERVED_NAMES = ['admin', 'administrator', 'root', 'maszek', 'support', 'info', 'mester', 'felhasznalo', 'system', 'null', 'undefined', 'test'];
    function checkUsername(v) {
        if (!v) return 'Válassz egy felhasználónevet.';
        if (/[áéíóöőúüűÁÉÍÓÖŐÚÜŰ]/.test(v)) return 'Ékezet nélkül add meg (pl. ' + stripAccents(v).toLowerCase() + ').';
        if (v.length < 3) return 'Legalább 3 karakter legyen.';
        if (v.length > 20) return 'Legfeljebb 20 karakter lehet.';
        if (!/^[A-Za-z0-9._-]+$/.test(v)) return 'Csak betű, szám, pont, kötőjel és alsóvonás használható.';
        if (/^[._-]|[._-]$/.test(v)) return 'Ne kezdődjön és ne végződjön ponttal, kötőjellel vagy alsóvonással.';
        if (/[._-]{2}/.test(v)) return 'Két írásjel ne álljon egymás mellett.';
        if (/^\d+$/.test(v)) return 'Legyen benne legalább egy betű.';
        if (RESERVED_NAMES.indexOf(v.toLowerCase()) !== -1) return 'Ez a név le van foglalva, válassz másikat.';
        if (findUser(v)) return 'Ez a felhasználónév már foglalt.';
        return { text: 'Szabad felhasználónév!' };
    }

    const PW_RULES = {
        hossz: function (v) { return v.length >= 8; },
        nagybetu: function (v) { return /\p{Lu}/u.test(v); },
        szam: function (v) { return /[0-9]/.test(v); },
        specialis: function (v) { return /[^\p{L}\p{N}\s]/u.test(v); }
    };
    const PW_MISSING = { hossz: 'legalább 8 karakter', nagybetu: 'nagybetű', szam: 'szám', specialis: 'speciális karakter' };
    const COMMON_WORDS = ['jelszo', 'password', 'qwerty', 'qwertz', 'asdf', 'asdfgh', 'maszek', 'admin', 'welcome', 'letmein', 'iloveyou',
        'budapest', 'magyarorszag', 'szia', 'titok', 'kutya', 'macska', 'foci', 'alma', 'abc', 'test', 'teszt', 'login', 'master'];
    const SEQUENCES = ['0123456789', 'abcdefghijklmnopqrstuvwxyz', 'qwertzuiop', 'asdfghjkl', 'yxcvbnm', 'qwertyuiop', 'zyxwvutsrqponmlkjihgfedcba', '9876543210'];
    function pwIssue(v) {
        const base = stripAccents(v).toLowerCase().replace(/[^a-z0-9]/g, '');
        if (COMMON_WORDS.indexOf(base.replace(/\d+$/, '')) !== -1 || /^(\d)\1*$/.test(base) || base === '12345678') return 'Ez a jelszó túl gyakori és könnyen kitalálható.';
        if (/(.)\1{3,}/u.test(v)) return 'Ne ismételj ugyanazt a karaktert 4-nél többször egymás után.';
        const low = stripAccents(v).toLowerCase();
        for (let i = 0; i < SEQUENCES.length; i++) {
            for (let k = 0; k + 5 <= SEQUENCES[i].length; k++) {
                if (low.indexOf(SEQUENCES[i].slice(k, k + 5)) !== -1) return 'Kerüld az egymás utáni karaktereket (pl. 12345, abcde, qwert).';
            }
        }
        return '';
    }
    function checkPassword(v) {
        if (!v) return 'Adj meg egy jelszót.';
        if (/^\s|\s$/.test(v)) return 'A jelszó ne kezdődjön és ne végződjön szóközzel.';
        const missing = Object.keys(PW_RULES).filter(function (k) { return !PW_RULES[k](v); });
        if (missing.length) return 'Még hiányzik: ' + missing.map(function (k) { return PW_MISSING[k]; }).join(', ') + '.';
        if (v.length > 64) return 'A jelszó legfeljebb 64 karakter lehet.';
        const uname = fields.felhasznalonev ? fields.felhasznalonev.read().toLowerCase() : '';
        if (uname.length >= 3 && v.toLowerCase().indexOf(uname) !== -1) return 'A jelszó ne tartalmazza a felhasználónevedet.';
        return pwIssue(v);
    }

    const fields = {};

    function shake(el) {
        if (!el) return;
        el.classList.remove('shake');
        void el.offsetWidth;
        el.classList.add('shake');
        setTimeout(function () { el.classList.remove('shake'); }, 650);
    }

    function paint(f, state, text, warn) {
        const w = f.wrap;
        w.classList.toggle('is-valid', state === 'valid');
        w.classList.toggle('is-invalid', state === 'invalid');
        w.classList.toggle('show-warn', state === 'valid' && !!text && !!warn);
        f.input.setAttribute('aria-invalid', state === 'invalid' ? 'true' : 'false');
        if (state === 'invalid') {
            f.msgP.textContent = text;
            w.classList.remove('show-ok');
        } else if (state === 'valid' && text) {
            f.msgP.textContent = text;
            w.classList.toggle('show-ok', !warn);
        } else {
            w.classList.remove('show-ok');
        }
    }

    function evaluate(f) {
        const r = f.check(f.read());
        if (!r) return { ok: true };
        if (typeof r === 'object') return { ok: true, text: r.text, warn: !!r.warn };
        return { ok: false, msg: r };
    }

    function update(f, force) {
        const res = evaluate(f);
        if (res.ok) paint(f, f.quiet ? 'neutral' : 'valid', res.text, res.warn);
        else if (force || f.touched) paint(f, 'invalid', res.msg);
        else paint(f, 'neutral');
        return res.ok;
    }

    function addField(id, opts) {
        const input = $('#' + id);
        const wrap = input.closest('.field');
        const msgP = $('.msg p', wrap);
        msgP.id = id + '-msg';
        input.setAttribute('aria-describedby', msgP.id);
        const f = {
            id: id, input: input, wrap: wrap, msgP: msgP,
            check: opts.check,
            read: opts.read || function () { return input.value.trim(); },
            format: opts.format || null,
            quiet: !!opts.quiet,
            touched: false, dirty: false
        };
        fields[id] = f;

        input.addEventListener('input', function () {
            f.dirty = true;
            if (opts.touchOnInput) f.touched = true;
            if (f.format) f.format(f, 'input');
            update(f, false);
            if (opts.onInput) opts.onInput(f);
        });
        input.addEventListener('blur', function () {
            if (f.format) f.format(f, 'blur');
            if (f.dirty || input.value) f.touched = true;
            update(f, false);
            if (opts.onBlur) opts.onBlur(f);
        });
        return f;
    }

    function titleCaseName(v) {
        if (!v) return v;
        if (v !== v.toLowerCase() && v !== v.toUpperCase()) return v;
        return v.toLowerCase().split(' ').map(function (w, i) {
            if (i > 0 && PARTICLES.indexOf(w) !== -1) return w;
            return w.replace(/(^|[-'])(\p{Ll})/gu, function (m, sep, ch) { return sep + ch.toUpperCase(); });
        }).join(' ');
    }
    function nameFormat(f, when) {
        if (when !== 'blur') return;
        f.input.value = titleCaseName(cleanText(f.input.value));
    }

    function addressFormat(f, when) {
        if (when !== 'blur') return;
        f.input.value = cleanText(f.input.value).replace(/\s*,\s*/g, ', ').replace(/,$/, '');
    }
    function noSpaceFormat(f, when) {
        if (when === 'input') {
            const el = f.input, pos = el.selectionStart, before = el.value;
            const cleaned = before.replace(/\s+/g, '');
            if (cleaned !== before) { el.value = cleaned; try { el.setSelectionRange(pos - 1, pos - 1); } catch (e) {} }
        }
    }
    function emailFormat(f, when) {
        noSpaceFormat(f, when);
        if (when === 'blur') f.input.value = f.input.value.trim().toLowerCase();
    }
    function noteFormat(f, when) {
        if (when === 'blur') f.input.value = cleanText(f.input.value);
    }

    function formatPhone(raw) {
        const plus = raw.trim().charAt(0) === '+';
        let d = raw.replace(/\D/g, '');
        if (plus) {
            if (d.length <= 2 && '36'.indexOf(d) === 0) return '+' + d;
            if (d.indexOf('36') === 0) d = d.slice(2);
        } else if (d.indexOf('0036') === 0) {
            d = d.slice(4);
        } else if (d.indexOf('06') === 0) {
            d = d.slice(2);
        } else if (d === '0' || d === '00' || d === '003') {
            return d;
        } else if (d.indexOf('36') === 0 && d.length >= 10) {
            d = d.slice(2);
        }
        d = d.slice(0, nationalLength(d));
        let parts;
        if (d.charAt(0) === '1') parts = [d.slice(0, 1), d.slice(1, 4), d.slice(4, 8)];
        else if (MOBILE_PREFIXES.indexOf(d.slice(0, 2)) !== -1) parts = [d.slice(0, 2), d.slice(2, 5), d.slice(5, 9)];
        else parts = [d.slice(0, 2), d.slice(2, 5), d.slice(5, 8)];
        parts = parts.filter(Boolean);
        return '+36' + (parts.length ? ' ' + parts.join(' ') : ' ');
    }
    function phoneFormat(f, when) {
        const el = f.input;
        if (!el.value) return;
        if (when === 'input' && el.selectionStart !== el.value.length) return;
        const formatted = formatPhone(el.value);
        if (formatted !== el.value) el.value = formatted;
        if (when === 'blur') el.value = el.value.trim();
    }

    addField('teljnev', { check: checkFullName, format: nameFormat });
    addField('szuldatum', { check: checkBirth, touchOnInput: true });
    addField('tel', { check: checkPhone, format: phoneFormat });
    addField('email', { check: checkEmail, format: emailFormat });
    addField('lakcim', { check: checkAddress, format: addressFormat });
    addField('felhasznalonev', {
        check: checkUsername,
        format: noSpaceFormat,
        onInput: function () { if (fields.jelszo && fields.jelszo.dirty) update(fields.jelszo, false); }
    });

    const noteCount = $('#note-count');
    const noteChips = $$('.chip-add');
    function noteTokens() {
        return $('#megjegyzes').value.split(/,\s*/).map(function (s) { return s.trim(); }).filter(Boolean);
    }
    function syncNote() {
        const len = $('#megjegyzes').value.length;
        noteCount.textContent = len + '/' + NOTE_MAX;
        const tokens = noteTokens();
        noteChips.forEach(function (c) { c.classList.toggle('is-on', tokens.indexOf(c.dataset.add) !== -1); });
    }
    addField('megjegyzes', { quiet: true, check: function () { return ''; }, format: noteFormat, onInput: syncNote });
    noteChips.forEach(function (c) {
        c.addEventListener('click', function () {
            const ta = $('#megjegyzes');
            let tokens = noteTokens();
            if (tokens.indexOf(c.dataset.add) !== -1) tokens = tokens.filter(function (t) { return t !== c.dataset.add; });
            else tokens.push(c.dataset.add);
            ta.value = tokens.join(', ').slice(0, NOTE_MAX);
            syncNote();
        });
    });

    const pwField = addField('jelszo', {
        check: checkPassword,
        read: function () { return $('#jelszo').value; },
        onInput: function (f) {
            paintPasswordMeter(f.input.value);
            if (fields.jelszomegegyszer.dirty) update(fields.jelszomegegyszer, true);
        }
    });
    let pwCloseTimer = 0;
    function placePwPop() {
        const pop = $('#pw-panel');
        const ctl = $('.control', pwField.wrap).getBoundingClientRect();
        const limit = actions.getBoundingClientRect().top - 8;
        const room = limit - (ctl.bottom + 9);
        pwField.wrap.classList.toggle('pw-up', pop.offsetHeight > room);
    }
    window.addEventListener('resize', placePwPop);
    pwField.input.addEventListener('focus', function () {
        clearTimeout(pwCloseTimer);
        placePwPop();
        pwField.wrap.classList.add('pw-open');
        paintPasswordMeter(pwField.input.value);
    });
    pwField.input.addEventListener('blur', function () {
        pwCloseTimer = setTimeout(function () { pwField.wrap.classList.remove('pw-open'); }, 160);
    });

    addField('jelszomegegyszer', {
        read: function () { return $('#jelszomegegyszer').value; },
        check: function (v) {
            if (!v) return 'Írd be még egyszer a jelszót.';
            if (v !== $('#jelszo').value) return 'A két jelszó nem egyezik.';
            return { text: 'A jelszavak egyeznek.' };
        }
    });

    const LEVEL_LABELS = ['Add meg a jelszavad', 'Gyenge', 'Közepes', 'Jó', 'Erős'];
    function paintPasswordMeter(v) {
        const met = {};
        Object.keys(PW_RULES).forEach(function (k) { met[k] = PW_RULES[k](v); });
        $$('#rules li').forEach(function (li) { li.classList.toggle('is-met', !!met[li.dataset.rule]); });
        const count = Object.keys(met).filter(function (k) { return met[k]; }).length;
        let level = 0;
        if (v) {
            if (count <= 1) level = 1;
            else if (count < 4) level = 2;
            else level = v.length >= 12 ? 4 : 3;
            if (pwIssue(v)) level = Math.min(level, 1);
        }
        $('#meter').dataset.level = level;
        $('#meter-label').textContent = LEVEL_LABELS[level];
    }

    (function () {
        const el = $('#szuldatum');
        const t = new Date();
        const iso = function (d) { return d.toISOString().slice(0, 10); };
        el.max = iso(t);
        el.min = iso(new Date(t.getFullYear() - 120, t.getMonth(), t.getDate()));
        const mark = function () { el.classList.toggle('has-value', !!el.value); };
        ['input', 'change', 'blur'].forEach(function (ev) { el.addEventListener(ev, mark); });
        mark();
    })();

    $$('.eye').forEach(function (btn) {
        btn.addEventListener('click', function () {
            const input = $('#' + btn.dataset.eye);
            const show = input.type === 'password';
            input.type = show ? 'text' : 'password';
            btn.setAttribute('aria-pressed', show ? 'true' : 'false');
            btn.setAttribute('aria-label', show ? 'Jelszó elrejtése' : 'Jelszó megjelenítése');
            input.focus({ preventScroll: true });
            const len = input.value.length;
            try { input.setSelectionRange(len, len); } catch (e) {}
        });
    });

    const toastEl = $('#toast');
    const toastText = $('#toast-text');
    const toastAct = $('#toast-action');
    let toastTimer = 0;
    function hideToast() { toastEl.classList.remove('is-open'); }
    function toast(text, opts) {
        opts = opts || {};
        toastText.textContent = text;
        toastEl.classList.toggle('is-ok', !!opts.ok);
        toastAct.hidden = !opts.action;
        if (opts.action) {
            toastAct.textContent = opts.action.label;
            toastAct.onclick = function () { hideToast(); opts.action.run(); };
        }
        toastEl.classList.add('is-open');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(hideToast, opts.action ? 7000 : 4200);
    }

    const regForm = $('#register-form');
    const regFlow = $('#reg-flow');
    const stepper = $('#stepper');
    const panes = $$('.step', regForm);
    const actions = $('#actions');
    const btnBack = $('#btn-back');
    const btnNext = $('#btn-next');
    const btnNextText = $('#btn-next-text');
    const eyebrowEl = $('#reg-eyebrow');
    const leadEl = $('#reg-lead');
    const STEP_FIELDS = {
        1: [],
        2: ['teljnev', 'szuldatum', 'tel'],
        3: ['email', 'lakcim', 'megjegyzes'],
        4: ['felhasznalonev', 'jelszo', 'jelszomegegyszer']
    };
    const LEADS = {
        1: 'Válaszd ki, hogyan használod a MASZEK-et.',
        2: 'Mesélj magadról röviden.',
        3: 'Hogyan érhetünk el?',
        4: 'Már csak a belépési adataid hiányoznak.'
    };
    const TOTAL = 4;
    let step = 1;
    let regTipus = '';
    let lastRegistered = null;

    function stepFields(n) {
        return STEP_FIELDS[n];
    }

    function retick(el) {
        el.classList.remove('tick');
        void el.offsetWidth;
        el.classList.add('tick');
    }

    function paintHead() {
        eyebrowEl.textContent = step === 1 || !regTipus
            ? 'Csatlakozz a MASZEK-hez'
            : 'Regisztráció ' + (regTipus === 'mester' ? 'mesterként' : 'felhasználóként');
        leadEl.textContent = LEADS[step];
        retick(eyebrowEl);
        retick(leadEl);
    }

    function goStep(n, opts) {
        opts = opts || {};
        step = n;
        regFlow.dataset.step = n;
        panes.forEach(function (p) {
            const s = +p.dataset.step;
            p.classList.toggle('is-active', s === n);
            p.classList.toggle('is-before', s < n);
            p.inert = s !== n;
        });
        $$('li', stepper).forEach(function (li) {
            const s = +li.dataset.step;
            li.classList.toggle('is-done', s < n);
            li.classList.toggle('is-current', s === n);
            li.querySelector('button').setAttribute('aria-current', s === n ? 'step' : 'false');
        });
        stepper.style.setProperty('--fill', (n - 1) / (TOTAL - 1));
        syncStepsHeight();
        actions.hidden = n === 1;
        btnBack.hidden = n === 1;
        btnNextText.textContent = n === TOTAL ? 'Regisztráció' : 'Tovább';
        paintHead();
        if (opts.focus !== false) {
            setTimeout(function () {
                const first = $('input, textarea', panes[n - 1]);
                if (first && canHover && !first.readOnly) first.focus({ preventScroll: true });
            }, reduceMotion ? 0 : 450);
        }
    }

    const stepsBox = $('#steps');
    function syncStepsHeight() {
        const active = panes[step - 1];
        if (active) stepsBox.style.height = active.offsetHeight + 'px';
    }
    if ('ResizeObserver' in window) {
        const ro = new ResizeObserver(syncStepsHeight);
        panes.forEach(function (p) { ro.observe(p); });
    }
    window.addEventListener('resize', syncStepsHeight);

    function validateStep(n) {
        if (n === 1) {
            if (!regTipus) {
                shake($('#types'));
                toast('Válaszd ki, hogy mesterként vagy felhasználóként regisztrálsz.');
                return false;
            }
            return true;
        }
        let firstBad = null;
        stepFields(n).forEach(function (id) {
            const f = fields[id];
            f.touched = true;
            if (!update(f, true)) {
                shake(f.wrap);
                if (!firstBad) firstBad = f;
            }
        });
        if (firstBad) {
            firstBad.input.focus();
            return false;
        }
        return true;
    }

    regForm.addEventListener('submit', function (e) {
        e.preventDefault();
        if (btnNext.classList.contains('is-loading')) return;
        if (!validateStep(step)) return;
        if (step < TOTAL) goStep(step + 1);
        else submitRegistration();
    });
    btnBack.addEventListener('click', function () { if (step > 1) goStep(step - 1); });
    $$('li button', stepper).forEach(function (b) {
        b.addEventListener('click', function () {
            const n = +b.closest('li').dataset.step;
            if (n < step) goStep(n);
        });
    });

    const typeCards = $$('.type-card');
    let advanceTimer = 0;

    function burst(card) {
        if (reduceMotion) return;
        const art = $('.tc-art', card);
        const cs = getComputedStyle(card);
        const colors = [cs.getPropertyValue('--tc').trim(), cs.getPropertyValue('--tc-mid').trim(), '#FFD700', '#ffffff'];
        for (let i = 0; i < 18; i++) {
            const a = (Math.PI * 2 * i) / 18 + Math.random() * 0.4;
            const d = 50 + Math.random() * 50;
            const p = doc.createElement('i');
            p.className = 'burst';
            p.style.setProperty('--bx', (Math.cos(a) * d).toFixed(1) + 'px');
            p.style.setProperty('--by', (Math.sin(a) * d).toFixed(1) + 'px');
            p.style.setProperty('--c', colors[i % colors.length]);
            p.style.setProperty('--w', (5 + Math.random() * 6).toFixed(1) + 'px');
            art.appendChild(p);
            setTimeout(function () { p.remove(); }, 1100);
        }
    }

    function paintTypes() {
        typeCards.forEach(function (c) {
            const on = c.dataset.type === regTipus;
            c.classList.toggle('is-selected', on);
            c.classList.toggle('is-dim', !!regTipus && !on);
            c.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        if (regTipus) shell.dataset.type = regTipus; else delete shell.dataset.type;
    }

    function selectType(type, card) {
        regTipus = type;
        paintTypes();
        burst(card);
        clearTimeout(advanceTimer);
        advanceTimer = setTimeout(function () { if (step === 1) goStep(2); }, reduceMotion ? 0 : 800);
    }

    typeCards.forEach(function (card) {
        card.addEventListener('click', function () { selectType(card.dataset.type, card); });
        card.addEventListener('pointermove', function (e) {
            if (e.pointerType !== 'mouse' || reduceMotion) return;
            const r = card.getBoundingClientRect();
            const px = (e.clientX - r.left) / r.width;
            const py = (e.clientY - r.top) / r.height;
            card.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
            card.style.setProperty('--my', (py * 100).toFixed(1) + '%');
            card.style.setProperty('--rx', ((0.5 - py) * 9).toFixed(2) + 'deg');
            card.style.setProperty('--ry', ((px - 0.5) * 11).toFixed(2) + 'deg');
        });
        card.addEventListener('pointerleave', function () {
            card.style.removeProperty('--rx');
            card.style.removeProperty('--ry');
        });
    });

    function todayISO() {
        const t = new Date();
        const p = function (n) { return String(n).padStart(2, '0'); };
        return t.getFullYear() + '-' + p(t.getMonth() + 1) + '-' + p(t.getDate());
    }

    async function submitRegistration() {
        btnNext.classList.add('is-loading');
        await wait(1000);

        const val = function (id) { return fields[id].read(); };
        if (findUser(val('felhasznalonev'))) {
            btnNext.classList.remove('is-loading');
            update(fields.felhasznalonev, true);
            shake(fields.felhasznalonev.wrap);
            return;
        }

        const szemely = {
            reg_tipus: regTipus,
            telj_nev: val('teljnev'),
            email: val('email'),
            szul_datum: val('szuldatum'),
            reg_datum: todayISO(),
            telszam: val('tel'),
            lakcim: val('lakcim'),
            megjegyzes: val('megjegyzes'),
            f_nev: val('felhasznalonev'),
            jelszo: val('jelszo')
        };
        const users = loadUsers().slice();
        users.push(szemely);
        saveUsers(users);

        regFlow.classList.add('is-leaving');
        await wait(450);
        regFlow.hidden = true;
        btnNext.classList.remove('is-loading');

        const nameWords = szemely.telj_nev.replace(/^Dr\.\s+/, '').split(' ');
        const given = nameWords.slice(1).join(' ') || nameWords[0];
        $('#success-title').textContent = 'Üdv a MASZEK-nél, ' + given + '!';
        $('#success-text').textContent = szemely.reg_tipus === 'mester'
            ? 'A(z) ' + szemely.f_nev + ' nevű mesterfiókod elkészült. Most már beléphetsz, és felépítheted a profilodat.'
            : 'A(z) ' + szemely.f_nev + ' nevű fiókod elkészült. Most már beléphetsz, és kereshetsz szakembert.';
        const sum = $('#success-sum');
        sum.innerHTML = '';
        const chipType = doc.createElement('span');
        chipType.className = 'is-type';
        chipType.textContent = (szemely.reg_tipus === 'mester' ? '🔧 ' : '🔍 ') + TYPE_LABEL[szemely.reg_tipus];
        chipType.style.setProperty('--tc-rgb', TYPE_RGB[szemely.reg_tipus]);
        sum.style.setProperty('--tc-rgb', TYPE_RGB[szemely.reg_tipus]);
        const chipDate = doc.createElement('span');
        chipDate.textContent = '📅 ' + new Date().toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' });
        sum.appendChild(chipType);
        sum.appendChild(chipDate);
        lastRegistered = szemely;
        $('#success').hidden = false;
        if (!reduceMotion) spawnConfetti();
    }
    function spawnConfetti() {
        const box = $('#confetti');
        box.innerHTML = '';
        const colors = ['#D85A30', '#1D9E75', '#F0997B', '#5DCAA5', '#FFD700', '#F5C4B3'];
        for (let i = 0; i < 34; i++) {
            const p = doc.createElement('i');
            p.style.setProperty('--x', (Math.random() * 100) + '%');
            p.style.setProperty('--c', colors[i % colors.length]);
            p.style.setProperty('--dl', (Math.random() * 0.5) + 's');
            p.style.setProperty('--t', (2.2 + Math.random() * 1.4) + 's');
            p.style.setProperty('--dx', ((Math.random() - 0.5) * 240) + 'px');
            p.style.setProperty('--r', ((Math.random() - 0.5) * 1440) + 'deg');
            box.appendChild(p);
        }
    }

    function resetRegistration() {
        regForm.reset();
        Object.keys(fields).forEach(function (id) {
            if (!Object.keys(STEP_FIELDS).some(function (k) { return STEP_FIELDS[k].indexOf(id) !== -1; })) return;
            const f = fields[id];
            f.touched = false; f.dirty = false;
            paint(f, 'neutral');
        });
        $$('.eye', regForm).forEach(function (b) {
            const input = $('#' + b.dataset.eye);
            input.type = 'password';
            b.setAttribute('aria-pressed', 'false');
        });
        regTipus = '';
        paintTypes();
        syncNote();
        paintPasswordMeter('');
        $('#jelszo').closest('.field').classList.remove('pw-open');
        regFlow.classList.remove('is-leaving');
        regFlow.hidden = false;
        $('#success').hidden = true;
        goStep(1, { focus: false });
    }

    const loginForm = $('#login-form');
    const loginBtn = $('#login-submit');
    const alertBox = $('#login-alert');
    const alertText = $('#login-alert-text');
    const alertAction = $('#login-alert-action');

    const lUser = addField('fnev_be', {
        quiet: true,
        check: function (v) { return v ? '' : 'Add meg a felhasználónevedet.'; },
        onInput: hideAlert
    });
    const lPass = addField('jelszo_be', {
        quiet: true,
        read: function () { return $('#jelszo_be').value; },
        check: function (v) { return v ? '' : 'Add meg a jelszavadat.'; },
        onInput: hideAlert
    });

    function showAlert(text, action) {
        alertText.textContent = text;
        alertBox.classList.add('is-open');
        shake(alertBox);
        alertAction.hidden = !action;
        if (action) {
            alertAction.textContent = action.label;
            alertAction.onclick = action.run;
        }
    }
    function hideAlert() { alertBox.classList.remove('is-open'); }

    async function finishLogin(user) {
        loginBtn.classList.add('is-done');
        await wait(1100);
        if (!REDIRECT_URL) return;
        if (window.maszekGo) window.maszekGo(REDIRECT_URL);
        else window.location.href = REDIRECT_URL;
    }

    loginForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        if (loginBtn.classList.contains('is-loading') || loginBtn.classList.contains('is-done')) return;
        hideAlert();

        let firstBad = null;
        [lUser, lPass].forEach(function (f) {
            f.touched = true;
            if (!update(f, true)) { shake(f.wrap); if (!firstBad) firstBad = f; }
        });
        if (firstBad) { firstBad.input.focus(); return; }

        loginBtn.classList.add('is-loading');
        await wait(800);
        const name = lUser.read();
        const user = findUser(name);
        loginBtn.classList.remove('is-loading');

        if (!user) {
            paint(lUser, 'invalid', 'Ilyen felhasználónév nem található.');
            shake(lUser.wrap);
            showAlert('Ehhez a névhez még nincs fiók. Új vagy nálunk?', {
                label: 'Regisztráció',
                run: function () {
                    setMode('register');
                    setTimeout(function () {
                        const t = $('#felhasznalonev');
                        if (name && /^[A-Za-z0-9._-]{3,20}$/.test(name)) { t.value = name; fields.felhasznalonev.dirty = true; }
                    }, 50);
                }
            });
            lUser.input.focus();
            return;
        }
        if (user.jelszo !== lPass.read()) {
            paint(lPass, 'invalid', 'Hibás jelszó. Próbáld újra!');
            shake(lPass.wrap);
            showAlert('A megadott jelszó nem egyezik a fiókodéval.');
            lPass.input.select();
            return;
        }
        finishLogin(user);
    });

    alertAction.hidden = true;

    const views = $$('.form-view');

    function setMode(mode, opts) {
        opts = opts || {};
        if (shell.dataset.mode === mode) return;
        shell.dataset.mode = mode;
        hideToast();
        views.forEach(function (v) {
            const on = v.dataset.view === mode;
            v.classList.toggle('is-active', on);
            v.inert = !on;
            v.setAttribute('aria-hidden', on ? 'false' : 'true');
        });
        doc.title = (mode === 'register' ? 'Regisztráció' : 'Bejelentkezés') + ' – MASZEK';
        if (opts.history !== false) {
            try { history.replaceState(null, '', mode === 'register' ? '#regisztracio' : '#belepes'); } catch (e) {}
        }
        if (opts.focus !== false && canHover && mode === 'login') {
            setTimeout(function () {
                const first = $('#fnev_be');
                if (first && first.offsetParent !== null) first.focus({ preventScroll: true });
            }, reduceMotion ? 0 : 1000);
        }
    }
    window.maszekSetMode = setMode;

    $$('[data-switch]').forEach(function (b) {
        b.addEventListener('click', function () { setMode(b.dataset.switch); });
    });

    $('#success-go').addEventListener('click', function () {
        const uname = lastRegistered ? lastRegistered.f_nev : '';
        setMode('login');
        setTimeout(function () {
            resetRegistration();
            const u = $('#fnev_be');
            u.value = uname;
            fields.fnev_be.dirty = true;
            update(fields.fnev_be, false);
            const p = $('#jelszo_be');
            if (canHover) setTimeout(function () { p.focus({ preventScroll: true }); }, 400);
        }, reduceMotion ? 0 : 900);
    });

    function modeFromHash() {
        return /regisztr/i.test(location.hash) ? 'register' : 'login';
    }
    window.addEventListener('hashchange', function () { setMode(modeFromHash(), { history: false }); });

    (function init() {
        const startMode = modeFromHash();
        if (startMode === 'register') {
            shell.classList.add('no-trans');
            setMode('register', { history: false, focus: false });
            requestAnimationFrame(function () { requestAnimationFrame(function () { shell.classList.remove('no-trans'); }); });
        }
        goStep(1, { focus: false });
        paintPasswordMeter('');
        syncNote();
        setTimeout(function () { shell.classList.remove('is-booting'); }, 1800);

        if (canHover && startMode === 'login') {
            setTimeout(function () {
                const first = $('#fnev_be');
                if (first) first.focus({ preventScroll: true });
            }, reduceMotion ? 0 : 900);
        }

        const logo = $('.panel-logo');
        function fallback() {
            const w = doc.createElement('span');
            w.className = 'wordmark';
            w.textContent = 'MASZEK';
            logo.replaceWith(w);
        }
        if (logo) {
            logo.addEventListener('error', fallback);
            if (logo.complete && logo.naturalWidth === 0) fallback();
        }
    })();
})();