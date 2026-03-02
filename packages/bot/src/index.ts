import 'dotenv/config';
import { Bot, GrammyError, HttpError } from 'grammy';
import { startCommand } from './commands/start.js';
import { profileCommand } from './commands/profile.js';
import { helpCommand } from './commands/help.js';

const token = process.env.BOT_TOKEN;
if (!token) {
    throw new Error('BOT_TOKEN is required');
}

const bot = new Bot(token);

// ─── Commands ──────────────────────────────────────────
bot.command('start', startCommand);
bot.command('profile', profileCommand);
bot.command('help', helpCommand);

// ─── Error Handling ────────────────────────────────────
bot.catch((err) => {
    const ctx = err.ctx;
    console.error(`Error while handling update ${ctx.update.update_id}:`);
    const e = err.error;
    if (e instanceof GrammyError) {
        console.error('Error in request:', e.description);
    } else if (e instanceof HttpError) {
        console.error('Could not contact Telegram:', e);
    } else {
        console.error('Unknown error:', e);
    }
});

// ─── Start ─────────────────────────────────────────────
bot.api.setMyCommands([
    { command: 'start', description: '🚀 Запустити додаток' },
    { command: 'profile', description: '👤 Мій профіль та S-Index' },
    { command: 'help', description: '❓ Довідка про Sinergio' },
]);

bot.start({
    onStart: () => console.log('🤖 Sinergio Bot is running!'),
});

export { bot };
