import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { errorEmbed, successEmbed } from '../../utils/embeds.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

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
        // [WAIT] Initial response to prevent "Interaction Failed"
        await InteractionHelper.safeDefer(interaction);

        const amount = interaction.options.getInteger("amount");
        const channel = interaction.channel;

        try {
            const fetched = await channel.messages.fetch({ limit: amount + 1 });
            const messagesToDelete = Array.from(fetched.values()).slice(1);

            if (messagesToDelete.length === 0) {
                return await InteractionHelper.safeEditReply(interaction, {
                    embeds: [errorEmbed("No messages found", "There are no messages available to delete.")],
                });
            }

            let deletedCount = 0;

            // [WAIT] Bot will pause here until the deletion is fully confirmed by Discord
            if (messagesToDelete.length === 1) {
                await messagesToDelete[0].delete();
                deletedCount = 1;
            } else {
                const deleted = await channel.bulkDelete(messagesToDelete, true);
                deletedCount = deleted.size;
            }
            // [AFTER THIS] Only now, the code proceeds to the next line

            // [WAIT] Finally, send the success notification
            await InteractionHelper.safeEditReply(interaction, {
                embeds: [successEmbed(`🗑️ Successfully deleted ${deletedCount} messages.`)],
                flags: MessageFlags.Ephemeral,
            });

            // Auto-delete the success message after 3s
            setTimeout(() => { interaction.deleteReply().catch(() => {}); }, 3000);

        } catch (error) {
            console.error(error);
            await InteractionHelper.safeEditReply(interaction, {
                embeds: [errorEmbed("Error", "Failed to delete messages. (They might be older than 14 days or system messages.)")],
            });
        }
    }
};
