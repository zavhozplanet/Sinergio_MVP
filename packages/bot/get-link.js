const { Bot } = require('grammy');
require('dotenv').config();

const bot = new Bot(process.env.BOT_TOKEN);
async function run() {
    try {
        const link = await bot.api.exportChatInviteLink(process.env.SUPERGROUP_CHAT_ID);
        console.log("INVITE_LINK_RESULT:", link);
    } catch (e) {
        console.error(e);
    }
}
run();
