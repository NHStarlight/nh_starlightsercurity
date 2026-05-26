import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { errorEmbed, successEmbed } from '../../utils/embeds.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { logger } from '../../utils/logger.js';

export default {
    data: new SlashCommandBuilder()
        .setName("purge")
        .setDescription("Delete a specific amount of messages")
        .addIntegerOption((option) =>
            option.setName("amount")
                .setDescription("Number of messages (1-100)")
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction, config, client) {
        const isPrefix = interaction._isPrefix === true;

        if (!isPrefix) {
            await InteractionHelper.safeDefer(interaction);
        }

        let amount = interaction.options.getInteger("amount") ?? 10;

        if (amount > 100) amount = 100;
        if (amount < 1) amount = 1;

        const channel = interaction.channel;

        try {
            const fetched = await channel.messages.fetch({ limit: amount + 1 });
            const messagesToDelete = Array.from(fetched.values()).slice(1);

            if (messagesToDelete.length === 0) {
                return InteractionHelper.safeEditReply(interaction, {
                    embeds: [errorEmbed("No messages found", "There are no messages available to delete.")],
                });
            }

            let deletedCount = 0;
            if (messagesToDelete.length === 1) {
                await messagesToDelete[0].delete();
                deletedCount = 1;
            } else {
                const deleted = await channel.bulkDelete(messagesToDelete, true);
                deletedCount = deleted.size;
            }

            await InteractionHelper.safeEditReply(interaction, {
                embeds: [successEmbed(`🗑️ Successfully deleted ${deletedCount} messages.`)],
                flags: isPrefix ? undefined : MessageFlags.Ephemeral,
            });

            setTimeout(() => interaction.deleteReply().catch(() => {}), 3000);
        } catch (error) {
            logger.error("Purge error:", error);
            await InteractionHelper.safeEditReply(interaction, {
                embeds: [errorEmbed("Error", "Failed to delete messages. (Older than 14 days or system messages.)")],
            });
        }
    }
};
