/* ============================================================
   InfoLady — report-app.js
   Handles White-Label, PDF Export, and Pricing Limits
   ============================================================ */

(function () {
    'use strict';

    const $ = (sel, ctx = document) => ctx.querySelector(sel);

    // Default White-Label Settings
    const defaultSettings = {
        agencyName: 'InfoLady',
        agencyLogo: '/favicon.png',
        plan: 'free' // free | pro | agency
    };

    // Load settings from localStorage
    function getSettings() {
        try {
            const saved = JSON.parse(localStorage.getItem('il_wl_settings'));
            return saved ? { ...defaultSettings, ...saved } : defaultSettings;
        } catch (e) {
            return defaultSettings;
        }
    }

    // Save settings to localStorage
    function saveSettings(settings) {
        localStorage.setItem('il_wl_settings', JSON.stringify(settings));
    }

    // Pricing Limits
    const LIMITS = {
        free: 3,
        pro: 30,
        agency: Infinity
    };

    function checkAndIncrementLimit() {
        const settings = getSettings();
        const plan = settings.plan || 'free';
        const limit = LIMITS[plan];

        if (limit === Infinity) return true;

        const now = new Date();
        const monthKey = `${now.getFullYear()}-${now.getMonth() + 1}`;

        let usage = { month: monthKey, count: 0 };
        try {
            const savedUsage = JSON.parse(localStorage.getItem('il_report_usage'));
            if (savedUsage && savedUsage.month === monthKey) {
                usage = savedUsage;
            }
        } catch (e) { }

        if (usage.count >= limit) {
            return false;
        }

        // Increment
        usage.count += 1;
        localStorage.setItem('il_report_usage', JSON.stringify(usage));
        return true;
    }

    // Apply White-Label Branding to the UI
    function applyBranding() {
        const settings = getSettings();
        const nameEl = $('#agencyName');
        const logoEl = $('#agencyLogo');

        if (nameEl) nameEl.textContent = settings.agencyName;
        if (logoEl && settings.agencyLogo) {
            logoEl.src = settings.agencyLogo;
        }
    }

    // Initialize the White-Label Modal Editor
    function initWLModal() {
        const btnEdit = $('#btnEditBranding');
        const modal = $('#wlModal');
        const overlay = $('#wlOverlay');
        const closeBtn = $('#wlClose');
        const saveBtn = $('#wlSaveBtn');

        const inputName = $('#wlAgencyNameInput');
        const inputLogo = $('#wlAgencyLogoInput');
        const selectPlan = $('#wlPlanSelect');

        if (!btnEdit || !modal) return;

        function openModal() {
            const s = getSettings();
            if (inputName) inputName.value = s.agencyName !== 'InfoLady' ? s.agencyName : '';
            if (inputLogo) inputLogo.value = s.agencyLogo !== '/favicon.png' ? s.agencyLogo : '';
            if (selectPlan) selectPlan.value = s.plan;

            modal.removeAttribute('hidden');
        }

        function closeModal() {
            modal.setAttribute('hidden', '');
        }

        btnEdit.addEventListener('click', openModal);
        if (closeBtn) closeBtn.addEventListener('click', closeModal);
        if (overlay) overlay.addEventListener('click', closeModal);

        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                const s = getSettings();
                s.agencyName = inputName.value.trim() || 'InfoLady';
                s.agencyLogo = inputLogo.value.trim() || '/favicon.png';
                s.plan = selectPlan.value;
                saveSettings(s);
                applyBranding();
                closeModal();
            });
        }
    }

    // PDF Export Logic
    function initPdfExport() {
        const btnExport = $('#btnExportPdf');
        if (!btnExport) return;

        btnExport.addEventListener('click', () => {
            const element = document.getElementById('reportContent');
            const domain = $('#targetDomain') ? $('#targetDomain').textContent : 'report';

            const opt = {
                margin: 0, // We control margins via CSS A4 page
                filename: `SEO_Audit_${domain}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };

            // Temporary classes for PDF rendering
            document.body.classList.add('is-exporting-pdf');

            // Generate PDF
            html2pdf().set(opt).from(element).save().then(() => {
                document.body.classList.remove('is-exporting-pdf');
            });
        });
    }

    // Share Link Logic
    function initShareLink() {
        const btnShare = $('#btnShareLink');
        if (!btnShare) return;

        btnShare.addEventListener('click', () => {
            const url = window.location.href;
            navigator.clipboard.writeText(url).then(() => {
                // Show temporary success state
                const originalText = btnShare.textContent;
                btnShare.textContent = '✅ Copied!';
                setTimeout(() => {
                    btnShare.textContent = originalText;
                }, 2000);
            }).catch(err => {
                alert('Failed to copy URL');
            });
        });
    }

    // Domain Parsing
    function parseDomain() {
        const params = new URLSearchParams(window.location.search);
        let domain = params.get('domain');

        // Check if there is a hash route fallback (e.g. #mysite-com)
        if (!domain && window.location.hash) {
            domain = window.location.hash.slice(1);
        }

        if (!domain) {
            domain = 'example.com';
        }

        // Replace hyphens with dots if it looks like mysite-com
        domain = domain.replace(/-com$/, '.com').replace(/-ru$/, '.ru').replace(/-net$/, '.net').replace(/-org$/, '.org');

        const domainEl = $('#targetDomain');
        const footerEl = $('#footerDomain');
        if (domainEl) domainEl.textContent = domain;
        if (footerEl) footerEl.textContent = domain;
    }

    // Date
    function setDate() {
        const dateEl = $('#reportDate');
        if (dateEl) {
            const now = new Date();
            dateEl.textContent = now.toLocaleDateString();
        }
    }

    document.addEventListener('DOMContentLoaded', () => {

        // Wait for translations to apply? script.js runs first usually.
        setTimeout(() => {
            const settings = getSettings();

            // Check limits before showing report
            if (!checkAndIncrementLimit()) {
                const lang = document.documentElement.lang || 'ru';
                const msg = lang === 'ru'
                    ? 'Достигнут лимит отчётов. Обновить тариф?'
                    : 'Report limit reached. Upgrade plan?';
                alert(msg);
                window.location.href = '/audit/ai-seo-audit.html#pricing';
                return;
            }

            parseDomain();
            setDate();
            applyBranding();
            initWLModal();
            initPdfExport();
            initShareLink();
        }, 100);
    });

})();
