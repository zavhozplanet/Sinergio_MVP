import { CommandContext, Context, InlineKeyboard } from 'grammy';
import { prisma } from '../lib/prisma.js';

const TMA_URL = process.env.TMA_URL || 'https://ionogenic-madge-arousedly.ngrok-free.dev';

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
    const isProducer = user.role === 'PRODUCER';

    const roleLabel = {
        uk: isProducer ? '🏭 Виробник' : '🛒 Споживач',
        ru: isProducer ? '🏭 Виробник' : '🛒 Споживач',
        en: isProducer ? '🏭 Producer' : '🛒 Consumer',
    };

    const messages: Record<string, string> = {
        uk: `🌿 <b>Ласкаво просимо до Sinergio!</b>

Sinergio — це кооперативна мережа взаємного забезпечення без посередників.

🆔 Ваш ID: <code>${tgUser.id}</code>
⭐ S-Index: <b>${user.c_index}</b>
${roleLabel.uk}

Натисніть кнопку нижче, щоб відкрити додаток і почати:`,

        ru: `🌿 <b>Ласкаво просимо до Sinergio!</b>

Sinergio — кооперативна мережа взаємного забезпечення без посередників.

🆔 Ваш ID: <code>${tgUser.id}</code>
⭐ S-Index: <b>${user.c_index}</b>
${roleLabel.ru}

Натисніть кнопку нижче, щоб відкрити додаток:`,

        en: `🌿 <b>Welcome to Sinergio!</b>

A cooperative mutual provisioning network — no intermediaries, no platform fees.

🆔 Your ID: <code>${tgUser.id}</code>
⭐ S-Index: <b>${user.c_index}</b>
${roleLabel.en}

Tap the button below to open the app:`,
    };

    const buttonLabels: Record<string, string> = {
        uk: '🚀 Відкрити Sinergio',
        ru: '🚀 Відкрити Sinergio',
        en: '🚀 Open Sinergio',
    };

    const keyboard = new InlineKeyboard()
        .webApp(buttonLabels[lang] || buttonLabels.uk, TMA_URL);

    await ctx.reply(messages[lang] || messages.uk, {
        parse_mode: 'HTML',
        reply_markup: keyboard,
    });
}
