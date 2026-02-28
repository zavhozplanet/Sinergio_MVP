import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GOOGLE_AI_API_KEY;
if (!apiKey) {
    console.warn('⚠️ GOOGLE_AI_API_KEY not set — AI features disabled');
}

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

/**
 * Get a Gemini model instance.
 * Uses gemini-2.0-flash for fast, cost-efficient semantic tasks.
 */
export function getModel() {
    if (!genAI) throw new Error('AI not configured — set GOOGLE_AI_API_KEY');
    return genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
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
    const model = getModel();

    const offersText = params.offers.map((o, i) =>
        `[${i}] ID:${o.id} | "${o.title}" — ${o.description} | Цена: ${o.price} | Продюсер: ${o.producer_name}${o.community_name ? ` | Осередок: ${o.community_name}` : ''}${o.location_tags ? ` | Локація: ${o.location_tags}` : ''}`
    ).join('\n');

    const prompt = `Ты — ассистент кооперативной сети Sinergio. Пользователь ищет: "${params.need}"
${params.userCommunity ? `Осередок пользователя: ${params.userCommunity}` : ''}
${params.userLocation ? `Локація пользователя: ${params.userLocation}` : ''}

Доступные оферти:
${offersText}

Верни JSON массив ТОЛЬКО подходящих офертов, отсортированных по релевантности.
ВАЖНО: Приоритет отдавай офертам из того же осередку или той же локації пользователя.

Формат ответа — только JSON, без маркдауна:
[{"id":"...", "score": 0.95, "reason": "причина на украинском"}]

Если ничего не подходит, верни пустой массив [].`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    try {
        // Clean potential markdown code blocks
        const jsonStr = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        return JSON.parse(jsonStr);
    } catch {
        console.error('AI match parse error:', text);
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
    const model = getModel();

    const prompt = `Ты — бот кооперативної мережі Sinergio. Згенеруй коротку щоденну зведку для осередку "${params.communityName}".

Дані за сьогодні:
- Нові оферти: ${params.newOffers.length > 0 ? params.newOffers.map(o => `"${o.title}" від ${o.producer} (${o.price}₴)`).join(', ') : 'немає'}
- Завершених замовлень: ${params.completedOrders}
- Нових учасників: ${params.newMembers}
- Топ продюсери: ${params.topProducers.map(p => `${p.name} (⭐${p.c_index})`).join(', ') || 'немає'}

Напиши зведку у форматі Telegram HTML (використовуй <b>, <i>, emoji). Максимум 500 символів. Мова: українська.`;

    const result = await model.generateContent(prompt);
    return result.response.text().trim();
}

/**
 * Smart Cart: suggest recurring purchases based on order history.
 */
export async function smartCartSuggestions(params: {
    orderHistory: Array<{ title: string; quantity: number; date: string; producer: string }>;
    availableOffers: Array<{ id: string; title: string; price: number | string; producer: string }>;
}): Promise<Array<{ offer_id: string; reason: string }>> {
    const model = getModel();

    const historyText = params.orderHistory.map(o =>
        `"${o.title}" x${o.quantity} від ${o.producer} (${o.date})`
    ).join('\n');

    const offersText = params.availableOffers.map(o =>
        `ID:${o.id} | "${o.title}" — ${o.price}₴ (${o.producer})`
    ).join('\n');

    const prompt = `Ти — AI-помічник мережі Sinergio. Проаналізуй історію замовлень користувача і запропонуй, що йому може знадобитися знову.

Історія замовлень:
${historyText || 'Порожня'}

Поточні оферти:
${offersText}

Верни JSON масив рекомендацій (тільки JSON, без маркдауна):
[{"offer_id":"...", "reason": "причина українською"}]

Якщо нічого не підходить, верни пустий масив [].`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    try {
        const jsonStr = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        return JSON.parse(jsonStr);
    } catch {
        console.error('Smart cart parse error:', text);
        return [];
    }
}
