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
    // Multi-level language detection: userChoice → URL → browser → fallback
    function detectLang() {
        const fromUser = localStorage.getItem('userSelectedLang');
        if (fromUser === 'ru' || fromUser === 'en') return fromUser;
        if (window.location.pathname.includes('/ru/')) return 'ru';
        if (window.location.pathname.includes('/en/')) return 'en';
        const browser = (navigator.language || navigator.userLanguage || '').toLowerCase();
        const fromBrowser = browser.startsWith('ru') ? 'ru' : 'en';
        console.log('[InfoLady] Lang fallback to browser:', fromBrowser);
        return fromBrowser;
    }
    const detectedLang = detectLang();
    const isRu = detectedLang === 'ru';

    // Timezone-based country detection for price/currency localisation
    function detectCountry() {
        try {
            const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
            if (/Almaty|Aqtau|Aqtobe|Atyrau|Oral|Qyzylorda/.test(tz)) return 'KZ';
            if (/America/.test(tz)) return 'US';
            if (/Europe/.test(tz)) return 'EU';
            if (/Asia/.test(tz)) return 'ASIA';
            return 'OTHER';
        } catch (e) {
            return isRu ? 'KZ' : 'US';
        }
    }
    const detectedCountry = detectCountry();

    // ─── Referral Tracking & Sources ───
    const ref = params.get('ref');
    if (ref) localStorage.setItem('referral', ref);
    const src = params.get('src');
    if (src) localStorage.setItem('source', src);

    // Legacy Banners Removed (70% Progress and Top Lead Bar) to focus on inline Email Gate.

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
    const API_BASE = typeof API_URL !== 'undefined' ? API_URL : 'https://api.infolady.online';

    try {
        const response = await fetch(`${API_BASE}/api/report?url=${encodeURIComponent(url)}&lang=${isRu ? 'ru' : 'en'}`);

        if (!response.ok) throw new Error('API Error');
        
        const data = await response.json();

        // 1. Hide unwanted score containers and locks
        document.querySelectorAll('.metrics-row, .upsell-box, .pro-section, .upsell-section, .pricing, .ai-offer').forEach(el => {
            el.style.display = 'none';
        });

        if (actionList) {
            const card = actionList.closest('.dash-card');
            if (card) {
                // 1. Bypass static html tier lock script (by downgrading require tier)
                card.setAttribute('data-plan', 'basic');
                // 2. Remove any existing dynamic overlay appended by inline scripts
                const existingOverlay = card.querySelector('.locked-overlay');
                if (existingOverlay) existingOverlay.remove();

                const gridContainer = card.parentNode;
                if (gridContainer) gridContainer.style.gridTemplateColumns = '1fr';
                
                const title = card.querySelector('.dash-card__title');
                if (title) title.style.display = 'none';
                const lock = card.querySelector('.locked-overlay-box');
                if (lock) lock.style.display = 'none';

                if (card.nextElementSibling) card.nextElementSibling.style.display = 'none';
            }
        }

        // 2. Render insights directly into actionList
        if (actionList && data.insights) {
            actionList.style.maxWidth = '600px';
            actionList.style.margin = '0 auto';

            const criticalCount = data.insights.filter(i => i.type === 'error').length;
            const mediumCount   = data.insights.filter(i => i.type === 'warning').length;
            const fixedCount    = data.insights.filter(i => i.type === 'success').length;
            const totalIssues   = criticalCount + mediumCount;
            const reportDomain  = data.domain || domain;
            const reportDate    = data.analysisDate || new Date().toLocaleDateString(isRu ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' });
            const hiddenCount   = typeof data.hiddenCount === 'number' ? data.hiddenCount : Math.max(0, issuesOnly.length - 3);

            // Expose report context for chatbot personalization
            window.chatbotContext = {
                domain: reportDomain,
                issues: issuesOnly.slice(0, 5).map(i => i.title),
                hiddenCount: hiddenCount,
                isRu: isRu,
                lang: detectedLang,
                country: detectedCountry,
                currency: isRu ? '₸' : '$',
                price: isRu ? '25 000 ₸' : '$50',
                payUrl: `/${isRu ? 'ru' : 'en'}/payment.html?plan=basic&domain=${encodeURIComponent(reportDomain)}`
            };

            const isEn = window.location.pathname.includes('/en/');

            const t = {
                title1:     isEn ? "🚨 Your site is losing clients right now" : "🚨 Ваш сайт теряет клиентов прямо сейчас",
                sub1:       isEn ? `Found ${totalIssues} issues on <strong>${reportDomain}</strong> that directly affect conversions`
                                 : `На сайте <strong>${reportDomain}</strong> найдено ${totalIssues} проблем, которые напрямую влияют на заявки`,
                resTitle:   isEn ? "Scan result:" : "Результат анализа:",
                crit:       isEn ? "critical errors" : "критические ошибки",
                crit1:      isEn ? "critical error" : "критическая ошибка",
                critMany:   isEn ? "critical errors" : "критических ошибок",
                med:        isEn ? "warnings" : "предупреждения",
                fixed:      isEn ? "ok" : "в порядке",
                conseqTitle: isEn ? `🔥 These errors cost ${reportDomain} clients` : `🔥 Эти ошибки стоят ${reportDomain} клиентов`,
                conseq1:    isEn ? "• Up to 30–50% fewer leads from search" : "• До 30–50% потерь заявок из поиска",
                conseq2:    isEn ? "• Lower trust, users leave faster" : "• Ниже доверие — пользователи уходят быстрее",
                conseq3:    isEn ? "• Competitors with fixed sites rank above you" : "• Конкуренты с исправленными сайтами обгоняют вас",
                question:   isEn ? "👉 Want to fix this in 24–48 hours?" : "👉 Хотите исправить это за 24–48 часов?",
                sub2:       isEn ? "Full report shows exact pages, fixes, and expected traffic growth"
                                 : "Полный отчёт покажет конкретные страницы, правки и ожидаемый рост трафика",
                ctaPrimary: isEn ? "💰 Get Full Audit — $50" : "💰 Получить полный аудит — 25 000 ₸",
                ctaSub1:    isEn ? "✔ Priority fix list" : "✔ Список правок по приоритету",
                ctaSub2:    isEn ? "✔ Specific fixes" : "✔ Конкретные исправления",
                ctaSub3:    isEn ? "✔ Lead growth" : "✔ Рост заявок",
                ctaSecondary: isEn ? "Write in Telegram" : "Написать в Telegram"
            };

            const critText = criticalCount === 1 ? t.crit1 : (criticalCount > 1 && criticalCount < 5 ? t.crit : t.critMany);

            let html = `
                <!-- БЛОК 0: ПЕРСОНАЛИЗАЦИЯ -->
                <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07); border-radius:12px; padding:12px 16px; margin-bottom:20px;">
                    <div style="font-size:0.88rem; color:rgba(255,255,255,0.5);">
                        ${isEn ? 'Analysis of site' : 'Анализ сайта'}:
                        <span style="color:#00e0ff; font-weight:700; margin-left:4px;">${reportDomain}</span>
                    </div>
                    <div style="font-size:0.82rem; color:rgba(255,255,255,0.35);">📅 ${reportDate}</div>
                </div>

                <!-- БЛОК 1: УДАР -->
                <div style="background: rgba(255, 59, 48, 0.08); border: 1px solid rgba(255, 59, 48, 0.2); padding: 25px; border-radius: 16px; margin-bottom: 25px; text-align:center;">
                    <h2 style="color: #ff4d4d; font-size: 1.5rem; font-weight: 800; margin-bottom: 8px;">${t.title1}</h2>
                    <p style="color: #fff; font-weight: 600; font-size: 1.05rem; margin: 0;">${t.sub1}</p>
                </div>

                <!-- БЛОК 2: ПРОГРЕСС -->
                <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); padding: 20px; border-radius: 16px; margin-bottom: 25px; text-align: left;">
                    <h4 style="color: #fff; font-size: 1.1rem; margin-bottom: 12px; font-weight: 700;">${t.resTitle}</h4>
                    <div style="display: flex; gap: 15px; flex-wrap: wrap; margin-bottom: 5px;">
                        <span style="background: rgba(255, 77, 77, 0.1); color: #ff4d4d; padding: 6px 12px; border-radius: 20px; font-size: 0.88rem; font-weight: 700;">❌ ${criticalCount} ${critText}</span>
                        <span style="background: rgba(254, 188, 46, 0.1); color: #febc2e; padding: 6px 12px; border-radius: 20px; font-size: 0.88rem; font-weight: 700;">⚠️ ${mediumCount} ${t.med}</span>
                        <span style="background: rgba(40, 200, 64, 0.1); color: #28c840; padding: 6px 12px; border-radius: 20px; font-size: 0.88rem; font-weight: 700;">✅ ${fixedCount} ${t.fixed}</span>
                    </div>
                </div>
            `;

            // ГЛАВНЫЙ ВЫВОД — перед списком
            html += `
                <div style="border-left:3px solid #ff4d4d; padding:12px 16px; margin-bottom:20px; background:rgba(255,59,48,0.05); border-radius:0 8px 8px 0;">
                    <p style="margin:0; font-size:0.95rem; color:rgba(255,255,255,0.85); line-height:1.5;">
                        ${isEn
                            ? 'The site is losing up to <strong style="color:#ff4d4d;">20–30% of traffic and leads</strong> due to critical errors in structure, SEO, and content'
                            : 'Сайт теряет до <strong style="color:#ff4d4d;">20–30% трафика и заявок</strong> из-за критических ошибок в структуре, SEO и контенте'}
                    </p>
                </div>
            `;

            // БЛОК 3: СПИСОК ОШИБОК
            const allIssues    = data.issues || data.insights || [];
            const issuesOnly   = allIssues.filter(i => i.type === 'error' || i.type === 'warning');
            const successOnly  = allIssues.filter(i => i.type === 'success');
            const hasEmail     = localStorage.getItem('lead_email') || isUnlocked;

            // Free: show first 3 real problems (errors+warnings), then 1 success as reassurance
            let insightsToRender = hasEmail
                ? allIssues
                : [...issuesOnly.slice(0, 3), ...successOnly.slice(0, 1)];

            html += insightsToRender.map(i => {
                let icon = '💡';
                let borderColor = 'rgba(255,255,255,0.05)';
                let titleColor = '#fff';
                if (i.type === 'error')   { icon = '❌'; borderColor = 'rgba(255,59,48,0.2)';  titleColor = '#ff4d4d'; }
                else if (i.type === 'warning') { icon = '⚠️'; borderColor = 'rgba(255,159,10,0.2)'; titleColor = '#febc2e'; }
                else if (i.type === 'success') { icon = '✅'; borderColor = 'rgba(40,200,64,0.15)';  titleColor = '#28c840'; }

                const itemTitle = i.title || i.message || '';
                const itemPage  = i.page  || null;
                const itemDesc  = i.description || (() => { const p = itemTitle.split(' — '); return p[1] || ''; })();
                const itemImpact = i.impact || null;

                return `
                    <div style="background:rgba(255,255,255,0.02); border:1px solid ${borderColor}; border-radius:12px; padding:18px; margin-bottom:15px; text-align:left; box-shadow:0 4px 15px rgba(0,0,0,0.2);">
                        <div style="display:flex; align-items:flex-start; gap:8px; font-weight:700; font-size:1rem; color:${titleColor}; line-height:1.4;">
                            <span style="flex-shrink:0;">${icon}</span> <span>${itemTitle.split(' — ')[0]}</span>
                        </div>
                        ${itemPage ? `<div style="margin-top:6px; margin-left:28px; font-size:0.78rem; color:rgba(255,255,255,0.3); font-family:monospace;">${itemPage}</div>` : ''}
                        ${itemDesc ? `<div style="margin-top:8px; margin-left:28px; color:rgba(255,255,255,0.65); font-size:0.9rem; line-height:1.55;">${itemDesc}</div>` : ''}
                        ${itemImpact ? `<div style="margin-top:8px; margin-left:28px; font-size:0.82rem; font-weight:700; color:#ff9f0a;">📉 ${itemImpact}</div>` : ''}
                    </div>
                `;
            }).join('');

            // ЭМОЦИОНАЛЬНЫЙ ТРИГГЕР — после списка
            if (!hasEmail) {
                html += `
                    <p style="text-align:center; font-size:0.9rem; color:rgba(255,255,255,0.5); margin:8px 0 20px; font-style:italic;">
                        ${isEn
                            ? 'If these errors are not fixed, the site will keep losing clients every day'
                            : 'Если не исправить эти ошибки, сайт продолжит терять клиентов каждый день'}
                    </p>
                `;
            }

            if (!hasEmail) {
                html += `
                    <!-- EMAIL GATE -->
                    <div style="background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 16px; padding: 24px; margin-top: 25px; text-align: center; backdrop-filter: blur(10px); box-shadow: 0 4px 20px rgba(0,0,0,0.4);">
                        <div style="font-weight: 700; color: #fff; font-size: 1.2rem; margin-bottom: 8px;">
                            ${isEn
                                ? `We found ${hiddenCount} more critical issues`
                                : `Мы нашли ещё ${hiddenCount} критических проблем`}
                        </div>
                        <p style="font-size: 0.88rem; color: var(--text-dim); margin-bottom: 20px;">
                            ${isEn
                                ? `${hiddenCount} issues on ${reportDomain} that directly affect leads and sales — not shown in the free version`
                                : `${hiddenCount} проблем на ${reportDomain}, которые напрямую влияют на заявки и продажи — они не показаны в бесплатной версии`}
                        </p>
                        <div style="display: flex; gap: 12px; max-width: 440px; margin: 0 auto; flex-direction: column;">
                            <input type="email" id="gateEmail" placeholder="example@mail.com" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 12px; color: #fff; width: 100%; outline: none;" />
                            <button class="btn btn-primary btn-block btn-lg" onclick="const e=document.getElementById('gateEmail').value; if(e.includes('@')){ window.saveGateLead(e); } else { alert('${isEn ? 'Please enter a valid email' : 'Введите корректный email'}'); }" style="width: 100%; font-weight: 700; padding: 14px; font-size: 1.1rem;">
                                ${isEn ? 'Unlock full report' : 'Получить полный разбор'}
                            </button>
                        </div>
                    </div>
                `;

                window.saveGateLead = (email) => {
                    fetch('/api/lead', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            email: email, 
                            scanned_domain: domain, 
                            language: isEn ? 'en' : 'ru' 
                        })
                    })
                    .then(res => res.json())
                    .then(data => {
                        localStorage.setItem('lead_email', email);
                        localStorage.setItem('unlocked', 'true');
                        window.location.reload();
                    })
                    .catch(err => {
                        console.error('Lead Save Error:', err);
                        // Fallback lock for local demo ease
                        localStorage.setItem('lead_email', email);
                        localStorage.setItem('unlocked', 'true');
                        window.location.reload();
                    });
                };
            }

            html += `
                <!-- БЛОК 4: ПОСЛЕДСТВИЯ -->
                <div style="margin-top: 30px; text-align: left; padding: 20px; background: rgba(255, 77, 77, 0.03); border: 1px solid rgba(255, 77, 77, 0.1); border-radius: 16px; margin-bottom: 30px;">
                    <p style="color: #fff; font-weight: 800; font-size: 1.15rem; margin-bottom: 12px;">${t.conseqTitle}</p>
                    <ul style="list-style: none; padding: 0; margin: 0; color: #fff; font-size: 0.95rem; line-height: 1.6;">
                        <li style="margin-bottom: 8px;">${t.conseq1}</li>
                        <li style="margin-bottom: 8px;">${t.conseq2}</li>
                        <li style="margin-bottom: 0;">${t.conseq3}</li>
                    </ul>
                </div>

                <!-- БЛОК 5: ПЕРЕЛОМ -->
                <div style="text-align: center; margin-bottom: 25px;">
                    <h3 style="color: #fff; font-size: 1.4rem; font-weight: 800; margin-bottom: 8px;">${t.question}</h3>
                    <p style="color: var(--text-dim); font-size: 0.95rem; margin: 0;">${t.sub2}</p>
                </div>

                <!-- БЛОК 6: CTA -->
                <div style="display: flex; flex-direction: column; gap: 15px; max-width: 440px; margin: 0 auto;">
                    <button class="btn btn-primary btn-block btn-lg" onclick="window.showAuditPopup()" style="width:100%; padding: 16px; font-size: 1.15rem;">
                        ${t.ctaPrimary}
                    </button>
                    <div style="display: flex; justify-content: center; gap: 12px; flex-wrap: wrap; color: #28c840; font-size: 0.82rem; font-weight: 700; margin-top: -5px; margin-bottom: 10px;">
                        <span>${t.ctaSub1}</span>
                        <span>•</span>
                        <span>${t.ctaSub2}</span>
                        <span>•</span>
                        <span>${t.ctaSub3}</span>
                    </div>

                    <a href="https://t.me/lyazkai_bot?start=${encodeURIComponent(`${isEn ? 'en' : 'ru'}|${domain || 'site'}`)}" target="_blank" class="btn-telegram">
                        💬 <span class="tg-text">${isEn ? 'Write in Telegram' : 'Написать в Telegram'}</span>
                    </a>
                </div>
            `;
            actionList.innerHTML = html;
        }

        // --- POPUP MODAL LOGIC ---
        window.showAuditPopup = () => {
            const modal = document.createElement('div');
            modal.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(5px); z-index: 9999; display: flex; align-items: center; justify-content: center;';
            modal.innerHTML = `
                <div style="background: #12141d; border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; padding: 32px; max-width: 400px; width: 92%; position: relative; text-align: left;">
                    <button style="position: absolute; top: 16px; right: 16px; background: none; border: none; color: rgba(255,255,255,0.4); cursor: pointer; font-size: 1.2rem; outline:none;" onclick="this.closest('.modal-root').remove()">✕</button>
                    <h3 style="color: #fff; margin-bottom: 16px; font-size: 1.3rem;">Полный аудит сайта</h3>
                    
                    <label style="display:block; font-size:0.85rem; color: var(--text-dim); margin-bottom: 5px;">Имя</label>
                    <input type="text" id="auditName" placeholder="Ваше имя" style="width:100%; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:8px; padding:10px; color:#fff; margin-bottom: 12px; outline:none;">

                    <label style="display:block; font-size:0.85rem; color: var(--text-dim); margin-bottom: 5px;">Email</label>
                    <input type="email" id="auditEmail" placeholder="example@mail.com" style="width:100%; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:8px; padding:10px; color:#fff; margin-bottom: 12px; outline:none;">

                    <label style="display:block; font-size:0.85rem; color: var(--text-dim); margin-bottom: 5px;">Ваш сайт</label>
                    <input type="text" id="auditSite" value="${domain}" style="width:100%; background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.1); border-radius:8px; padding:10px; color:rgba(255,255,255,0.6); margin-bottom: 20px; outline:none;" readonly>

                    <button class="btn btn-primary btn-block btn-lg" onclick="window.payForAudit()" style="background: linear-gradient(135deg, #00e0ff 0%, #7c5cff 100%); color: #000; font-weight: 800; width:100%;">${isRu ? 'Оплатить — 25 000 ₸' : 'Pay — $50'}</button>
                    <p style="font-size:0.75rem; color: var(--text-dim); text-align:center; margin-top: 8px;">${isRu ? `Отчёт по ${domain} придёт на email за 24–48 ч` : `Report for ${domain} delivered to email in 24–48 h`}</p>
                </div>
            `;
            modal.className = 'modal-root';
            document.body.appendChild(modal);
        };

        window.payForAudit = () => {
            const email = document.getElementById('auditEmail') ? document.getElementById('auditEmail').value : '';
            if (email && email.includes('@')) {
                window.location.href = `/${isRu ? 'ru' : 'en'}/payment.html?plan=basic&email=${encodeURIComponent(email)}&domain=${encodeURIComponent(domain)}`;
            } else {
                alert(isRu ? 'Введите корректный Email' : 'Please enter a valid email');
            }
        };

        // Re-run lucide icons loading just in case
        if (window.lucide) { lucide.createIcons(); }

        // Auto-open chatbot after 40s for users who haven't paid yet
        if (!isUnlocked) {
            setTimeout(() => {
                const trigger = document.getElementById('chatbotTrigger');
                const panel = document.getElementById('chatbotPanel');
                if (trigger && panel && !panel.classList.contains('open')) {
                    trigger.click();
                }
            }, 40000);
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

        // Legacy Telegram Widget removed to prevent duplicates.
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

                    <a href="https://t.me/share/url?url=${shareUrl}&text=${shareText}" target="_blank" class="btn btn-sm" style="background: #0088cc; color: #fff; border:none; display:flex; align-items:center; gap:6px; padding: 8px 14px; font-size:0.85rem;"><i data-lucide="send" style="width:16px;height:16px;"></i> Telegram</a>
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
