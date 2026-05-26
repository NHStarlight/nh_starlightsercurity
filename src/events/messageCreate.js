import { Events } from 'discord.js';
import { logger } from '../utils/logger.js';
import { getGuildConfig } from '../services/guildConfig.js';

export default {
    name: Events.MessageCreate,
    async execute(message, client) {
        const PREFIX = "nh!";
        if (!message.content.startsWith(PREFIX) || message.author.bot || !message.guild) return;

        const args = message.content.slice(PREFIX.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();
        const command = client.commands.get(commandName);

        if (!command) return;

        // Tạo 'fakeInteraction' để các lệnh tưởng chúng đang chạy qua Slash Command
        const fakeInteraction = {
            member: message.member,
            guild: message.guild,
            channel: message.channel,
            user: message.author,
            client: client,
            // Giả lập các phương thức quan trọng
            deferReply: async () => {}, 
            reply: async (content) => message.reply(content),
            editReply: async (content) => message.channel.send(content),
            followUp: async (content) => message.channel.send(content),
            deleteReply: async () => {},
            // Giả lập options để lệnh lấy dữ liệu từ args của Prefix
            options: {
                getInteger: (name) => parseInt(args[0]) || 0,
                getString: (name) => args.join(' '),
                getUser: (name) => message.mentions.users.first(),
                getMember: (name) => message.mentions.members.first() || message.member,
                getChannel: (name) => message.mentions.channels.first() || message.channel,
                getBoolean: (name) => args.includes('true')
            }
        };

        try {
            // Lấy config guild nếu cần thiết
            const guildConfig = await getGuildConfig(client, message.guild.id);
            
            // Thực thi lệnh với fakeInteraction
            await command.execute(fakeInteraction, guildConfig, client);
        } catch (error) {
            logger.error(`Error executing prefix command ${commandName}:`, error);
            message.channel.send('❌ Lệnh này gặp lỗi khi chạy ở chế độ Prefix. Vui lòng sử dụng Slash Command (/).');
        }
    }
};
