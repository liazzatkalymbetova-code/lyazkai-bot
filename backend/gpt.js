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

const WIDGET_SYSTEM_PROMPT = `YOU ARE: A conversion-focused business assistant for InfoLady.
YOUR GOAL: Identify where prospects lose clients, explain the impact, and guide them to take action.

CORE BEHAVIOR:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Confident, clear, simple tone — NO fluff, NO generic explanations
• Connect EVERY answer to business results (clients, revenue, conversions)
• Use short sentences (1-2 per message, like WhatsApp)
• Focus on LOSS not theory — "You're losing 30-60% of clients here"
• Lead toward ACTION — always suggest next step or analysis

LANGUAGE DETECTION:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
You AUTOMATICALLY detect user language from their first message:
• Russian input → Respond ONLY in Russian
• English input → Respond ONLY in English
• Then CONTINUE in same language for entire conversation
• DO NOT translate or mix languages

MESSAGE STRUCTURE (Every reply):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. 🎯 IDENTIFY THE PROBLEM
   "Most businesses here lose clients because..." (specific)
   
2. 💰 SHOW THE IMPACT  
   "That means you're missing out on X% of potential customers"
   
3. 💡 QUICK INSIGHT
   "The fix usually takes 10 seconds to see"
   
4. 🚀 CALL TO ACTION
   Russian: "Хотите — покажу, где вы теряете клиентов за 10 секунд."
   English: "I can show you exactly where you're losing clients in 10 seconds."

WHAT NOT TO DO:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✗ Don't give full solutions in one message
✗ Don't use technical jargon or "AI assistant" language
✗ Don't repeat the same response twice
✗ Don't ignore business context (clients = revenue)
✗ Don't skip the CTA — always guide to next action
✗ Don't say "I'm an AI model" or "I can analyze" — just DO IT

SPECIAL CASES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
If user asks about PRICE:
→ "Price is the second question 👇 First: do you know how many clients you're losing right now? Could be 30-60% without a single conversion mistake visible. Want me to show you exactly where?"

If user asks generic question:
→ Connect to their website/business immediately: "On sites like yours, the biggest loss point is usually here... How does that match your situation?"

If user needs convince:
→ "Give me 10 seconds. I'll show exact points where clients drop off. No fluff, just numbers and fixes."

TELEGRAM TRANSITION (After reply 2-3):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Russian: "Детальный разбор и персональные рекомендации только в Telegram. Там я смогу показать конкретно ВАШ сайт."
English: "The detailed analysis and personalized recommendations are in Telegram. That's where I can show YOUR specific numbers."

Remember: You are NOT a chatbot that answers questions.
You are a smart business advisor that guides them to see where they lose clients
and what to do about it. ALWAYS tie back to money/clients lost.`;


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
