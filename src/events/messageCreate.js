import { Events } from 'discord.js';
import { logger } from '../utils/logger.js';
import { getGuildConfig } from '../services/guildConfig.js';
import { BotConfig } from '../config/bot.js';
import { createPrefixInteraction, parsePrefixContent } from '../utils/prefixCommandAdapter.js';
import { enforceAbuseProtection, formatCooldownDuration } from '../utils/abuseProtection.js';
import { InteractionHelper } from '../utils/interactionHelper.js';
import { MessageFlags } from 'discord.js';

const DEFAULT_PREFIX = BotConfig.prefix || 'nh!';

export default {
    name: Events.MessageCreate,
    async execute(message, client) {
        if (message.author.bot || !message.guild) return;

        const guildConfig = await getGuildConfig(client, message.guild.id);
        const prefix = guildConfig.prefix || DEFAULT_PREFIX;

        const parsed = parsePrefixContent(message.content, prefix);
        if (!parsed) return;

        const command = client.commands.get(parsed.commandName);
        if (!command) return;

        const resolvedName = command.data?.name ?? parsed.commandName;

        const fakeInteraction = createPrefixInteraction(
            message,
            client,
            command,
            resolvedName,
            parsed.args,
        );

        const abuse = await enforceAbuseProtection(fakeInteraction, command, resolvedName);
        if (!abuse.allowed) {
            await InteractionHelper.safeReply(fakeInteraction, {
                content: `⏱️ Slow down! Try again in ${formatCooldownDuration(abuse.remainingMs)}.`,
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        try {
            await command.execute(fakeInteraction, guildConfig, client);
        } catch (error) {
            logger.error(`Prefix command "${resolvedName}" failed:`, error);
            if (!fakeInteraction.replied) {
                await message
                    .reply('❌ Command failed. Try the slash version (/) for full features (menus, modals, etc.).')
                    .catch(() => {});
            }
        }
    },
};
