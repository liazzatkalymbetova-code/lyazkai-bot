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
        upsell: `Хочешь узнать, как исправить ошибки и привлечь больше клиентов?\n\n✔ Ключевые ошибки\n✔ Слабые места\n✔ Первые рекомендации\n\n👇 Получить полный отчёт`,
        upsellBtn: '📄 Получить полный отчёт',
        auditResults: '🔍 *Результаты аудита:*',
        seoScore: 'SEO-рейтинг',
        aiScore: 'AI-видимость',
        bestPractices: 'Лучшие практики',
        mainIssues: 'Главные проблемы',
        noIssues: '• Данные недоступны',
        verdict: '⚠️ *Вывод:* Клиенты могут уходить к конкурентам прямо сейчас.',
        error: '⚠️ Не удалось проанализировать сайт. Проверь ссылку и попробуй ещё раз.',
        link: 'Откройте полный анализ',
        followUp: `Ваш отчёт готов.\nНо там скрыты ключевые точки роста.\n\n👇 Открыть полный анализ`,
        followUpBtn: 'Открыть полный анализ'
    },
    en: {
        greet: `Hello! 👋\n\nI will scan your website and show you where issues are hiding that block sales.\n\n👇 **Send your link (e.g., mysite.com) right now!**`,
        analyzing: 'Analyzing... ⏳',
        success: 'Done 👇 Here is your analysis',
        upsell: `Want to find out how to fix issues and solve customer dropoffs?\n\n✔ Key issues\n✔ Hidden leaks\n✔ First tips\n\n👇 Get Full Report`,
        upsellBtn: '📄 Get Full Report',
        auditResults: '🔍 *Audit Results:*',
        seoScore: 'SEO Rating',
        aiScore: 'AI Visibility',
        bestPractices: 'Best Practices',
        mainIssues: 'Main Issues',
        noIssues: '• Data not available',
        verdict: '⚠️ *Verdict:* Customers may be leaving to competitors right now.',
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
            userStates[chatId].status = 'paid';
            if (typeof stopFollowUps === 'function') {
                stopFollowUps(chatId);
            }
            console.log(`[Payment] ${chatId} status set to paid.`);
            try {
                await bot.sendMessage(chatId, `🎉 Спасибо за оплату! Начинаю глубокий разбор вашего сайта.`);
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

        sendWelcome(chatId, data);

        scheduleFollowUps(chatId, data.segment);

    } catch (err) {
        console.error('Error in /start handler:', err.message);
    }
});

function parseStart(start) {
    const parts = decodeURIComponent(start || '').split('_');
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
    const s = strings[data.lang || 'ru'] || strings['ru'];
    if (data.source === 'site') {
        await bot.sendMessage(chatId, `Я посмотрел ваш сайт 👇\nЕсть ошибки, из-за которых вы теряете клиентов.`);
        setTimeout(async () => {
            await bot.sendMessage(chatId, `У вас есть трафик 📈\nно заявок меньше, чем может быть.`);
        }, 2000);
    } else {
        await bot.sendMessage(chatId, s.greet || "Привет! 👋 Отправь ссылку на свой сайт.");
    }
}


bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    if (userStates[chatId]) {
        userStates[chatId].clicked = true;
    }

    const data = query.data;

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
        const text = `💰 **Наши Тарифы:**\n\n` +
                     `— **Базовый (25 000 ₸ / 50$):** Краткий аудит ошибок\n` +
                     `— **Стандарт (50 000 ₸ / 100$):** Пошаговый план роста\n` +
                     `— **Премиум (150 000 ₸ / 300$):** Индивидуальный разбор\n\n` +
                     `👉 **Ссылка на оплату:** https://infolady.online/payment.html?user=${chatId}`;
        await bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
        
        if (userStates[chatId]) userStates[chatId].status = 'interested';
    }

    if (data === 'view_case') {
        const text = `📈 **Кейс: Рост заявок на 40% за 1 неделю**\n\n` +
                     `**Проблема:** Страница услуг теряла клиентов из-за сложной формы.\n` +
                     `**Решение:** Упростили форму до 1 поля, добавили блок доверия.\n` +
                     `**Результат:** Заявки выросли в 1.4 раза 🚀\n\n` +
                     `Хотите также? Напишите "хочу"!`;
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

                const summary = buildSummary(data, lang);
                await bot.sendMessage(chatId, summary, { parse_mode: 'Markdown' });

                const reportLink = `https://infolady.online/${lang}/report.html?user=${chatId}`;
                await bot.sendMessage(chatId, `${s.success}\n${reportLink}`);

                const sellBlock = s.upsell;
                const opts = {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: s.upsellBtn, url: `https://infolady.online/${lang}/payment.html?plan=basic&source=${source}&user=${chatId}` }]
                        ]
                    }
                };
                await bot.sendMessage(chatId, sellBlock, opts);

                setTimeout(async () => {
                     const reviewMsg = `Я посмотрел 👀\n\nУ вас:\n❌ нет захвата\n❌ слабый оффер\n❌ нет доверия\n\nЭто можно быстро исправить 📈`;
                     await bot.sendMessage(chatId, reviewMsg);
                     userStates[chatId] = { status: 'warm', updated_at: new Date().toISOString(), timestamp: Date.now() };
                }, 5000);

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
            scheduleFollowUps(chatId, segment); // Start segmented follow-up chain
            } else {
                await bot.sendMessage(chatId, `Я могу показать, где вы теряете клиентов 👇`);
            }
        } catch (gptErr) {
            console.error("[GPT] Error in bot handler:", gptErr.message);
            await bot.sendMessage(chatId, `Я могу показать, где вы теряете клиентов 👇`);
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

const followUpOpts = {
    reply_markup: {
        inline_keyboard: [
            [{ text: "📊 Получить разбор", callback_data: "get_audit" }]
        ]
    }
};

async function send1(chatId, segment) {
    if (userStates[chatId]?.status === 'purchased') return;
    
    const texts = {
        hot: "Ты уже близко 👇\n\nЯ могу сразу показать,\nгде именно ты теряешь деньги\n\nГотов разобрать?",
        warm: "Я вижу ты уже смотришь 👇\n\nУ тебя типичная ситуация:\nсайт есть — заявок нет\n\nХочешь объясню почему?",
        cold: "Быстро глянул твой сайт 👇\n\nЕсть пара моментов,\nкоторые режут конверсию\n\nПоказать?"
    };

    const text = texts[segment] || texts.cold;
    console.log(`FOLLOW-UP 1 SENT [${segment}]`);
    await bot.sendMessage(chatId, text, followUpOpts);
}

async function send2(chatId, segment) {
    if (userStates[chatId]?.status === 'purchased') return;

    const texts = {
        hot: "Смотри, без разбора ты продолжаешь терять заявки\n\nЭто не теория — это видно по твоему сайту\n\nДавай покажу",
        warm: "Проблема не в трафике\n\nПроблема в том,\nкак сайт продаёт\n\nРазобрать?",
        cold: "Часто проблема не очевидна\n\nНо именно из-за неё нет клиентов\n\nМогу показать на примере"
    };

    const text = texts[segment] || texts.cold;
    console.log(`FOLLOW-UP 2 SENT [${segment}]`);
    await bot.sendMessage(chatId, text, followUpOpts);
}

async function send3(chatId, segment) {
    if (userStates[chatId]?.status === 'purchased') return;
    console.log("FOLLOW-UP 3 SENT");
    await bot.sendMessage(chatId, "Пока ты думаешь — клиенты уходят\n\nКонкуренты просто сделали сайт понятнее\n\nИ забирают твой трафик\n\nХочешь покажу где именно?", followUpOpts);
}

async function send4(chatId, segment) {
    if (userStates[chatId]?.status === 'purchased') return;
    console.log("FOLLOW-UP 4 SENT");
    await bot.sendMessage(chatId, "Недавно был похожий сайт\n\nПосле правок:\n+ заявки выросли в 2 раза\n\nПричина — те же ошибки\n\nРазобрать твой?", followUpOpts);
}

async function send5(chatId, segment) {
    if (userStates[chatId]?.status === 'purchased') return;
    console.log("FOLLOW-UP 5 SENT");
    await bot.sendMessage(chatId, `Сделаем просто:

Покажу:
— где теряешь клиентов
— что исправить
— как увеличить заявки

Без воды

Готов?`, followUpOpts);
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
