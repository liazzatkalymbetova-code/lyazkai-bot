/* ============================================================
   InfoLady — script.js
   WordPress-compatible · No dependencies · Production-ready
   ============================================================ */

(function () {
    'use strict';

    const params = new URLSearchParams(window.location.search);
    const src = params.get("src") || localStorage.getItem("source");
    const ref = params.get("ref") || localStorage.getItem("referral");
    if (src) localStorage.setItem("source", src);
    if (ref) localStorage.setItem("referral", ref);

    // --- SaaS Data Persistence ---
    const urlParam = params.get("url") || params.get("domain");
    if (urlParam) localStorage.setItem("domain", urlParam); // Standardize on 'domain' or 'url'
    const emailParam = params.get("email");
    if (emailParam) localStorage.setItem("email", emailParam);


    /* ── Helpers ─────────────────────────────────────────────── */
    const $ = (sel, ctx = document) => ctx.querySelector(sel);
    const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

    function push(eventName, payload = {}) {
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({ event: eventName, ...payload });
    }

    function getUTM() {
        const p = new URLSearchParams(window.location.search);
        return {
            utm_source: p.get('utm_source') || '',
            utm_medium: p.get('utm_medium') || '',
            utm_campaign: p.get('utm_campaign') || '',
            utm_content: p.get('utm_content') || '',
            utm_term: p.get('utm_term') || '',
        };
    }

    /* ── Sticky nav ──────────────────────────────────────────── */
    function initNav() {
        const nav = $('.nav');
        if (!nav) return;
        const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 20);
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();

        const burger = $('.nav__burger');
        const mobile = $('.nav__mobile');
        if (burger && mobile) {
            burger.addEventListener('click', () => {
                const open = mobile.classList.toggle('open');
                burger.setAttribute('aria-expanded', String(open));
            });
            $$('a', mobile).forEach(a => a.addEventListener('click', () => mobile.classList.remove('open')));
        }
    }

    /* ── Scroll animations ───────────────────────────────────── */
    function initScrollAnimations() {
        const els = $$('.fade-up');
        if (!els.length) return;
        const observer = new IntersectionObserver(
            entries => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); } }),
            { threshold: 0.12 }
        );
        els.forEach(el => observer.observe(el));
    }

    /* ── Affiliate tracking ──────────────────────────────────── */
    function initAffiliateTracking() {
        $$('[data-affiliate]').forEach(link => {
            link.addEventListener('click', function () {
                const payload = {
                    affiliate_name: this.dataset.affiliate || '',
                    affiliate_url: this.href || '',
                    course_name: this.dataset.course || '',
                    ...getUTM(),
                };
                push('affiliate_click', payload);
                if (typeof gtag === 'function') gtag('event', 'affiliate_click', payload);
            });
        });
    }

    /* ── Catalog filter + search ─────────────────────────────── */
    function initCatalog() {
        const grid = $('#catalogGrid');
        const searchInput = $('#catalogSearch');
        const filterBtns = $$('.filter-btn');
        if (!grid) return;

        let activeFilter = 'all';

        function filterCards() {
            const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
            $$('.catalog-card', grid).forEach(card => {
                const matchFilter = activeFilter === 'all' || card.dataset.category === activeFilter;
                const matchSearch = !query || card.textContent.toLowerCase().includes(query);
                card.style.display = matchFilter && matchSearch ? '' : 'none';
            });
            /* update count */
            const countEl = $('#catalogCount');
            const noRes = $('#noResults');
            const visible = $$('.catalog-card', grid).filter(c => c.style.display !== 'none').length;
            if (countEl) countEl.textContent = visible;
            if (noRes) noRes.classList.toggle('visible', visible === 0);
            push('catalog_filter', { filter: activeFilter, query });
        }

        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                filterBtns.forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed', 'false'); });
                btn.classList.add('active');
                btn.setAttribute('aria-pressed', 'true');
                activeFilter = btn.dataset.filter || 'all';
                filterCards();
            });
        });

        if (searchInput) {
            let timer;
            searchInput.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(filterCards, 250); });
        }

        /* URL params on load */
        const params = new URLSearchParams(window.location.search);
        const fp = params.get('filter');
        const sq = params.get('search');
        if (fp) { const b = $$(`.filter-btn[data-filter="${fp}"]`)[0]; if (b) b.click(); }
        if (sq && searchInput) { searchInput.value = sq; searchInput.dispatchEvent(new Event('input')); }
    }

    /* ── Quiz engine ─────────────────────────────────────────── */
    const QUIZ = {
        questions: [
            {
                id: 1,
                question: 'Как вы сейчас чувствуете себя в цифровом мире?',
                sub: 'Выберите, что ближе всего к вашей ситуации',
                options: [
                    { icon: '🌱', text: 'Чувствую себя новичком, многое непонятно', value: 'beginner' },
                    { icon: '📱', text: 'Умею базовые вещи, хочу большего', value: 'basic' },
                    { icon: '💡', text: 'Понимаю технологии, но боюсь AI', value: 'intermediate' },
                    { icon: '🚀', text: 'Готова учиться и внедрять новое', value: 'ready' },
                ],
            },
            {
                id: 2,
                question: 'Что вас больше всего привлекает в цифровых возможностях?',
                sub: 'Это поможет подобрать нужное направление',
                options: [
                    { icon: '💰', text: 'Дополнительный доход онлайн', value: 'income' },
                    { icon: '🎨', text: 'Творческая деятельность и самовыражение', value: 'creative' },
                    { icon: '📊', text: 'Прокачать карьеру и профессию', value: 'career' },
                    { icon: '🤝', text: 'Свой проект или малый бизнес', value: 'business' },
                ],
            },
            {
                id: 3,
                question: 'Сколько времени вы готовы уделять обучению в неделю?',
                sub: 'Будем реалистичны — это важно для результата',
                options: [
                    { icon: '⏰', text: '1–2 часа, понемногу каждый день', value: 'low' },
                    { icon: '📅', text: '3–5 часов, 2–3 раза в неделю', value: 'medium' },
                    { icon: '🔥', text: '5–10 часов, стараюсь активно', value: 'high' },
                    { icon: '⚡', text: 'Готова погрузиться полностью', value: 'intensive' },
                ],
            },
            {
                id: 4,
                question: 'Какой стиль обучения вам ближе?',
                sub: 'У всех разные способы усвоения информации',
                options: [
                    { icon: '🎥', text: 'Видеоуроки с пояснениями', value: 'video' },
                    { icon: '📝', text: 'Практика и выполнение заданий', value: 'practice' },
                    { icon: '👥', text: 'Живые встречи и сообщество', value: 'community' },
                    { icon: '📖', text: 'Самостоятельно по инструкциям', value: 'self' },
                ],
            },
            {
                id: 5,
                question: 'Что вас сдерживает больше всего прямо сейчас?',
                sub: 'Честный ответ поможет нам помочь именно вам',
                options: [
                    { icon: '😰', text: 'Страх, что не справлюсь технически', value: 'fear' },
                    { icon: '⏳', text: 'Нехватка времени на обучение', value: 'time' },
                    { icon: '🗺️', text: 'Не знаю, с чего начать', value: 'direction' },
                    { icon: '💸', text: 'Не готова сразу тратить большие суммы', value: 'budget' },
                ],
            },
        ],

        results: {
            beginner_income: { title: 'Мягкий старт в цифровой доход', emoji: '🌸', direction: 'AI-Старт', desc: 'Начнём с самого простого: освоим базовые инструменты и найдём первый онлайн-доход без стресса.' },
            beginner_creative: { title: 'Цифровое творчество для вас', emoji: '🎨', direction: 'Онлайн-инструменты', desc: 'Освоим простые инструменты для создания красивого контента и самовыражения онлайн.' },
            basic_career: { title: 'Карьерный апгрейд через AI', emoji: '📈', direction: 'AI для работы', desc: 'AI-инструменты дадут вам преимущество в текущей профессии и откроют новые возможности.' },
            ready_business: { title: 'Цифровой бизнес с нуля', emoji: '🚀', direction: 'Digital-профессии', desc: 'Вы готовы! Выстроим систему онлайн-присутствия и монетизации вашей экспертизы.' },
            default: { title: 'Ваш персональный путь в AI', emoji: '✨', direction: 'AI-Старт', desc: 'Мы подобрали для вас оптимальный маршрут: начните с программы AI-Старт и двигайтесь уверенно.' },
        },

        state: { current: 0, answers: [] },

        getResult() {
            const a = this.state.answers;
            return this.results[`${a[0]}_${a[1]}`] || this.results.default;
        },
    };

    function initQuiz() {
        const quizStep = $('#quizStep');
        const resultStep = $('#resultStep');
        if (!quizStep) return;

        const progressFill = $('#progressFill');
        const progressLabel = $('#progressLabel');
        const progressPct = $('#progressPct');
        const questionEl = $('#quizQuestion');
        const subEl = $('#quizSub');
        const optionsEl = $('#quizOptions');
        const btnBack = $('#btnBack');
        const btnNext = $('#btnNext');

        function render() {
            const q = QUIZ.questions[QUIZ.state.current];
            const pct = Math.round((QUIZ.state.current / QUIZ.questions.length) * 100);

            if (progressFill) progressFill.style.width = pct + '%';
            if (progressLabel) progressLabel.textContent = `Вопрос ${QUIZ.state.current + 1} из ${QUIZ.questions.length}`;
            if (progressPct) progressPct.textContent = pct + '%';
            if (questionEl) questionEl.textContent = q.question;
            if (subEl) subEl.textContent = q.sub;

            if (optionsEl) {
                optionsEl.innerHTML = q.options.map((opt) => `
          <button class="quiz-option${QUIZ.state.answers[QUIZ.state.current] === opt.value ? ' selected' : ''}"
            data-value="${opt.value}" aria-pressed="${QUIZ.state.answers[QUIZ.state.current] === opt.value}">
            <span class="quiz-option__icon" aria-hidden="true">${opt.icon}</span>
            <span>${opt.text}</span>
          </button>`).join('');

                $$('.quiz-option', optionsEl).forEach(btn => {
                    btn.addEventListener('click', () => {
                        QUIZ.state.answers[QUIZ.state.current] = btn.dataset.value;
                        $$('.quiz-option', optionsEl).forEach(b => {
                            b.classList.toggle('selected', b === btn);
                            b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
                        });
                        if (btnNext) btnNext.disabled = false;
                        push('quiz_option_selected', {
                            question_id: QUIZ.questions[QUIZ.state.current].id,
                            option_value: btn.dataset.value,
                            question_text: QUIZ.questions[QUIZ.state.current].question,
                        });
                    });
                });
            }

            if (btnNext) btnNext.disabled = !QUIZ.state.answers[QUIZ.state.current];
            if (btnBack) btnBack.disabled = QUIZ.state.current === 0;
        }

        function showResult() {
            quizStep.style.display = 'none';
            resultStep.classList.add('active');

            const res = QUIZ.getResult();
            const set = (id, val) => { const el = $(id); if (el) el.textContent = val; };
            set('#resultEmoji', res.emoji);
            set('#resultTitle', res.title);
            set('#resultSubtitle', 'Это ваш персональный маршрут цифрового перехода');
            set('#resultDirection', res.direction);
            set('#resultDesc', res.desc);

            push('quiz_completed', { result_title: res.title, result_direction: res.direction, answers: QUIZ.state.answers.join(','), ...getUTM() });
            if (typeof gtag === 'function') gtag('event', 'quiz_complete', { result: res.direction });
        }

        if (btnNext) {
            btnNext.addEventListener('click', () => {
                if (QUIZ.state.current < QUIZ.questions.length - 1) { QUIZ.state.current++; render(); }
                else showResult();
            });
        }
        if (btnBack) {
            btnBack.addEventListener('click', () => {
                if (QUIZ.state.current > 0) { QUIZ.state.current--; render(); }
            });
        }

        push('quiz_started', getUTM());
        render();
    }

    /* ── Smooth anchors ──────────────────────────────────────── */
    function initSmoothAnchors() {
        $$('a[href^="#"]').forEach(a => {
            a.addEventListener('click', e => {
                const target = document.getElementById(a.getAttribute('href').slice(1));
                if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
            });
        });
    }

    /* ── Lazy images ─────────────────────────────────────────── */
    function initLazyImages() {
        if (!('IntersectionObserver' in window)) return;
        const observer = new IntersectionObserver(
            entries => entries.forEach(e => { if (e.isIntersecting && e.target.dataset.src) { e.target.src = e.target.dataset.src; observer.unobserve(e.target); } }),
            { rootMargin: '200px' }
        );
        $$('img[loading="lazy"]').forEach(img => observer.observe(img));
    }

    /* ── UTM persistence ─────────────────────────────────────── */
    function persistUTM() {
        const utms = getUTM();
        if (Object.values(utms).some(Boolean)) {
            try { sessionStorage.setItem('infolady_utms', JSON.stringify(utms)); } catch (_) { }
        }
    }

    function appendUTMToAffiliates() {
        let stored = {};
        try { stored = JSON.parse(sessionStorage.getItem('infolady_utms') || '{}'); } catch (_) { }
        const utms = Object.assign({}, stored, getUTM());
        if (!Object.values(utms).some(Boolean)) return;
        $$('[data-affiliate]').forEach(link => {
            if (!link.href) return;
            try { const url = new URL(link.href); Object.entries(utms).forEach(([k, v]) => { if (v) url.searchParams.set(k, v); }); link.href = url.toString(); } catch (_) { }
        });
    }

    /* ── Consultation CTA ────────────────────────────────────── */
    function initConsultation() {
        const btn = $('#consultationBtn');
        if (btn) {
            btn.addEventListener('click', function () {
                push('consultation_click', {
                    button_text: this.textContent.trim(),
                    page_location: window.location.href,
                    ...getUTM(),
                });
            });
        }

        /* Services page: any .services-cta-link button */
        $$('.services-cta-link').forEach(link => {
            link.addEventListener('click', function () {
                push('services_cta_click', {
                    button_text: this.textContent.trim(),
                    page_location: window.location.href,
                    ...getUTM(),
                });
            });
        });

        /* Services hero CTA */
        const sHero = $('#servicesHeroBtn');
        if (sHero) {
            sHero.addEventListener('click', function () {
                push('services_cta_click', {
                    button_text: this.textContent.trim(),
                    source: 'hero',
                    ...getUTM(),
                });
            });
        }
    }

    /* ── Services Form ───────────────────────────────────────── */
    function initServicesForm() {
        const form = $('#servicesForm');
        if (!form) return;
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            const data = Object.fromEntries(new FormData(this).entries());
            push('services_form_submit', { ...data, ...getUTM() });
            /* Replace form with success message */
            form.innerHTML = `
                <div style="text-align:center;padding:32px 0">
                    <div style="font-size:2.5rem;margin-bottom:16px">✅</div>
                    <h3 style="margin-bottom:12px">Заявка отправлена!</h3>
                    <p>Я свяжусь с вами в течение 24 часов. Ожидайте сообщения в Telegram или на email.</p>
                </div>`;
        });
    }

    function initHeroScan() {
        const btn = $('#heroScanSubmit');
        const input = $('#heroScanInput');
        if (!btn || !input) return;

        // ─── Auto-Restore Session ───
        const lastDomain = localStorage.getItem('last_domain');
        if (lastDomain) {
            const actions = $('.hero__actions-scan');
            if (actions && actions.parentNode) {
                const lang = document.documentElement.lang === 'ru' ? 'ru' : 'en';
                const isUnlocked = localStorage.getItem('unlocked') === 'true';
                const isPro = localStorage.getItem('pro') === 'true';
                
                const returnBlock = document.createElement('div');
                returnBlock.className = 'returning-user-block';
                returnBlock.style.cssText = 'background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 14px; margin-bottom: 20px; text-align: left; display: flex; align-items: center; justify-content: space-between; gap: 12px; width: 100%; max-width: 640px;';
                returnBlock.innerHTML = `
                    <div style="display: flex; gap: 10px; align-items: center;">
                        <i data-lucide="history" style="color: #00e0ff; width: 20px; height: 20px; flex-shrink:0;"></i>
                        <div>
                            <div style="font-weight: 700; color: #fff; font-size: 0.95rem;">${lang === 'ru' ? 'Вы уже проверяли сайт' : 'You already analyzed a site'}</div>
                            <div style="font-size: 0.8rem; color: var(--text-dim); text-overflow: ellipsis; overflow: hidden; white-space: nowrap; max-width: 280px;">${lastDomain}</div>
                        </div>
                    </div>
                    <a href="/${lang}/report.html?domain=${encodeURIComponent(lastDomain)}${isUnlocked ? '&unlocked=true' : ''}${isPro ? '&pro=true' : ''}" class="btn btn-primary btn-sm" style="flex-shrink: 0; padding: 8px 16px; font-size: 0.85rem;">
                        ${lang === 'ru' ? 'Вернуться к отчету' : 'Return to report'}
                    </a>
                `;
                actions.parentNode.insertBefore(returnBlock, actions);
                setTimeout(() => { if (window.lucide) lucide.createIcons(); }, 100);
            }
        }

        btn.addEventListener('click', () => {
            const url = input.value.trim();
            if (!url) {
                input.focus();
                return;
            }
            const lang = document.documentElement.lang === 'ru' ? 'ru' : 'en';
            const src = localStorage.getItem('source') || '';
            const ref = localStorage.getItem('referral') || '';
            window.location.href = `/${lang}/audit-preview.html?url=${encodeURIComponent(url)}&src=${encodeURIComponent(src)}&ref=${encodeURIComponent(ref)}`;
        });

        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') btn.click();
        });
    }

    /* ── Translations & i18n ─────────────────────────────────── */
    function applyTranslations() {
        // Detect language from URL first, then fallback to localStorage
        let lang = 'ru'; // default
        const path = window.location.pathname;
        
        if (path.startsWith('/en/')) {
            lang = 'en';
        } else if (path.startsWith('/ru/')) {
            lang = 'ru';
        } else {
            // Fallback to localStorage (use correct key)
            lang = localStorage.getItem('lang') || localStorage.getItem('site_language') || 'ru';
        }
        
        const dict = typeof T !== 'undefined' ? (T[lang] || T.ru) : {};

        // 1. Text content translation (if dict exists)
        $$('[data-i18n]').forEach(el => {
            const key = el.dataset.i18n;
            if (dict[key]) el.textContent = dict[key];
        });

        // 2. Placeholders translation
        const placeholderSelector = 'input[data-placeholder-ru], input[data-placeholder-en], textarea[data-placeholder-ru], textarea[data-placeholder-en]';
        $$(placeholderSelector).forEach(el => {
            const ph = lang === 'ru' ? el.dataset.placeholderRu : el.dataset.placeholderEn;
            if (ph) el.placeholder = ph;
        });

        // 3. Dynamic attributes translation (data-en/data-ru pattern)
        $$('[data-en][data-ru]').forEach(el => {
            const val = lang === 'ru' ? el.dataset.ru : el.dataset.en;
            if (val) el.textContent = val;
        });
    }

    /* ── Mobile CTA Scroll Behavior ──────────────────────────── */
    function initMobileCtaScroll() {
        const cta = $('.mobile-cta');
        if (!cta) return;

        let lastScrollY = 0;
        let scrollDirection = 'up';
        const scrollThreshold = 50;
        let scrollTimer;

        function updateScrollBehavior() {
            const currentScrollY = window.scrollY;
            const isAtTop = currentScrollY < scrollThreshold;
            const isAtBottom = (currentScrollY + window.innerHeight) >= document.documentElement.scrollHeight - 200;

            /* Show button if at top, bottom, or scrolling up */
            const shouldShow = isAtTop || isAtBottom || scrollDirection === 'up';
            
            if (shouldShow && cta.classList.contains('hidden')) {
                cta.classList.remove('hidden');
            } else if (!shouldShow && !cta.classList.contains('hidden')) {
                cta.classList.add('hidden');
            }

            lastScrollY = currentScrollY;
        }

        window.addEventListener('scroll', () => {
            clearTimeout(scrollTimer);
            const currentScrollY = window.scrollY;

            /* Determine scroll direction */
            if (currentScrollY > lastScrollY + 5) {
                scrollDirection = 'down';
            } else if (currentScrollY < lastScrollY - 5) {
                scrollDirection = 'up';
            }

            /* Debounce final check */
            scrollTimer = setTimeout(updateScrollBehavior, 100);
        }, { passive: true });

        /* Initial state */
        updateScrollBehavior();
    }

    /* ── Bootstrap ───────────────────────────────────────────── */
    document.addEventListener('DOMContentLoaded', () => {
        /* Load Lucide Icons */
        const lScript = document.createElement('script');
        lScript.src = 'https://unpkg.com/lucide@latest';
        lScript.onload = () => { if (window.lucide) { lucide.createIcons(); } };
        document.head.appendChild(lScript);

        initNav();
        initMegaNav();
        initHeroScan();
        initScrollAnimations();
        initAffiliateTracking();
        initCatalog();
        initQuiz();
        initSmoothAnchors();
        initLazyImages();
        persistUTM();
        appendUTMToAffiliates();
        initConsultation();
        initServicesForm();
        initLangSwitcher();
        // initSmartRouting();
        initCurrencySwitcher();
        initChatbot();
        initBarCharts();
        initGauges();
        initTabs();
        initMobileCtaScroll();

        applyTranslations(); // Apply i18n on load

        push('page_view', { page_title: document.title, page_location: window.location.href, ...getUTM() });
    });

    /* ── Mega-Nav ─────────────────────────────────────────────── */
    function initMegaNav() {
        const items = $$('.pnav__item');
        if (!items.length) return;

        let openItem = null;

        function closeAll() {
            items.forEach(item => {
                item.classList.remove('open');
                const trigger = item.querySelector('.pnav__trigger');
                if (trigger) trigger.setAttribute('aria-expanded', 'false');
            });
            openItem = null;
        }

        items.forEach(item => {
            const trigger = item.querySelector('.pnav__trigger');
            if (!trigger) return;

            trigger.addEventListener('click', e => {
                e.stopPropagation();
                const isOpen = item.classList.contains('open');
                closeAll();
                if (!isOpen) {
                    item.classList.add('open');
                    trigger.setAttribute('aria-expanded', 'true');
                    openItem = item;
                }
            });
        });

        document.addEventListener('click', closeAll);
        document.addEventListener('keydown', e => { if (e.key === 'Escape') closeAll(); });

        /* Mobile accordion */
        $$('.pnav__mobile-section-trigger').forEach(btn => {
            btn.addEventListener('click', () => {
                const links = btn.nextElementSibling;
                if (!links) return;
                const open = links.classList.toggle('open');
                btn.setAttribute('aria-expanded', String(open));
            });
        });

        /* Mobile burger for platform nav */
        const burger = $('.nav__burger');
        const drawer = $('#mobileDrawer');
        if (burger && drawer) {
            burger.addEventListener('click', () => {
                const hidden = drawer.hasAttribute('hidden');
                if (hidden) { drawer.removeAttribute('hidden'); burger.setAttribute('aria-expanded', 'true'); }
                else { drawer.setAttribute('hidden', ''); burger.setAttribute('aria-expanded', 'false'); }
            });
        }
    }

    /* ── Translations dictionary ─────────────────────────────── */
    const T = {
        ru: {
            /* Nav */
            nav_tools: '🔧 Инструменты',
            nav_analytics: '📈 Аналитика',
            nav_leads: '🎯 Лиды',
            nav_marketplace: '🛒 Маркетплейс',
            nav_learning: '📚 Обучение',
            nav_platform: '⚙️ Платформа',
            nav_free_scan: 'Проверить сайт бесплатно',
            nav_get_audit: 'Получить аудит',
            /* Dropdown headers */
            dd_website_analysis: 'Анализ сайта',
            dd_insights: 'Аналитика',
            dd_client_discovery: 'Поиск клиентов',
            dd_seo_services: 'SEO-услуги',
            dd_saas_features: 'Функции платформы',
            dd_currently_viewing: 'Вы здесь',
            /* Dropdown items */
            dd_ai_scanner: 'Сканер видимости',
            dd_ai_audit: 'Аудит видимости',
            dd_content_optimizer: 'Оптимизатор контента',
            dd_competitor_intel: 'Анализ конкурентов',
            dd_traffic_analytics: 'Аналитика трафика',
            dd_ai_radar: 'Радар трендов',
            dd_market_map: 'Карта рынка',
            dd_lead_finder: 'Поиск лидов',
            dd_outreach_gen: 'Генератор рассылки',
            dd_auto_outreach: 'Авто-рассылка',
            dd_website_db: 'База сайтов',
            dd_seo_marketplace: 'Маркетплейс',
            dd_learning_hub: 'Центр обучения Digital SEO',
            dd_ai_score_api: 'Visibility Rating API',
            dd_score_badge: 'Бейдж видимости',
            dd_report_gen: 'Генератор отчётов',
            dd_white_label: 'Белая метка',
            /* Common Buttons */
            btn_free_scan: 'Проверить сайт бесплатно',
            btn_scan_website: 'Сканировать сайт',
            btn_scan_now: 'Сканировать',
            btn_analyze: '🚦 Анализировать',
            btn_find_leads: '🔎 Найти лиды',
            btn_generate_email: '📧 Создать письмо',
            btn_generate_badge: '🏅 Создать бейдж',
            btn_generate_report: '📄 Сгенерировать PDF',
            btn_run_radar: '📡 Запустить радар',
            btn_get_api_score: '🎯 Получить скор',
            btn_request_audit: 'Запросить аудит',
            btn_full_audit: '📊 Полный аудит →',
            btn_get_report: 'Получить полный отчёт →',
            btn_compare_competitors: 'Сравнить с конкурентами',
            btn_copy: '📋 Копировать',
            btn_apply: 'Подать заявку',
            btn_submit: '🚀 Отправить',
            btn_join_waitlist: '⚡ Войти в список ожидания',
            btn_send_list: 'Отправить список →',
            btn_download_csv: '📥 Отправить CSV →',
            btn_order_basic: 'Заказать Basic →',
            btn_order_full: 'Заказать полный аудит →',
            btn_order_premium: 'Заказать Premium →',
            btn_apply_now: 'Подать заявку →',
            btn_filter: '🔍 Фильтровать',
            btn_back: '← Назад',
            btn_next: 'Далее →',
            /* Common labels */
            label_free_tool: 'Бесплатный инструмент',
            label_analytics: 'Аналитика',
            label_tools: 'Инструменты',
            label_leads: 'Лиды',
            label_platform: 'Платформа',
            label_marketplace: 'Маркетплейс',
            label_learning: 'Обучение',
            label_features: 'Возможности',
            label_how_it_works: 'Как это работает',
            label_packages: 'Пакеты',
            label_pricing: 'Стоимость',
            label_process: 'Процесс',
            label_docs: 'Документация',
            label_quick_demo: 'Быстрое демо',
            label_badge_gen: 'Генератор бейджа',
            label_report_gen: 'Генератор отчётов',
            label_industry_comparison: 'Сравнение отраслей',
            label_top_opp: 'Топ возможности',
            label_db_filter: 'Фильтр базы',
            label_request_access: 'Запросить доступ',
            label_partner_form: 'Форма для партнёров',
            label_6_dimensions: '6 измерений',
            label_report_contents: 'Содержание отчёта',
            /* Placeholders */
            ph_url: 'https://ваш-сайт.ru',
            ph_domain: 'https://домен.ru',
            ph_client_url: 'https://сайт-клиента.ru',
            ph_prospect_url: 'https://сайт-перспективного-клиента.ru',
            ph_niche: 'напр. стоматология, недвижимость, интернет-магазин',
            ph_your_name: 'Ваше имя / название агентства',
            ph_email: 'ваш@email.ru',
            ph_agency_name: 'Название агентства',
            ph_agency_url: 'Сайт вашего агентства',
            ph_target_niche: 'Ваша целевая ниша (напр. стоматологии)',
            ph_business_desc: 'Опишите бизнес и цели SEO…',
            ph_agency_desc: 'Кратко опишите агентство и клиентскую базу…',
            ph_ask_seo: 'Спросите про SEO…',
            stat_sites_analyzed: 'САЙТОВ ПРОАНАЛИЗИРОВАНО',
            stat_avg_time: 'СРЕДНЕЕ ВРЕМЯ',
            stat_params: 'ПАРАМЕТРОВ АНАЛИЗА',
            /* Reports */
            report_title: 'Отчёт SEO-аудита',
            btn_back_home: '← На главную',
            btn_edit_branding: '⚙️ Настройки White-Label',
            btn_export_pdf: '📥 Скачать PDF',
            btn_share_link: '🔗 Поделиться ссылкой',
            prepared_by: 'Подготовлено:',
            seo_score: 'SEO-оценка',
            ai_visibility: 'Visibility Rating',
            technical_issues: 'Технические проблемы',
            ai_citations: 'Упоминания в поиске',
            improvement_recs: 'Рекомендации по улучшению',
            report_generated_by: 'Отчёт сгенерирован автоматически',
            wl_settings: 'Настройки White-Label',
            wl_agency_name: 'Название агентства',
            wl_agency_logo: 'URL логотипа или Base64',
            wl_plan: 'Тариф',
            plan_free: 'Бесплатный',
            plan_pro: 'Pro',
            plan_agency: 'Агентство',
            btn_save: 'Сохранить настройки',
            /* Footer */
            footer_platform: 'Платформа аналитики поиска',
            /* Global Translations (Nav, Heroes, Cards) */
            nav_scanner: 'Сканер',
            nav_radar: 'Trend Radar',
            nav_about: 'О проекте',
            nav_pricing: 'Цены',
            hero_scanner: 'Анализ видимости в поиске',
            hero_audit: 'Аудит видимости',
            hero_pricing: 'Выберите пакет аудита',
            hero_tools: 'Каталог цифровых инструментов',
            hero_marketplace: 'Маркетплейс',
            hero_learning: 'Центр обучения',
            hero_about: 'О проекте InfoLady',
            btn_check_seo: 'Проверить видимость',
            btn_visit_tool: 'Открыть инструмент',
            btn_read: 'Читать',
            card_audit: 'Search Visibility Audit',
            card_optimizer: 'Оптимизатор контента',
            card_radar: 'Search Trend Radar',
            lbl_free: 'Бесплатно',
            lbl_premium: 'Премиум',
            lbl_popular: 'Самый популярный'
        },
        en: {
            nav_tools: '🔧 Tools',
            nav_analytics: '📈 Analytics',
            nav_leads: '🎯 Leads',
            nav_marketplace: '🛒 Marketplace',
            nav_learning: '📚 Learning',
            nav_platform: '⚙️ Platform',
            nav_free_scan: 'Check your site for free',
            nav_get_audit: 'Get Audit',
            dd_website_analysis: 'Website Analysis',
            dd_insights: 'Insights',
            dd_client_discovery: 'Client Discovery',
            dd_seo_services: 'SEO Services',
            dd_saas_features: 'SaaS Features',
            dd_currently_viewing: 'Currently viewing',
            dd_ai_scanner: 'Visibility Scanner',
            dd_ai_audit: 'Search Visibility Audit',
            dd_content_optimizer: 'Content Optimizer',
            dd_competitor_intel: 'Competitor Intelligence',
            dd_traffic_analytics: 'Traffic Analytics',
            dd_ai_radar: 'Search Trend Radar',
            dd_market_map: 'Market Map',
            dd_lead_finder: 'Lead Finder',
            dd_outreach_gen: 'Outreach Generator',
            dd_auto_outreach: 'Auto Outreach',
            dd_website_db: 'Website Database',
            dd_seo_marketplace: 'Marketplace',
            dd_learning_hub: 'Digital SEO Learning Hub',
            dd_ai_score_api: 'Visibility Rating API',
            dd_score_badge: 'Visibility Badge',
            dd_report_gen: 'Report Generator',
            dd_white_label: 'White Label',
            btn_free_scan: 'Check your site for free',
            btn_scan_website: 'Scan Website',
            btn_scan_now: 'Scan Now',
            btn_analyze: '🚦 Analyze',
            btn_find_leads: '🔎 Find Leads',
            btn_generate_email: '📧 Generate Email',
            btn_generate_badge: '🏅 Generate Badge',
            btn_generate_report: '📄 Generate PDF Report',
            btn_run_radar: '📡 Generate Radar',
            btn_get_api_score: '🎯 Get Score',
            btn_request_audit: 'Request Audit',
            btn_full_audit: '📊 Full SEO Audit →',
            btn_get_report: 'Get Full Audit Report →',
            btn_compare_competitors: 'Compare with Competitors',
            btn_copy: '📋 Copy',
            btn_apply: 'Apply',
            btn_submit: '🚀 Submit',
            btn_join_waitlist: '⚡ Join Beta Waitlist',
            btn_send_list: 'Send Full List →',
            btn_download_csv: '📥 Send CSV →',
            btn_order_basic: 'Order Basic →',
            btn_order_full: 'Order Full Audit →',
            btn_order_premium: 'Order Premium →',
            btn_apply_now: 'Apply Now →',
            btn_filter: '🔍 Filter',
            btn_back: '← Back',
            btn_next: 'Next →',
            label_free_tool: 'Free Tool',
            label_analytics: 'Analytics',
            label_tools: 'Tools',
            label_leads: 'Leads',
            label_platform: 'Platform',
            label_marketplace: 'Marketplace',
            label_learning: 'Learning',
            label_features: 'Features',
            label_how_it_works: 'How It Works',
            label_packages: 'Packages',
            label_pricing: 'Pricing',
            label_process: 'Process',
            label_docs: 'Documentation',
            label_quick_demo: 'Quick Demo',
            label_badge_gen: 'Badge Generator',
            label_report_gen: 'Report Generator',
            label_industry_comparison: 'Industry Comparison',
            label_top_opp: 'Top Opportunities',
            label_db_filter: 'Database Filter',
            label_request_access: 'Request Access',
            label_partner_form: 'Partner Form',
            label_6_dimensions: '6 Dimensions',
            label_report_contents: 'Report Contents',
            ph_url: 'https://your-site.com',
            ph_domain: 'https://domain.com',
            ph_client_url: 'https://clientwebsite.com',
            ph_prospect_url: 'https://prospectwebsite.com',
            ph_niche: 'e.g. real estate, dental clinic, e-commerce',
            ph_your_name: 'Your name / agency name',
            ph_email: 'your@email.com',
            ph_agency_name: 'Agency name',
            ph_agency_url: 'Agency website URL',
            ph_target_niche: 'Your target niche (e.g. dental clinics)',
            ph_business_desc: 'Briefly describe your business and main SEO goals…',
            ph_agency_desc: 'Briefly describe your agency and client base…',
            ph_ask_seo: 'Ask about SEO…',
            stat_sites_analyzed: 'SITES ANALYZED',
            stat_avg_time: 'AVG TIME',
            stat_params: 'ANALYSIS PARAMS',
            /* Reports */
            report_title: 'SEO Audit Report',
            btn_back_home: '← Back to Home',
            btn_edit_branding: '⚙️ White Label',
            btn_export_pdf: '📥 Download PDF',
            btn_share_link: '🔗 Share Link',
            prepared_by: 'Prepared by:',
            seo_score: 'SEO score',
            ai_visibility: 'Visibility Rating',
            technical_issues: 'Technical issues',
            ai_citations: 'Search citations',
            improvement_recs: 'Improvement recommendations',
            report_generated_by: 'Report generated automatically',
            wl_settings: 'White-Label Settings',
            wl_agency_name: 'Agency Name',
            wl_agency_logo: 'Agency Logo URL / Base64',
            wl_plan: 'Plan',
            plan_free: 'Free',
            plan_pro: 'Pro',
            plan_agency: 'Agency',
            btn_save: 'Save Settings',
            footer_platform: 'AI SEO Platform',
            /* Global Translations (Nav, Heroes, Cards) */
            nav_scanner: 'Scanner',
            nav_radar: 'AI Radar',
            nav_about: 'About',
            nav_pricing: 'Pricing',
            hero_scanner: 'Free AI SEO Checker',
            hero_audit: 'AI SEO & GEO Website Audit',
            hero_pricing: 'Choose Your Audit Package',
            hero_tools: 'Best AI Tools Directory',
            hero_marketplace: 'AI SEO Marketplace',
            hero_learning: 'Learning Hub',
            hero_about: 'About InfoLady',
            btn_check_seo: 'Check SEO',
            btn_visit_tool: 'Visit Tool',
            btn_read: 'Read',
            card_audit: 'AI SEO Audit',
            card_optimizer: 'AI Content Optimizer',
            card_radar: 'AI Readiness Radar',
            lbl_free: 'Free',
            lbl_premium: 'Premium',
            lbl_popular: 'Most Popular'
        }
    };

    /* ── Language Switcher ───────────────────────────────────── */
    function initLangSwitcher() {
        const btns = $$('.lang-btn');
        if (!btns.length) return;

        let path = window.location.pathname;
        let currentLang = 'ru'; // Default fallback
        if (path.startsWith('/en/')) {
            currentLang = 'en';
        } else if (path.startsWith('/ru/')) {
            currentLang = 'ru';
        } else if (path.startsWith('/platform/') && path.includes('.html')) {
            currentLang = path.endsWith('-ru.html') ? 'ru' : 'en';
        } else {
            currentLang = localStorage.getItem('site_language') || 'ru';
        }

        function applyLang(lang) {
            currentLang = lang;
            localStorage.setItem('lang', lang); // SaaS Standard
            localStorage.setItem('site_language', lang); // Backwards compatibility

            /* --- Update active button state --- */
            btns.forEach(b => b.classList.toggle('active', b.dataset.lang === lang));
            document.documentElement.lang = lang;
        }

        btns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                let targetLang = btn.dataset.lang || (btn.textContent.trim().toUpperCase() === 'EN' ? 'en' : 'ru');

                if (targetLang === currentLang) return;

                // Carry all URL parameters (saves domain, email, etc.)
                const currentUrl = window.location.href;
                let newUrl = currentUrl;

                if (path.startsWith('/en/') || path.startsWith('/ru/')) {
                    newUrl = currentUrl.replace(`/${currentLang}/`, `/${targetLang}/`);
                } else {
                    let newPath = (path === '/' || path === '/index.html') ? '' : path.split('/').pop();
                    newUrl = window.location.origin + `/${targetLang}/${newPath}` + window.location.search;
                }

                applyLang(targetLang);
                window.location.href = newUrl;
            });
        });

        applyLang(currentLang);
    }

    /* ── Chatbot ──────────────────────────────────────────────── */
    function initChatbot() {
        const isEN = window.location.pathname.includes('/en/');
        const widget = document.createElement('div');
        widget.className = 'chatbot';
        widget.id = 'chatbotWidget';
        widget.innerHTML = `
            <button class="chatbot__trigger" id="chatbotTrigger" aria-label="AI Sales Assistant" aria-expanded="false" title="${isEN ? 'Ask a question' : 'Задай вопрос'}">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="color: #fff;">
                    <path d="M12 2C6.48 2 2 6.48 2 12c0 1.54.36 3 .97 4.29L2 22l6.29-1.97C9 21.64 10.46 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm0 18c-1.41 0-2.73-.36-3.88-1.02l-.28-.15-2.89.92.92-2.89-.15-.28C4.36 14.73 4 13.41 4 12c0-4.41 3.59-8 8-8s8 3.59 8 8-3.59 8-8 8z"></path>
                    <circle cx="8" cy="12" r="1.5" fill="currentColor"></circle>
                    <circle cx="12" cy="12" r="1.5" fill="currentColor"></circle>
                    <circle cx="16" cy="12" r="1.5" fill="currentColor"></circle>
                </svg>
            </button>
            <div class="chatbot__tooltip" id="chatbotTooltip">${isEN ? "Find where you're losing customers" : 'Разберу, где теряешь клиентов'}</div>
            <div class="chatbot__panel" id="chatbotPanel" role="dialog" aria-label="InfoLady Assistant">
                <div class="chatbot__header">
                    <div class="chatbot__header-info">
                        <div class="chatbot__avatar" aria-hidden="true">👋</div>
                        <div class="chatbot__header-text">
                            <strong>InfoLady</strong>
                            <span>${isEN ? 'AI Sales Assistant — Online' : 'AI Sales Assistant — Онлайн'}</span>
                        </div>
                    </div>
                    <button class="chatbot__close" id="chatbotClose" aria-label="${isEN ? 'Close chat' : 'Закрыть чат'}">✕</button>
                </div>
                <div class="chatbot__messages" id="chatbotMessages"></div>
                <div class="chatbot__quick-replies" id="chatbotQR"></div>
                <div class="chatbot__input-row">
                    <input type="text" class="chatbot__input" id="chatbotInput" placeholder="${isEN ? 'Ask about SEO…' : 'Спросите про SEO…'}" aria-label="${isEN ? 'Message' : 'Сообщение'}">
                    <button class="chatbot__send" id="chatbotSend" aria-label="${isEN ? 'Send' : 'Отправить'}">⟳</button>
                </div>
            </div>`;
        setTimeout(() => {
        document.body.appendChild(widget);

        const trigger = $('#chatbotTrigger');
        const panel = $('#chatbotPanel');
        const tooltip = $('#chatbotTooltip');
        const closeBtn = $('#chatbotClose');
        const messagesEl = $('#chatbotMessages');
        const qrEl = $('#chatbotQR');
        const input = $('#chatbotInput');
        const sendBtn = $('#chatbotSend');

        let started = false;

        function getLang() { return localStorage.getItem('lang') || localStorage.getItem('site_language') || 'ru'; }

        function openTelegram() {
            const message = getLang() === 'ru'
                ? 'Помощник InfoLady готов помочь 👇'
                : 'InfoLady assistant ready to help 👇';
            const telegramLink = `https://t.me/lyazkai_bot?text=${encodeURIComponent(message)}&start=mobile_chat`;
            window.open(telegramLink, '_blank');
        }

        function togglePanel() {
            const open = panel.classList.toggle('open');
            trigger.setAttribute('aria-expanded', String(open));
            if (open && !started) { started = true; startChat(); }
        }

        trigger.addEventListener('click', (e) => {
            e.preventDefault();
            togglePanel();
        });

        trigger.addEventListener('touchend', (e) => {
            e.preventDefault();
            togglePanel();
        });

        trigger.addEventListener('mouseenter', () => {
            tooltip.classList.add('show');
        });

        trigger.addEventListener('mouseleave', () => {
            tooltip.classList.remove('show');
        });

        closeBtn.addEventListener('click', () => {
            panel.classList.remove('open');
            trigger.setAttribute('aria-expanded', 'false');
        });

        function addMsg(text, role = 'bot') {
            const msg = document.createElement('div');
            msg.className = `chatbot__msg chatbot__msg--${role}`;
            msg.innerHTML = `<div class="chatbot__bubble">${text}</div>`;
            messagesEl.appendChild(msg);
            messagesEl.scrollTop = messagesEl.scrollHeight;
            return msg;
        }

        function setQR(replies) {
            qrEl.innerHTML = replies.map(r => {
                if (r.includes('Telegram') || r.includes('Switch')) {
                    return `<button class="chatbot__qr" data-reply="${r}" style="background: linear-gradient(135deg, #229ED9 0%, #0088cc 100%); color: #fff; border: none;">${r}</button>`;
                }
                return `<button class="chatbot__qr" data-reply="${r}">${r}</button>`;
            }).join('');
            
            $$('.chatbot__qr', qrEl).forEach(btn => {
                btn.addEventListener('click', () => {
                    if (btn.dataset.reply.includes('Telegram') || btn.dataset.reply.includes('Switch')) {
                        openTelegram();
                    } else {
                        handleReply(btn.dataset.reply);
                    }
                });
            });
        }

        let chatState = 'init';
        let capturedUrl = '';

        /* Bilingual quick-reply sets */
        const QR = {
            ru: {
                main: ['🚀 Перейти в Telegram', '🔍 Сканировать сайт', '📊 Запросить аудит', '❓ Что такое GEO?', '💰 Цены'],
                postScan: ['💰 Цены', '🔍 Сканировать другой сайт'],
                postAudit: ['🔍 Сначала сканировать', '💰 Цены'],
                postGeo: ['🔍 Сканировать сайт', '📚 Подробнее о GEO'],
                postGeoL: ['🔍 Сканировать сайт', '📊 Запросить аудит'],
                postPrice: ['📊 Запросить аудит', '🔍 Сначала сканировать'],
                fallback: ['🔍 Сканировать сайт', '📊 Запросить аудит', '💰 Цены'],
                report: ['📄 Получить полный отчёт', '🔍 Сканировать другой сайт'],
            },
            en: {
                main: ['🚀 Switch to Telegram', '🔍 Scan my website', '📊 Request audit', '❓ What is GEO?', '💰 See pricing'],
                postScan: ['💰 See pricing', '🔍 Scan another site'],
                postAudit: ['🔍 Scan my website first', '💰 See pricing'],
                postGeo: ['🔍 Scan my website', '📚 Learn more about GEO'],
                postGeoL: ['🔍 Scan my website', '📊 Request audit'],
                postPrice: ['📊 Request audit', '🔍 Scan my website first'],
                fallback: ['🔍 Scan my website', '📊 Request audit', '💰 See pricing'],
                report: ['📄 Get Full Audit Report', '🔍 Scan another site'],
            }
        };

        function startChat() {
            setTimeout(() => {
                const ru = getLang() === 'ru';
                const text = ru 
                    ? 'Привет 👋<br>Я помогу вам понять, как выглядит ваш сайт в ChatGPT и Google. Покажу, где вы теряете клиентов.'
                    : 'Hi there 👋<br>I can help you understand how your website looks in ChatGPT and Google. I\'ll show you where you\'re losing potential clients.';
                addMsg(text, 'bot');
                
                setQR(ru ? ['🔍 Анализировать мой сайт', '💡 Расскажи подробнее', '💰 Во сколько выйдет?'] : ['🔍 Analyze my website', '💡 Tell me more', '💰 How much does it cost?']);
            }, 800); // Faster greeting for better UX
        }

        async function fetchReply(text) {
            const ru = getLang() === 'ru';
            const typingBubble = addMsg(
                `<div class="typing-indicator" style="display:flex;gap:4px"><span>.</span><span>.</span><span>.</span></div>`, 
                'bot'
            );
            
            try {
                const apiUrl = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
                    ? 'http://localhost:3000/api/gpt-chat'
                    : 'https://api.infolady.online/api/gpt-chat';
                
                const res = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        message: text,
                        context: {
                            lang: getLang(),
                            page: window.location.pathname,
                            domain: window.location.hostname
                        }
                    })
                });

                const data = await res.json();
                
                // Typing Delay (Item 8)
                setTimeout(() => {
                    typingBubble.innerHTML = `<div class="chatbot__bubble">${data.reply}</div>`;
                    
                    if (data.showTelegram) {
                        const payload = `src_site_lang_${getLang()}_step_chat`;
                        const link = `https://t.me/lyazkai_bot?start=${payload}`;
                        qrEl.innerHTML = `<button class="chatbot__qr" style="background:#229ED9;color:#fff;border:none" onclick="window.open('${link}', '_blank')">🚀 ` + 
                            (ru ? 'Хочу полный разбор в Telegram' : 'Get analysis in Telegram') + `</button>`;
                    }
                }, 1000);

            } catch (err) {
                typingBubble.innerHTML = `<div class="chatbot__bubble">${ru ? 'Задумался. Напишите еще раз!' : 'Thinking. Try again!'}</div>`;
            }
        }

        function handleReply(text) {
            addMsg(text, 'user');
            qrEl.innerHTML = '';
            fetchReply(text);
        }

        function handleUserInput(val) {
            if (!val.trim()) return;
            addMsg(val, 'user');
            input.value = '';
            fetchReply(val);
        }

        sendBtn.addEventListener('click', () => handleUserInput(input.value));
        input.addEventListener('keydown', e => { if (e.key === 'Enter') handleUserInput(input.value); });

        $$('.chatbot__qr', qrEl).forEach(btn => btn.addEventListener('click', () => handleReply(btn.dataset.reply)));

        }, 4000); // end setTimeout
    }

    /* ── Bar Charts (animate fills on view) ─────────────────── */
    function initBarCharts() {
        const fills = $$('.bar-row__fill[data-width]');
        if (!fills.length) return;
        const observer = new IntersectionObserver(entries => {
            entries.forEach(e => {
                if (e.isIntersecting) {
                    e.target.style.width = e.target.dataset.width;
                    observer.unobserve(e.target);
                }
            });
        }, { threshold: 0.3 });
        fills.forEach(f => observer.observe(f));
    }

    /* ── Score Gauges (SVG circle animation) ────────────────── */
    function initGauges() {
        const gauges = $$('.gauge[data-score]');
        if (!gauges.length) return;
        const observer = new IntersectionObserver(entries => {
            entries.forEach(e => {
                if (e.isIntersecting) {
                    const score = parseInt(e.target.dataset.score, 10) || 0;
                    const fill = e.target.querySelector('.gauge__fill');
                    if (fill) {
                        const circumference = 251;
                        const offset = circumference - (score / 100) * circumference;
                        setTimeout(() => { fill.style.strokeDashoffset = offset; }, 100);
                    }
                    observer.unobserve(e.target);
                }
            });
        }, { threshold: 0.3 });
        gauges.forEach(g => observer.observe(g));
    }

    /* ── Tab Switcher ────────────────────────────────────────── */
    function initTabs() {
        $$('.tabs').forEach(tabsEl => {
            const btns = $$('.tab-btn', tabsEl);
            const container = tabsEl.closest('section') || document;
            const panels = $$('.tab-panel', container);

            btns.forEach((btn, i) => {
                btn.addEventListener('click', () => {
                    btns.forEach(b => { b.classList.remove('active'); b.setAttribute('aria-selected', 'false'); });
                    panels.forEach(p => p.classList.remove('active'));
                    btn.classList.add('active');
                    btn.setAttribute('aria-selected', 'true');
                    if (panels[i]) panels[i].classList.add('active');
                });
            });
        });
    }

    /* ── Affiliate Click Tracking ────────────────────────────── */
    function trackClick(type, label, url) {
        const event = {
            type: type,       /* 'course' | 'tool' | 'catalog' */
            label: label,
            url: url,
            ts: new Date().toISOString(),
            lang: localStorage.getItem('il_lang') || 'ru',
            page: location.pathname
        };
        /* Store in sessionStorage array */
        try {
            const stored = JSON.parse(sessionStorage.getItem('il_clicks') || '[]');
            stored.push(event);
            sessionStorage.setItem('il_clicks', JSON.stringify(stored));
        } catch (e) { }
        /* Also log to console for debugging */
        console.log('[InfoLady Affiliate]', event);
        /* Push to dataLayer if GTM present */
        if (window.dataLayer) {
            window.dataLayer.push({
                event: 'affiliate_click',
                affiliateType: type,
                affiliateLabel: label,
                affiliateUrl: url
            });
        }
    }

    function initAffiliateTracking() {
        /* Delegate listener — catches dynamically rendered cards too */
        document.body.addEventListener('click', function (e) {
            const link = e.target.closest('[data-track-type]');
            if (!link) return;
            const type = link.dataset.trackType || 'catalog';
            const label = link.dataset.trackLabel || link.textContent.trim();
            const url = link.href || '';
            trackClick(type, label, url);
        });
    }

    /* ── Currency Switcher (USD / KZT) ──────────────────────── */
    function initCurrencySwitcher() {
        function applyPrices(lang) {
            document.querySelectorAll('[data-price-usd][data-price-kzt]').forEach(function (el) {
                el.textContent = lang === 'en' ? el.dataset.priceUsd : el.dataset.priceKzt;
            });

            document.querySelectorAll('[data-lang-en]').forEach(function (el) {
                el.style.display = lang === 'en' ? 'block' : 'none';
            });
            document.querySelectorAll('[data-lang-ru]').forEach(function (el) {
                el.style.display = lang === 'ru' ? 'block' : 'none';
            });

            document.querySelectorAll('.kaspi-pay').forEach(function (el) {
                el.style.display = lang === 'ru' ? 'inline-flex' : 'none';
            });
            document.querySelectorAll('.kaspi-pay-container').forEach(function (el) {
                el.style.display = lang === 'ru' ? 'block' : 'none';
            });
            document.querySelectorAll('.paypal-pay').forEach(function (el) {
                el.style.display = lang === 'en' ? 'inline-flex' : 'none';
            });
            document.querySelectorAll('.paypal-pay-container').forEach(function (el) {
                el.style.display = lang === 'en' ? 'block' : 'none';
            });
            /* Hide paypal-button-container in RU/KZT mode as we use Kaspi */
            const ppContainer = document.getElementById('paypal-button-container');
            if (ppContainer) {
                ppContainer.style.display = lang === 'en' ? 'block' : 'none';
            }
        }

        /* Apply on load using stored preference */
        applyPrices(localStorage.getItem('lang') || 'ru');
    }

})();

