import { Events } from 'discord.js';
import { logger } from '../utils/logger.js';
import { getGuildConfig } from '../services/guildConfig.js';

// Regex để nhận diện Discord mention syntax: <@123>, <@!123>, <@&123>, <#123>
const MENTION_REGEX = /^<[@#][!&]?\d+>$/;
// Regex số nguyên thuần tuý (có thể âm)
const INTEGER_REGEX = /^-?\d+$/;

export default {
    name: Events.MessageCreate,
    async execute(message, client) {
        const PREFIX = "nh!";
        if (!message.content.startsWith(PREFIX) || message.author.bot || !message.guild) return;

        const rawArgs = message.content.slice(PREFIX.length).trim().split(/ +/);
        const commandName = rawArgs.shift().toLowerCase();
        if (!commandName) return;

        const command = client.commands.get(commandName);
        if (!command) return;

        // args là bản sao để các option method dùng chung không mutate nhau
        const args = [...rawArgs];

        // Các arg không phải mention và không phải số nguyên (phần text thuần)
        const textArgs = args.filter(a => !MENTION_REGEX.test(a) && !INTEGER_REGEX.test(a));

        // Nếu args[0] là subcommand (không phải mention, không phải số), các textArgs
        // dùng cho getString sẽ bỏ qua nó để tránh subcommand lẫn vào reason/text
        const firstArgIsSubcommand = args[0] && !MENTION_REGEX.test(args[0]) && !INTEGER_REGEX.test(args[0]);
        const stringArgs = firstArgIsSubcommand ? textArgs.slice(1) : textArgs;

        let _deferred = false;
        let _replied = false;

        const stripFlags = (opts) => {
            if (!opts || typeof opts !== 'object') return opts;
            const { flags, ephemeral, ...safe } = opts;
            return safe;
        };

        const fakeInteraction = {
            // Marker cho lệnh tự phát hiện chế độ prefix
            _isPrefix: true,

            // InteractionHelper.isInteractionValid() yêu cầu id là string
            id: `prefix-${message.id}`,
            createdTimestamp: message.createdTimestamp,

            guildId: message.guild.id,
            channelId: message.channel.id,
            commandName,

            // type = 0 (không phải APPLICATION_COMMAND) để phân biệt với slash
            type: 0,

            member: message.member,
            guild: message.guild,
            channel: message.channel,
            user: message.author,
            client: client,

            get deferred() { return _deferred; },
            get replied() { return _replied; },

            deferReply: async (_opts) => {
                _deferred = true;
            },

            reply: async (content) => {
                const opts = stripFlags(typeof content === 'string' ? { content } : content);
                const msg = await message.reply(opts);
                _replied = true;
                return msg;
            },

            editReply: async (content) => {
                const opts = stripFlags(typeof content === 'string' ? { content } : content);
                const msg = await message.channel.send(opts);
                _replied = true;
                return msg;
            },

            followUp: async (content) => {
                const opts = stripFlags(typeof content === 'string' ? { content } : content);
                return message.channel.send(opts);
            },

            deleteReply: async () => {},

            options: {
                /**
                 * Trả về args[0] nếu nó là tên subcommand (không phải mention/số).
                 * Ví dụ: nh!todo add task → "add"
                 */
                getSubcommand: () => firstArgIsSubcommand ? args[0] : null,

                /**
                 * Tìm số nguyên đầu tiên trong args.
                 * Ví dụ: nh!timeout @user 60 reason → 60
                 */
                getInteger: (_name) => {
                    const found = args.find(a => INTEGER_REGEX.test(a));
                    return found !== undefined ? parseInt(found, 10) : null;
                },

                /**
                 * Tương tự getInteger nhưng cho số thực.
                 */
                getNumber: (_name) => {
                    const found = args.find(a => /^-?[\d.]+$/.test(a) && !isNaN(parseFloat(a)));
                    return found !== undefined ? parseFloat(found) : null;
                },

                /**
                 * Trả về phần text thuần (bỏ mention và số), bỏ qua subcommand nếu có.
                 * Ví dụ: nh!ban @user lý do ban → "lý do ban"
                 * Ví dụ: nh!timeout @user 60 lý do → "lý do"
                 * Ví dụ: nh!todo add tên công việc → "tên công việc"
                 */
                getString: (_name) => stringArgs.join(' ') || null,

                getUser: (_name) => message.mentions.users.first() ?? null,
                getMember: (_name) => message.mentions.members.first() ?? null,
                getChannel: (_name) => message.mentions.channels.first() ?? message.channel,
                getRole: (_name) => message.mentions.roles.first() ?? null,
                getBoolean: (_name) => args.includes('true'),
                getAttachment: (_name) => message.attachments.first() ?? null,
            },
        };

        try {
            const guildConfig = await getGuildConfig(client, message.guild.id);
            await command.execute(fakeInteraction, guildConfig, client);
        } catch (error) {
            logger.error(`Prefix command "${commandName}" failed:`, error);
            await message.channel.send('❌ Lệnh gặp lỗi. Hãy thử dùng Slash Command (/) để có đầy đủ tính năng.').catch(() => {});
        }
    }
};
