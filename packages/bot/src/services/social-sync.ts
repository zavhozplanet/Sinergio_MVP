import { Bot, InlineKeyboard } from 'grammy';

const BOT_USERNAME = process.env.BOT_USERNAME || 'Sinergio_bot';
const SUPERGROUP_CHAT_ID = process.env.SUPERGROUP_CHAT_ID;

interface SocialSyncOptions {
    bot: Bot;
}

/**
 * Social Sync — Auto-post Offers & Communities to Telegram Supergroup Topics.
 * Each message includes an Inline Keyboard with [Open/Join] linking to the TMA.
 */
export class SocialSync {
    private bot: Bot;

    constructor({ bot }: SocialSyncOptions) {
        this.bot = bot;
    }

    /**
     * Post a new Offer to the Supergroup
     */
    async postOffer(offer: {
        id: string;
        title: string;
        description: string;
        price: number | string;
        type: string;
        producer_name: string;
        community_name?: string;
        target_quantity?: number | string;
        tg_topic_id?: number;
    }): Promise<number | undefined> {
        if (!SUPERGROUP_CHAT_ID) return;

        const typeEmoji = offer.type === 'POOL' ? '👥' : '🛒';
        const typeLabel = offer.type === 'POOL' ? 'Групова закупка' : 'Індивідуальна пропозиція';

        let text = `${typeEmoji} <b>${offer.title}</b>\n\n`;
        text += `${offer.description}\n\n`;
        text += `💰 Ціна: <b>${offer.price} грн</b>\n`;
        text += `👤 Продюсер: <b>${offer.producer_name}</b>\n`;
        if (offer.community_name) text += `🏘️ Осередок: <b>${offer.community_name}</b>\n`;
        if (offer.type === 'POOL' && offer.target_quantity) {
            text += `🎯 Ціль: <b>${offer.target_quantity}</b> од.\n`;
        }
        text += `\n📌 ${typeLabel}`;

        const keyboard = new InlineKeyboard()
            .webApp('🚀 Відкрити / Open', `https://t.me/${BOT_USERNAME}/app?startapp=offer_${offer.id}`);

        try {
            const msg = await this.bot.api.sendMessage(
                SUPERGROUP_CHAT_ID,
                text,
                {
                    parse_mode: 'HTML',
                    reply_markup: keyboard,
                    message_thread_id: offer.tg_topic_id || undefined,
                },
            );
            return msg.message_id;
        } catch (err) {
            console.error('Social Sync — failed to post offer:', err);
            return undefined;
        }
    }

    /**
     * Post a new Community to the Supergroup
     */
    async postCommunity(community: {
        id: string;
        name: string;
        description: string;
        location_tags: string;
        tg_topic_id?: number;
    }): Promise<number | undefined> {
        if (!SUPERGROUP_CHAT_ID) return;

        let text = `🏘️ <b>Новий осередок: ${community.name}</b>\n\n`;
        text += `${community.description}\n\n`;
        text += `📍 Локація: <b>${community.location_tags}</b>\n`;
        text += `\nПриєднуйтесь до локальної спільноти!`;

        const keyboard = new InlineKeyboard()
            .webApp('🤝 Приєднатися / Join', `https://t.me/${BOT_USERNAME}/app?startapp=community_${community.id}`);

        try {
            const msg = await this.bot.api.sendMessage(
                SUPERGROUP_CHAT_ID,
                text,
                {
                    parse_mode: 'HTML',
                    reply_markup: keyboard,
                    message_thread_id: community.tg_topic_id || undefined,
                },
            );
            return msg.message_id;
        } catch (err) {
            console.error('Social Sync — failed to post community:', err);
            return undefined;
        }
    }
}
