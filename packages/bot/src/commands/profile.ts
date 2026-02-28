import { CommandContext, Context } from 'grammy';
import { prisma } from '../lib/prisma.js';

export async function profileCommand(ctx: CommandContext<Context>) {
    const tgUser = ctx.from;
    if (!tgUser) return;

    const user = await prisma.user.findUnique({
        where: { tg_id: BigInt(tgUser.id) },
        include: {
            _count: {
                select: { offers: true, orders: true, subscriptions: true, subscribers: true },
            },
        },
    });

    if (!user) {
        await ctx.reply('❌ Профиль не найден. Используйте /start для регистрации.');
        return;
    }

    const roleEmoji = user.role === 'PRODUCER' ? '🏭' : '👤';
    const roleName = user.role === 'PRODUCER' ? 'Продюсер' : 'Учасник';

    const text = [
        `${roleEmoji} <b>${user.name}</b>`,
        user.username ? `@${user.username}` : '',
        '',
        `⭐ <b>C-Index:</b> ${user.c_index}`,
        `🎭 <b>Роль:</b> ${roleName}`,
        user.bio ? `📝 <b>Bio:</b> ${user.bio}` : '',
        '',
        `📦 Оферти: ${user._count.offers}`,
        `🛒 Замовлення: ${user._count.orders}`,
        `📬 Підписки: ${user._count.subscriptions}`,
        `👥 Підписники: ${user._count.subscribers}`,
        '',
        `📅 Зареєстрований: ${user.created_at.toLocaleDateString('uk-UA')}`,
    ].filter(Boolean).join('\n');

    await ctx.reply(text, { parse_mode: 'HTML' });
}
