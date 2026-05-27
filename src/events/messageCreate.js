import { Events } from 'discord.js';
import { logger } from '../utils/logger.js';
import { getGuildConfig } from '../services/guildConfig.js';

// Discord mention syntax: <@123>, <@!123>, <@&123>, <#123>
const MENTION_REGEX = /^<[@#][!&]?\d+>$/;
// Pure integer (for subcommand detection only — NOT filtered from getString)
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

        const args = [...rawArgs];

        // Non-mention args — keep integers so "2 days", "2d", "60" all pass through getString intact
        const nonMentionArgs = args.filter(a => !MENTION_REGEX.test(a));

        // Subcommand detection: args[0] is text (not a mention, not a pure integer)
        // e.g.  nh!todo add task  → args[0]="add"  → isSubcommand = true
        //       nh!ban @user reason → args[0]="<@123>" → isSubcommand = false
        //       nh!purge 10        → args[0]="10"   → isSubcommand = false
        const firstArgIsSubcommand = !!args[0] && !MENTION_REGEX.test(args[0]) && !INTEGER_REGEX.test(args[0]);

        // stringArgs: everything that is not a mention, skip subcommand token if present
        const stringArgs = firstArgIsSubcommand ? nonMentionArgs.slice(1) : nonMentionArgs;

        let _deferred = false;
        let _replied = false;

        const stripFlags = (opts) => {
            if (!opts || typeof opts !== 'object') return opts;
            const { flags, ephemeral, ...safe } = opts;
            return safe;
        };

        const fakeInteraction = {
            _isPrefix: true,
            id: `prefix-${message.id}`,
            createdTimestamp: message.createdTimestamp,
            guildId: message.guild.id,
            channelId: message.channel.id,
            commandName,
            type: 0,

            member: message.member,
            guild: message.guild,
            channel: message.channel,
            user: message.author,
            client: client,
            // memberPermissions for commands that check interaction.memberPermissions
            memberPermissions: message.member.permissions,

            get deferred() { return _deferred; },
            get replied() { return _replied; },

            deferReply: async (_opts) => { _deferred = true; },

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

            // showModal cannot work in prefix mode — inform user to use slash command
            showModal: async (_modal) => {
                await message.reply('❌ This feature requires the slash command (`/`). Please use `/` version instead.');
            },

            // fetchReply returns the channel message (best approximation)
            fetchReply: async () => message,

            options: {
                getSubcommand: () => firstArgIsSubcommand ? args[0] : null,

                // Finds the first pure integer in args
                getInteger: (_name) => {
                    const found = args.find(a => INTEGER_REGEX.test(a));
                    return found !== undefined ? parseInt(found, 10) : null;
                },

                // Finds the first float in args
                getNumber: (_name) => {
                    const found = args.find(a => /^-?[\d.]+$/.test(a) && !isNaN(parseFloat(a)));
                    return found !== undefined ? parseFloat(found) : null;
                },

                // Returns non-mention args as a string (integers included so "2 days", "30m" etc. survive)
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
