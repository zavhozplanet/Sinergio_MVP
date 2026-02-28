import { CommandContext, Context, InlineKeyboard } from 'grammy';

const BOT_USERNAME = process.env.BOT_USERNAME || 'Sinergio_bot';

export async function helpCommand(ctx: CommandContext<Context>) {
    const keyboard = new InlineKeyboard()
        .webApp('🚀 Відкрити додаток', `https://t.me/${BOT_USERNAME}/app`);

    const text = `
❓ <b>Sinergio Node — Допомога</b>

Sinergio — це кооперативна мережа взаємного забезпечення.

<b>Команди бота:</b>
/start — Реєстрація / вітання
/profile — Мій профіль та C-Index
/help — Ця довідка

<b>Основні можливості:</b>
🏪 <b>Маркетплейс</b> — Індивідуальні та групові оферти
🏘️ <b>Спільноти</b> — Фрактальні локальні осередки
📦 <b>Логістика</b> — Остання миля доставки
⭐ <b>C-Index</b> — Репутаційна система
🤝 <b>Підписки</b> — Слідкуйте за продюсерами

Натисніть кнопку нижче, щоб відкрити додаток:
  `.trim();

    await ctx.reply(text, {
        parse_mode: 'HTML',
        reply_markup: keyboard,
    });
}
