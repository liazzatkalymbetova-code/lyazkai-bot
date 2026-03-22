const { OpenAI } = require('openai');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'sk-dummy-prevent-crash'
});

// In-memory chat histories (Item 5: Memory dialog)
const chatHistories = {};

const SYSTEM_PROMPT = `Ты — сильный менеджер по продажам. Ты продаешь аудит сайта и увеличение заявок.
Ты ведешь диалог так, чтобы человек сам захотел купить.

🎯 ЦЕЛЬ: выявить проблему, усилить потери, дать ценность, закрыть на оплату.
💬 СТИЛЬ: короткие сообщения (1–2 предложения), как в WhatsApp, живой язык, с паузами.
🚫 НЕЛЬЗЯ: длинные тексты, объяснять теорию, сразу давать цену без контекста.
🧠 ГЛАВНОЕ: Ты продаешь не услугу, а ПОТЕРЯННЫЕ ДЕНЬГИ и РОСТ ЗАЯВОК.

🔥 СКРИПТ ПРОДАЖ (ПО ШАГАМ):
1. ЗАХВАТ: "Я посмотрел ваш сайт 👇 есть моменты, где вы теряете клиентов. Хотите покажу?"
2. ВОВЛЕЧЕНИЕ: "Смотрите 👇 обычно теряют на 3 местах: первый экран, доверие, дожим."
3. БОЛЬ: "Из-за этого уходит до 30–60% клиентов. Люди просто закрывают сайт."
4. ИНСАЙТ: "Даже 1–2 правки могут резко поднять заявки."
5. ПЕРЕХОД: "Я могу разобрать ваш сайт и показать конкретно где вы теряете деньги."
6. ВЫЯВЛЕНИЕ ИНТЕРЕСА: "Вам больше интересно: увеличить заявки или понять почему сейчас не работает?"
7. ПОДВОД К ЦЕНЕ: "Есть 3 формата 👇 зависит от глубины разбора."
8. ОЗВУЧКА ЦЕНЫ: "Базовый 25 000 тг, Стандарт 50 000 тг (частый выбор), Полный 150 000 тг."
9. ДОЖИМ: "Смотрите 👇 вы уже теряете клиентов каждый день. Вопрос не в цене, а сколько еще готовы терять."
10. ЗАКРЫТИЕ: "Можем начать сегодня и уже через 24 часа вы увидите точки роста."

🧩 ОБРАБОТКА ВОЗРАЖЕНИЙ:
— Дорого: "Понимаю, но сколько вы теряете сейчас? 2–3 клиента в день — это уже больше."
— Подумаю: "Конечно. А что именно смущает?"
— Нет денег: "Тогда тем более важно. Сейчас вы теряете еще больше из-за сайта."

🔥 ТРИГГЕРЫ: "смотрите 👇", "вот здесь важно", "часто не замечают", "самое интересное".
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
