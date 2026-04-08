// Load .env only in development to avoid overwriting Render's environment variables
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}
const { OpenAI } = require('openai');

const apiKey = process.env.OPENAI_API_KEY;
const usingDummy = !apiKey || apiKey === 'sk-dummy-prevent-crash';

console.log("\n[GPT INIT] ═══════════════════════════════════════");
console.log("[GPT INIT] OPENAI_API_KEY present:", !!apiKey);
if (apiKey) console.log("[GPT INIT] API Key starts with:", apiKey.substring(0, 15) + '...');
console.log("[GPT INIT] Using REAL API:", !usingDummy);
console.log("[GPT INIT] Using DUMMY fallback:", usingDummy);
if (usingDummy) console.warn("[GPT INIT] ⚠️  WARNING: Dummy key active!");
console.log("[GPT INIT] ═══════════════════════════════════════\n");

const openai = new OpenAI({
    apiKey: apiKey || 'sk-dummy-prevent-crash'
});

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
        console.log(`\n[Widget GPT] ────────────────────────────────`);
        console.log(`[Widget GPT] User message: "${message.substring(0, 40)}..."`);
        console.log(`[Widget GPT] Session ID: ${sessionId}`);
        console.log(`[Widget GPT] Using real API key: ${!usingDummy}`);
        
        if (usingDummy) {
            console.warn(`[Widget GPT] ⚠️  DUMMY KEY DETECTED - No real OpenAI response!`);
            return { 
                reply: "🧠 Ошибка: API ключ не настроен. Обратитесь в Telegram для помощи.",
                showTelegram: true 
            };
        }
        
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

        console.log(`[Widget GPT] Calling OpenAI API (gpt-4o-mini)...`);
        
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: messages,
            max_tokens: 200,
            temperature: 0.7
        });
        
        const reply = response.choices[0]?.message?.content;
        
        console.log(`[Widget GPT] ✅ Success! Reply: "${reply.substring(0, 50)}..."`);
        
        if (reply) {
            history.push({ role: 'assistant', content: reply });
        }

        return {
            reply: reply || "🧠 Извините, я задумался. Напишите еще раз!",
            showTelegram: history.count >= 2
        };

    } catch (e) {
        console.error(`[Widget GPT] ❌ ERROR: ${e.message}`);
        console.error(`[Widget GPT] Error code: ${e.code}`);
        console.error(`[Widget GPT] Status: ${e.status}`);
        if (e.response?.data) {
            console.error(`[Widget GPT] API Response:`, JSON.stringify(e.response.data));
        }
        
        // Check if it's auth error
        if (e.status === 401 || e.code === 'invalid_api_key') {
            console.error(`[Widget GPT] 🔑 INVALID API KEY - check OPENAI_API_KEY environment variable`);
        }
        
        return { 
            reply: "🧠 Сервис временно обучается новым ответам.",
            showTelegram: true 
        };
    }
}

module.exports = {
    askGPT,
    askWidgetGPT
};
