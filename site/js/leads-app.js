/**
 * InfoLady Lead Capture System
 * Handles dynamic modal rendering, submissions, LocalStorage DB, and Admin Email simulations.
 */

document.addEventListener('DOMContentLoaded', () => {
    // Determine current language from the HTML tag or URL path
    const isRu = document.documentElement.lang === 'ru' || window.location.pathname.includes('/ru/');

    // UI Dictionary
    const dict = {
        en: {
            title: "Need help fixing your SEO?",
            desc: "Get a free SEO consultation from professionals to fix visibility issues.",
            name: "Name",
            email: "Email",
            website: "Website",
            budget: "Monthly marketing budget (optional)",
            submit: "Submit request",
            successTitle: "Request Received!",
            successDesc: "Our SEO specialists will review your website and contact you shortly.",
            close: "Close"
        },
        ru: {
            title: "Нужна помощь с SEO?",
            desc: "Получите бесплатную консультацию специалиста для устранения проблем с видимостью.",
            name: "Имя",
            email: "Email",
            website: "Сайт",
            budget: "Бюджет на маркетинг (необязательно)",
            submit: "Отправить заявку",
            successTitle: "Заявка получена!",
            successDesc: "Наши SEO-специалисты изучат ваш сайт и свяжутся с вами в ближайшее время.",
            close: "Закрыть"
        }
    };

    const t = isRu ? dict.ru : dict.en;

    // 1. Inject Modal HTML into the DOM dynamically (if not exists)
    if (!document.getElementById('leadCaptureModal')) {
        const modalHtml = `
            <div class="modal" id="leadCaptureModal" hidden>
                <div class="modal__overlay" id="leadModalOverlay"></div>
                <div class="modal__content" style="max-width:480px;">
                    <button class="modal__close" id="leadModalClose">✕</button>
                    
                    <div id="leadFormView">
                        <h3 style="margin-bottom:8px;font-size:1.5rem;">${t.title}</h3>
                        <p style="color:var(--text-muted);margin-bottom:24px;">${t.desc}</p>
                        
                        <form id="leadCaptureForm">
                            <div class="form-group">
                                <label>${t.name}</label>
                                <input type="text" id="leadName" required placeholder="John Doe">
                            </div>
                            <div class="form-group">
                                <label>${t.email}</label>
                                <input type="email" id="leadEmail" required placeholder="john@example.com">
                            </div>
                            <div class="form-group">
                                <label>${t.website}</label>
                                <input type="url" id="leadWebsite" required placeholder="https://example.com">
                            </div>
                            <div class="form-group">
                                <label>${t.budget}</label>
                                <select id="leadBudget">
                                    <option value="" disabled selected>-</option>
                                    <option value="<$500">< $500</option>
                                    <option value="$500 - $1k">$500 - $1,000</option>
                                    <option value="$1k - $5k">$1,000 - $5,000</option>
                                    <option value="$5k+">$5,000+</option>
                                </select>
                            </div>
                            <button type="submit" class="btn btn-primary btn-block mt-16" style="padding:14px;font-size:1.05rem;">
                                ${t.submit}
                            </button>
                        </form>
                    </div>

                    <div id="leadSuccessView" style="display:none; text-align:center; padding: 20px 0;">
                        <div style="font-size:4rem; margin-bottom:16px;">✅</div>
                        <h3 style="margin-bottom:12px;">${t.successTitle}</h3>
                        <p style="color:var(--text-muted); margin-bottom:24px;">${t.successDesc}</p>
                        <button class="btn btn-ghost" id="leadSuccessClose">${t.close}</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    // Modal elements
    const modal = document.getElementById('leadCaptureModal');
    const overlay = document.getElementById('leadModalOverlay');
    const closeBtn = document.getElementById('leadModalClose');
    const successCloseBtn = document.getElementById('leadSuccessClose');
    const form = document.getElementById('leadCaptureForm');

    // 2. Attach Event Listeners to any CTA buttons matching '.lead-cta-trigger'
    document.body.addEventListener('click', (e) => {
        if (e.target.closest('.lead-cta-trigger')) {
            e.preventDefault();

            // If they just ran a scan, pre-fill the website URL if possible
            const checkerInput = document.getElementById('checkerUrl');
            if (checkerInput && checkerInput.value) {
                document.getElementById('leadWebsite').value = checkerInput.value;
            }

            // Reset Views
            document.getElementById('leadFormView').style.display = 'block';
            document.getElementById('leadSuccessView').style.display = 'none';
            form.reset();

            modal.hidden = false;
        }
    });

    const closeModal = () => modal.hidden = true;
    overlay.addEventListener('click', closeModal);
    closeBtn.addEventListener('click', closeModal);
    successCloseBtn.addEventListener('click', closeModal);

    // 3. Handle Form Submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const btn = form.querySelector('button[type="submit"]');
        const originalText = btn.textContent;
        btn.disabled = true;
        btn.textContent = isRu ? 'Отправка...' : 'Sending...';

        const lead = {
            id: 'L-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
            name: document.getElementById('leadName').value.trim(),
            email: document.getElementById('leadEmail').value.trim(),
            website: document.getElementById('leadWebsite').value.trim(),
            budget: document.getElementById('leadBudget').value || 'Not specified',
            language: isRu ? 'ru' : 'en',
            source: window.location.pathname.split('/').pop().replace('.html', '') || 'index',
            created_at: new Date().toISOString()
        };

        // 1. Save to Database (LocalStorage simulated table)
        const leadsDb = JSON.parse(localStorage.getItem('il_leads') || '[]');
        leadsDb.push(lead);
        localStorage.setItem('il_leads', JSON.stringify(leadsDb));

        // 2. Submit to REAL Backend
        if (window.InfoLadyLeads) {
            await window.InfoLadyLeads.submitLead(lead);
        }

        // Reset UI
        btn.disabled = false;
        btn.textContent = originalText;

        // Show Success View
        document.getElementById('leadFormView').style.display = 'none';
        document.getElementById('leadSuccessView').style.display = 'block';
    });
});
