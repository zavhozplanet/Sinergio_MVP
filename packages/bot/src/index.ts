import 'dotenv/config';
import { Bot, GrammyError, HttpError } from 'grammy';
import { startCommand } from './commands/start.js';
import { profileCommand } from './commands/profile.js';
import { helpCommand } from './commands/help.js';

const token = process.env.BOT_TOKEN;
if (!token) throw new Error('BOT_TOKEN is required');

const SUPERGROUP = process.env.SUPERGROUP_CHAT_ID || '-1003779091657';
const TMA_URL = process.env.TMA_URL || 'https://ionogenic-madge-arousedly.ngrok-free.dev';

const bot = new Bot(token);

// ─── Commands ──────────────────────────────────────────
bot.command('start', startCommand);
bot.command('profile', profileCommand);
bot.command('help', helpCommand);

// ─── /chat — quick link to main supergroup ────────────
bot.command('chat', async (ctx) => {
    // Convert "-100XXXXXXX" format to numeric for t.me/c/ links
    const numericId = SUPERGROUP.replace(/^-100/, '');
    const chatUrl = `https://t.me/c/${numericId}`;
    await ctx.reply(
        `💬 <b>Головний чат Sinergio</b>\n\nПерейдіть у голосний чат спільноти:`,
        {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [[
                    { text: '💬 Відкрити чат', url: chatUrl },
                    { text: '🚀 Додаток', web_app: { url: TMA_URL } },
                ]],
            },
        }
    );
});

// ─── Error Handling ────────────────────────────────────
bot.catch((err) => {
    const ctx = err.ctx;
    console.error(`[Bot] Error on update ${ctx.update.update_id}:`);
    const e = err.error;
    if (e instanceof GrammyError) {
        console.error('[Bot] GrammyError:', e.description);
    } else if (e instanceof HttpError) {
        console.error('[Bot] HttpError:', e.message);
    } else {
        console.error('[Bot] Unknown error:', e);
    }
    // Don't rethrow — keep bot alive on individual handler errors
});

// ─── Start with reliability options ───────────────────
bot.api.setMyCommands([
    { command: 'start', description: '🚀 Запустити додаток' },
    { command: 'profile', description: '👤 Мій профіль та S-Index' },
    { command: 'chat', description: '💬 Відкрити головний чат' },
    { command: 'help', description: '❓ Довідка про Sinergio' },
]).catch(console.error);

bot.start({
    onStart: () => console.log('🤖 Sinergio Bot is running!'),
    drop_pending_updates: true,
    allowed_updates: ['message', 'callback_query', 'inline_query'],
});

export { bot };
