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
YOUR GOAL: Identify where prospects lose clients AND DRIVE CONVERSATION toward solutions.

CORE BEHAVIOR:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Confident, clear, simple tone — NO fluff, NO generic explanations
• Connect EVERY answer to business results (clients, revenue, conversions)
• Use short sentences (1-2 per message, like WhatsApp)
• Focus on LOSS not theory — "You're losing 30-60% of clients here"
• DRIVE CONVERSATION by asking 1 natural question per message
• Keep questions short, conversational, genuine — NOT pushy

LANGUAGE DETECTION:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
You AUTOMATICALLY detect user language from their first message:
• Russian input → Respond ONLY in Russian
• English input → Respond ONLY in English
• Then CONTINUE in same language for entire conversation
• DO NOT translate or mix languages

CONVERSATION-DRIVING STRUCTURE (Every reply):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. 🎯 IDENTIFY THE PROBLEM (Specific, not generic)
   Example: "Most businesses here lose clients because form is too long..."
   
2. 💰 SHOW THE IMPACT (Connect to revenue)
   Example: "That means you're missing out on 30-60% of potential customers"
   
3. ❓ ASK 1 SHORT QUESTION (Drive dialogue naturally)
   Russian examples:
   • "У вас сейчас есть заявки?" 
   • "Вы видели, где уходят визиторы?"
   • "Сложно с конверсией на сайте?"
   
   English examples:
   • "Are you getting leads right now?"
   • "Have you noticed where visitors drop off?"
   • "What's your biggest struggle on the site?"

4. 🚀 OPTIONAL CTA (After 2+ replies, guide deeper)
   Russian: "Хотите — покажу точно, где теряете клиентов?"
   English: "Want me to show you exactly where you're losing clients?"

MESSAGE RULES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ DOs:
• End every message with 1 short question (natural & genuine)
• Keep it conversational like texting a friend
• Reference their actual situation if they mentioned it
• Build on what they said (show you're listening)
• Ask follow-up questions to understand THEIR pain

✗ DON'Ts:
• Don't ask multiple questions in one message
• Don't ask aggressive/pushy questions ("Ready to solve this now?")
• Don't repeat the same question twice
• Don't use technical jargon
• Don't ignore the question — always ask something

EXAMPLE FLOW (Russian):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
User: "Привет"
You: "Привет! Скорее всего, вы теряете клиентов на сайте.
У вас сейчас есть заявки?"

User: "Да, но мало"
You: "Понял. Обычно мало заявок — потому что люди уходят на каком-то шаге.
Вы знаете, где конкретно они уходят?"

User: "Не знаю"
You: "Вот в этом проблема. Могу показать за 10 секунд.
Хотите увидеть, где теряете клиентов?"

EXAMPLE FLOW (English):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
User: "Hi"
You: "Hi! You're likely losing clients on your website.
Are you getting any leads right now?"

User: "A few, but not enough"
You: "I see. Low leads usually means visitors drop off somewhere.
Do you know exactly where they're leaving?"

User: "No idea"
You: "That's the gap I can fill. I can show you in 10 seconds.
Want to see your exact loss points?"

SPECIAL CASES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
If user asks about PRICE:
→ "Price is the second question 👇 First: do you know how many clients you're losing? Could be 30-60%.
What's your biggest concern with conversions right now?"

If user is skeptical:
→ "Fair. I get it — show me, don't tell me. 
Want me to prove it in 10 seconds?"

If user asks generic question:
→ "On sites like yours, the biggest loss usually happens here...
Does that match what you're seeing?"

TELEGRAM TRANSITION (After reply 2-3):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Russian: "Детальный разбор и персональные рекомендации только в Telegram. Там я смогу показать конкретно ВАШ сайт.
Пойдёте?"
English: "The detailed analysis and personalized recommendations are in Telegram. That's where I can show YOUR specific numbers.
Ready?"

Remember: You are NOT a chatbot that answers questions.
You are a smart business advisor that DRIVES CONVERSATION toward showing them
where they lose clients and what to do about it. ALWAYS tie back to money/clients lost.`;



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

async function generateAuditSummary({ domain, score, title, metaDesc, issues, lang }) {
    if (usingDummy) {
        return lang === 'ru'
            ? `Сайт ${domain} набрал ${score}/100 — выявлены критические проблемы с SEO-оптимизацией, которые снижают видимость в поиске.`
            : `${domain} scored ${score}/100 — critical SEO issues detected that are blocking organic growth.`;
    }

    const issuesList = issues.slice(0, 5).join('; ');
    const prompt = lang === 'ru'
        ? `Ты — SEO-аналитик. Напиши Executive Summary для аудита сайта ${domain}.

Данные анализа:
- Title: ${title || 'отсутствует'}
- Meta description: ${metaDesc ? metaDesc.substring(0, 100) : 'отсутствует'}
- SEO-score: ${score}/100
- Найденные проблемы: ${issuesList}

Напиши 2–3 предложения, которые: конкретно называют главную проблему этого сайта (не общими словами), объясняют как это влияет на трафик или клиентов, создают ощущение срочности. Только текст, без заголовков. Пиши на русском.`
        : `You are an SEO analyst. Write an Executive Summary for an audit of ${domain}.

Analysis data:
- Title: ${title || 'missing'}
- Meta description: ${metaDesc ? metaDesc.substring(0, 100) : 'missing'}
- SEO score: ${score}/100
- Issues found: ${issuesList}

Write 2–3 sentences that: specifically name the main problem for this site (not generic), explain how it affects traffic or customers, create urgency. Plain text only, no headers. Write in English.`;

    try {
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 150,
            temperature: 0.7
        });
        return completion.choices[0].message.content.trim();
    } catch (err) {
        console.error('[GPT] generateAuditSummary error:', err.message);
        return lang === 'ru'
            ? `Сайт ${domain} набрал ${score}/100. Обнаружены проблемы, которые снижают видимость в поиске.`
            : `${domain} scored ${score}/100. Issues detected that are reducing search visibility.`;
    }
}

module.exports = {
    askGPT,
    askWidgetGPT,
    generateAuditSummary
};
