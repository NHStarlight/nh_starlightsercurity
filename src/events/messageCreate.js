import { Events } from 'discord.js';
import { logger } from '../utils/logger.js';
import { getGuildConfig } from '../services/guildConfig.js';
import { BotConfig } from '../config/bot.js';
import { COMMAND_MAP } from '../config/aliases.js';
import { createPrefixInteraction, parsePrefixContent } from '../utils/prefixCommandAdapter.js';

const DEFAULT_PREFIX = BotConfig.prefix || 'nh!';

export default {
    name: Events.MessageCreate,
    async execute(message, client) {
        if (message.author.bot || !message.guild) return;

        const guildConfig = await getGuildConfig(client, message.guild.id);
        const prefix = guildConfig.prefix || DEFAULT_PREFIX;

        const parsed = parsePrefixContent(message.content, prefix);
        if (!parsed) return;

        const resolvedName = COMMAND_MAP[parsed.commandName] ?? parsed.commandName;
        const command = client.commands.get(resolvedName);
        if (!command) return;

        const fakeInteraction = createPrefixInteraction(
            message,
            client,
            command,
            resolvedName,
            parsed.args,
        );

        try {
            await command.execute(fakeInteraction, guildConfig, client);
        } catch (error) {
            logger.error(`Prefix command "${resolvedName}" failed:`, error);
            await message
                .reply('❌ Lệnh gặp lỗi. Hãy thử dùng Slash Command (/) để có đầy đủ tính năng.')
                .catch(() => {});
        }
    },
};
