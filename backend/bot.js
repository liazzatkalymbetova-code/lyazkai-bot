const TelegramBot = require('node-telegram-bot-api');
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
Проверю ваш сайт и покажу ошибки, из-за которых вы теряете клиентов.

Отправьте ссылку 👇`;

        bot.sendMessage(chatId, greetText);
    } catch (err) {
        console.error("Error in /start handler:", err.message);
    }
});

// 2. HANDLE USER INPUT (URL)
bot.on('message', (msg) => {
    try {
        const chatId = msg.chat.id;
        const text = msg.text;

        if (!text) return;
        console.log(`[Message] ${chatId}: ${text}`);

        if (text.startsWith('/')) return; // Ignore commands

        const source = userSources[chatId] || 'telegram';
        const lowerText = text.toLowerCase().trim();

        if (lowerText.includes('привет') || lowerText === 'тест') {
            return bot.sendMessage(chatId, "Привет! Я работаю");
        }

        // 1. КОНТЕНТ / ПОСТ
        // 4. ДА (Воронка продаж)
        if (lowerText === 'да' || lowerText === 'да!') {
            const currentState = userStates[chatId];
            if (!currentState) {
                userStates[chatId] = 'asked_details';
                return bot.sendMessage(chatId, "Я помогаю женщинам запустить доход через AI и Telegram. Хочешь подробности?");
            } else if (currentState === 'asked_details') {
                userStates[chatId] = 'finished';
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
`Перестань ждать понедельника. Начни прямо сейчас, с одной маленькой вещи, которая сделает тебя счастливее сегодня. Пиши в комментариях: какой твой шаг будет сегодня? 👇`;
            return bot.sendMessage(chatId, post, { parse_mode: 'Markdown' });
        }

        // 2. ИДЕЯ
        if (lowerText === 'идея') {
            const ideas = `💡 **5 взрывных идей для твоего Instagram:**\n\n` +
`1️⃣ **До/После:** Покажи свою точку А (например, год назад) и точку Б. Искренность всегда собирает охваты.\n` +
`2️⃣ **Секретный плагин/приложение:** Расскажи про 1 сервис, который экономит тебе 2 часа в день (например, Canva или Notion шаблоны).\n` +
`3️⃣ **Разрушение мифа:** «Все думают, что [твоя ниша] — это легко, но на самом деле...».\n` +
`4️⃣ **Один день со мной:** В ускоренном формате (Reels) покажи свою утреннюю рутину или рабочие будни. Эстетика + польза.\n` +
`5️⃣ **Отказ от привычки:** Расскажи, от чего ты отказалась (кофе, токсичные люди, лень) и как это изменило твою жизнь.`;
            return bot.sendMessage(chatId, ideas, { parse_mode: 'Markdown' });
        }

        // 3. ЗАРАБОТОК
        if (lowerText === 'заработок' || lowerText.includes('деньги')) {
            const advice = `💰 **Как выйти на доход онлайн сегодня?**\n\n` +
`Самый быстрый путь сейчас — это **создание востребованного контента** + автоматизация через **ИИ (AI)**.\n\n` +
`Вы можете вести блог, быть менеджером аккаунтов или создавать AI-аватаров для брендов.\n\n` +
`**Хочешь, я покажу как зарабатывать через AI и контент?**`;
            return bot.sendMessage(chatId, advice);
        }


    // Treat as website URL
    bot.sendMessage(chatId, "Анализирую сайт... ⏳");

    // Wait 2–3 seconds (simulate analysis)
    setTimeout(() => {
        
        // 3. SEND ANALYSIS RESULT
        const analysisResult = 
`Нашёл проблемы:

❌ теряете заявки  
❌ слабая конверсия  
❌ сайт не виден в поиске  
❌ нет AI-оптимизации  

⚠️ вы теряете деньги`;

        bot.sendMessage(chatId, analysisResult);

        // 4. SELL BLOCK
        // Wait slightly before pitching
        setTimeout(() => {
            const sellBlock = 
`Я сделал базовый аудит вашего сайта.

Вы увидите:
✔ ключевые ошибки  
✔ слабые места  
✔ первые рекомендации  

👇 Получить базовый отчёт`;

            const opts = {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: "Получить базовый отчёт", url: "https://infolady.online/ru/payment.html?plan=basic&source=" + source + "" }
                        ]
                    ]
                }
            };

            bot.sendMessage(chatId, sellBlock, opts);

                        // 6. FOLLOW-UP MESSAGE (DELAY 20 Minutes)
            setTimeout(() => {
                const followUp = 
`Ваш отчёт готов.  
Но там скрыты ключевые точки роста.

👇 Открыть полный анализ`;

                // Update opts URL to standard for Upsell inside follow-up
                const upsellOpts = {
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: "Открыть полный анализ", url: `https://infolady.online/ru/payment.html?plan=standard&source=${source}` }
                            ]
                        ]
                    }
                };

                bot.sendMessage(chatId, followUp, upsellOpts);
            }, 1200000); // 20 минут (20 * 60 * 1000)

        }, 1500);

    }, 2500);
    } catch (err) {
        console.error("Error in message handler:", err.message);
    }
});

};
