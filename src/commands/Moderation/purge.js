import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { errorEmbed, successEmbed, warningEmbed } from '../../utils/embeds.js';
import { logEvent } from '../../utils/moderation.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { getColor } from '../../config/bot.js';

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
    category: "moderation",

    async execute(interaction, config, client) {
        await InteractionHelper.safeDefer(interaction);

        const amount = interaction.options.getInteger("amount");
        const channel = interaction.channel;

        if (amount < 1 || amount > 100) {
            return await InteractionHelper.safeEditReply(interaction, {
                embeds: [errorEmbed("Invalid Amount", "Please specify a number between 1 and 100.")],
            });
        }

        try {
            let deletedCount = 0;

            if (amount === 1) {
                // Xử lý riêng cho 1 tin nhắn: Fetch và xóa thủ công
                const fetched = await channel.messages.fetch({ limit: 1 });
                const messageToDelete = fetched.first();
                if (messageToDelete) {
                    await messageToDelete.delete();
                    deletedCount = 1;
                }
            } else {
                // Xử lý cho 2-100 tin nhắn
                const fetched = await channel.messages.fetch({ limit: amount });
                // Cố gắng xóa, không lọc bỏ tin cũ (để xem nó có báo lỗi thật không)
                const deleted = await channel.bulkDelete(fetched, false); 
                deletedCount = deleted.size;
            }

            if (deletedCount === 0) {
                return await InteractionHelper.safeEditReply(interaction, {
                    embeds: [warningEmbed("No messages deleted", "Bot found no messages to delete. They might be older than 14 days or are system messages.")],
                    flags: MessageFlags.Ephemeral,
                });
            }

            // Ghi log sự kiện
            await logEvent({
                client,
                guild: interaction.guild,
                event: {
                    action: "Messages Purged",
                    target: `${channel} (${deletedCount} messages)`,
                    executor: `${interaction.user.tag}`,
                    reason: `Deleted ${deletedCount} messages`,
                }
            });

            await InteractionHelper.safeEditReply(interaction, {
                embeds: [successEmbed(`🗑️ Successfully deleted ${deletedCount} messages.`)],
                flags: MessageFlags.Ephemeral,
            });

            // Tự động xóa thông báo của bot sau 3 giây
            setTimeout(() => {
                interaction.deleteReply().catch(() => {});
            }, 3000);

        } catch (error) {
            logger.error('Purge error:', error);
            await InteractionHelper.safeEditReply(interaction, {
                embeds: [errorEmbed("Error", `Failed to delete messages: ${error.message}`)],
                flags: MessageFlags.Ephemeral,
            });
        }
    }
};

