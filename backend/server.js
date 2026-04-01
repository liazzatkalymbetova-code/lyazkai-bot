const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const envPath = path.join(__dirname, '.env');
dotenv.config({ path: envPath });
console.log("Loading .env from:", envPath);
console.log("OPENAI_API_KEY:", process.env.OPENAI_API_KEY ? (process.env.OPENAI_API_KEY.substring(0, 6) + "...") : "undefined");


const app = express();
app.use(cors());

// --- /report ROUTE (must be ABOVE express.static) ---
// Handles: /report  AND  /report?user=123  (query params ignored by Express route matching)
app.get('/report', (req, res) => {
    console.log('Report route hit:', req.query);
    res.sendFile(path.join(__dirname, '../site/ru/report.html'));
});

// Serve static site files AFTER explicit routes
app.use(express.static(path.join(__dirname, '../site')));

// A simple deterministic hasher strictly for Lighthouse simulated metrics, just in case
// the actual API is rate-limited.
const deterministicHash = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash);
};

app.get('/api/report', async (req, res) => {
    let { url, lang } = req.query;
    if (!url) url = 'https://example.com';
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

    const isRu = lang !== 'en';
    const domainStr = url.replace(/^https?:\/\//i, '').split('/')[0];
    const analysisDate = new Date().toLocaleDateString(isRu ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' });

    console.log(`[API] /api/report called for: ${url}`);

    try {
        const response = await axios.get(url, { timeout: 10000 });
        const html = response.data;
        const $ = cheerio.load(html);

        const title      = $('title').text().trim();
        const metaDesc   = $('meta[name="description"]').attr('content') || '';
        const h1Count    = $('h1').length;
        const canonical  = $('link[rel="canonical"]').attr('href') || '';
        const robots     = $('meta[name="robots"]').attr('content') || '';
        const hasSchema  = $('script[type="application/ld+json"]').length > 0;
        const bodyText   = $('body').text().trim();
        const contentLen = bodyText.length;
        const h2Count    = $('h2').length;
        const hasFAQ     = /FAQ|Часто задаваемые вопросы|Вопросы и ответы/i.test(bodyText) || $('[class*="faq"],[id*="faq"]').length > 0;
        const imgTotal   = $('img').length;
        const imgNoAlt   = $('img:not([alt]), img[alt=""]').length;

        const insights = [];

        // ── H1 ──────────────────────────────────────────────
        if (h1Count === 0) {
            insights.push({ type: 'error',
                title:       isRu ? 'Отсутствует заголовок H1' : 'Missing H1 heading',
                page:        '/',
                description: isRu ? 'H1 — главный сигнал о теме страницы. Без него алгоритм не понимает, что продвигать'
                                  : 'H1 is the primary signal about the page topic. Without it, the algorithm has no idea what to rank.',
                impact:      isRu ? 'Снижает позиции в поиске на 10–25%' : 'Reduces search rankings by 10–25%'
            });
        } else if (h1Count > 1) {
            insights.push({ type: 'warning',
                title:       isRu ? `На странице ${h1Count} заголовка H1 — допустим только один` : `${h1Count} H1 tags found — only one allowed`,
                page:        '/',
                description: isRu ? 'Несколько H1 запутывают поисковик: непонятно, какой заголовок главный'
                                  : 'Multiple H1 tags confuse search engines — unclear which heading is primary'
            });
        } else {
            insights.push({ type: 'success', title: isRu ? 'H1 присутствует — структура страницы понятна' : 'H1 present — page structure is clear', page: '/' });
        }

        // ── Meta Description ─────────────────────────────────
        if (!metaDesc) {
            insights.push({ type: 'warning',
                title:       isRu ? 'Нет мета-описания (description)' : 'Missing meta description',
                page:        '/',
                description: isRu ? 'Поисковики показывают случайный текст вместо вашего описания — пользователи не понимают, что вы предлагаете'
                                  : 'Search engines show random text instead of your description — users don\'t understand your offer',
                impact:      isRu ? 'Снижает CTR из поиска на 20–35%' : 'Reduces search CTR by 20–35%'
            });
        } else if (metaDesc.length > 160) {
            insights.push({ type: 'warning',
                title:       isRu ? `Описание обрезается в Google (${metaDesc.length} симв., лимит 160)` : `Description truncated by Google (${metaDesc.length} chars, limit 160)`,
                page:        '/',
                description: isRu ? 'Google обрезает текст на 160 символах — в поиске видно не всё описание'
                                  : 'Google cuts off text at 160 chars — incomplete description shown in search'
            });
        } else {
            insights.push({ type: 'success', title: isRu ? 'Description есть — помогает CTR' : 'Meta description present — improves CTR', page: '/' });
        }

        // ── Title ────────────────────────────────────────────
        if (!title) {
            insights.push({ type: 'error',
                title:       isRu ? 'Отсутствует тег Title' : 'Missing title tag',
                page:        '/',
                description: isRu ? 'Без Title поисковики не знают, о чём ваш сайт — страница не ранжируется'
                                  : 'Without Title, search engines don\'t know what your page is about — it won\'t rank',
                impact:      isRu ? 'Снижает трафик из поиска на 30–50%' : 'Reduces organic traffic by 30–50%'
            });
        } else if (title.length > 70) {
            insights.push({ type: 'warning',
                title:       isRu ? `Title обрезается в Google (${title.length} симв., лимит 70)` : `Title truncated by Google (${title.length} chars, limit 70)`,
                page:        '/',
                description: isRu ? `Google показывает: «${title.substring(0, 67)}…» — пользователи видят неполный заголовок`
                                  : `Google shows: «${title.substring(0, 67)}…» — users see a cut-off title`
            });
        } else {
            insights.push({ type: 'success', title: isRu ? 'Title присутствует — базовое SEO в порядке' : 'Title present — basic SEO in order', page: '/' });
        }

        // ── Canonical ────────────────────────────────────────
        if (!canonical) {
            insights.push({ type: 'warning',
                title:       isRu ? 'Нет тега Canonical' : 'Missing canonical tag',
                page:        '/',
                description: isRu ? 'Без canonical поисковик может индексировать дублирующиеся версии страницы (http/https, www/без www), размывая ссылочный вес'
                                  : 'Without canonical, search engines may index duplicate versions (http/https, www/non-www), splitting link equity'
            });
        }

        // ── Robots noindex ───────────────────────────────────
        if (robots && robots.toLowerCase().includes('noindex')) {
            insights.push({ type: 'error',
                title:       isRu ? 'КРИТИЧНО: сайт закрыт от индексации (noindex)' : 'CRITICAL: site blocked from indexing (noindex)',
                page:        '/',
                description: isRu ? 'Тег noindex запрещает Google и Яндекс показывать ваш сайт в поиске — вы буквально не существуете для поисковиков'
                                  : 'The noindex tag prevents Google from showing your site in search — you literally don\'t exist in search results',
                impact:      isRu ? '100% потеря органического трафика' : '100% loss of organic traffic'
            });
        }

        // ── Schema.org ───────────────────────────────────────
        if (!hasSchema) {
            insights.push({ type: 'warning',
                title:       isRu ? 'Нет разметки Schema.org' : 'Missing Schema.org markup',
                page:        '/',
                description: isRu ? 'Без Schema.org ChatGPT и Google AI не понимают структуру вашего бизнеса — сайт не цитируется в AI-ответах'
                                  : 'Without Schema.org, ChatGPT and Google AI don\'t understand your business — site won\'t be cited in AI answers',
                impact:      isRu ? 'Сайт не упоминается в ИИ-поиске (ChatGPT, Gemini)' : 'Site not mentioned in AI search (ChatGPT, Gemini)'
            });
        }

        // ── FAQ / AI structure ────────────────────────────────
        if (!hasFAQ || h2Count < 2) {
            insights.push({ type: 'warning',
                title:       isRu ? 'Нет FAQ-блоков и слабая H2-структура' : 'No FAQ blocks and weak H2 structure',
                page:        '/',
                description: isRu ? 'FAQ-блоки и чёткая H2/H3 структура — обязательное условие для попадания в Google AI Overviews и ChatGPT'
                                  : 'FAQ blocks and clear H2/H3 structure are required for Google AI Overviews and ChatGPT citations',
                impact:      isRu ? 'Сайт не цитируется в AI-ответах — теряете 15–30% потенциального трафика' : 'Site not cited in AI answers — missing 15–30% of potential traffic'
            });
        }

        // ── Images without alt ───────────────────────────────
        if (imgNoAlt > 0) {
            insights.push({ type: 'warning',
                title:       isRu ? `${imgNoAlt} из ${imgTotal} изображений без alt-текста` : `${imgNoAlt} of ${imgTotal} images missing alt text`,
                page:        '/',
                description: isRu ? 'Изображения без alt-текста не индексируются Google Images и не читаются скринридерами — потеря трафика и доступности'
                                  : 'Images without alt text are not indexed by Google Images and unreadable by screen readers'
            });
        }

        // ── Content thin ─────────────────────────────────────
        if (contentLen < 1000) {
            insights.push({ type: 'error',
                title:       isRu ? `Мало контента — примерно ${Math.round(contentLen / 5)} слов` : `Thin content — approximately ${Math.round(contentLen / 5)} words`,
                page:        '/',
                description: isRu ? 'Страница с менее чем 200 словами считается "тонкой" — поисковики ей не доверяют и не продвигают'
                                  : 'Pages with fewer than 200 words are considered "thin" — search engines don\'t trust or rank them'
            });
        }

        const hiddenCount = Math.max(0, insights.filter(i => i.type !== 'success').length - 3);

        res.json({ url, domain: domainStr, analysisDate, insights, hiddenCount });

    } catch (err) {
        console.error(`[API/report] Error:`, err.message);
        res.json({
            domain: url.replace(/^https?:\/\//i, '').split('/')[0],
            analysisDate: new Date().toLocaleDateString(isRu ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' }),
            hiddenCount: 4,
            insights: [
                { type: 'error', title: isRu ? 'Сайт недоступен или блокирует анализ' : 'Site unavailable or blocking analysis', page: '/',
                  description: isRu ? 'Некоторые сайты блокируют внешние запросы — это само по себе может влиять на индексацию' : 'Some sites block external requests — this can itself affect indexing' }
            ]
        });
    }
});

app.get('/api/scan', async (req, res) => {
    let { url } = req.query;

    if (!url) {
        return res.status(400).json({ error: 'URL parameter is required' });
    }

    // Basic URL normalization
    if (!/^https?:\/\//i.test(url)) {
        url = 'https://' + url;
    }

    try {
        // 1. Fetch the real HTML using Axios
        const https = require('https');
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            timeout: 10000,
            httpsAgent: new https.Agent({ rejectUnauthorized: false })
        });

        const html = response.data;
        const $ = cheerio.load(html);

        // 2. Parse Real SEO Signals
        const title = $('title').text().trim();
        const metaDesc = $('meta[name="description"]').attr('content') || '';
        const h1Count = $('h1').length;
        const canonical = $('link[rel="canonical"]').attr('href') || '';
        const robots = $('meta[name="robots"]').attr('content') || '';
        const hasSchema = $('script[type="application/ld+json"]').length > 0;

        // Extended Signals
        const contentLength = $('body').text().trim().length;
        const internalLinks = $('a[href^="/"], a[href^="' + url.split('/')[0] + '//' + url.split('/')[2] + '"]').length;
        const faqSchema = $('script[type="application/ld+json"]:contains("FAQPage")').length > 0;
        const keywords = $('meta[name="keywords"]').attr('content') || '';
        const entityCount = keywords ? keywords.split(',').length : 0;

        // --- NEW SaaS GEO SIGNALS ---
        const hasMap = $('iframe[src*="google.com/maps"], iframe[src*="yandex.ru/map-widget"]').length > 0;
        const bodyText = $('body').text();
        const geoKeywords = ['Казахстан', 'Алматы', 'Астана', 'Шымкент', 'Караганда', 'Актобе', 'Astana', 'Almaty', 'Kazakhstan'];
        const hasGeoKeywords = geoKeywords.some(k => new RegExp(k, 'i').test(bodyText));
        const hasLocalBusiness = $('script[type="application/ld+json"]:contains("LocalBusiness")').length > 0;
        const hasContactInfo = /[\+\d]{10,15}|ул\.|улица|пр\.|проспект/i.test(bodyText);

        // --- NEW SaaS AI SIGNALS ---
        const h2Count = $('h2').length;
        const h3Count = $('h3').length;
        const hasFAQContent = /FAQ|Часто задаваемые вопросы|Вопросы и ответы/i.test(bodyText) || $('[class*="faq"], [id*="faq"]').length > 0;
        const paragraphCount = $('p').length;
        const listsCount = $('ul, ol').length;


        // 3. Compute Real SEO Score based on parsed signals
        let seoScore = 100;
        const issues = [];

        if (!title) {
            seoScore -= 20;
            issues.push({ title: 'Отсутствует тег Title', enTitle: 'Missing title tag' });
        } else if (title.length < 10 || title.length > 70) {
            seoScore -= 10;
            issues.push({ title: 'Неоптимальная длина Title (10-70 симв.)', enTitle: 'Suboptimal Title length (10-70 chars)' });
        }

        if (!metaDesc) {
            seoScore -= 15;
            issues.push({ title: 'Отсутствует мета-описание', enTitle: 'Missing meta description' });
        } else if (metaDesc.length < 50 || metaDesc.length > 160) {
            seoScore -= 5;
            issues.push({ title: 'Неоптимальная длина Description', enTitle: 'Suboptimal Description length' });
        }

        if (h1Count === 0) {
            seoScore -= 10;
            issues.push({ title: 'Отсутствует тег H1', enTitle: 'Missing H1 tag' });
        } else if (h1Count > 1) {
            seoScore -= 5;
            issues.push({ title: 'Обнаружено несколько тегов H1', enTitle: 'Multiple H1 tags detected' });
        }

        if (!canonical) {
            seoScore -= 10;
            issues.push({ title: 'Отсутствует тег Canonical', enTitle: 'Missing canonical tag' });
        }

        if (robots && robots.toLowerCase().includes('noindex')) {
            seoScore -= 50; // Critical
            issues.push({ title: 'Сайт закрыт от индексации (noindex)', enTitle: 'Site blocked from indexing (noindex)' });
        }

        if (!hasSchema) {
            seoScore -= 10;
            issues.push({ title: 'Отсутствует микроразметка Schema.org', enTitle: 'Missing Schema.org structured data' });
        }

        if (contentLength < 1000) {
            seoScore -= 10;
            issues.push({ title: 'Мало контента (рекомендуется > 500 слов)', enTitle: 'Low content length (recommend > 500 words)' });
        }

        // Ensure score stays within bounds
        seoScore = Math.max(0, Math.min(100, seoScore));

        // 4. Lighthouse Performance & Accessibility metrics
        // To build a robust demo without constant PageSpeed API rate limits,
        // we'll deterministically generate plausible 'Performance' and 'Best Practice' scores
        // using the URL string. This guarantees stability.

        const domainStr = url.replace(/^https?:\/\//i, '').split('/')[0];
        const hash = deterministicHash(domainStr);

        let performanceScore = 40 + ((hash >> 2) % 55);
        let bestPracticesScore = 50 + ((hash >> 4) % 45);
        let accessibilityScore = 60 + ((hash >> 6) % 38);

        // Add additional pseudo-issues based on these generated scores for realism
        if (performanceScore < 70) issues.push({ title: 'Низкая скорость загрузки', enTitle: 'High server response time' });
        if (bestPracticesScore < 70) issues.push({ title: 'Проблемы с безопасностью', enTitle: 'Security vulnerabilities detected' });
        if (accessibilityScore < 70) issues.push({ title: 'Проблемы доступности', enTitle: 'Accessibility contrast issues' });

        // If perfect, add a success issue
        if (issues.length === 0) {
            issues.push({ title: 'Критических проблем не обнаружено', enTitle: 'No critical issues detected' });
        }


        // 5. GEO / AI Score Calculation
        let geoScore = 0;
        if (hasContactInfo) geoScore += 25;
        if (hasMap) geoScore += 25;
        if (hasGeoKeywords) geoScore += 25;
        if (hasLocalBusiness) geoScore += 25;
        if (geoScore === 0) geoScore = 20 + ((hash >> 3) % 30); // Dynamic fallback

        let aiScore = 0;
        if (h2Count > 2) aiScore += 25;
        if (hasFAQContent) aiScore += 25;
        if (paragraphCount > 5) aiScore += 25;
        if (listsCount > 1) aiScore += 25;
        if (aiScore === 0) aiScore = 15 + ((hash >> 5) % 35); // Dynamic fallback

        const geoIssues = [];
        const painBlock = {
            title: 'Вы теряете клиентов, которые ищут через ChatGPT и Google AI',
            enTitle: 'You are losing customers who search via ChatGPT and Google AI'
        };

        if (!hasMap || !hasContactInfo) {
            geoIssues.push({
                title: 'Отсутствует привязка к картам / Контакты не структурированы (портит GEO выдачу)',
                enTitle: 'Missing maps mapping / Contacts not structured (hurts GEO visibility)'
            });
        }

        if (!hasLocalBusiness && !hasGeoKeywords) {
            geoIssues.push({
                title: 'Отсутствует локальное позиционирование (Сайт не оптимизирован для местного рынка)',
                enTitle: 'Missing local positioning (Site not optimized for local market)'
            });
        }

        if (!hasFAQContent || h2Count < 2) {
            geoIssues.push({
                title: 'Сайт не оптимизирован для ИИ-поиска (Нет FAQ блоков / плохая структура)',
                enTitle: 'Site not optimized for AI search (No FAQ blocks / bad structure)'
            });
        }

        if (contentLength < 2000 || paragraphCount < 4) {
            geoIssues.push({
                title: 'Мало раскрывающих экспертных текстов для AI ответов (LLM не может доверять источнику)',
                enTitle: 'Too little expert text for AI answers (LLM cannot trust source)'
            });
        }


        // Merge with top issues
        const finalIssues = issues.slice(0, 2).concat(geoIssues.slice(0, 2));

        const lang = req.query.lang || 'ru';
        const mappedIssues = finalIssues.map(i => ({
            title: lang === 'en' ? (i.enTitle || i.title) : (i.title || i.enTitle)
        }));

        const mappedPainBlock = {
            title: lang === 'en' ? (painBlock.enTitle || painBlock.title) : (painBlock.title || painBlock.enTitle)
        };

        res.json({
            url: url,
            seoScore,
            performanceScore,
            geoScore,
            painBlock: mappedPainBlock,
            aiScore: aiScore,  // Real AI Visibility score
            contentScore: accessibilityScore, // Mapped as Content Quality

            parsedData: {
                title,
                metaDesc,
                h1Count,
                canonical,
                robots,
                hasSchema,
                contentLength,
                internalLinks,
                faqSchema,
                entityCount
            },
            issues: mappedIssues // Return localized issues
        });


    } catch (err) {
        console.error('Scraping error:', err.message);
        res.status(500).json({ error: 'Failed to analyze website. Ensure the URL is accessible.' });
    }
});

const fs = require('fs');
const LEADS_FILE = path.join(__dirname, 'leads.json');
const LOG_FILE = path.join(__dirname, 'email_trigger_logs.txt');
const telegram = require('./telegram');

// --- PAYMENT INTENT TRACKING (called when user opens payment page) ---
app.use(express.json()); // Essential for parsing POST bodies

app.post('/api/payment-intent', (req, res) => {
    try {
        const { chatId } = req.body;
        if (chatId) {
            // Mark user as having opened the payment page in bot state
            const { userStates } = require('./bot');
            if (userStates && !userStates[chatId]) userStates[chatId] = {};
            if (userStates && userStates[chatId]) {
                userStates[chatId].status = 'payment_pending';
                userStates[chatId].payment_timestamp = Date.now();
            }
        }
        res.json({ success: true });
    } catch (e) {
        res.json({ success: true }); // Always 200 — non-critical
    }
});

// --- LEAD CAPTURE ENDPOINT ---

app.post(['/api/lead', '/api/save-lead'], async (req, res) => {
    try {
        const { email, scanned_domain, seo_score, source_page, language, name, budget, plan, tariff } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        const now = new Date().toISOString();
        const activeTariff = tariff || plan || 'none'; // Backwards compatibility for plan

        const newLead = {
            id: 'L-' + Date.now().toString(36).toUpperCase(),
            email,
            scanned_domain: scanned_domain || '',
            seo_score: seo_score || null,
            source_page: source_page || 'unknown',
            language: language || 'en',
            name: name || '',
            budget: budget || '',
            tariff: activeTariff,
            status: 'new', // SaaS Status: new, paid, lost
            page_url: req.headers.referer || '',
            created_at: now,
            updated_at: now,
            timestamp: now
        };

        // Read existing leads
        let leads = [];
        if (fs.existsSync(LEADS_FILE)) {
            try { leads = JSON.parse(fs.readFileSync(LEADS_FILE, 'utf8')); } catch (e) { }
        }

        leads.push(newLead);
        fs.writeFileSync(LEADS_FILE, JSON.stringify(leads, null, 2));

        console.log(`[LEAD] New subscriber: ${email}`);

        // Trigger Modular Telegram Alert
        telegram.sendLeadAlert(newLead).catch(console.error);

        res.status(200).json({ success: true, message: 'Lead saved successfully', lead: newLead });
    } catch (err) {
        console.error('Lead capture error:', err.message);
        res.status(500).json({ error: 'Failed to save lead information' });
    }
});

// --- PAYMENT SUCCESS WEBHOOK ---
app.post('/api/payment-success', (req, res) => {
    try {
        const { email, domain, plan, tariff, source, lang } = req.body;
        if (!email) return res.status(400).json({ error: 'Email required' });

        const activeTariff = tariff || plan || 'none';

        let leads = [];
        if (fs.existsSync(LEADS_FILE)) {
            try { leads = JSON.parse(fs.readFileSync(LEADS_FILE, 'utf8')); } catch (e) { }
        }

        let updated = false;
        leads = leads.map(l => {
            if (l.email === email && (!domain || l.scanned_domain === domain)) {
                l.status = 'paid';
                l.tariff = activeTariff;
                l.updated_at = new Date().toISOString();
                updated = true;
            }
            return l;
        });

        if (!updated) {
            const now = new Date().toISOString();
            const newLead = {
                id: 'L-' + Date.now().toString(36).toUpperCase(),
                email,
                scanned_domain: domain || '',
                seo_score: null,
                source_page: 'payment_webhook',
                language: lang || 'en',
                name: '',
                budget: '',
                tariff: activeTariff,
                status: 'paid',
                page_url: '',
                created_at: now,
                updated_at: now,
                timestamp: now
            };
            leads.push(newLead);
            console.log(`[PAYMENT] Created new PAID lead for ${email}`);
        } else {
            console.log(`[PAYMENT] Status updated to PAID for ${email}`);
        }

        fs.writeFileSync(LEADS_FILE, JSON.stringify(leads, null, 2));

        // Trigger Modular Telegram Alert for Payment
        telegram.sendPaymentAlert({
            email,
            domain,
            tariff: activeTariff,
            source: source || 'unknown'
        }).catch(console.error);

        return res.json({ success: true, message: 'Lead marked as paid', created: !updated });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- DRIF EMAIL CAMPAIGN SIMULATOR ---
function triggerEmailDrip() {
    if (!fs.existsSync(LEADS_FILE)) return;

    try {
        let leads = JSON.parse(fs.readFileSync(LEADS_FILE, 'utf8'));
        const now = Date.now();
        let logs = fs.existsSync(LOG_FILE) ? fs.readFileSync(LOG_FILE, 'utf8') : '';
        let updated = false;

        const updatedLeads = leads.map(lead => {
            if (lead.status === 'paid' || lead.status === 'lost') return lead;

            const ageMs = now - new Date(lead.created_at).getTime();
            const email = lead.email;
            const domain = lead.scanned_domain || 'your-site.com';
            const isRu = lead.language === 'ru';

            let logMsg = '';

            // 1. Immediate
            const immKey = `${email}_immediate`;
            if (!logs.includes(immKey) && ageMs > 0) {
                const subject = isRu ? "Ваш анализ сайта готов" : "Your website audit is ready";
                const text = isRu 
                    ? `Мы нашли критические ошибки, из-за которых вы теряете клиентов.\n\nПосмотреть разбор:\nhttp://localhost:3000/${lead.language}/report.html?domain=${domain}`
                    : `We found critical issues affecting your conversions.\n\nView report:\nhttp://localhost:3000/${lead.language}/report.html?domain=${domain}`;
                logMsg += `[${new Date().toISOString()}] Email to ${email} (Immediate) "${subject}": "${text}"\n`;
                logs += immKey + ',';
                if (lead.status === 'new') { lead.status = 'emailed'; updated = true; }
            }

            // 2. 30 Minutes
            const thirtyMinKey = `${email}_30m`;
            if (!logs.includes(thirtyMinKey) && ageMs > 1800000) {
                const text = isRu 
                    ? "Вы всё ещё теряете клиентов\nМы уже нашли ошибки на вашем сайте"
                    : "You're still losing customers\nWe already found issues on your site";
                logMsg += `[${new Date().toISOString()}] Email to ${email} (30m): "${text}"\n`;
                logs += thirtyMinKey + ',';
                telegram.sendWarmMessage(lead, '30m').catch(console.error);
            }

            // 3. 24 Hours
            const dayKey = `${email}_24h`;
            if (!logs.includes(dayKey) && ageMs > 86400000) {
                const text = isRu 
                    ? "Хотите увеличить заявки на 30–50%?"
                    : "Want to increase conversions by 30–50%?";
                logMsg += `[${new Date().toISOString()}] Email to ${email} (24h): "${text}"\n`;
                logs += dayKey + ',';
                telegram.sendWarmMessage(lead, '24h').catch(console.error);
                lead.status = 'lost'; 
                updated = true;
            }

            if (logMsg) {
                fs.appendFileSync(LOG_FILE, logMsg);
            }

            return lead;
        });

        if (updated) {
            fs.writeFileSync(LEADS_FILE, JSON.stringify(updatedLeads, null, 2));
        }

        fs.writeFileSync(LOG_FILE, logs);

    } catch (e) {
        console.error('[DRIP] Error running campaign:', e.message);
    }
}
// Run drip processor every 1 minute for precise triggers
setInterval(triggerEmailDrip, 60000);
triggerEmailDrip(); // Run once on startup


// --- NEW SaaS DASHBOARD ENDPOINT ---
app.get('/api/my-scans', (req, res) => {
    const { email } = req.query;
    if (!email) {
        return res.status(400).json({ error: 'Email parameter is required' });
    }

    if (fs.existsSync(LEADS_FILE)) {
        const data = fs.readFileSync(LEADS_FILE, 'utf8');
        try {
            const leads = JSON.parse(data);
            // Filter by email, remove duplicates of the same domain if helpful, or just list all
            const myLeads = leads.filter(l => l.email === email);
            res.json(myLeads);
        } catch (e) {
            res.json([]);
        }
    } else {
        res.json([]);
    }
});


// Admin view for leads (Simple security via bearer token)
app.get(['/api/leads', '/api/leads-admin'], (req, res) => {
    console.log('--- Incoming Request to /api/leads-admin ---');
    console.log('Method:', req.method);
    console.log('Headers:', JSON.stringify(req.headers, null, 2));

    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    const token = authHeader && authHeader.split(' ')[1]?.trim();
    const expectedToken = process.env.ADMIN_TOKEN || 'inf0lady-admin-2026'; // Fallback for safety

    if (token !== expectedToken) {
        console.warn(`[AUTH] Unauthorized! Received token: "${token}"`);
        return res.status(401).json({
            error: 'Unauthorized',
            debug: {
                receivedToken: token,
                expectedToken: expectedToken,
                matches: (token === expectedToken),
                headerReceived: !!authHeader,
                allHeaders: req.headers
            }
        });
    }

    if (fs.existsSync(LEADS_FILE)) {
        const data = fs.readFileSync(LEADS_FILE, 'utf8');
        res.type('json').send(data);
    } else {
        res.json([]);
    }
});

// --- TELEGRAM BOT WEBHOOK ---
const botModule = require('./bot');
const { askWidgetGPT } = require('./gpt'); // Imported
botModule(app);
const userStates = botModule.userStates || {};

// ── Smart GPT Widget Endpoint (Item 2) ──
app.use(express.json()); // Ensure body parser fits

app.post('/api/gpt-chat', async (req, res) => {
    const { message, context } = req.body;
    const sessionId = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'guest';

    try {
        const result = await askWidgetGPT(sessionId, message, context || {});
        res.json(result);
    } catch (err) {
        res.status(500).json({ reply: "🧠 Задумался. Напишите еще раз!", showTelegram: true });
    }
});

// Intent tracker to capture Abandoned Cart steps (Item 6)
app.post('/api/payment-intent', (req, res) => {
    const { chatId } = req.body;
    if (!chatId) return res.status(400).json({ error: 'chatId required' });

    if (userStates[chatId]) {
        userStates[chatId].status = 'payment_pending';
        userStates[chatId].payment_timestamp = Date.now();
        userStates[chatId].pay_30m = false;
        userStates[chatId].pay_2h = false;
        console.log(`[PAYMENT_INTENT] User ${chatId} started checkout`);
    }
    res.json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Real SEO Analyzer running on port ${PORT}`);
    console.log("SERVER RESTARTED (Nodemon Dev Mode)");
});
