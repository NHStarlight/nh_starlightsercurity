import { Events } from 'discord.js';
import { logger } from '../utils/logger.js';

export default {
    name: Events.MessageCreate,
    async execute(message, client) {
        // 1. XỬ LÝ PREFIX COMMAND (nh!)
        const PREFIX = "nh!";
        if (message.content.startsWith(PREFIX)) {
            if (message.author.bot) return;

            const args = message.content.slice(PREFIX.length).trim().split(/ +/);
            const commandName = args.shift().toLowerCase();

            if (commandName === 'ping') {
                return message.reply('Pong! 🏓');
            }
            
            return; // Dừng lại ở đây nếu đã chạy lệnh prefix
        }

        // 2. Các xử lý khác
        try {
            if (message.author.bot || !message.guild) return;
            // Không còn gọi handleLeveling ở đây nên sẽ không bị lỗi nữa
        } catch (error) {
            logger.error('Error in messageCreate:', error);
        }
    }
};
