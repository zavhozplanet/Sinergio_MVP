import { CommandContext, Context, InlineKeyboard } from 'grammy';
import { prisma } from '../lib/prisma.js';

const BOT_USERNAME = process.env.BOT_USERNAME || 'Sinergio_bot';

export async function startCommand(ctx: CommandContext<Context>) {
    const tgUser = ctx.from;
    if (!tgUser) return;

    // Upsert user in DB
    const user = await prisma.user.upsert({
        where: { tg_id: BigInt(tgUser.id) },
        update: {
            name: [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' '),
            username: tgUser.username || undefined,
        },
        create: {
            tg_id: BigInt(tgUser.id),
            name: [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' '),
            username: tgUser.username || undefined,
            language: tgUser.language_code === 'ru' ? 'ru' : tgUser.language_code === 'en' ? 'en' : 'uk',
        },
    });

    const lang = user.language;
    const messages: Record<string, string> = {
        uk: `🌿 <b>Ласкаво просимо до Sinergio!</b>\n\nВи — частина кооперативної мережі взаємного забезпечення.\n\n🆔 Ваш ID: <code>${tgUser.id}</code>\n⭐ C-Index: <b>${user.c_index}</b>\n🎭 Роль: <b>${user.role === 'PRODUCER' ? 'Продюсер' : 'Учасник'}</b>\n\nВідкрийте додаток, щоб почати:`,
        ru: `🌿 <b>Добро пожаловать в Sinergio!</b>\n\nВы — часть кооперативной сети взаимного обеспечения.\n\n🆔 Ваш ID: <code>${tgUser.id}</code>\n⭐ C-Index: <b>${user.c_index}</b>\n🎭 Роль: <b>${user.role === 'PRODUCER' ? 'Продюсер' : 'Участник'}</b>\n\nОткройте приложение, чтобы начать:`,
        en: `🌿 <b>Welcome to Sinergio!</b>\n\nYou are part of a cooperative mutual provisioning network.\n\n🆔 Your ID: <code>${tgUser.id}</code>\n⭐ C-Index: <b>${user.c_index}</b>\n🎭 Role: <b>${user.role === 'PRODUCER' ? 'Producer' : 'Participant'}</b>\n\nOpen the app to get started:`,
    };

    const buttonLabels: Record<string, string> = {
        uk: '🚀 Відкрити Sinergio',
        ru: '🚀 Открыть Sinergio',
        en: '🚀 Open Sinergio',
    };

    const keyboard = new InlineKeyboard()
        .webApp(buttonLabels[lang] || buttonLabels.uk, `https://t.me/${BOT_USERNAME}/app`);

    await ctx.reply(messages[lang] || messages.uk, {
        parse_mode: 'HTML',
        reply_markup: keyboard,
    });
}
