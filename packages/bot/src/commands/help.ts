import { CommandContext, Context, InlineKeyboard } from 'grammy';

const TMA_URL = process.env.TMA_URL || 'https://ionogenic-madge-arousedly.ngrok-free.dev';

export async function helpCommand(ctx: CommandContext<Context>) {
    const keyboard = new InlineKeyboard()
        .webApp('🚀 Відкрити Sinergio', TMA_URL);

    const text = `
❓ <b>Sinergio Node — Довідка</b>

Sinergio — кооперативна мережа взаємного забезпечення без посередників і платіжного посередника.

<b>Команди бота:</b>
/start — Реєстрація / вітання
/profile — Мій профіль та S-Index
/help — Ця довідка

<b>Основні можливості:</b>
🏪 <b>Маркетплейс</b> — Особисті та групові пропозиції від виробників
🏘️ <b>Осередки</b> — Фрактальні локальні спільноти (район, будинок, квартал)
📦 <b>Логістика</b> — Доставка «остання миля» силами учасників
⭐ <b>S-Index</b> — Індекс синергії: відображає рівень кооперативної участі
🤝 <b>Підписки</b> — Слідкуйте за улюбленими виробниками

<b>S-Index</b> нараховується автоматично:
• +10 — за виконане замовлення (виробник)
• +5 — за оплачене замовлення (споживач)
• +3 — за успішну доставку (кур'єр)

Натисніть кнопку нижче, щоб відкрити додаток:
  `.trim();

    await ctx.reply(text, {
        parse_mode: 'HTML',
        reply_markup: keyboard,
    });
}
