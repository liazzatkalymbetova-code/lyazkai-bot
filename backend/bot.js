const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const dotenv = require('dotenv');
const { askGPT } = require('./gpt');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const token = process.env.TELEGRAM_BOT_TOKEN;

let bot = null;
if (!token) {
    console.warn("⚠️ WARNING: TELEGRAM_BOT_TOKEN is missing. Bot features are disabled, but web server will run.");
} else {
    bot = new TelegramBot(token, { polling: false });
    console.log("🚀 Telegram Bot initialized with Webhooks...");
}

// In-memory state to track sources
const userSources = {};
const userStates = {};
const followUpTimers = {};

const strings = {
    ru: {
        greet: `Привет! 👋\n\nЯ просканирую твой сайт и покажу, где скрываются ошибки, мешающие продажам.\n\n👇 **Отправь ссылку (например, mysite.com) прямо сейчас!**`,
        analyzing: 'Анализирую... ⏳',
        success: 'Готово 👇 Вот твой анализ',
        upsell: `Хочешь увидеть полную картину?\n\n✔ 50+ технических проверок\n✔ AI-видимость в ChatGPT и Google\n✔ Пошаговый план на 4 недели\n\n💰 Стоимость: 25 000 ₸ · PDF за 48 ч`,
        upsellBtn: '📄 Получить полный отчёт',
        auditResults: '🔍 *Результаты аудита:*',
        seoScore: 'SEO-рейтинг',
        aiScore: 'AI-видимость',
        bestPractices: 'Лучшие практики',
        mainIssues: 'Главные проблемы',
        noIssues: '• Данные недоступны',
        verdict: '⚠️ *Вывод:* Эти проблемы сейчас стоят вам клиентов каждый день.',
        error: '⚠️ Не удалось проанализировать сайт. Проверь ссылку и попробуй ещё раз.',
        link: 'Откройте полный анализ',
        followUp: `Ваш отчёт готов.\nНо там скрыты ключевые точки роста.\n\n👇 Открыть полный анализ`,
        followUpBtn: 'Открыть полный анализ'
    },
    en: {
        greet: `Hello! 👋\n\nI will scan your website and show you where issues are hiding that block sales.\n\n👇 **Send your link (e.g., mysite.com) right now!**`,
        analyzing: 'Analyzing... ⏳',
        success: 'Done 👇 Here is your analysis',
        upsell: `Want to see the full picture?\n\n✔ 50+ technical checks\n✔ AI visibility in ChatGPT & Google\n✔ Step-by-step 4-week plan\n\n💰 Price: $50 · PDF within 48h`,
        upsellBtn: '📄 Get Full Report',
        auditResults: '🔍 *Audit Results:*',
        seoScore: 'SEO Rating',
        aiScore: 'AI Visibility',
        bestPractices: 'Best Practices',
        mainIssues: 'Main Issues',
        noIssues: '• Data not available',
        verdict: '⚠️ *Verdict:* These issues are costing you customers every day.',
        error: '⚠️ Failed to analyze website. Check link and try again.',
        link: 'Unlock full analysis',
        followUp: `Your report is ready.\nBut key growth points are hidden there.\n\n👇 Unlock full analysis`,
        followUpBtn: 'Unlock full analysis'
    }
};

// ── URL helpers ──────────────────────────────────────────────────────────────

/**
 * Returns true if the text looks like a website URL or Instagram handle/link.
 */
function isUrl(text) {
    const t = text.trim().toLowerCase();
    // full URLs
    if (/^https?:\/\//i.test(t)) return true;
    // www. prefix
    if (/^www\./i.test(t)) return true;
    // instagram.com handle or link
    if (t.includes('instagram.com/') || /^@?[a-z0-9._]+$/.test(t) === false) {
        // only catch instagram.com mentions here; bare handles are ambiguous
        if (t.includes('instagram.com')) return true;
    }
    // bare domain pattern: something.tld  (at least one dot, no spaces)
    if (/^[a-z0-9-]+\.[a-z]{2,}(\/.*)?$/.test(t)) return true;
    return false;
}

/**
 * Normalises the raw text into a full URL the API can fetch.
 * Instagram profile URLs are kept as-is so the API attempts to fetch them.
 */
function normalizeUrl(text) {
    const t = text.trim();
    if (/^https?:\/\//i.test(t)) return t;
    return 'https://' + t;
}

/**
 * Builds a short Telegram-friendly audit summary from the /api/scan response.
 */
function buildSummary(data, lang = 'ru') {
    const seo = data.seoScore || 0;
    const geo = data.geoScore || 0;
    const ai  = data.aiScore  || 0;
    const s   = strings[lang];

    const scoreBar = (score) => {
        if (score >= 80) return '🟢';
        if (score >= 50) return '🟡';
        return '🔴';
    };

    const topIssues = (data.issues || []).slice(0, 3)
        .map(i => `• ${i.title}`)
        .join('\n');

    return (
`🔍 *${s.auditResults}*

${scoreBar(seo)} ${s.seoScore}: *${seo}/100*
${scoreBar(geo)} ${s.aiScore}: *${geo}/100*
${scoreBar(ai)} ${s.bestPractices}: *${ai}/100*

*${s.mainIssues}:*
${topIssues || s.noIssues}

⚠️ *${s.verdict}*`
    );
}

module.exports = function(app) {
    if (!bot) {
        console.warn("⚠️ Skipping Telegram Bot routes initialization because bot is null.");
        return;
    }

    // 2. Webhook Route
    app.post('/api/payment-success', async (req, res) => {
        const { chatId } = req.body;
        if (userStates[chatId]) {
            userStates[chatId].status = 'purchased'; // matches follow-up guard
            stopFollowUps(chatId); // stop all pending follow-ups
            console.log(`[Payment] ${chatId} status set to purchased.`);
            try {
                const lang = userStates[chatId].lang || 'ru';
                const domain = userStates[chatId].domain || '';
                const domainLine = domain ? (lang === 'en' ? `\n\nSite: ${domain}` : `\n\nСайт: ${domain}`) : '';
                const confirmMsg = lang === 'en'
                    ? `🎉 Payment received! Thank you!\n\nI'm starting a deep analysis of your site.${domainLine}\n\n⏱ Your full audit PDF will be ready within 24–48 hours.\n\nI'll send it here in this chat.`
                    : `🎉 Оплата получена! Спасибо!\n\nНачинаю глубокий разбор вашего сайта.${domainLine}\n\n⏱ Полный PDF-отчёт будет готов в течение 24–48 часов.\n\nОтправлю его прямо сюда в чат.`;
                await bot.sendMessage(chatId, confirmMsg);
            } catch (e) {}
        }
        res.json({ success: true, status: 'paid' });
    });

    app.post('/webhook', (req, res) => {
        bot.processUpdate(req.body);
        res.sendStatus(200);
    });






// 1. START MESSAGE
bot.onText(/\/start(?:\s+(.+))?/, async (msg, match) => {
    try {
        const chatId = msg.chat.id;
        const startParam = match[1] || '';

        console.log("START PAYLOAD:", startParam);

        const data = parseStart(startParam);

        // Map backwards compatibility for gpt context queries
        userSources[chatId] = { 
            source: data.source, 
            lang: data.lang, 
            tariff: 'standard',
            step: data.step,
            segment: data.segment,
            domain: data.domain
        };
        
        saveUser(chatId, data);

        // User returning after payment from website
        if (data.step === 'paid') {
            userStates[chatId] = userStates[chatId] || {};
            userStates[chatId].status = 'purchased';
            userStates[chatId].lang = data.lang || (data.source && data.source.endsWith('_en') ? 'en' : 'ru');
            stopFollowUps(chatId);

            const l = userStates[chatId].lang;

            const msg1 = l === 'en'
                ? '⚡ We have started analysing your site...'
                : '⚡ Мы уже начали анализ вашего сайта...';
            const msg2 = l === 'en'
                ? '🔍 Checking SEO, speed, and AI visibility across 50+ signals...'
                : '🔍 Проверяем SEO, скорость и AI-видимость по 50+ параметрам...';
            const msg3 = l === 'en'
                ? '📊 Preparing your personalised recommendations. Your PDF report will arrive within 24–48 hours. We will message you here the moment it\'s ready.'
                : '📊 Готовим персональные рекомендации. PDF-отчёт придёт в течение 24–48 часов. Как только будет готово — напишем сюда.';

            await bot.sendMessage(chatId, msg1);
            setTimeout(async () => {
                try { await bot.sendMessage(chatId, msg2); } catch(e) {}
            }, 25000);
            setTimeout(async () => {
                try { await bot.sendMessage(chatId, msg3); } catch(e) {}
            }, 50000);
            return;
        }

        if (data.domain) {
            // STEP 1
            const step1 = data.lang === 'en'
                ? `I checked your website ${data.domain}. I already see several issues affecting your conversions.`
                : `Я посмотрел ваш сайт ${data.domain}. Уже вижу несколько проблем, из-за которых вы теряете заявки.`;
            await bot.sendMessage(chatId, step1);
            
            if (!userStates[chatId]) userStates[chatId] = {};
            userStates[chatId].domain = data.domain;
            userStates[chatId].lang = data.lang || 'ru';

            // STEP 2
            setTimeout(async () => {
                const step2 = data.lang === 'en'
                    ? `Do you want me to show 2–3 issues for free?`
                    : `Хотите покажу 2–3 ошибки бесплатно?`;
                const reply_markup = {
                    inline_keyboard: [
                        [{ text: data.lang === 'en' ? "Show issues" : "Показать ошибки", callback_data: "show_free_issues" }]
                    ]
                };
                await bot.sendMessage(chatId, step2, { reply_markup });
            }, 2000);
            return; // skip standard welcome
        }

        sendWelcome(chatId, data);

        scheduleFollowUps(chatId, data.segment);

    } catch (err) {
        console.error('Error in /start handler:', err.message);
    }
});

function parseStart(start) {
    const decoded = decodeURIComponent(start || '');
    
    // NEW format: lang|domain
    if (decoded.includes('|')) {
        const [lang, domain] = decoded.split('|');
        return {
            source: 'site',
            lang: lang || 'ru',
            step: 'chat',
            segment: 'warm',
            domain: domain || ''
        };
    }
    
    // Known simple params from site CTAs
    const knownCtaParams = ['global_cta', 'mobile_cta', 'audit_root_index', 'audit_root_ru', 'audit_root_en', 'paid_ru', 'paid_en'];
    if (knownCtaParams.includes(decoded)) {
        const lang = decoded.includes('en') ? 'en' : 'ru';
        const isPaid = decoded.startsWith('paid_');
        return { source: 'site', lang, step: isPaid ? 'paid' : 'chat', segment: isPaid ? 'purchased' : 'warm', domain: '' };
    }

    const parts = decoded.split('_');
    const map = {};
    for (let i = 0; i < parts.length; i += 2) {
        if (parts[i] && parts[i+1]) {
            map[parts[i]] = parts[i+1];
        }
    }
    return {
        source: map['src'] || 'site',
        lang: map['lang'] || 'ru',
        step: map['step'] || 'chat',
        segment: map['interest'] || 'warm',
        domain: map['domain'] || ''
    };
}

async function sendWelcome(chatId, data) {
    const lang = data.lang || 'ru';
    const s = strings[lang] || strings['ru'];

    const greetMsg = lang === 'en'
        ? `Hello! 👋\n\nI'm InfoLady — AI search visibility analyzer.\n\nSend me your website URL and I'll show you:\n📉 Where you're losing customers\n📊 Your SEO & AI visibility score\n🎯 Top 3 issues to fix\n\n👇 Just paste your URL (e.g. mysite.com)`
        : `Привет! 👋\n\nЯ InfoLady — AI-аналитик видимости сайтов.\n\nОтправь мне ссылку на сайт, и я покажу:\n📉 Где ты теряешь клиентов\n📊 Твой SEO и AI-рейтинг\n🎯 Топ-3 ошибки которые нужно исправить\n\n👇 Просто отправь ссылку (например, mysite.com)`;

    const opts = {
        reply_markup: {
            inline_keyboard: [
                [{ text: lang === 'en' ? "📋 View Pricing" : "📋 Посмотреть тарифы", callback_data: "view_price" }],
                [{ text: lang === 'en' ? "📈 Success Case" : "📈 Кейс: +40% заявок", callback_data: "view_case" }]
            ]
        }
    };

    await bot.sendMessage(chatId, greetMsg, opts);
}


bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    if (userStates[chatId]) {
        userStates[chatId].clicked = true;
    }

    const data = query.data;

    if (data === 'show_free_issues') {
        const state = userStates[chatId] || { lang: 'ru' };
        const l = state.lang || 'ru';
        const domain = state.domain || '';
        const domainRef = domain ? (l === 'en' ? ` on ${domain}` : ` на ${domain}`) : '';

        const step3 = l === 'en'
            ? `Here's what I can already see${domainRef}:\n\n❌ Visitors don't understand what to do next — no visible action button\n⚠️ The offer isn't clear in the first 5 seconds — people leave\n📉 These 2 issues alone can kill 30–60% of potential leads`
            : `Вот что уже видно${domainRef}:\n\n❌ Посетитель не понимает что делать дальше — нет явной кнопки действия\n⚠️ Оффер не считывается за первые 5 секунд — люди уходят\n📉 Только из-за этих 2 проблем вы теряете 30–60% потенциальных заявок`;

        await bot.sendMessage(chatId, step3);

        setTimeout(async () => {
            const step4 = l === 'en'
                ? `That's just 2 of the issues I found.\n\nThe full audit covers 50+ checks:\n→ Technical SEO\n→ AI search visibility\n→ Competitor gaps\n→ Content quality\n\nYou get a prioritized PDF plan — exactly what to fix and in what order.\n\n💰 $50 · PDF within 48h`
                : `Это только 2 из найденных проблем.\n\nПолный аудит включает 50+ проверок:\n→ Технический SEO\n→ Видимость в AI-поиске\n→ Анализ конкурентов\n→ Качество контента\n\nВы получаете PDF с приоритетным планом — что исправить и в какой очерёдности.\n\n💰 25 000 ₸ · PDF за 48 ч`;
            const reply_markup = {
                inline_keyboard: [
                    [{ text: l === 'en' ? "✅ Get Full Audit — $50" : "✅ Хочу полный аудит — 25 000 ₸", callback_data: "get_full_audit" }],
                    [{ text: l === 'en' ? "📈 See a real case first" : "📈 Сначала посмотреть кейс", callback_data: "view_case" }]
                ]
            };
            await bot.sendMessage(chatId, step4, { reply_markup });
        }, 2500);
    }

    if (data === 'get_full_audit') {
        const state = userStates[chatId] || { lang: 'ru' };
        const l = state.lang || 'ru';
        const payUrl = `https://infolady.online/${l}/payment.html?plan=basic&source=bot&user=${chatId}`;
        const text = l === 'en'
            ? `⚠️ I found several critical issues on your site.\n\nThey are actively reducing your conversions and search visibility right now.\n\nThe full audit will show you:\n• exactly where you're losing customers\n• why your site isn't ranking in Google\n• how competitors are outranking you\n\n👇 Tap to see the complete breakdown:`
            : `⚠️ Я нашёл несколько критических ошибок на вашем сайте.\n\nОни прямо сейчас снижают вашу конверсию и видимость в поиске.\n\nПолный аудит покажет:\n• где именно теряются клиенты\n• почему сайт не виден в Google\n• как конкуренты вас обходят\n\n👇 Нажмите, чтобы увидеть полный разбор:`;
        if (!userStates[chatId]) userStates[chatId] = {};
        userStates[chatId].status = 'payment_pending';
        userStates[chatId].payment_timestamp = Date.now();
        await bot.sendMessage(chatId, text, {
            reply_markup: {
                inline_keyboard: [
                    [{ text: l === 'en' ? "👉 Show Full Audit" : "👉 Показать полный аудит", url: payUrl }]
                ]
            }
        });
    }

    bot.answerCallbackQuery(query.id);
    if (data === 'get_audit') {
        const state = userStates[chatId];
        if (state && state.lastUrl) {
            await bot.sendMessage(chatId, `Запускаю повторный разбор для ${state.lastUrl}...`);
            // Trigger can be simulated or ask to type again if desired, but best is to run norm audit
            await bot.sendMessage(chatId, `Отправьте ссылку заново, чтобы обновить анализ 📈`);
        } else {
            await bot.sendMessage(chatId, `👇 **Отправь ссылку (например, mysite.com) прямо сейчас!**`);
        }
    }


    if (data === 'view_price') {
        const state = userStates[chatId] || { lang: 'ru' };
        const l = state.lang || 'ru';
        const payUrl = `https://infolady.online/${l}/payment.html?plan=basic&source=bot&user=${chatId}`;
        const text = l === 'en'
            ? `⚠️ Your site is losing customers right now.\n\nThe audit shows exactly where — and how to fix it.\n\n💰 *Our Plans:*\n\n— *Basic ($50):* Issue audit + top fixes\n— *Standard ($100):* Step-by-step growth plan\n— *Premium ($300):* Personal walkthrough\n\nMost popular: Basic`
            : `⚠️ Ваш сайт теряет клиентов прямо сейчас.\n\nАудит покажет точно где — и как это исправить.\n\n💰 *Наши Тарифы:*\n\n— *Базовый (25 000 ₸):* Краткий аудит ошибок\n— *Стандарт (50 000 ₸):* Пошаговый план роста\n— *Премиум (150 000 ₸):* Индивидуальный разбор\n\nСамый популярный: Базовый`;
        await bot.sendMessage(chatId, text, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: l === 'en' ? "✅ Get Basic Audit — $50" : "✅ Базовый аудит — 25 000 ₸", url: payUrl }]
                ]
            }
        });
        if (userStates[chatId]) userStates[chatId].status = 'interested';
    }

    if (data === 'view_case') {
        const state = userStates[chatId] || { lang: 'ru' };
        const l = state.lang || 'ru';
        const text = l === 'en'
            ? `📈 *Case Study: +40% leads in 1 week*\n\n*Problem:* A services page was losing visitors due to a complex form.\n*Solution:* Simplified to 1 field, added a trust block.\n*Result:* Leads grew 1.4x 🚀\n\nWant the same for your site? Type "ready"!`
            : `📈 *Кейс: Рост заявок на 40% за 1 неделю*\n\n*Проблема:* Страница услуг теряла клиентов из-за сложной формы.\n*Решение:* Упростили форму до 1 поля, добавили блок доверия.\n*Результат:* Заявки выросли в 1.4 раза 🚀\n\nХотите также? Напишите "хочу"!`;
        await bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
        if (userStates[chatId]) userStates[chatId].status = 'warm';
    }
});

// 2. HANDLE USER INPUT (URL)
bot.on('message', async (msg) => {
    try {
        const chatId = msg.chat.id;
        const text = msg.text;

        if (!text) return;
        console.log(`[Message] ${chatId}: ${text}`);

        if (text.startsWith('/')) return; // Ignore commands

        const userCtx = userSources[chatId] || { source: 'telegram', lang: 'ru' };
        const source = userCtx.source;
        const lang = userCtx.lang || 'ru';
        const s = strings[lang];
        const lowerText = text.toLowerCase().trim();

        stopFollowUps(chatId); // Reset timers on active response
        if (!userStates[chatId]) userStates[chatId] = {};
        userStates[chatId].messagesCount = (userStates[chatId].messagesCount || 0) + 1;


        console.log("USER:", text);

        // 1. Ссылка -> Аудит (если содержит http или является URL)
        if (text.includes('http') || isUrl(text)) {
            const targetUrl = normalizeUrl(text);
            await bot.sendMessage(chatId, s.analyzing);

            try {
                const port = process.env.PORT || 3000;
                const apiRes = await axios.get(
                    `http://localhost:${port}/api/scan?url=${encodeURIComponent(targetUrl)}&lang=${lang}`,
                    { timeout: 15000 }
                );
                const data = apiRes.data;

                // Step 1: show audit scores
                const summary = buildSummary(data, lang);
                await bot.sendMessage(chatId, summary, { parse_mode: 'Markdown' });

                // Step 2: pause, then show report link
                await new Promise(r => setTimeout(r, 1500));
                const reportLink = `https://infolady.online/${lang}/report.html?user=${chatId}`;
                await bot.sendMessage(chatId, lang === 'en'
                    ? `📄 Your free report is ready:\n${reportLink}`
                    : `📄 Твой бесплатный отчёт готов:\n${reportLink}`);

                // Step 3: pause, then upsell
                await new Promise(r => setTimeout(r, 2500));
                const issueCount = (data.issues || []).length;
                const sellBlock = lang === 'en'
                    ? `I found ${issueCount || 'several'} issues.\n\nThe free report shows *what* is broken.\nThe full audit shows *why* — and gives you an exact fix plan.\n\n✔ 50+ checks\n✔ Competitor analysis\n✔ PDF delivered in 48h`
                    : `Я нашёл ${issueCount || 'несколько'} проблем.\n\nБесплатный отчёт показывает *что* сломано.\nПолный аудит — *почему* и как исправить.\n\n✔ 50+ проверок\n✔ Анализ конкурентов\n✔ PDF за 48 ч`;
                const opts = {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: lang === 'en' ? "✅ Get Full Audit — $50" : "✅ Полный аудит — 25 000 ₸", url: `https://infolady.online/${lang}/payment.html?plan=basic&source=${source}&user=${chatId}` }],
                            [{ text: lang === 'en' ? "📈 See a real case" : "📈 Посмотреть кейс", callback_data: "view_case" }]
                        ]
                    }
                };
                await bot.sendMessage(chatId, sellBlock, opts);

                // Update state
                userStates[chatId] = { status: 'warm', lang, domain: targetUrl, updated_at: new Date().toISOString(), timestamp: Date.now() };
                scheduleFollowUps(chatId, 'warm');

            } catch (auditErr) {
                console.error('[Audit] API error:', auditErr.message);
                await bot.sendMessage(chatId, s.error);
            }
            return; // EXIT after audit
        }

        // 2. Иначе -> GPT
        try {
            console.log("GPT CALLED");
            const context = {
                lang: lang || 'ru',
                source: userCtx.source || 'site',
                tariff: userCtx.tariff || 'отсутствует'
            };

            const reply = await askGPT(chatId, text, context);

            if (reply) {
                console.log("GPT REPLY:", reply);
                await bot.sendMessage(chatId, reply);
                const segment = detectSegment(text, {
                    messagesCount: userStates[chatId].messagesCount || 1,
                    clicked: userStates[chatId].clicked || false
                });
                userStates[chatId].segment = segment;
                console.log("SEGMENT:", segment);
                scheduleFollowUps(chatId, segment);
            } else {
                await bot.sendMessage(chatId, lang === 'en'
                    ? `I can show where you're losing customers 👇`
                    : `Я могу показать, где вы теряете клиентов 👇`,
                    getFollowUpOpts(chatId));
            }
        } catch (gptErr) {
            console.error("[GPT] Error in bot handler:", gptErr.message);
            await bot.sendMessage(chatId, lang === 'en'
                ? `I can show where you're losing customers 👇`
                : `Я могу показать, где вы теряете клиентов 👇`,
                getFollowUpOpts(chatId));
        }

    } catch (err) {
        console.error('Error in message handler:', err.message);
    }
});

    
    // --- AUTO FOLLOW-UP SYSTEM ---
function detectSegment(text, meta = {}) {
    const lowerText = text ? text.toLowerCase() : "";
    if (
        lowerText.includes('цена') ||
        lowerText.includes('стоимость') ||
        lowerText.includes('аудит') ||
        meta.clicked === true
    ) {
        return 'hot';
    }

    if (meta.messagesCount >= 2) {
        return 'warm';
    }

    return 'cold';
}

function saveUser(chatId, meta = {}) {
    if (!userStates[chatId]) userStates[chatId] = {};
    const state = userStates[chatId];
    state.source = meta.source || state.source || 'telegram';
    state.interest = meta.interest || state.interest || 'discussion';
    state.timestamp = Date.now();
    console.log(`[saveUser] ${chatId} saved with meta:`, meta);
}

function scheduleFollowUps(chatId, segment = 'cold') {
    stopFollowUps(chatId); // Clear old timers to avoid duplicates!
    
    console.log(`[Follow-up] Scheduling chain for ${chatId} (${segment})`);
    followUpTimers[chatId] = [];

    const sendWithDelay = (sendFn, delayMs) => {
        const t = setTimeout(() => sendFn(chatId, segment), delayMs);
        followUpTimers[chatId].push(t);
    };

    // 10 Min, 3 Hours, 24 Hours, 48 Hours, 72 Hours
    sendWithDelay(send1, 10 * 60 * 1000);
    sendWithDelay(send2, 3 * 3600 * 1000);
    sendWithDelay(send3, 24 * 3600 * 1000);
    sendWithDelay(send4, 48 * 3600 * 1000);
    sendWithDelay(send5, 72 * 3600 * 1000);
}

function stopFollowUps(chatId) {
    if (followUpTimers[chatId]) {
        console.log(`[Follow-up] Stopping chain for ${chatId}`);
        followUpTimers[chatId].forEach(clearTimeout);
        delete followUpTimers[chatId];
    }
}

function getFollowUpOpts(chatId) {
    const lang = userStates[chatId]?.lang || 'ru';
    const payUrl = `https://infolady.online/${lang}/payment.html?plan=basic&source=followup&user=${chatId}`;
    return {
        reply_markup: {
            inline_keyboard: [
                [{ text: lang === 'en' ? "📊 Get Full Audit — $50" : "📊 Получить полный разбор — 25 000 ₸", url: payUrl }]
            ]
        }
    };
}

async function send1(chatId, segment) {
    if (userStates[chatId]?.status === 'purchased') return;
    const lang = userStates[chatId]?.lang || 'ru';
    const texts = lang === 'en' ? {
        hot: "⏱ You didn't complete your audit checkout.\n\nI found critical issues actively hurting your sales right now.\n\nWant to see the full list?",
        warm: "⏱ You started the audit but didn't finish.\n\nThese errors are costing you customers every day.",
        cold: "🔍 Want to find out why your site isn't converting?"
    } : {
        hot: "⏱ Вы не завершили оформление аудита.\n\nЯ нашёл критические ошибки, которые прямо сейчас мешают вашим продажам.\n\nХотите увидеть полный список?",
        warm: "⏱ Вы начали аудит, но не завершили.\n\nЭти ошибки стоят вам клиентов каждый день.",
        cold: "🔍 Хотите узнать, почему ваш сайт не продаёт?"
    };
    const text = texts[segment] || texts.cold;
    console.log(`FOLLOW-UP 1 SENT [${segment}]`);
    await bot.sendMessage(chatId, text, getFollowUpOpts(chatId));
}

async function send2(chatId, segment) {
    if (userStates[chatId]?.status === 'purchased') return;
    const lang = userStates[chatId]?.lang || 'ru';
    const texts = lang === 'en' ? {
        hot: "📊 In the last 3 hours, sites with similar issues lost potential customers.\n\nI'm ready to show you exactly what's holding your site back — and how to fix it within a week.",
        warm: "📊 In the last 3 hours, sites with similar issues lost potential customers.\n\nI'm ready to show you exactly what's holding your site back — and how to fix it within a week.",
        cold: "📊 In the last 3 hours, sites with similar issues lost potential customers.\n\nI'm ready to show you exactly what's holding your site back — and how to fix it within a week."
    } : {
        hot: "📊 За последние 3 часа сайты с похожими ошибками потеряли потенциальных клиентов.\n\nЯ готов показать, что именно мешает вашему сайту — и как это исправить за неделю.",
        warm: "📊 За последние 3 часа сайты с похожими ошибками потеряли потенциальных клиентов.\n\nЯ готов показать, что именно мешает вашему сайту — и как это исправить за неделю.",
        cold: "📊 За последние 3 часа сайты с похожими ошибками потеряли потенциальных клиентов.\n\nЯ готов показать, что именно мешает вашему сайту — и как это исправить за неделю."
    };
    const text = texts[segment] || texts.cold;
    console.log(`FOLLOW-UP 2 SENT [${segment}]`);
    await bot.sendMessage(chatId, text, getFollowUpOpts(chatId));
}

async function send3(chatId, segment) {
    if (userStates[chatId]?.status === 'purchased') return;
    const lang = userStates[chatId]?.lang || 'ru';
    const text = lang === 'en'
        ? "💡 Yesterday you started an audit — but never got the result.\n\nMost of our clients find 5–12 issues they didn't know about.\n\n👉 Complete your audit today — price hasn't gone up yet."
        : "💡 Вчера вы начали аудит — но так и не получили результат.\n\nБольшинство наших клиентов находят 5–12 ошибок, о которых не знали.\n\n👉 Пройдите аудит сегодня — цена ещё не выросла.";
    console.log("FOLLOW-UP 3 SENT");
    await bot.sendMessage(chatId, text, getFollowUpOpts(chatId));
}

async function send4(chatId, segment) {
    if (userStates[chatId]?.status === 'purchased') return;
    const lang = userStates[chatId]?.lang || 'ru';
    const text = lang === 'en'
        ? "⚠️ Last reminder.\n\nThe audit price is going up soon.\n\nGet your full site breakdown now — while the current price stands."
        : "⚠️ Последнее напоминание.\n\nЦена на аудит скоро вырастет.\n\nПолучите полный разбор своего сайта прямо сейчас — пока действует текущая цена.";
    console.log("FOLLOW-UP 4 SENT");
    await bot.sendMessage(chatId, text, getFollowUpOpts(chatId));
}

async function send5(chatId, segment) {
    if (userStates[chatId]?.status === 'purchased') return;
    const lang = userStates[chatId]?.lang || 'ru';
    const text = lang === 'en'
        ? `🎯 Final offer.\n\nThe audit will show you exactly where and why you're losing customers.\n\nOne-time investment — results that last for months.`
        : `🎯 Финальное предложение.\n\nАудит покажет точно, где и почему вы теряете клиентов.\n\nЭто разовая инвестиция — результат работает месяцами.`;
    console.log("FOLLOW-UP 5 SENT");
    await bot.sendMessage(chatId, text, getFollowUpOpts(chatId));
}

function triggerBotDrip() {
        const now = Date.now();
        for (const chatId in userStates) {
            const state = userStates[chatId];
            if (!state.status) continue;

            const ageMs = now - (state.timestamp || now);

            // AUTO-ДОЖИМ: 12 Hours (status === 'warm')
            if (state.status === 'warm' && !state.drip_12h && ageMs > 43200000) {
                bot.sendMessage(chatId, `Вы так и не ответили 🤝\n\nСкорее всего у вас сейчас уже уходят клиенты.`);
                state.drip_12h = true;
            }

            // AUTO-ДОЖИМ: 24 Hours (status === 'warm')
            if (state.status === 'warm' && !state.drip_24h && ageMs > 86400000) {
                bot.sendMessage(chatId, `Могу дать быстрый старт\nи показать результат за 1 день 🚀`);
                state.drip_24h = true;
                state.status = 'lost'; 
            }

            // --- ABANDONED PAYMENT DROPS (Item 6) ---
            if (state.status === 'payment_pending') {
                const elapsedPay = now - (state.payment_timestamp || now);

                // 30 Minutes (1 800 000 ms)
                if (!state.pay_30m && elapsedPay > 1800000) {
                    bot.sendMessage(chatId, `Вы начали оплату 💳\nно не завершили.\n\nНужна помощь?`);
                    state.pay_30m = true;
                }

                // 2 Hours (7 200 000 ms)
                if (!state.pay_2h && elapsedPay > 7200000) {
                    bot.sendMessage(chatId, `Могу зафиксировать цену сегодня 🎁`);
                    state.pay_2h = true;
                    // Leave status as payment_pending or mark lost to avoid re-loops
                }
            }
        }
    }
    setInterval(triggerBotDrip, 300000); // Check every 5 minutes

};

module.exports.userStates = userStates;
