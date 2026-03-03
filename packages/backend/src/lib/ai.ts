import OpenAI from 'openai';

const apiKey = process.env.OPENROUTER_API_KEY;
if (!apiKey) {
    console.warn('⚠️  OPENROUTER_API_KEY not set — AI features disabled');
}

/**
 * OpenRouter client using OpenAI SDK format.
 * Free models tried in order — first responding one wins.
 */
const client = apiKey
    ? new OpenAI({
        apiKey,
        baseURL: 'https://openrouter.ai/api/v1',
        defaultHeaders: {
            'HTTP-Referer': 'https://t.me/Sinergio_bot',
            'X-Title': 'Sinergio Node',
        },
    })
    : null;

// Fallback chain: tries each model until one responds
const FREE_MODELS = [
    'meta-llama/llama-3.3-70b-instruct:free',
    'qwen/qwen3-next-80b-a3b-instruct:free',
    'liquid/lfm-2.5-1.2b-instruct:free',
    'nvidia/nemotron-nano-9b-v2:free',
    'stepfun/step-3.5-flash:free',
];

async function chat(prompt: string): Promise<string> {
    if (!client) throw new Error('AI not configured — set OPENROUTER_API_KEY');

    let lastError: Error | null = null;

    for (const model of FREE_MODELS) {
        try {
            const completion = await client.chat.completions.create({
                model,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.3,
                max_tokens: 1024,
            });
            const content = completion.choices[0]?.message?.content?.trim() ?? '';
            if (content) {
                console.log(`✅ AI responded via ${model}`);
                return content;
            }
        } catch (err: any) {
            const status = err?.status ?? err?.code;
            // 429 = rate limited, 404 = model not available — try next
            if (status === 429 || status === 404) {
                console.warn(`⚠️  Model ${model} unavailable (${status}), trying next...`);
                lastError = err;
                continue;
            }
            throw err;
        }
    }

    throw lastError ?? new Error('All AI models exhausted');
}

/**
 * Semantic Matcher: compare offers against a user's need description.
 * Prioritizes local community matches.
 */
export async function semanticMatch(params: {
    need: string;
    offers: Array<{
        id: string;
        title: string;
        description: string;
        price: number | string;
        producer_name: string;
        community_name?: string;
        location_tags?: string;
    }>;
    userCommunity?: string;
    userLocation?: string;
}): Promise<Array<{ id: string; score: number; reason: string }>> {
    const offersText = params.offers
        .map(
            (o, i) =>
                `[${i}] ID:${o.id} | "${o.title}" — ${o.description} | Ціна: ${o.price}₴ | Виробник: ${o.producer_name}${o.community_name ? ` | Осередок: ${o.community_name}` : ''}${o.location_tags ? ` | Локація: ${o.location_tags}` : ''}`
        )
        .join('\n');

    const prompt = `Ти — асистент кооперативної мережі Sinergio. Користувач шукає: "${params.need}"
${params.userCommunity ? `Осередок користувача: ${params.userCommunity}` : ''}
${params.userLocation ? `Локація користувача: ${params.userLocation}` : ''}

Доступні оферти:
${offersText || 'Немає доступних офертів'}

Поверни JSON масив ТІЛЬКИ підходящих офертів, відсортованих за релевантністю.
ВАЖЛИВО: Пріоритет надавай офертам з того ж осередку або локації користувача.

Відповідь — виключно JSON, без markdown:
[{"id":"...", "score": 0.95, "reason": "причина українською"}]

Якщо нічого не підходить, поверни пустий масив [].`;

    const text = await chat(prompt);

    try {
        const jsonStr = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        return JSON.parse(jsonStr);
    } catch {
        console.error('AI match parse error:', text.slice(0, 200));
        return [];
    }
}

/**
 * Generate a daily summary of community activity.
 */
export async function generateDailySummary(params: {
    communityName: string;
    newOffers: Array<{ title: string; producer: string; price: string | number }>;
    completedOrders: number;
    newMembers: number;
    topProducers: Array<{ name: string; c_index: number }>;
}): Promise<string> {
    const prompt = `Ти — бот кооперативної мережі Sinergio. Згенеруй коротку щоденну зведку для осередку "${params.communityName}".

Дані за сьогодні:
- Нові оферти: ${params.newOffers.length > 0 ? params.newOffers.map((o) => `"${o.title}" від ${o.producer} (${o.price}₴)`).join(', ') : 'немає'}
- Завершених замовлень: ${params.completedOrders}
- Нових учасників: ${params.newMembers}
- Топ виробники: ${params.topProducers.map((p) => `${p.name} (⭐${p.c_index})`).join(', ') || 'немає'}

Напиши зведку у форматі Telegram HTML (використовуй <b>, <i>, emoji). Максимум 500 символів. Мова: українська.`;

    return await chat(prompt);
}

/**
 * Smart Cart: suggest recurring purchases based on order history.
 */
export async function smartCartSuggestions(params: {
    orderHistory: Array<{ title: string; quantity: number; date: string; producer: string }>;
    availableOffers: Array<{ id: string; title: string; price: number | string; producer: string }>;
}): Promise<Array<{ offer_id: string; reason: string }>> {
    const historyText = params.orderHistory
        .map((o) => `"${o.title}" x${o.quantity} від ${o.producer} (${o.date})`)
        .join('\n');

    const offersText = params.availableOffers
        .map((o) => `ID:${o.id} | "${o.title}" — ${o.price}₴ (${o.producer})`)
        .join('\n');

    const prompt = `Ти — AI-помічник мережі Sinergio. Проаналізуй історію замовлень і запропонуй, що може знадобитися знову.

Історія замовлень:
${historyText || 'Порожня'}

Поточні оферти:
${offersText}

Поверни JSON масив рекомендацій (тільки JSON, без markdown):
[{"offer_id":"...", "reason": "причина українською"}]

Якщо нічого не підходить, поверни пустий масив [].`;

    const text = await chat(prompt);

    try {
        const jsonStr = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        return JSON.parse(jsonStr);
    } catch {
        console.error('Smart cart parse error:', text.slice(0, 200));
        return [];
    }
}
