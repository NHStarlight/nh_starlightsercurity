import { Events } from 'discord.js';
import { logger } from '../utils/logger.js';
import { getGuildConfig } from '../services/guildConfig.js';
import { BotConfig } from '../config/bot.js';
import { createPrefixInteraction, parsePrefixContent } from '../utils/prefixCommandAdapter.js';
import { enforceAbuseProtection, formatCooldownDuration } from '../utils/abuseProtection.js';
import { InteractionHelper } from '../utils/interactionHelper.js';
import { MessageFlags } from 'discord.js';
import { getFromDb, setInDb } from '../utils/database.js';

const DEFAULT_PREFIX = BotConfig.prefix || 'nh!';

// Format time duration in human readable format
function formatAfkDuration(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
        const remainingHours = hours % 24;
        return `${days}d ${remainingHours}h`;
    } else if (hours > 0) {
        const remainingMinutes = minutes % 60;
        return `${hours}h ${remainingMinutes}m`;
    } else if (minutes > 0) {
        return `${minutes}m`;
    } else {
        return `${seconds}s`;
    }
}

export default {
    name: Events.MessageCreate,
    async execute(message, client) {
        if (message.author.bot || !message.guild) return;

        // Check and remove AFK status for message author
        try {
            const afkKey = `afk:${message.guildId}:${message.author.id}`;
            const afkMentionsKey = `afk_mentions:${message.guildId}:${message.author.id}`;
            const afkData = await getFromDb(afkKey);
            
            if (afkData) {
                // Get mention history
                const mentionHistory = await getFromDb(afkMentionsKey);
                
                // Remove AFK from database
                await setInDb(afkKey, null);
                await setInDb(afkMentionsKey, null);
                
                // Remove [AFK] from nickname
                try {
                    if (message.member?.nickname?.includes('[AFK]')) {
                        const newNick = message.member.nickname.replace('[AFK] ', '');
                        await message.member.setNickname(newNick).catch(() => {});
                    }
                } catch (err) {
                    logger.warn('Could not update nickname for AFK removal:', err);
                }
                
                // Build notification message
                const currentTime = Date.now();
                const afkDuration = formatAfkDuration(currentTime - afkData.timestamp);
                
                let notificationContent = `✅ Welcome back! You have been AFK for **${afkDuration}**`;
                
                if (mentionHistory && mentionHistory.channels && mentionHistory.channels.length > 0) {
                    const channelList = mentionHistory.channels.map(c => `<#${c}>`).join(', ');
                    notificationContent += `\n\n💬 You were mentioned in: ${channelList}`;
                }
                
                // Notify that user is no longer AFK
                try {
                    await message.reply({
                        content: notificationContent,
                        flags: MessageFlags.Ephemeral,
                    }).catch(() => {});
                } catch (err) {
                    logger.warn('Failed to send AFK removal notification:', err);
                }
                
                logger.info(`User removed from AFK`, {
                    userId: message.author.id,
                    guildId: message.guildId,
                    username: message.author.tag,
                    duration: afkDuration
                });
            }
        } catch (err) {
            logger.warn(`Failed to check/remove AFK status:`, err);
        }

        // Check for AFK mentions
        if (message.mentions.has(client.user.id) || message.mentions.users.size > 0) {
            const afkNotifications = [];
            
            for (const mentionedUser of message.mentions.users.values()) {
                try {
                    const afkKey = `afk:${message.guildId}:${mentionedUser.id}`;
                    const afkData = await getFromDb(afkKey);
                    
                    if (afkData) {
                        const currentTime = Date.now();
                        const afkDuration = formatAfkDuration(currentTime - afkData.timestamp);
                        
                        afkNotifications.push(
                            `💤 **${afkData.username}** has been AFK for **${afkDuration}** | Reason: ${afkData.message}`
                        );
                        
                        // Store mention history for when user returns
                        const afkMentionsKey = `afk_mentions:${message.guildId}:${mentionedUser.id}`;
                        const mentionHistory = await getFromDb(afkMentionsKey) || { channels: [] };
                        
                        if (!mentionHistory.channels) {
                            mentionHistory.channels = [];
                        }
                        
                        // Add channel if not already in list
                        if (!mentionHistory.channels.includes(message.channelId)) {
                            mentionHistory.channels.push(message.channelId);
                        }
                        
                        await setInDb(afkMentionsKey, mentionHistory);
                    }
                } catch (err) {
                    logger.warn(`Failed to check AFK status for ${mentionedUser.tag}:`, err);
                }
            }
            
            if (afkNotifications.length > 0) {
                try {
                    await message.reply({
                        content: afkNotifications.join('\n'),
                        flags: MessageFlags.SuppressEmbeds,
                    }).catch(() => {});
                } catch (err) {
                    logger.warn('Failed to send AFK notification:', err);
                }
            }
        }

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
