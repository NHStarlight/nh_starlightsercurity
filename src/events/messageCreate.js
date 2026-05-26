import { Events } from 'discord.js';
import { logger } from '../utils/logger.js';

export default {
    name: Events.MessageCreate,
    async execute(message, client) {
        const PREFIX = "nh!";

        if (!message.content.startsWith(PREFIX) || message.author.bot || !message.guild) return;

        const args = message.content.slice(PREFIX.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();
        const command = client.commands.get(commandName);

        if (!command) return;

        // Object Context thay thế cho Interaction (rất gọn nhẹ)
        const context = {
            member: message.member,
            guild: message.guild,
            channel: message.channel,
            user: message.author,
            
            // Các phương thức thay thế cho Slash Command
            reply: async (options) => message.reply(options),
            editReply: async (options) => message.channel.send(options),
            
            // Xử lý args cho các lệnh cũ
            options: {
                getMember: () => message.mentions.members.first() || message.member,
                getString: (name) => args.join(' '),
                getUser: () => message.mentions.users.first(),
                getInteger: () => parseInt(args[0]) || 0
            }
        };

        try {
            // Thực thi lệnh. 
            // Lưu ý: Nếu lệnh trong file command yêu cầu deferReply, 
            // ta cần một lớp "bọc" hoặc sửa file command đó.
            await command.execute(context, null, client);
        } catch (error) {
            logger.error(`Error executing prefix command ${commandName}:`, error);
            message.reply('❌ Có lỗi xảy ra khi thực hiện lệnh này.');
        }
    }
};
