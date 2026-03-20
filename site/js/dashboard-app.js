/**
 * dashboard-app.js
 * Logic for the User Dashboard (Auth Guard, Navigation, DB state, EN/RU Translation)
 */

// --- 1. Auth Guard ---
const sessionRaw = localStorage.getItem('infolady_session');
if (!sessionRaw) {
    window.location.href = 'login.html';
}
const session = JSON.parse(sessionRaw);

// --- 2. Mock Database Structure Initialization ---
function initDB() {
    if (!localStorage.getItem('il_websites')) localStorage.setItem('il_websites', JSON.stringify([]));
    if (!localStorage.getItem('il_scans')) localStorage.setItem('il_scans', JSON.stringify([]));
    if (!localStorage.getItem('il_subscriptions')) {
        // Default to free plan
        localStorage.setItem('il_subscriptions', JSON.stringify({ email: session.email, plan: 'free' }));
    }
}
initDB();

const PLAN_LIMITS = {
    'free': 1,
    'pro': 5,
    'agency': 20
};

// --- 3. Translation Dictionary ---
const dashT = {
    en: {
        nav_overview: "Overview",
        nav_websites: "My Websites",
        nav_reports: "Audit Reports",
        nav_insights: "AI Insights",
        nav_settings: "Account Settings",
        btn_logout: "Logout",
        btn_new_scan: "+ New Scan",
        stat_sites: "Tracked Websites",
        stat_scans: "Total Scans Run",
        stat_avg: "Average SEO Score",
        title_recent_activity: "Recent Activity",
        col_domain: "Domain",
        col_score: "SEO Score",
        col_date: "Date",
        col_action: "Action",
        col_added: "Added On",
        col_score_seo: "SEO",
        col_score_ai: "AI Visibility",
        col_score_tech: "Tech",
        empty_activity: "No scans run yet.",
        btn_run_first: "Run your first scan",
        title_manage_sites: "Manage Websites",
        btn_add_site: "+ Add Website",
        empty_sites: "No websites added to your tracking list.",
        title_scan_history: "Scan History",
        empty_reports: "You have not generated any reports yet.",
        insights_title: "AI Competitor Insights",
        insights_sub: "Pro users unlock deep entity mapping and query gap analysis for tracked domains.",
        btn_upgrade_pro: "Upgrade to Pro",
        settings_profile: "Profile Information",
        lbl_name: "Full Name",
        lbl_email: "Email Address",
        settings_plan: "Current Plan",
        btn_upgrade: "Upgrade Plan",
        modal_add_title: "Add New Website",
        btn_add_site_confirm: "Add Website",
        err_limit: "Website limit reached! Upgrade your plan.",
        plan_limit_1: "Limit: 1 Website",
        plan_limit_5: "Limit: 5 Websites",
        plan_limit_20: "Limit: 20 Websites",
        btn_view_report: "View Report",
        btn_delete: "Delete"
    },
    ru: {
        nav_overview: "Обзор",
        nav_websites: "Мои сайты",
        nav_reports: "Отчёты аудита",
        nav_insights: "AI-инсайты",
        nav_settings: "Настройки аккаунта",
        btn_logout: "Выйти",
        btn_new_scan: "+ Новый скан",
        stat_sites: "Отслеживаемые сайты",
        stat_scans: "Всего сканирований",
        stat_avg: "Средний SEO-скор",
        title_recent_activity: "Недавняя активность",
        col_domain: "Домен",
        col_score: "SEO-оценка",
        col_date: "Дата",
        col_action: "Действие",
        col_added: "Дата добавления",
        col_score_seo: "SEO",
        col_score_ai: "AI-видимость",
        col_score_tech: "Тех. состояние",
        empty_activity: "Сканирований еще не было.",
        btn_run_first: "Запустить первую проверку",
        title_manage_sites: "Управление сайтами",
        btn_add_site: "+ Добавить сайт",
        empty_sites: "Нет сайтов в списке отслеживания.",
        title_scan_history: "История проверок",
        empty_reports: "Вы еще не создали ни одного отчёта.",
        insights_title: "AI-инсайты конкурентов",
        insights_sub: "Пользователи Pro получают доступ к глубокому картированию сущностей и анализу пробелов.",
        btn_upgrade_pro: "Перейти на Pro",
        settings_profile: "Информация профиля",
        lbl_name: "Ваше имя",
        lbl_email: "Email адрес",
        settings_plan: "Текущий тариф",
        btn_upgrade: "Обновить тариф",
        modal_add_title: "Добавить новый сайт",
        btn_add_site_confirm: "Добавить сайт",
        err_limit: "Достигнут лимит сайтов! Обновите тариф.",
        plan_limit_1: "Лимит: 1 сайт",
        plan_limit_5: "Лимит: 5 сайтов",
        plan_limit_20: "Лимит: 20 сайтов",
        btn_view_report: "Смотреть отчёт",
        btn_delete: "Удалить"
    }
};

let currentLang = localStorage.getItem('il_lang') || 'ru';

function setLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('il_lang', lang);
    document.documentElement.lang = lang;

    // Toggle active button logic for top lang switcher
    document.querySelectorAll('.lang-btn').forEach(btn => {
        if (btn.dataset.lang === lang) {
            btn.classList.add('active');
            btn.style.borderColor = 'var(--border)';
            btn.style.background = 'var(--bg-card)';
        } else {
            btn.classList.remove('active');
            btn.style.borderColor = 'transparent';
            btn.style.background = 'transparent';
        }
    });

    // Replace strings
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (dashT[lang] && dashT[lang][key]) {
            // Check if it's an input with placeholder or standard text
            if (el.tagName === 'INPUT' && el.hasAttribute('placeholder')) {
                el.placeholder = dashT[lang][key];
            } else {
                el.textContent = dashT[lang][key];
            }
        }
    });

    // Re-render data tables to translate dynamic UI elements
    renderWebsitesTable();
    renderReportsTable();
}

// --- 4. Core Nav & View Switching ---
function switchView(viewId) {
    // Nav active states
    document.querySelectorAll('.dash-nav-item').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.dash-nav-item[data-view="${viewId}"]`).classList.add('active');

    // Panel visibility
    document.querySelectorAll('.view-panel').forEach(panel => panel.classList.remove('active'));
    document.getElementById(`view-${viewId}`).classList.add('active');

    // Update Header Title dynamically based on lang context
    const viewTitleKey = `nav_${viewId}`;
    if (dashT[currentLang][viewTitleKey]) {
        document.getElementById('viewTitle').textContent = dashT[currentLang][viewTitleKey];
        document.getElementById('viewTitle').setAttribute('data-i18n', viewTitleKey);
    }
}

// --- 5. Data Renderers ---
const getWebsites = () => JSON.parse(localStorage.getItem('il_websites')).filter(s => s.email === session.email);
const getScans = () => JSON.parse(localStorage.getItem('il_scans')).filter(s => s.email === session.email);
const getPlan = () => JSON.parse(localStorage.getItem('il_subscriptions'))?.plan || 'free';

function populateSidebarAndSettings() {
    const fn = (session.name || 'User').split(' ')[0];
    document.getElementById('dashName').textContent = fn;
    document.getElementById('dashInitial').textContent = fn.charAt(0).toUpperCase();

    const plan = getPlan();
    document.getElementById('dashPlanLabel').textContent = plan.charAt(0).toUpperCase() + plan.slice(1);

    // Auth settings page population
    document.getElementById('setProfileName').value = session.name;
    document.getElementById('setProfileEmail').value = session.email;
    document.getElementById('setCurrentPlan').textContent = plan.charAt(0).toUpperCase() + plan.slice(1) + " Plan";

    const limitKey = `plan_limit_${PLAN_LIMITS[plan]}`;
    document.getElementById('setPlanLimit').setAttribute('data-i18n', limitKey);
    if (dashT[currentLang][limitKey]) {
        document.getElementById('setPlanLimit').textContent = dashT[currentLang][limitKey];
    }
}

function renderOverviewStats() {
    const sites = getWebsites();
    const scans = getScans();

    document.getElementById('statSites').textContent = sites.length;
    document.getElementById('statScans').textContent = scans.length;

    let avgScore = 0;
    if (scans.length > 0) {
        avgScore = Math.round(scans.reduce((acc, curr) => acc + curr.seoScore, 0) / scans.length);
    }
    document.getElementById('statAvgScore').textContent = avgScore;

    // Populate recent activity (last 5 scans)
    const recent = scans.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
    const tbody = document.querySelector('#recentActivityTable tbody');
    tbody.innerHTML = '';

    if (recent.length === 0) {
        document.getElementById('recentActivityTable').style.display = 'none';
        document.getElementById('emptyActivity').style.display = 'block';
    } else {
        document.getElementById('recentActivityTable').style.display = 'table';
        document.getElementById('emptyActivity').style.display = 'none';

        recent.forEach(scan => {
            const tr = document.createElement('tr');
            const dateStr = new Date(scan.date).toLocaleDateString(currentLang === 'ru' ? 'ru-RU' : 'en-US');
            const color = scan.seoScore >= 80 ? '#10b981' : scan.seoScore >= 50 ? '#f59e0b' : '#ef4444';

            tr.innerHTML = `
                <td style="font-weight: 500; color: var(--text-main);">${scan.domain}</td>
                <td><span style="background: ${color}22; color: ${color}; padding: 4px 10px; border-radius: 20px; font-weight: 700;">${scan.seoScore}</span></td>
                <td style="color: var(--text-muted);">${dateStr}</td>
                <td><a href="/report.html?domain=${scan.domain}" class="btn btn-ghost" style="padding: 6px 14px; font-size: 0.8rem;">${dashT[currentLang].btn_view_report}</a></td>
            `;
            tbody.appendChild(tr);
        });
    }
}

function renderWebsitesTable() {
    const sites = getWebsites().sort((a, b) => new Date(b.addedOn) - new Date(a.addedOn));
    const tbody = document.querySelector('#sitesTable tbody');
    tbody.innerHTML = '';

    if (sites.length === 0) {
        document.getElementById('sitesTable').style.display = 'none';
        document.getElementById('emptySites').style.display = 'block';
    } else {
        document.getElementById('sitesTable').style.display = 'table';
        document.getElementById('emptySites').style.display = 'none';

        sites.forEach(site => {
            const tr = document.createElement('tr');
            const dateStr = new Date(site.addedOn).toLocaleDateString(currentLang === 'ru' ? 'ru-RU' : 'en-US');

            tr.innerHTML = `
                <td style="font-weight: 500; color: var(--text-main);">${site.domain}</td>
                <td style="color: var(--text-muted);">${dateStr}</td>
                <td style="display:flex; gap: 8px;">
                    <button class="btn btn-ghost" style="padding: 6px 14px; font-size: 0.8rem; color: #ff4d4d; border-color: rgba(255,77,77,0.3);" onclick="deleteSite('${site.domain}')">${dashT[currentLang].btn_delete}</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }
}

function renderReportsTable() {
    const scans = getScans().sort((a, b) => new Date(b.date) - new Date(a.date));
    const tbody = document.querySelector('#reportsTable tbody');
    tbody.innerHTML = '';

    if (scans.length === 0) {
        document.getElementById('reportsTable').style.display = 'none';
        document.getElementById('emptyReports').style.display = 'block';
    } else {
        document.getElementById('reportsTable').style.display = 'table';
        document.getElementById('emptyReports').style.display = 'none';

        scans.forEach(scan => {
            const tr = document.createElement('tr');
            const dateStr = new Date(scan.date).toLocaleDateString(currentLang === 'ru' ? 'ru-RU' : 'en-US');

            tr.innerHTML = `
                <td style="font-weight: 500; color: var(--text-main);">${scan.domain}</td>
                <td><strong style="color: ${scan.seoScore >= 80 ? '#10b981' : '#f59e0b'};">${scan.seoScore}</strong></td>
                <td>${scan.aiScore}</td>
                <td>${scan.techScore}</td>
                <td style="color: var(--text-muted);">${dateStr}</td>
                <td><a href="/report.html?domain=${scan.domain}" class="btn btn-primary" style="padding: 6px 14px; font-size: 0.8rem;">${dashT[currentLang].btn_view_report}</a></td>
            `;
            tbody.appendChild(tr);
        });
    }
}

// --- 6. Event Actions ---
function handleLogout() {
    localStorage.removeItem('infolady_session');
    window.location.href = 'login.html';
}

function showAddSiteModal() {
    document.getElementById('addSiteInput').value = '';
    document.getElementById('addSiteError').style.display = 'none';
    document.getElementById('addSiteModal').hidden = false;
}

function closeDashModals() {
    document.querySelectorAll('.dash-modal').forEach(m => m.hidden = true);
}

function submitAddSite() {
    let domainStr = document.getElementById('addSiteInput').value.trim().toLowerCase();
    if (!domainStr) return;

    // Quick sanitize
    domainStr = domainStr.replace(/^https?:\/\//, '').split('/')[0];

    const currentPlan = getPlan();
    const limit = PLAN_LIMITS[currentPlan];
    const sites = JSON.parse(localStorage.getItem('il_websites'));
    const mySites = sites.filter(s => s.email === session.email);

    if (mySites.length >= limit) {
        document.getElementById('addSiteError').style.display = 'block';
        return;
    }

    // Add it
    if (!sites.find(s => s.domain === domainStr && s.email === session.email)) {
        sites.push({ email: session.email, domain: domainStr, addedOn: new Date().toISOString() });
        localStorage.setItem('il_websites', JSON.stringify(sites));
        renderOverviewStats();
        renderWebsitesTable();
    }
    closeDashModals();
}

function deleteSite(domain) {
    if (confirm('Are you sure you want to remove this website from tracking?')) {
        let sites = JSON.parse(localStorage.getItem('il_websites'));
        sites = sites.filter(s => !(s.domain === domain && s.email === session.email));
        localStorage.setItem('il_websites', JSON.stringify(sites));

        renderOverviewStats();
        renderWebsitesTable();
    }
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {

    // Bind Tab Clickers
    document.querySelectorAll('.dash-nav-item').forEach(btn => {
        if (btn.hasAttribute('data-view')) {
            btn.addEventListener('click', (e) => switchView(e.currentTarget.getAttribute('data-view')));
        }
    });

    // Language Toggles
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.addEventListener('click', (e) => setLanguage(e.target.dataset.lang));
    });

    // Boot
    populateSidebarAndSettings();
    setLanguage(currentLang); // applies lang and render all tables 
    renderOverviewStats();
});
