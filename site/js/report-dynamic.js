/**
 * InfoLady — report-dynamic.js
 * Fetches real website analysis from backend API and populates the Dashboard.
 */

document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const domain = params.get('domain') || localStorage.getItem('domain') || 'example.com';
    let isUnlocked = params.get('unlocked') === 'true' || localStorage.getItem('unlocked') === 'true';
    const isPro = params.get('pro') === 'true' || localStorage.getItem('pro') === 'true';
    const url = params.get('url') || 'https://' + domain;

    if (!isUnlocked && localStorage.getItem('paid') === 'true') {
        isUnlocked = true;
    }

    if (domain && domain !== 'example.com') {
        localStorage.setItem('domain', domain);
    }
    const isRu = window.location.pathname.includes('/ru/');

    // ─── Referral Tracking & Sources ───
    const ref = params.get('ref');
    if (ref) localStorage.setItem('referral', ref);
    const src = params.get('src');
    if (src) localStorage.setItem('source', src);

    // ─── "Almost Done" Psychology Banner ───
    if (!isUnlocked) {
        document.addEventListener('DOMContentLoaded', () => {
            const dashMain = document.querySelector('.dash-main');
            if (dashMain) {
                const progressDiv = document.createElement('div');
                progressDiv.style.cssText = 'background: rgba(0, 224, 255, 0.04); border: 1px solid rgba(0, 224, 255, 0.15); border-radius: 12px; padding: 14px; margin-bottom: 20px; text-align: center; width: 100%; clear: both;';
                progressDiv.innerHTML = `
                    <div style="font-weight: 700; color: #fff; font-size: 0.95rem; margin-bottom: 8px;">
                        ${isRu ? 'Вы уже на 70% к улучшению сайта 🎯' : "You are 70% closer to fixing your site 🎯"}
                    </div>
                    <div style="background: rgba(255,255,255,0.08); border-radius: 10px; height: 8px; width: 100%; max-width: 320px; margin: 0 auto;">
                        <div style="background: #00e0ff; width: 70%; height: 100%; border-radius: 10px; box-shadow: 0 0 10px rgba(0, 224, 255, 0.4);"></div>
                    </div>
                `;
                dashMain.prepend(progressDiv);
            }
        });
    }

    // ─── Lead Capture Banner ───
    if (!isUnlocked && !localStorage.getItem('lead_email')) {
        const headBar = document.createElement('div');
        headBar.style.cssText = 'background: rgba(124, 58, 237, 0.1); border-bottom: 1px solid rgba(124, 58, 237, 0.2); padding: 10px; text-align: center; font-size: 0.85rem; position: relative; z-index: 1000;';
        headBar.className = 'lead-bar';
        headBar.innerHTML = `
            <span style="color:#fff; margin-right:10px;">${isRu ? 'Введите email, чтобы сохранить отчет:' : 'Enter email to save report:'}</span>
            <input type="email" placeholder="Email" id="leadEmail" style="background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:4px; padding:4px 8px; color:#fff; font-size:0.8rem; width:180px; outline:none;">
            <button class="btn btn-primary btn-sm" onclick="const e=document.getElementById('leadEmail').value; if(e.includes('@')){ localStorage.setItem('lead_email', e); this.closest('.lead-bar').remove(); alert('${isRu ? 'Сохранено. Мы вышлем отчет.' : 'Saved!'}'); } else { alert('${isRu ? 'Некорректный email' : 'Invalid email'}'); }" style="padding:4px 10px; font-size:0.8rem; margin-left:5px;">${isRu ? 'Сохранить' : 'Save'}</button>
            <button style="background:none; border:none; color:rgba(255,255,255,0.4); margin-left:12px; cursor:pointer;" onclick="this.closest('.lead-bar').remove()">✕</button>
        `;
        document.body.prepend(headBar);
    }

    // ─── Save Domain & Status ───
    if (domain && domain !== 'example.com') {
        localStorage.setItem('last_domain', domain);
        if (isUnlocked) localStorage.setItem('unlocked', 'true');
        if (isPro) localStorage.setItem('pro', 'true');
    }

    // ─── Returning User Reminder Block ───
    const lastVisited = localStorage.getItem('last_domain');
    if (!isUnlocked && lastVisited === domain) {
        // We'll append the alert at the top of .dash-main dynamically
        document.addEventListener('DOMContentLoaded', () => {
            const dashMain = document.querySelector('.dash-main');
            if (dashMain) {
                const alertDiv = document.createElement('div');
                alertDiv.className = 'returning-alert';
                alertDiv.style.cssText = 'background: rgba(255, 159, 10, 0.08); border: 1px solid rgba(255, 159, 10, 0.2); border-radius: 12px; padding: 16px; margin-bottom: 24px; display: flex; align-items: center; justify-content: space-between; gap: 15px;';
                alertDiv.innerHTML = `
                    <div style="display: flex; gap: 12px; align-items: center;">
                        <i data-lucide="alert-circle" style="color: #ff9f0a; flex-shrink:0;"></i>
                        <div>
                            <div style="font-weight: 700; color: #fff; margin-bottom: 2px;">
                                ${isRu ? 'Вы уже смотрели этот отчет' : 'You already viewed this report'}
                            </div>
                            <div style="font-size: 0.85rem; color: var(--text-dim);">
                                ${isRu ? 'Ошибки не исправлены. Сайт продолжает терять трафик.' : 'Issues are still not fixed. Your site continues losing traffic.'}
                            </div>
                        </div>
                    </div>
                    <button class="btn btn-primary btn-sm" onclick="document.getElementById('actionList').scrollIntoView({behavior:'smooth'})" style="flex-shrink:0;">
                        ${isRu ? 'Продолжить и исправить' : 'Continue and fix issues'}
                    </button>
                `;
                setTimeout(() => { if (window.lucide) lucide.createIcons(); }, 100);
                dashMain.prepend(alertDiv);
            }
        });
    }

    // DOM Elements
    const domainDisplay = document.getElementById('domainDisplay');
    const seoScoreGaugeText = document.getElementById('seoScoreGaugeText');
    const techScoreText = document.getElementById('techScoreText');
    const aiScoreText = document.getElementById('aiScoreText');
    const actionList = document.getElementById('actionList');
    const gaugeFill = document.querySelector('#vRatingGauge .gauge__fill');

    const techSubText = document.getElementById('techSubText');
    const aiSubText = document.getElementById('aiSubText');
    const scoreSubText = document.getElementById('scoreSubText');

    if (domainDisplay) domainDisplay.textContent = domain;

    // Show Loading state on cards
    if (seoScoreGaugeText) seoScoreGaugeText.innerHTML = '<span class="loading-dots">...</span>';
    if (techScoreText) techScoreText.textContent = 'loading...';
    if (aiScoreText) aiScoreText.textContent = 'loading...';

    // API Endpoint config
    const API_BASE = typeof API_URL !== 'undefined' ? API_URL : (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:3000'
        : '');

    try {
        const response = await fetch(`${API_BASE}/api/scan?url=${encodeURIComponent(url)}&lang=${isRu ? 'ru' : 'en'}`);

        if (!response.ok) throw new Error('API Error');
        
        const data = await response.json();
        const pData = data.parsedData || {};

        // 1. Render Scores
        if (seoScoreGaugeText) seoScoreGaugeText.textContent = data.seoScore;
        if (techScoreText) techScoreText.textContent = data.performanceScore + '%';
        if (aiScoreText) aiScoreText.textContent = data.aiScore >= 80 ? 'High' : data.aiScore >= 60 ? 'Good' : 'Moderate';

        if (isRu) {
            if (aiScoreText) {
                const mapRu = { 'High': 'Высокий', 'Good': 'Хороший', 'Moderate': 'Средний' };
                if (mapRu[aiScoreText.textContent]) aiScoreText.textContent = mapRu[aiScoreText.textContent];
            }
        }

        // Animate Gauge
        if (gaugeFill && data.seoScore !== undefined) {
            const val = data.seoScore;
            // Arc logic for gauge (radius 40, circumference ~251)
            const offset = 251 - (251 * val / 100);
            setTimeout(() => { gaugeFill.style.strokeDashoffset = offset; }, 300);
        }

        // 2. Render Sub-text Updates
        if (scoreSubText) {
            scoreSubText.textContent = isRu 
                ? `Скор на основе тегов, заголовков и структуры сайта.`
                : `Score based on metadata tags, titles, and site volume.`;
        }
        if (techSubText) {
            techSubText.textContent = isRu 
                ? `Длина контента: ${pData.contentLength || 0} симв. Внутренних ссылок: ${pData.internalLinks || 0}.`
                : `Content Length: ${pData.contentLength || 0} chars. Internal links: ${pData.internalLinks || 0}.`;
        }
        if (aiSubText) {
            aiSubText.textContent = isRu 
                ? `Микроразметка Schema: ${pData.hasSchema ? 'Да' : 'Нет'}. FAQ: ${pData.faqSchema ? 'Да' : 'Нет'}.`
                : `Schema.org: ${pData.hasSchema ? 'Yes' : 'No'}. FAQ schema: ${pData.faqSchema ? 'Yes' : 'No'}.`;
        }

        // 3. Render Roadmap Actions (Issues)
        if (actionList && data.issues) {
            if (data.issues.length === 0 || data.issues[0].title.includes('Критических') || data.issues[0].enTitle.includes('No critical')) {
                actionList.innerHTML = `<div class="action-item" style="border-color:#28c840; background:rgba(40,200,64,0.05);">
                    <div style="flex:1;">
                        <div style="font-weight:600; color:#28c840;">${isRu ? '🎉 Сайт отлично оптимизирован!' : '🎉 Website is highly optimized!'}</div>
                        <p style="font-size:0.85rem; color:var(--text-dim);">${isRu ? 'Все базовые критерии SEO пройдены.' : 'All basic SEO checklist criteria met.'}</p>
                    </div>
                </div>`;
            } else {
                const MAX_FREE = isUnlocked ? 9999 : 3;
                const visible = data.issues.slice(0, MAX_FREE);
                const locked = data.issues.slice(MAX_FREE);

                let html = visible.map(issue => {
                    const titleStr = isRu ? (issue.title || issue.enTitle) : (issue.enTitle || issue.title);
                    return `
                        <div class="action-item">
                            <span class="action-tag tag-high">${isRu ? 'Исправить' : 'Fix'}</span>
                            <div style="flex: 1;">
                                <div style="font-weight: 600; margin-bottom: 4px;">${titleStr}</div>
                                <p style="font-size: 0.85rem; color: var(--text-dim);">${isRu ? 'Требуется оптимизация для улучшения видимости.' : 'Critical for search visibility optimization.'}</p>
                            </div>
                            <button class="btn btn-ghost btn-sm">${isRu ? 'Исправить' : 'Fix'}</button>
                        </div>
                    `;
                }).join('');

                if (!isUnlocked) {
                    html += `<div class="locked-section" style="position:relative;">`;
                    html += (locked.length > 0 ? locked : [{}, {}]).map(() => `
                        <div class="action-item locked-item">
                            <span class="action-tag tag-high">${isRu ? 'Исправить' : 'Fix'}</span>
                            <div style="flex: 1;">
                                <div style="font-weight: 600; margin-bottom: 4px;">••••••••••••</div>
                                <p style="font-size: 0.85rem; color: var(--text-dim);">${isRu ? 'Содержимое заблокировано' : 'Content hidden'}</p>
                            </div>
                            <button class="btn btn-ghost btn-sm">${isRu ? 'Исправить' : 'Fix'}</button>
                        </div>
                    `).join('');
                    html += `</div>`;

                    html += `
                        <div class="paywall-overlay" style="background: linear-gradient(to bottom, rgba(15,16,20,0), #161822 40%); padding: 60px 24px 40px; text-align: center; margin-top: -80px; position: relative; z-index: 10; border-radius: 0 0 20px 20px; border-top: 1px solid rgba(255,255,255,0.05);">
                            <h2 style="margin-bottom: 12px; font-size: 1.8rem; font-weight: 800; color: #fff;">
                                ${isRu ? "🔒 Вы видите только 30% анализа" : "🔒 You are seeing only 30% of the analysis"}
                            </h2>
                            <p style="color: var(--text-dim); margin-bottom: 18px; max-width: 480px; margin: 0 auto 12px; font-size: 0.95rem;">
                                ${isRu ? "Разблокируйте полный отчет:" : "Unlock full report:"}
                            </p>

                            <!-- Bullets to match SPEC -->
                            <div style="text-align: left; max-width: 380px; margin: 0 auto 24px; font-size: 0.95rem; color: var(--text-main); display: flex; flex-direction: column; gap: 8px;">
                                <div style="display: flex; gap: 8px;"><i data-lucide="check-circle-2" style="color: #28c840; width: 16px; height: 16px; flex-shrink:0; margin-top:2px;"></i> <span>${isRu ? "Все ошибки" : "Full audit"}</span></div>
                                <div style="display: flex; gap: 8px;"><i data-lucide="check-circle-2" style="color: #28c840; width: 16px; height: 16px; flex-shrink:0; margin-top:2px;"></i> <span>${isRu ? "План роста" : "Growth plan"}</span></div>
                                <div style="display: flex; gap: 8px;"><i data-lucide="check-circle-2" style="color: #28c840; width: 16px; height: 16px; flex-shrink:0; margin-top:2px;"></i> <span>${isRu ? "GEO и ИИ оптимизация" : "GEO + AI optimization"}</span></div>
                                <div style="display: flex; gap: 8px;"><i data-lucide="check-circle-2" style="color: #28c840; width: 16px; height: 16px; flex-shrink:0; margin-top:2px;"></i> <span>${isRu ? "Как увеличить заявки" : "Conversion improvements"}</span></div>
                            </div>

                            <button class="btn btn-primary btn-block btn-lg" style="max-width:340px; margin:0 auto 12px; font-size: 1.05rem; box-shadow: 0 4px 20px rgba(0, 224, 255, 0.25); font-weight: 700;" onclick="location.href='/${isRu ? 'ru' : 'en'}/index.html#pricing'">
                                ${isRu ? "Открыть полный аудит — 50 000 ₸" : "Unlock full audit — $100"}
                            </button>

                            
                            <p style="font-size: 0.8rem; color: var(--text-dim); margin-bottom: 0;">
                                ${isRu ? "Доступ сразу после оплаты" : "Instant access after payment"}
                            </p>
                        </div>
                    `;
                }
                actionList.innerHTML = html;

                // Dynamically load lucide icons for overlay if added
                if (window.lucide) { lucide.createIcons(); }

                // Timer Interval Logic
                const timerElem = document.getElementById('paymentTimer');
                if (timerElem) {
                    let timeLeft = 15 * 60;
                    const timerInterval = setInterval(() => {
                        timeLeft--;
                        const mins = Math.floor(timeLeft / 60);
                        const secs = timeLeft % 60;
                        timerElem.textContent = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
                        if (timeLeft <= 0) {
                            clearInterval(timerInterval);
                            timerElem.textContent = "Expired";
                        }
                    }, 1000);
                }
                
                // Expose function for onclick
                window.initiateUnlock = function() {
                    const email = document.getElementById('paywallEmail').value;
                    if (!email || !email.includes('@')) {
                        alert(isRu ? 'Введите корректный Email' : 'Please enter a valid email');
                        return;
                    }
                    // Place email template placeholder Stripe link
                    window.location.href = 'https://buy.stripe.com/mock_placeholder?prefilled_email=' + encodeURIComponent(email);
                };
            }
        }


        // ─── PRO Block Logic ───
        const proOverlay = document.getElementById('proOverlay');
        const proGrid = document.getElementById('proGrid');
        
        if (proOverlay && proGrid) {
            if (isPro) {
                proOverlay.style.display = 'none';
                proGrid.style.filter = 'none';
                proGrid.style.pointerEvents = 'auto';
            } else {
                proOverlay.style.display = 'flex';
                proGrid.style.filter = 'blur(4px)';
                proGrid.style.pointerEvents = 'none';
            }
        }

        // ─── PRO Buttons Links Update ───
        const proLinks = document.querySelectorAll('.pro-link');
        if (proLinks.length > 0) {
            proLinks.forEach(link => {
                const href = link.getAttribute('href');
                if (href && !href.includes('pro=true')) {
                    const separator = href.includes('?') ? '&' : '?';
                    link.setAttribute('href', `${href}${separator}domain=${encodeURIComponent(domain)}&pro=true`);
                }
            });
        }

        // ─── Smart Conversion Triggers ───
        if (!isUnlocked) {
            let popupShown = sessionStorage.getItem('popup_shown') === 'true';

            const showSmartPopup = (type) => {
                if (popupShown) return;
                popupShown = true;
                sessionStorage.setItem('popup_shown', 'true');

                const modal = document.createElement('div');
                modal.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(5px); z-index: 9999; display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.3s;';
                
                let title = '', desc = '', cta = '';
                const bestPro = isRu 
                    ? '<div style="color:#febc2e; font-weight:700; margin-top:12px; font-size:0.9rem;">Лучший вариант — PRO (всё включено)</div>' 
                    : '<div style="color:#febc2e; font-weight:700; margin-top:12px; font-size:0.9rem;">Best option — PRO (everything included)</div>';
                const expires = isRu 
                    ? '<div style="font-size:0.75rem; color: #ff3b30; margin-top:8px; font-weight:600;">Анализ устаревает через 24 часа</div>' 
                    : '<div style="font-size:0.75rem; color: #ff3b30; margin-top:8px; font-weight:600;">Analysis expires in 24 hours</div>';

                if (type === 'time') {
                    title = isRu ? "Вы теряете трафик прямо сейчас" : "You are losing traffic right now";
                    desc = (isRu ? "Ошибки мешают вашему сайту расти в поиске." : "Hidden issues are blocking your website ranking.") + bestPro + expires;
                    cta = isRu ? "Исправить сейчас →" : "Fix now →";
                } else if (type === 'scroll') {
                    title = isRu ? "Вы дошли до конца, но решения скрыты" : "Вы дошли до конца, но решения скрыты"; // Matches EN if not provided, else just generic
                    title = isRu ? "Вы дошли до конца, но решения скрыты" : "You're at the end, solutions locked";
                    desc = (isRu ? "Получите пошаговый отчет для исправления всех ошибок." : "Get a step-by-step roadmap to fix all issues.") + bestPro;
                    cta = isRu ? "Получить клиентов с сайта → открыть полный отчет" : "Start getting clients → unlock full report";
                } else if (type === 'exit') {
                    title = isRu ? "СТОЙТЕ!" : "WAIT!";
                    desc = isRu ? "Вы можете терять заявки прямо сейчас <br> 👉 Получите быстрый разбор сайта" : "You might be losing clients right now <br> 👉 Get a free site audit";
                    cta = isRu ? "Перейти в Telegram" : "Go to Telegram";
                }

                const ctaUrl = type === 'exit' ? 'https://t.me/lyazkai_bot?start=exit_popup' : `/${isRu?'ru':'en'}/pricing.html`;

                modal.innerHTML = `
                    <div style="background: #12141d; border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; padding: 32px; max-width: 420px; width: 92%; text-align: center; box-shadow: 0 25px 50px rgba(0,0,0,0.6); position: relative;">
                        <button style="position: absolute; top: 16px; right: 16px; background: none; border: none; color: rgba(255,255,255,0.4); cursor: pointer; font-size: 1.2rem; outline:none;" onclick="this.closest('.smart-modal-root').remove()">✕</button>
                        <h3 style="font-size: 1.4rem; font-weight: 800; margin-bottom: 12px; color: #fff; line-height:1.3;">${title}</h3>
                        <div style="color: var(--text-dim); margin-bottom: 24px; font-size: 0.9rem; line-height:1.5;">${desc}</div>
                        <button class="btn btn-primary btn-block btn-lg" style="box-shadow: 0 4px 15px rgba(124, 58, 237, 0.3);" onclick="window.location.href='${ctaUrl}'">${cta}</button>
                        <p style="font-size: 0.8rem; color: var(--text-dim); margin-top: 8px; margin-bottom: 0;">${isRu ? "Доступ сразу после оплаты" : "Instant access after payment"}</p>
                    </div>
                `;
                modal.className = 'smart-modal-root';
                document.body.appendChild(modal);
                setTimeout(() => modal.style.opacity = 1, 10);
            };

            // 1. Time-based trigger (20s) - Mobile only
            if (window.innerWidth < 768) {
                setTimeout(() => { if (!popupShown) showSmartPopup('exit'); }, 20000);
            }

            // 2. Exit Intent trigger - Desktop only (mouse leave)
            if (window.innerWidth >= 768) {
                document.addEventListener('mouseleave', (e) => {
                    if (e.clientY < 0 && !popupShown) {
                        showSmartPopup('exit');
                    }
                });
            }
        }

            // ─── Limit Free Value Clicks ───
            let clickCount = 0;
            document.addEventListener('click', (e) => {
                if (popupShown || isUnlocked) return;
                const target = e.target.closest('button, .action-item');
                if (target) {
                    clickCount++;
                    if (clickCount >= 3) {
                        showSmartPopup('time'); // Force modal trigger
                    }
                }
            });

        // ─── Telegram Widget ───
        const dashMain = document.querySelector('.dash-main');
        if (dashMain) {
            const tgDiv = document.createElement('div');
            tgDiv.className = 'tg-widget';
            tgDiv.style.cssText = 'background: #0f172a; padding: 20px; border-radius: 12px; margin-top: 20px; text-align: center; clear: both; width: 100%; max-width: 500px; margin-left: auto; margin-right: auto;';
            tgDiv.innerHTML = `
                <h3 style="color: #fff; margin-bottom: 8px; font-size: 1.25rem;">${isRu ? 'Хотите понять, как исправить ошибки?' : 'Want to know how to fix it?'}</h3>
                <p style="color: var(--text-dim); font-size: 0.9rem; margin-bottom: 15px;">${isRu ? 'Я покажу, что именно мешает вашему сайту получать клиентов' : 'I will show what blocks your website from getting clients'}</p>
                <a href="https://t.me/lyazkai_bot?start=from_report" class="tg-btn" style="display: inline-block; padding: 12px 20px; background: #22c55e; color: #fff; border-radius: 8px; text-decoration: none; font-weight: 600;">
                    ${isRu ? 'Получить разбор → Telegram' : 'Get tips → Telegram'}
                </a>
            `;
            dashMain.appendChild(tgDiv);
        }
        // ─── Implementation CTA Widget ───
        if (dashMain) {
            const implDiv = document.createElement('div');
            implDiv.className = 'impl-widget';
            implDiv.style.cssText = 'background: rgba(124, 58, 237, 0.06); border: 1px solid rgba(124, 58, 237, 0.15); padding: 20px; border-radius: 12px; margin-top: 20px; text-align: center; clear: both; width: 100%; max-width: 500px; margin-left: auto; margin-right: auto;';
            implDiv.innerHTML = `
                <h3 style="color: #fff; margin-bottom: 8px; font-size: 1.15rem;">${isRu ? '🔥 Хотите, чтобы мы внедрили это за вас?' : '🔥 Want us to implement this for you?'}</h3>
                <p style="color: var(--text-dim); font-size: 0.92rem; margin-bottom: 15px;">${isRu ? '👉 Мы настроим ИИ и автоматизацию под ваш бизнес' : '👉 We will set up AI and automation for your business'}</p>
                <a href="/${isRu ? 'ru' : 'en'}/ai-integration.html" class="btn btn-primary" style="display: inline-block; padding: 10px 20px; background: #fff; color: #000; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 0.9rem;">
                    ${isRu ? 'Перейти к внедрению' : 'Go to implementation'}
                </a>
            `;
            dashMain.appendChild(implDiv);
        }
        // ─── Share Loop ───
        if (dashMain) {
            const shareDiv = document.createElement('div');
            shareDiv.className = 'share-loop';
            shareDiv.style.cssText = 'background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 16px; padding: 24px; text-align: center; margin-top: 40px; width: 100%; max-width: 500px; margin-left: auto; margin-right: auto; clear:both;';
            const shareUrl = encodeURIComponent(window.location.href);
            const shareText = encodeURIComponent(isRu ? 'Посмотри рейтинг видимости моего сайта!' : 'Check out my search visibility rating!');
            shareDiv.innerHTML = `
                <div style="font-weight: 700; color: #fff; margin-bottom: 12px; font-size: 1.1rem;">
                    ${isRu ? 'Поделитесь результатом' : 'Share your result'}
                </div>
                <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
                    <a href="https://wa.me/?text=${shareText}%20${shareUrl}" target="_blank" class="btn btn-sm" style="background: #25D366; color: #fff; border:none; display:flex; align-items:center; gap:6px; padding: 8px 14px; font-size:0.85rem;"><i data-lucide="message-square" style="width:16px;height:16px;"></i> WhatsApp</a>
                    <a href="https://t.me/share/url?url=${shareUrl}&text=${shareText}" target="_blank" class="btn btn-sm" style="background: #0088cc; color: #fff; border:none; display:flex; align-items:center; gap:6px; padding: 8px 14px; font-size:0.85rem;"><i data-lucide="send" style="width:16px;height:16px;"></i> Telegram</a>
                    <button class="btn btn-sm btn-secondary" onclick="navigator.clipboard.writeText(window.location.href); alert('${isRu ? 'Ссылка скопирована' : 'Link copied'}')" style="display:flex; align-items:center; gap:6px; padding: 8px 14px; font-size:0.85rem;"><i data-lucide="copy" style="width:16px;height:16px;"></i> ${isRu ? "Копировать" : "Copy Link"}</button>
                </div>
            `;
            dashMain.appendChild(shareDiv);
            setTimeout(() => { if (window.lucide) lucide.createIcons(); }, 100);
        }

        // ─── Global Pricing Parameter Forwarder ───
        document.addEventListener('click', (e) => {
            const a = e.target.closest('a[href*="pricing.html"]');
            if (a) {
                e.preventDefault();
                localStorage.setItem('domain', domain); // Save before pricing redirect
                const src = localStorage.getItem('source') || '';
                const ref = localStorage.getItem('referral') || '';
                const baseHref = a.getAttribute('href');
                window.location.href = `${baseHref}${baseHref.includes('?') ? '&' : '?'}src=${encodeURIComponent(src)}&ref=${encodeURIComponent(ref)}`;
            }
        });
        // --- AUTO PRINT FOR PDF GENERATION ---
        if (window.location.search.includes('print=true')) {
            setTimeout(() => { window.print(); }, 2000); // Let scores animate to 100% first
        }

    } catch (err) {

        console.error('Fetch error:', err);
        if (seoScoreGaugeText) seoScoreGaugeText.textContent = '65'; // Failsafe score fallback
        if (aiScoreGaugeText) aiScoreGaugeText.textContent = '40';
    }
});
