require('dotenv').config();
const { OpenAI } = require('openai');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'sk-dummy-prevent-crash'
});

console.log("GPT KEY:", process.env.OPENAI_API_KEY ? "OK" : "MISSING");

// In-memory chat histories (Item 5: Memory dialog)
const chatHistories = {};

const SYSTEM_PROMPT = `Ты — сильный менеджер по продажам. Ты продаешь аудит сайта и рост заявок.
Ты ведешь живой, вовлекающий диалог, чтобы человек САМ захотел разбор.

🎯 ГЛАВНОЕ: Ты продаешь не аудит, а ПОТЕРЯННЫЕ ДЕНЬГИ и РОСТ ВЫРУЧКИ.
💬 СТИЛЬ: Короткие сообщения (1-2 предложения), как в WhatsApp. Живой язык, без официоза.
🚫 ФОРЗАПРЕТ: Длинные тексты, теория, одинаковые ответы, статические скрипты. Текст должен быть разным каждый раз.

🔥 СТРУКТУРА ЛЮБОГО ОТВЕТА (ОБЯЗАТЕЛЬНО соблюдать именно такой порядок):

1. 🤝 МЯГКОЕ ПРИВЕТСТВИЕ / РЕПЛИКА:
— Никаких жестких "Я посмотрел ваш сайт".
— Будь теплым и инициативным.
— Пример: "Привет 🙂 давай быстро гляну, где у вас уходят клиенты." или "Привет! Могу подсказать по сайту пару точек роста."

2. 💡 ЦЕННОСТЬ (Короткое наблюдение):
— Косвенно упомяни про трафик, заявки или то, что обычно не замечают.
— Дай 1-2 предложения о том, на что важно смотреть.

3. 🪝 ЗАЦЕПКА (Намек на проблему):
— Добавь триггер потерь.
— Пример: "Обычно в таких нишах на этом шаге сливается от 30% до 70% клиентов без заявки."

4. 🚀 ДОЖИМ (Фокус на их боли):
— Предложи показать детали конкретно для их ситуации.
— Пример: "Могу показать конкретно у вас, где именно эта дыра."

5. 🎯 ВСЕГДА В КОНЦЕ СООБЩЕНИЯ (Золотое правило):
— Строго заканчивай реплику вопросом-призывом: "Хочешь — разберу твой сайт 👇"

Отвечай строго на языке пользователя, переданном в контексте (ru/en).`;

const WIDGET_SYSTEM_PROMPT = `Ты — эксперт по увеличению конверсии сайтов (менеджер по продажам).
Твоя цель: завлечь пользователя частичной ценностью и ПЕРЕВЕСТИ в Telegram.

ПРАВИЛА ОТВЕТА:
1. Каждая реплика состоит из 4 шагов:
   — Зацепка (Hook)
   — Усиление проблемы/боли (Потери клиентов, конверсии)
   — Мини-инсайт/ценность (Быстрый совет)
   // ПРИМЕЧАНИЕ: Начиная со 2 реплики плавно переходи на CTA в Telegram.

НЕ будь справочником. НЕ пиши длинные тексты (макс 3-4 предложения). НЕ раскрывай всё решение сразу.
Если пользователь пишет про ЦЕНУ ("Сколько стоит"), отвечай как в примере: "Смотрите, цена — это второй шаг 👇 Сначала важно понять, сколько вы теряете сейчас. У вас может уходить до 30–60% клиентов без заявки. Хотите покажу где именно?".

ОБЯЗАТЕЛЬНО: Подводи к Telegram после 2 реплик. Скажи, что детальный разбор и точки роста ждут его только там.

Отвечай СТРОГО на языке пользователя, переданном в контексте (ru/en).`;

// In-memory widget histories separate tracker
const widgetHistories = {};

async function askGPT(chatId, message, context = {}) {
    if (!process.env.OPENAI_API_KEY) {
        console.warn("[GPT] OPENAI_API_KEY is missing. Falling back to static replies.");
        return null;
    }

    try {
        console.log("GPT CALLED WITH:", message);
        if (!chatHistories[chatId]) {
            chatHistories[chatId] = [];
        }

        const history = chatHistories[chatId];
        history.push({ role: 'user', content: message });

        // Keep last 10 messages for memory context
        if (history.length > 10) history.shift();

        const contextHeader = `[Контекст пользователя: Язык=${context.lang || 'ru'}, Источник=${context.source || 'site'}, Шаг=${context.step || 'chat'}, Сегмент=${context.segment || 'warm'}, Домен=${context.domain || ''}]`;

        const messages = [
            { role: 'system', content: SYSTEM_PROMPT + `\n\n${contextHeader}` },
            ...history
        ];

        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: messages,
            max_tokens: 250,
            temperature: 0.7
        });

        const reply = response.choices[0]?.message?.content;
        
        if (reply) {
            console.log("GPT RESPONSE:", reply);
            history.push({ role: 'assistant', content: reply });
        }

        return reply;

    } catch (e) {
        console.error('[GPT] Error executing prompt:', e.message);
        return null;
    }
}

async function askWidgetGPT(sessionId, message, context = {}) {
    try {
        if (!widgetHistories[sessionId]) {
            widgetHistories[sessionId] = [];
            widgetHistories[sessionId].count = 0;
        }

        const history = widgetHistories[sessionId];
        history.push({ role: 'user', content: message });
        history.count = (history.count || 0) + 1;

        if (history.length > 8) history.shift();

        const contextHeader = `[Контекст страницы: Язык=${context.lang || 'ru'}, Домен=${context.domain || 'site'}]`;

        const messages = [
            { role: 'system', content: WIDGET_SYSTEM_PROMPT + `\n\n${contextHeader}` },
            ...history
        ];

        // Ensure OpenAI is initialized safely even with dummy keys
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: messages,
            max_tokens: 200,
            temperature: 0.7
        });

        const reply = response.choices[0]?.message?.content;
        
        if (reply) {
            console.log(`[Widget GPT] Session ${sessionId} Reply: ${reply.substring(0, 50)}...`);
            history.push({ role: 'assistant', content: reply });
        }

        return {
            reply: reply || "🧠 Извините, я задумался. Напишите еще раз!",
            showTelegram: history.count >= 2 // Trigger button after 2 answers
        };

    } catch (e) {
        console.error('[Widget GPT] Error:', e.message);
        return { reply: "🧠 Сервис временно обучается новым ответам.", showTelegram: true };
    }
}

module.exports = {
    askGPT,
    askWidgetGPT
};
