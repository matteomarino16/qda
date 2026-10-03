/* ==========================================================================
   QUELLI DELL'ALBA – ROAD RUNNERS
   script.js – JavaScript vanilla per index.html e galleria.html

   INDICE
   1. Navbar scroll
   1b. Logo volante (hero → header)
   2. Hamburger menu
   3. Smooth scrolling
   4. Link attivo in navbar (scrollspy)
   5. Animazioni allo scroll (IntersectionObserver)
   6. Contatori statistiche
   7. Immagini mancanti → placeholder
   8. Filtri galleria
   9. Lightbox
   10. Consenso cookie + Google Maps
   11. Form contatti
   12. Piccole interazioni UI (back to top, anno footer, link non ancora attivi)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    'use strict';

    const header = document.getElementById('site-header');
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;


    /* ----------------------------------------------------------------------
       1. NAVBAR SCROLL
       ---------------------------------------------------------------------- */
    const backToTop = document.querySelector('.back-to-top');

    const onScroll = () => {
        const y = window.scrollY;
        header?.classList.toggle('is-scrolled', y > 40);
        backToTop?.classList.toggle('is-visible', y > window.innerHeight * 0.8);
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });


    /* ----------------------------------------------------------------------
       1b. LOGO VOLANTE (solo home)
       Il logo parte grande sopra .hero__visual e, mentre si scorre, viene
       traslato e scalato fino alla posizione di .nav__logo nell'header.

       Per la massima fluidità (soprattutto su mobile) il percorso viene
       calcolato UNA volta e trasformato in un'animazione CSS legata allo
       scroll (animation-timeline: scroll()): la esegue la GPU, sincronizzata
       con il dito, senza JavaScript durante lo scroll.
       Fallback per i browser senza supporto: aggiornamento con
       requestAnimationFrame (solo transform/opacity).
       ---------------------------------------------------------------------- */
    const flyLogo = document.querySelector('.flying-logo');
    const heroSlot = document.querySelector('.hero__visual');
    const navSlot = document.querySelector('.nav__logo');
    const heroSection = document.getElementById('hero');

    if (flyLogo && heroSlot && navSlot && heroSection && header) {
        const STEPS = 30;               // punti del percorso (più sono, più è morbido)
        const DOCK_RATIO = 0.5;         // arriva nell'header dopo metà hero
        const supportsTimeline = window.CSS && CSS.supports('animation-timeline: scroll()')
            && CSS.supports('animation-range: 0px 100px');

        const lerp = (a, b, t) => a + (b - a) * t;
        const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
        const styleTag = document.createElement('style');
        document.head.appendChild(styleTag);

        let geo = null;     // geometria misurata
        let docked = false;

        // Posizione del logo nell'header nello stato "scrollato" (header più basso)
        const measureDockedNav = () => {
            const wasScrolled = header.classList.contains('is-scrolled');
            header.style.transition = 'none';
            header.classList.add('is-scrolled');
            const r = navSlot.getBoundingClientRect();
            header.classList.toggle('is-scrolled', wasScrolled);
            void header.offsetHeight;   // applica subito lo stato originale
            header.style.transition = '';
            return r;
        };

        const measure = () => {
            const size = heroSlot.offsetWidth;
            const nav = measureDockedNav();
            const slot = heroSlot.getBoundingClientRect();
            geo = {
                size,
                distance: Math.max(1, Math.round(heroSection.offsetHeight * DOCK_RATIO)),
                slotX: slot.left,
                slotDocY: slot.top + window.scrollY,
                navX: nav.left,
                navY: nav.top,
                navScale: size ? nav.width / size : 1
            };
            flyLogo.style.setProperty('--fly-size', `${size || nav.width}px`);
        };

        // Transform del logo per un avanzamento t (0 → 1) dello scroll
        const frameAt = (t) => {
            const e = easeInOut(t);
            const slotY = geo.slotDocY - t * geo.distance;   // il segnaposto sale con la pagina
            const x = lerp(geo.slotX, geo.navX, e);
            const y = lerp(slotY, geo.navY, e);
            const sc = lerp(1, geo.navScale, e);
            return `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) scale(${sc.toFixed(4)})`;
        };

        const buildTimeline = () => {
            if (!geo.size) {
                // Segnaposto nascosto (es. smartphone in orizzontale): logo fisso nell'header
                styleTag.textContent = '';
                flyLogo.classList.remove('is-timeline');
                flyLogo.style.transform = `translate3d(${geo.navX}px, ${geo.navY}px, 0) scale(1)`;
                flyLogo.style.setProperty('--rings', 0);
                return;
            }
            let frames = '';
            for (let i = 0; i <= STEPS; i++) {
                const t = i / STEPS;
                frames += `${(t * 100).toFixed(2)}% { transform: ${frameAt(t)}; }\n`;
            }
            const range = `animation-range: 0px ${geo.distance}px;`;
            styleTag.textContent = `
                @keyframes qdaFlyPath { ${frames} }
                @keyframes qdaFlyRings { 0% { opacity: 1; } 60%, 100% { opacity: 0; } }
                .flying-logo.is-timeline {
                    animation: qdaFlyPath linear both;
                    animation-timeline: scroll(root block);
                    ${range}
                }
                .flying-logo.is-timeline::before {
                    animation: qdaFlyRings linear both;
                    animation-timeline: scroll(root block);
                    ${range}
                }`;
            flyLogo.style.transform = '';
            flyLogo.classList.add('is-timeline');
        };

        // Fallback JavaScript (browser senza scroll-driven animations)
        let rafId = null;
        const updateFallback = () => {
            rafId = null;
            if (!geo.size) return;
            const t = Math.min(Math.max(window.scrollY / geo.distance, 0), 1);
            flyLogo.style.transform = frameAt(t);
            flyLogo.style.setProperty('--rings', Math.max(0, 1 - t / 0.6).toFixed(3));
        };

        // Stato "agganciato": ferma la fluttuazione e fa un piccolo rimbalzo
        const updateDocked = () => {
            const isDocked = geo.size === 0 || window.scrollY >= geo.distance;
            if (isDocked !== docked) {
                docked = isDocked;
                flyLogo.classList.toggle('is-docked', docked);
            }
        };

        const setup = () => {
            measure();
            if (supportsTimeline) buildTimeline();
            else updateFallback();
            updateDocked();
        };

        setup();
        window.addEventListener('scroll', () => {
            updateDocked();
            if (!supportsTimeline && !rafId) rafId = requestAnimationFrame(updateFallback);
        }, { passive: true });

        // Ricalcolo solo quando cambia davvero la larghezza (rotazione, finestra):
        // su mobile la barra degli indirizzi che compare/scompare cambia solo l'altezza
        let lastWidth = window.innerWidth;
        let resizeTimer = null;
        window.addEventListener('resize', () => {
            if (window.innerWidth === lastWidth) return;
            lastWidth = window.innerWidth;
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(setup, 120);
        });
        window.addEventListener('load', setup);
        document.fonts?.ready.then(setup);
    }


    /* ----------------------------------------------------------------------
       2. HAMBURGER MENU (accessibile: aria-expanded, ESC, focus)
       ---------------------------------------------------------------------- */
    const toggle = document.querySelector('.nav__toggle');
    const menu = document.getElementById('nav-menu');
    const desktopQuery = window.matchMedia('(min-width: 1024px)');

    // fromKeyboard: sposta il focus nel menu solo se aperto da tastiera
    const setMenu = (open, fromKeyboard = false) => {
        if (!toggle || !menu) return;
        toggle.setAttribute('aria-expanded', String(open));
        toggle.setAttribute('aria-label', open ? 'Chiudi il menu' : 'Apri il menu');
        menu.classList.toggle('is-open', open);
        header.classList.toggle('nav-open', open);
        document.body.classList.toggle('no-scroll', open);
        document.body.classList.toggle('menu-open', open);
        if (open && fromKeyboard) {
            menu.querySelector('a')?.focus();
        }
    };

    toggle?.addEventListener('click', (e) => {
        // e.detail === 0 → "click" generato da tastiera (Invio/Spazio)
        setMenu(toggle.getAttribute('aria-expanded') !== 'true', e.detail === 0);
    });

    // Chiude il menu quando si clicca un link
    menu?.querySelectorAll('a').forEach((link) => {
        link.addEventListener('click', () => setMenu(false));
    });

    // ESC chiude il menu e riporta il focus sul pulsante
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && toggle?.getAttribute('aria-expanded') === 'true') {
            setMenu(false);
            toggle.focus();
        }
    });

    // Passando a desktop il menu mobile viene resettato
    desktopQuery.addEventListener('change', (e) => {
        if (e.matches) setMenu(false);
    });


    /* ----------------------------------------------------------------------
       3. SMOOTH SCROLLING per le ancore interne
       ---------------------------------------------------------------------- */
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
        anchor.addEventListener('click', (e) => {
            const id = anchor.getAttribute('href');
            if (id.length < 2) return;
            const target = document.querySelector(id);
            if (!target) return;

            e.preventDefault();
            const offset = header ? header.offsetHeight - 8 : 0;
            const top = target.getBoundingClientRect().top + window.scrollY - offset;
            window.scrollTo({ top, behavior: prefersReducedMotion ? 'auto' : 'smooth' });

            // Sposta il focus per gli utenti da tastiera / screen reader
            target.setAttribute('tabindex', '-1');
            target.focus({ preventScroll: true });
            history.replaceState(null, '', id);
        });
    });


    /* ----------------------------------------------------------------------
       4. LINK ATTIVO IN NAVBAR (solo in home)
       Ogni link indica le sezioni che lo attivano tramite data-section.
       ---------------------------------------------------------------------- */
    const spyLinks = document.querySelectorAll('.nav__link[data-section]');

    if (spyLinks.length && 'IntersectionObserver' in window) {
        const sectionToLink = new Map();
        spyLinks.forEach((link) => {
            link.dataset.section.split(' ').forEach((id) => {
                const section = document.getElementById(id);
                if (section) sectionToLink.set(section, link);
            });
        });
        // Gli sponsor fanno parte della "Home"
        const sponsors = document.getElementById('sponsors');
        if (sponsors) sectionToLink.set(sponsors, spyLinks[0]);

        const spy = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                const active = sectionToLink.get(entry.target);
                spyLinks.forEach((l) => {
                    l.classList.toggle('is-active', l === active);
                    if (l === active) l.setAttribute('aria-current', 'location');
                    else l.removeAttribute('aria-current');
                });
            });
        }, { rootMargin: '-45% 0px -50% 0px' });

        sectionToLink.forEach((_, section) => spy.observe(section));
    }


    /* ----------------------------------------------------------------------
       5. ANIMAZIONI ALLO SCROLL (IntersectionObserver)
       ---------------------------------------------------------------------- */
    const revealEls = document.querySelectorAll('[data-reveal]');

    if ('IntersectionObserver' in window && !prefersReducedMotion) {
        const revealObserver = new IntersectionObserver((entries, obs) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    obs.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

        revealEls.forEach((el) => revealObserver.observe(el));
    } else {
        revealEls.forEach((el) => el.classList.add('is-visible'));
    }


    /* ----------------------------------------------------------------------
       6. CONTATORI STATISTICHE
       Animano da 0 al valore di data-count; se vuoto resta il testo (es. "XX").
       ---------------------------------------------------------------------- */
    const counters = document.querySelectorAll('[data-count]');

    const animateCounter = (el) => {
        const target = parseInt(el.dataset.count, 10);
        if (Number.isNaN(target)) return;
        const prefix = el.dataset.prefix || '';
        const format = (n) => prefix + n.toLocaleString('it-IT');

        if (prefersReducedMotion) {
            el.textContent = format(target);
            return;
        }

        const duration = 1600;
        const start = performance.now();
        const step = (now) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            el.textContent = format(Math.round(target * eased));
            if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    };

    if (counters.length && 'IntersectionObserver' in window) {
        const counterObserver = new IntersectionObserver((entries, obs) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    animateCounter(entry.target);
                    obs.unobserve(entry.target);
                }
            });
        }, { threshold: 0.6 });
        counters.forEach((c) => counterObserver.observe(c));
    } else {
        counters.forEach(animateCounter);
    }


    /* ----------------------------------------------------------------------
       7. IMMAGINI MANCANTI → PLACEHOLDER
       Se una foto non esiste ancora (es. immagini/gallery/gallery-gara-01.jpg)
       il contenitore .media mostra un segnaposto con il nome del file.
       Basta caricare la foto con quel nome e il segnaposto sparisce.
       ---------------------------------------------------------------------- */
    const markMissing = (img) => img.closest('.media')?.classList.add('is-missing');

    document.querySelectorAll('.media img').forEach((img) => {
        if (img.complete && img.naturalWidth === 0 && img.getAttribute('src')) {
            markMissing(img);
        } else {
            img.addEventListener('error', () => markMissing(img), { once: true });
        }
    });


    /* ----------------------------------------------------------------------
       8. FILTRI GALLERIA (galleria.html)
       ---------------------------------------------------------------------- */
    const filterButtons = document.querySelectorAll('.filter-btn');
    const masonry = document.querySelector('.masonry');

    if (filterButtons.length && masonry) {
        const items = [...masonry.querySelectorAll('.gallery-item')];
        const emptyMsg = document.querySelector('.gallery-empty');
        const status = document.getElementById('filter-status');

        // Numero di foto per categoria accanto a ogni filtro
        document.querySelectorAll('[data-count-for]').forEach((badge) => {
            const cat = badge.dataset.countFor;
            badge.textContent = cat === 'all'
                ? items.length
                : items.filter((i) => i.dataset.category === cat).length;
        });

        // Filtro iniziale da URL (es. galleria.html#gare)
        const initial = location.hash.replace('#', '');

        const applyFilter = (filter) => {
            filterButtons.forEach((btn) => {
                btn.setAttribute('aria-pressed', String(btn.dataset.filter === filter));
            });

            let visible = 0;
            items.forEach((item) => {
                const show = filter === 'all' || item.dataset.category === filter;
                if (show) {
                    visible++;
                    item.classList.remove('is-hidden');
                    // doppio rAF: permette alla transizione di partire dopo il display
                    requestAnimationFrame(() => requestAnimationFrame(() => item.classList.remove('is-hiding')));
                } else {
                    item.classList.add('is-hiding');
                    setTimeout(() => {
                        if (item.classList.contains('is-hiding')) item.classList.add('is-hidden');
                    }, prefersReducedMotion ? 0 : 350);
                }
            });

            if (emptyMsg) emptyMsg.hidden = visible > 0;
            if (status) status.textContent = `${visible} foto visualizzate`;
        };

        filterButtons.forEach((btn) => {
            btn.addEventListener('click', () => {
                applyFilter(btn.dataset.filter);
                history.replaceState(null, '', btn.dataset.filter === 'all' ? location.pathname : `#${btn.dataset.filter}`);
            });
        });

        if ([...filterButtons].some((b) => b.dataset.filter === initial)) {
            applyFilter(initial);
        }
    }


    /* ----------------------------------------------------------------------
       9. LIGHTBOX
       Funziona su ogni contenitore [data-lightbox-group] (home e galleria).
       Considera solo le foto visibili (rispetta il filtro attivo).
       ---------------------------------------------------------------------- */
    const lightbox = document.getElementById('lightbox');

    if (lightbox) {
        const lbImg = lightbox.querySelector('.lightbox__img');
        const lbPlaceholder = lightbox.querySelector('.lightbox__placeholder');
        const lbText = lightbox.querySelector('.lightbox__text');
        const lbCounter = lightbox.querySelector('.lightbox__counter');
        const btnClose = lightbox.querySelector('.lightbox__close');
        const btnPrev = lightbox.querySelector('.lightbox__prev');
        const btnNext = lightbox.querySelector('.lightbox__next');

        let group = [];
        let index = 0;
        let lastFocused = null;

        // Elementi apribili: foto della galleria e locandine ([data-lightbox-item])
        const ITEM_SELECTOR = '.gallery-item, [data-lightbox-item]';

        const visibleItems = (container) =>
            [...container.querySelectorAll(ITEM_SELECTOR)].filter(
                (i) => !i.classList.contains('is-hidden') && !i.classList.contains('is-hiding')
            );

        const render = () => {
            const item = group[index];
            const img = item.querySelector('img');
            const missing = item.classList.contains('is-missing');

            lbCounter.textContent = `${index + 1} / ${group.length}`;
            lbText.textContent = img.alt;

            if (missing) {
                lbImg.hidden = true;
                lbPlaceholder.hidden = false;
                lbPlaceholder.textContent = `📷 Foto in arrivo – ${item.dataset.placeholder || ''}`;
            } else {
                lbPlaceholder.hidden = true;
                lbImg.hidden = false;
                lbImg.classList.add('is-loading');
                lbImg.onload = () => lbImg.classList.remove('is-loading');
                lbImg.src = img.currentSrc || img.src;
                lbImg.alt = img.alt;
            }

            const single = group.length < 2;
            btnPrev.hidden = single;
            btnNext.hidden = single;
        };

        const open = (container, item) => {
            group = visibleItems(container);
            index = Math.max(0, group.indexOf(item));
            lastFocused = document.activeElement;
            render();
            lightbox.classList.add('is-open');
            lightbox.setAttribute('aria-hidden', 'false');
            document.body.classList.add('no-scroll');
            btnClose.focus();
        };

        const close = () => {
            lightbox.classList.remove('is-open');
            lightbox.setAttribute('aria-hidden', 'true');
            document.body.classList.remove('no-scroll');
            lastFocused?.focus();
        };

        const go = (dir) => {
            index = (index + dir + group.length) % group.length;
            render();
        };

        document.querySelectorAll('[data-lightbox-group]').forEach((container) => {
            container.addEventListener('click', (e) => {
                const item = e.target.closest(ITEM_SELECTOR);
                if (item) open(container, item);
            });
        });

        btnClose.addEventListener('click', close);
        btnPrev.addEventListener('click', () => go(-1));
        btnNext.addEventListener('click', () => go(1));

        // Chiusura cliccando fuori dall'immagine
        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox || e.target.classList.contains('lightbox__figure')) close();
        });

        // Tastiera: ESC, frecce, focus trap con TAB
        document.addEventListener('keydown', (e) => {
            if (!lightbox.classList.contains('is-open')) return;

            if (e.key === 'Escape') close();
            else if (e.key === 'ArrowLeft') go(-1);
            else if (e.key === 'ArrowRight') go(1);
            else if (e.key === 'Tab') {
                const focusables = [btnClose, btnPrev, btnNext].filter((b) => !b.hidden);
                const first = focusables[0];
                const last = focusables[focusables.length - 1];
                if (e.shiftKey && document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
        });

        // Swipe su mobile
        let touchX = null;
        lightbox.addEventListener('touchstart', (e) => { touchX = e.touches[0].clientX; }, { passive: true });
        lightbox.addEventListener('touchend', (e) => {
            if (touchX === null) return;
            const dx = e.changedTouches[0].clientX - touchX;
            if (Math.abs(dx) > 50 && group.length > 1) go(dx > 0 ? -1 : 1);
            touchX = null;
        });
    }


    /* ----------------------------------------------------------------------
       10. CONSENSO COOKIE + GOOGLE MAPS
       - Al primo accesso compare il banner (Accetta tutti / Solo necessari).
       - La scelta viene salvata nel browser (localStorage) per 6 mesi.
       - Google Maps (cookie di terze parti) viene caricata solo con "Accetta tutti";
         altrimenti al suo posto c'è un riquadro con il pulsante per attivarla.
       - Qualsiasi elemento con [data-cookie-settings] riapre il banner.
       ---------------------------------------------------------------------- */
    const CONSENT_KEY = 'qda-cookie-consent';
    const CONSENT_DAYS = 180;

    const readConsent = () => {
        try {
            const saved = JSON.parse(localStorage.getItem(CONSENT_KEY));
            if (!saved || !saved.value || !saved.date) return null;
            const age = (Date.now() - new Date(saved.date).getTime()) / 86400000;
            return age > CONSENT_DAYS ? null : saved.value;
        } catch (err) {
            return null;
        }
    };

    const PIN_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s7-6.2 7-12a7 7 0 10-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/></svg>';

    const applyMaps = (consent) => {
        document.querySelectorAll('.map iframe[data-src]').forEach((iframe) => {
            const box = iframe.closest('.map');
            let placeholder = box.querySelector('.map__placeholder');

            if (consent === 'all') {
                if (!iframe.getAttribute('src')) iframe.setAttribute('src', iframe.dataset.src);
                iframe.hidden = false;
                placeholder?.remove();
                return;
            }

            iframe.hidden = true;
            iframe.removeAttribute('src'); // consenso revocato: la mappa viene scollegata
            if (!placeholder) {
                placeholder = document.createElement('div');
                placeholder.className = 'map__placeholder';
                placeholder.innerHTML = `
                    ${PIN_ICON}
                    <strong>Mappa di Google</strong>
                    <span>Per vedere la mappa serve il consenso ai cookie di Google Maps.</span>
                    <button class="btn btn--primary" type="button" data-consent-maps>Mostra la mappa</button>
                    <a class="link-arrow" href="${iframe.dataset.mapsLink}" target="_blank" rel="noopener">Apri in Google Maps</a>`;
                box.appendChild(placeholder);
                placeholder.querySelector('[data-consent-maps]').addEventListener('click', () => saveConsent('all'));
            }
        });
    };

    let banner = null;

    const hideBanner = () => {
        if (!banner) return;
        banner.classList.remove('is-visible');
        setTimeout(() => { if (banner) banner.hidden = true; }, 400);
    };

    function saveConsent(value) {
        try {
            localStorage.setItem(CONSENT_KEY, JSON.stringify({ value, date: new Date().toISOString() }));
        } catch (err) { /* storage non disponibile: la scelta vale per questa visita */ }
        applyMaps(value);
        hideBanner();
    }

    const showBanner = () => {
        if (!banner) {
            banner = document.createElement('div');
            banner.className = 'cookie-banner';
            banner.setAttribute('role', 'dialog');
            banner.setAttribute('aria-labelledby', 'cookie-title');
            banner.setAttribute('aria-describedby', 'cookie-text');
            banner.innerHTML = `
                <p class="cookie-banner__title" id="cookie-title">🍪 Questo sito usa i cookie</p>
                <p class="cookie-banner__text" id="cookie-text">
                    Usiamo cookie tecnici necessari al funzionamento del sito e, solo con il tuo consenso,
                    cookie di terze parti (Google Maps) per mostrarti la mappa. Puoi cambiare idea in qualsiasi
                    momento da “Preferenze cookie” in fondo alla pagina.
                    <a href="cookie-policy.html">Cookie Policy</a> · <a href="privacy-policy.html">Privacy Policy</a>
                </p>
                <div class="cookie-banner__actions">
                    <button class="btn btn--outline" type="button" data-consent="necessary">Solo necessari</button>
                    <button class="btn btn--primary" type="button" data-consent="all">Accetta tutti</button>
                </div>`;
            document.body.appendChild(banner);
            banner.querySelectorAll('[data-consent]').forEach((btn) => {
                btn.addEventListener('click', () => saveConsent(btn.dataset.consent));
            });
        }
        banner.hidden = false;
        requestAnimationFrame(() => requestAnimationFrame(() => banner.classList.add('is-visible')));
    };

    const consent = readConsent();
    applyMaps(consent);
    if (!consent) showBanner();

    document.querySelectorAll('[data-cookie-settings]').forEach((el) => {
        el.addEventListener('click', (e) => {
            e.preventDefault();
            showBanner();
            banner.querySelector('[data-consent="all"]').focus();
        });
    });


    /* ----------------------------------------------------------------------
       11. FORM CONTATTI
       Validazione lato client, poi invio diretto alla mail della squadra
       tramite FormSubmit (data-endpoint sul <form>). Se l'invio fallisce
       si apre l'app di posta con la mail già compilata.
       ---------------------------------------------------------------------- */
    const form = document.getElementById('contactForm');

    if (form) {
        const success = document.getElementById('formSuccess');
        const submitBtn = form.querySelector('button[type="submit"]');

        const messages = {
            nome: 'Inserisci il tuo nome (almeno 2 caratteri).',
            cognome: 'Inserisci il tuo cognome (almeno 2 caratteri).',
            email: 'Inserisci un indirizzo email valido.',
            telefono: 'Inserisci un numero di telefono valido (es. +39 333 1234567).',
            messaggio: 'Scrivi un messaggio di almeno 10 caratteri.',
            privacy: 'Per inviare la richiesta devi acconsentire al trattamento dei dati.'
        };

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

        const validateField = (field) => {
            const wrapper = field.closest('.form-field');
            const errorEl = document.getElementById(`${field.id}-error`);
            let valid = field.checkValidity();

            // Controlli aggiuntivi oltre alla validazione HTML5
            if (valid && field.type === 'email') valid = emailRegex.test(field.value.trim());
            if (valid && field.type !== 'checkbox' && field.required) valid = field.value.trim().length >= (field.minLength > 0 ? field.minLength : 1);

            wrapper?.classList.toggle('has-error', !valid);
            field.setAttribute('aria-invalid', String(!valid));
            if (errorEl) errorEl.textContent = valid ? '' : messages[field.name] || 'Campo non valido.';
            return valid;
        };

        // Solo i campi visibili (esclusi hidden e anti-spam)
        const fields = [...form.querySelectorAll('input:not([type="hidden"]):not(.form-honeypot), textarea')];

        // Validazione "live" dopo il primo contatto con il campo
        fields.forEach((field) => {
            field.addEventListener('blur', () => {
                if (field.value || field.type === 'checkbox') validateField(field);
            });
            field.addEventListener('input', () => {
                if (field.closest('.form-field')?.classList.contains('has-error')) validateField(field);
            });
            field.addEventListener('change', () => {
                if (field.type === 'checkbox') validateField(field);
            });
        });

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            success.classList.remove('is-visible');

            const results = fields.map(validateField);
            const firstInvalid = fields[results.indexOf(false)];
            if (firstInvalid) {
                firstInvalid.focus();
                return;
            }

            const endpoint = form.dataset.endpoint;
            submitBtn.classList.add('is-loading');
            submitBtn.disabled = true;

            // Dati del form come oggetto (JSON per FormSubmit)
            const data = Object.fromEntries(new FormData(form).entries());
            data.privacy = form.privacy.checked ? 'Sì, consenso dato' : 'No';

            try {
                if (!endpoint) throw new Error('Endpoint non configurato');

                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                    body: JSON.stringify(data)
                });
                const result = await response.json().catch(() => ({}));
                if (!response.ok || String(result.success) !== 'true') {
                    throw new Error(result.message || `HTTP ${response.status}`);
                }

                form.reset();
                fields.forEach((f) => f.removeAttribute('aria-invalid'));
                success.classList.add('is-visible');
                success.focus();
            } catch (err) {
                // Piano B: apre l'app di posta con la mail già compilata
                const to = form.dataset.mailto || 'quellidellalba@gmail.com';
                const subject = 'Richiesta dal sito – Quelli dell\'Alba';
                const body = [
                    `Nome: ${data.nome || ''} ${data.cognome || ''}`,
                    `Email: ${data.email || ''}`,
                    `Telefono: ${data.telefono || '-'}`,
                    '',
                    data.messaggio || ''
                ].join('\n');
                const ok = confirm('Non siamo riusciti a inviare la richiesta automaticamente.\nVuoi inviarla dalla tua app di posta? La mail sarà già compilata.');
                if (ok) {
                    window.location.href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                }
            } finally {
                submitBtn.classList.remove('is-loading');
                submitBtn.disabled = false;
            }
        });
    }


    /* ----------------------------------------------------------------------
       12. PICCOLE INTERAZIONI UI
       ---------------------------------------------------------------------- */

    // Conto alla rovescia delle gare in arrivo ([data-countdown] con data ISO)
    document.querySelectorAll('[data-countdown]').forEach((el) => {
        const start = new Date(el.dataset.countdown);
        if (Number.isNaN(start.getTime())) return;
        const today = new Date();
        const dayStart = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
        const days = Math.round((dayStart(start) - dayStart(today)) / 86400000);
        if (days < 0) return; // gara passata: il badge resta nascosto
        el.innerHTML = days === 0
            ? '🏁 <span>Si corre <b>oggi</b>!</span>'
            : `<strong>${days}</strong><span>${days === 1 ? 'giorno' : 'giorni'} alla partenza</span>`;
        el.hidden = false;
    });

    // Anno corrente nel footer
    document.querySelectorAll('[data-year]').forEach((el) => {
        el.textContent = new Date().getFullYear();
    });

    // Link non ancora collegati (href="#" con data-link): evita il salto in cima
    document.querySelectorAll('a[href="#"]').forEach((link) => {
        link.addEventListener('click', (e) => e.preventDefault());
        link.setAttribute('title', 'Link in arrivo');
    });
});
