import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { successEmbed, errorEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { handleInteractionError } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { getFromDb, setInDb } from '../../utils/database.js';

export default {
    data: new SlashCommandBuilder()
        .setName("editafk")
        .setDescription("Edit or remove AFK status")
        .addStringOption((option) =>
            option
                .setName("message")
                .setDescription("New AFK message (leave empty to remove AFK)")
                .setRequired(false)
        )
        .addUserOption((option) =>
            option
                .setName("target")
                .setDescription("Target user (admin only)")
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    category: "utility",

    async execute(interaction) {
        try {
            const deferSuccess = await InteractionHelper.safeDefer(interaction);
            if (!deferSuccess) {
                logger.warn(`EditAFK interaction defer failed`, {
                    userId: interaction.user.id,
                    guildId: interaction.guildId,
                    commandName: 'editafk'
                });
                return;
            }

            const newMessage = interaction.options.getString("message");
            const targetUser = interaction.options.getUser("target");
            const guildId = interaction.guildId;
            
            // Determine which user to edit
            let userId = interaction.user.id;
            let targetMember = interaction.member;
            let targetUsername = interaction.user.username;
            
            // If target is specified, check if user has permission
            if (targetUser) {
                if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
                    return await InteractionHelper.safeEditReply(interaction, {
                        embeds: [errorEmbed('Insufficient Permissions', 'Only admins can edit other users\' AFK status.')]
                    });
                }
                
                userId = targetUser.id;
                try {
                    targetMember = await interaction.guild.members.fetch(targetUser.id);
                    targetUsername = targetUser.username;
                } catch (err) {
                    return await InteractionHelper.safeEditReply(interaction, {
                        embeds: [errorEmbed('User Not Found', 'That user is not in this server.')]
                    });
                }
            }
            
            const afkKey = `afk:${guildId}:${userId}`;

            // Check if user is AFK
            const currentAFK = await getFromDb(afkKey);
            if (!currentAFK) {
                return await InteractionHelper.safeEditReply(interaction, {
                    embeds: [errorEmbed('Not AFK', `${targetUsername} is not currently AFK.`)]
                });
            }

            if (!newMessage) {
                // Remove AFK status
                await setInDb(afkKey, null);

                // Remove [AFK] from nickname
                try {
                    if (targetMember?.nickname?.includes('[AFK]')) {
                        const newNick = targetMember.nickname.replace('[AFK] ', '');
                        await targetMember.setNickname(newNick);
                    }
                } catch (err) {
                    logger.warn('Could not update nickname for AFK removal:', err.message);
                }

                await InteractionHelper.safeEditReply(interaction, {
                    embeds: [successEmbed('💤 AFK Removed', `${targetUsername}'s AFK status has been removed!`)]
                });
            } else {
                // Update AFK message
                const afkData = {
                    userId,
                    guildId,
                    message: newMessage,
                    timestamp: Date.now(),
                    username: targetUsername
                };

                await setInDb(afkKey, afkData);

                await InteractionHelper.safeEditReply(interaction, {
                    embeds: [
                        successEmbed(
                            '💤 AFK Updated',
                            `${targetUsername}'s AFK message: **${newMessage}**`
                        )
                    ]
                });
            }

            logger.info(`AFK status edited`, {
                userId,
                targetUsername,
                guildId,
                editorId: interaction.user.id,
                newMessage: newMessage || 'REMOVED'
            });
        } catch (error) {
            logger.error('EditAFK command error:', error);
            await handleInteractionError(interaction, error, { subtype: 'editafk_failed' });
        }
    }
};
