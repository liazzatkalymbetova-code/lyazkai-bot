const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

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
function buildSummary(data) {
    const seo = data.seoScore || 0;
    const geo = data.geoScore || 0;
    const ai  = data.aiScore  || 0;

    const scoreBar = (score) => {
        if (score >= 80) return '🟢';
        if (score >= 50) return '🟡';
        return '🔴';
    };

    const topIssues = (data.issues || []).slice(0, 3)
        .map(i => `• ${i.title}`)
        .join('\n');

    return (
`🔍 *Результаты аудита:*

${scoreBar(seo)} SEO-рейтинг: *${seo}/100*
${scoreBar(geo)} AI-видимость: *${geo}/100*
${scoreBar(ai)} Лучшие практики: *${ai}/100*

*Главные проблемы:*
${topIssues || '• Данные недоступны'}

⚠️ *Вывод:* Клиенты могут уходить к конкурентам прямо сейчас.`
    );
}

module.exports = function(app) {
    if (!bot) {
        console.warn("⚠️ Skipping Telegram Bot routes initialization because bot is null.");
        return;
    }

    // 2. Webhook Route
    app.post('/webhook', (req, res) => {
        bot.processUpdate(req.body);
        res.sendStatus(200);
    });






// 1. START MESSAGE
bot.onText(/\/start(?:\s+(.+))?/, (msg, match) => {
    try {
        const chatId = msg.chat.id;
        const startParam = match[1] || 'telegram';
        let source = startParam.replace('scan_', '');
        
        // Save source tracking
        userSources[chatId] = source;

        console.log(`[/start] User ${chatId} from source: ${source}`);

        
    // 1.1 TEST MESSAGE
    bot.onText(/\/test_webhook/, (msg) => {
        bot.sendMessage(msg.chat.id, "Привет! Я работаю");
    });
        const greetText = 
`Привет! 👋

Я просканирую твой сайт и покажу, где скрываются ошибки, мешающие продажам.

👇 **Отправь ссылку (например, mysite.com) прямо сейчас!**`;

        bot.sendMessage(chatId, greetText);
    } catch (err) {
        console.error("Error in /start handler:", err.message);
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

        const source = userSources[chatId] || 'telegram';
        const lowerText = text.toLowerCase().trim();

        const currentState = userStates[chatId];

        // --- Lead Capture Answer Interceptor ---
        if (currentState && currentState.step === 'awaiting_lead_info') {
            userStates[chatId] = { step: 'finished', answers: text };
            console.log(`[Lead] User ${chatId} answers: ${text}`);
            
            bot.sendMessage(chatId, "Супер, тебе это идеально подходит.\nЯ сейчас объясню, как можно начать уже сегодня");
            
            setTimeout(() => {
                const plan = `📝 **Твой пошаговый план:**\n\n` +
                `1️⃣ **Упаковка:** Оформи профиль так, чтобы он продавал за тебя.\n` +
                `2️⃣ **Контент с ИИ:** Генерируй сценарии Reels и посты за 15 минут в день.\n` +
                `3️⃣ **Трафик:** Настрой автоматическую воронку в Telegram.\n\n` +
                `👉 **Напиши мне в личку "ХОЧУ СТАРТ", чтобы забрать готовые шаблоны:** https://t.me/your_username`;
                bot.sendMessage(chatId, plan, { parse_mode: 'Markdown' });
            }, 1500);
            return;
        }

        if (lowerText.includes('привет') || lowerText === 'тест') {
            return bot.sendMessage(chatId, "Привет! Я работаю");
        }

        // 1. КОНТЕНТ / ПОСТ
        // 4. ДА (Воронка продаж)
        if (lowerText === 'да' || lowerText === 'да!') {
            // Read updated currentState references
            const cur = userStates[chatId];
            if (!cur) {
                userStates[chatId] = { step: 'awaiting_lead_info' };
                const promptQs = `Напиши, пожалуйста:
1. Есть ли у тебя Instagram?
2. Хочешь для себя или на продажу?`;
                return bot.sendMessage(chatId, promptQs);
            } else if (cur.step === 'asked_details') {
                userStates[chatId] = { step: 'finished', answers: cur.answers };
                return bot.sendMessage(chatId, "Напиши мне в личку или перейди сюда: https://t.me/your_username");
            }
        }

        if (lowerText === 'контент' || lowerText === 'пост') {
            const post = `🌸 **Твой пост готов!**\n\n` +
`**Тема: Искусство маленьких шагов в саморазвитии**\n\n` +
`Часто мы думаем, что перемены — это что-то глобальное. Начать бегать по 10 км, выучить язык за месяц... В итоге мы выгораем и бросаем.\n\n` +
`💡 **Секрет в микро-шагах:**\n` +
`- 5 страниц книги перед сном — это 150 страниц в месяц.\n` +
`- 10 минут зарядки — это бодрость на весь день, а не боль в мышцах.\n` +
`- Один стакан воды утром — это минус отечность и плюс сияние кожи.\n\n` +
`Перестань ждать понедельника. Начни прямо сейчас, с одной маленькой вещи, которая сделает тебя счастливее сегодня. Пиши в комментариях: какой твой шаг будет сегодня? 👇

👀 **Хочешь такие же сочные посты каждый день без выгорания? Напиши мне "да"**`;
            return bot.sendMessage(chatId, post, { parse_mode: 'Markdown' });
        }

        // 2. ИДЕЯ
        if (lowerText === 'идея') {
            const ideas = `💡 **5 взрывных идей для твоего Instagram:**\n\n` +
`1️⃣ **До/После:** Покажи свою точку А (например, год назад) и точку Б. Искренность всегда собирает охваты.\n` +
`2️⃣ **Секретный плагин/приложение:** Расскажи про 1 сервис, который экономит тебе 2 часа в день (например, Canva или Notion шаблоны).\n` +
`3️⃣ **Разрушение мифа:** «Все думают, что [твоя ниша] — это легко, но на самом деле...».\n` +
`4️⃣ **Один день со мной:** В ускоренном формате (Reels) покажи свою утреннюю рутину или рабочие будни. Эстетика + польза.\n` +
`5️⃣ **Отказ от привычки:** Расскажи, от чего ты отказалась (кофе, токсичные люди, лень) и как это изменило твою жизнь.

👀 **Хочешь готовый контент-план на месяц за 5 минут? Напиши мне "да"**`;
            return bot.sendMessage(chatId, ideas, { parse_mode: 'Markdown' });
        }

        // 3. ЗАРАБОТОК
        if (lowerText === 'заработок' || lowerText.includes('деньги')) {
            const advice = `💰 **Как выйти на доход онлайн сегодня?**\n\n` +
`Самый быстрый путь сейчас — это **создание востребованного контента** + автоматизация через **ИИ (AI)**.\n\n` +
`Вы можете вести блог, быть менеджером аккаунтов или создавать AI-аватаров для брендов.\n\n` +
`**Хочешь, я покажу как зарабатывать через AI и контент?**

🔥 **Могу показать пошагово, как запустить такой же бот и начать зарабатывать 100–300$ в день.** Заманчиво? Напиши "да"**`;
            return bot.sendMessage(chatId, advice);
        }


    // ── URL / Instagram audit flow ──────────────────────────────────────────
    if (!isUrl(lowerText)) return; // non-URL messages fall through silently

    const targetUrl = normalizeUrl(text);
    await bot.sendMessage(chatId, 'Анализирую... ⏳');

    try {
        const port = process.env.PORT || 3000;
        const apiRes = await axios.get(
            `http://localhost:${port}/api/scan?url=${encodeURIComponent(targetUrl)}`,
            { timeout: 15000 }
        );
        const data = apiRes.data;

        // 1. Short real-data summary
        const summary = buildSummary(data);
        await bot.sendMessage(chatId, summary, { parse_mode: 'Markdown' });

        // 2. Report link — required message
        const reportLink = `https://infolady.online/ru/report.html?user=${chatId}`;
        await bot.sendMessage(
            chatId,
            `Готово 👇 Вот твой анализ\n${reportLink}`
        );

        // 3. Upsell button
        const sellBlock =
`Хочешь узнать, как исправить ошибки и привлечь больше клиентов?

✔ Ключевые ошибки
✔ Слабые места
✔ Первые рекомендации

👇 Получить полный отчёт`;

        const opts = {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '📄 Получить полный отчёт', url: `https://infolady.online/ru/payment.html?plan=basic&source=${source}` }
                    ]
                ]
            }
        };
        await bot.sendMessage(chatId, sellBlock, opts);

        // 4. Follow-up after 20 minutes
        setTimeout(async () => {
            const followUp =
`Ваш отчёт готов.
Но там скрыты ключевые точки роста.

👇 Открыть полный анализ`;

            const upsellOpts = {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: 'Открыть полный анализ', url: `https://infolady.online/ru/payment.html?plan=standard&source=${source}` }
                        ]
                    ]
                }
            };
            await bot.sendMessage(chatId, followUp, upsellOpts);
        }, 1200000); // 20 minutes

    } catch (auditErr) {
        console.error('[Audit] API error:', auditErr.message);
        await bot.sendMessage(
            chatId,
            '⚠️ Не удалось проанализировать сайт. Проверь ссылку и попробуй ещё раз.'
        );
    }

    } catch (err) {
        console.error('Error in message handler:', err.message);
    }
});

};
