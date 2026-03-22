const axios = require('axios');

async function sendTelegramAlert(text) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
        console.warn("[TELEGRAM] Missing TOKEN or CHAT_ID. Notification skipped.");
        return;
    }

    try {
        await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
            chat_id: chatId,
            text: text,
            parse_mode: 'Markdown'
        });
        console.log(`[TELEGRAM] Alert sent successfully`);
    } catch (err) {
        console.error('[TELEGRAM] Error sending alert:', err.message);
    }
}

function sendLeadAlert(lead) {
    const text = `🔥 *Новый лид*\n` +
                 `📧 *Email:* ${lead.email}\n` +
                 `🌐 *Сайт:* ${lead.scanned_domain || lead.domain || 'не указан'}\n` +
                 `🌍 *Язык:* ${lead.language || 'en'}\n` +
                 `📦 *Тариф:* ${lead.tariff || 'отсутствует'}`;
                 
    return sendTelegramAlert(text);
}

function sendPaymentAlert(payment) {
    const text = `🔥 *Новый оплаченный клиент*\n\n` +
                 `📧 *Email:* ${payment.email}\n` +
                 `🌐 *Сайт:* ${payment.domain || 'не указан'}\n` +
                 `📦 *Тариф:* ${payment.tariff || 'отсутствует'}\n` +
                 `🔌 *Источник:* ${payment.source || 'неизвестно'}\n\n` +
                 `✅ *Готов к работе*`;
                 
    return sendTelegramAlert(text);
}

function sendWarmMessage(lead, stepCode) {
    const steps = {
        '5m':  `⏳ *Прогрев (Шаг 1 - 5 минут)*\n📧 *Email:* ${lead.email}\n💬 "Я посмотрел ваш сайт. Есть ошибки, которые режут заявки"`,
        '30m': `⏳ *Прогрев (Шаг 2 - 30 минут)*\n📧 *Email:* ${lead.email}\n💬 "Вы теряете клиентов даже при хорошем трафике"`,
        '2h':  `⏳ *Прогрев (Шаг 3 - 2 часа)*\n📧 *Email:* ${lead.email}\n💬 "Это можно исправить за 1-2 дня"`,
        '24h': `⏳ *Прогрев (Шаг 4 - 24 часа)*\n📧 *Email:* ${lead.email}\n💬 "Могу разобрать лично — напишите 👇"`,
        'lost': `⚠️ *Дожим (-20% Скидка)*\n📧 *Email:* ${lead.email}\n💬 "Дам скидку -20% сегодня, если напишите 👇"`
    };
    
    const text = steps[stepCode] || `⏳ *Прогрев (${stepCode})*\n📧 *Email:* ${lead.email}`;
    return sendTelegramAlert(text);
}

module.exports = {
    sendLeadAlert,
    sendWarmMessage,
    sendPaymentAlert
};
