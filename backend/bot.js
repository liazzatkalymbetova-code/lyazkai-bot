const TelegramBot = require('node-telegram-bot-api');
const dotenv = require('dotenv');

dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
    console.error("CRITICAL: TELEGRAM_BOT_TOKEN is missing from .env file.");
    process.exit(1);
}

const bot = new TelegramBot(token, { polling: false });

// In-memory state to track sources
const userSources = {};

module.exports = function(app) {
    // 2. Webhook Route
    app.post(`/bot${token}`, (req, res) => {
        bot.processUpdate(req.body);
        res.sendStatus(200);
    });




console.log("🚀 Telegram Bot is running in polling mode...");

// 1. START MESSAGE
bot.onText(/\/start(?:\s+(.+))?/, (msg, match) => {
    try {
        const chatId = msg.chat.id;
        const startParam = match[1] || 'telegram';
        let source = startParam.replace('scan_', '');
        
        // Save source tracking
        userSources[chatId] = source;

        console.log(`[/start] User ${chatId} from source: ${source}`);

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
