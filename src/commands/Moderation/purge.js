import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { errorEmbed, successEmbed } from '../../utils/embeds.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
    data: new SlashCommandBuilder()
        .setName("purge")
        .setDescription("Xóa tin nhắn")
        .addIntegerOption((option) =>
            option.setName("amount")
                .setDescription("Số lượng (1-100)")
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction, config, client) {
        await InteractionHelper.safeDefer(interaction);

        const amount = interaction.options.getInteger("amount");
        const channel = interaction.channel;

        try {
            // 1. Fetch nhiều hơn 1 tin so với yêu cầu (cộng thêm 1 cho chính tin nhắn lệnh của bạn)
            const fetched = await channel.messages.fetch({ limit: amount + 1 });

            // 2. Chuyển thành mảng và cắt bỏ tin nhắn đầu tiên (chính là tin nhắn lệnh của bạn)
            const messagesToDelete = Array.from(fetched.values()).slice(1);

            if (messagesToDelete.length === 0) {
                return await InteractionHelper.safeEditReply(interaction, {
                    embeds: [errorEmbed("Không tìm thấy", "Không có tin nhắn nào để xóa.")],
                });
            }

            let deletedCount = 0;

            // 3. Xử lý xóa
            if (messagesToDelete.length === 1) {
                // Xóa 1 tin đơn lẻ
                await messagesToDelete[0].delete();
                deletedCount = 1;
            } else {
                // Xóa nhiều tin
                const deleted = await channel.bulkDelete(messagesToDelete, true);
                deletedCount = deleted.size;
            }

            await InteractionHelper.safeEditReply(interaction, {
                embeds: [successEmbed(`🗑️ Đã xóa ${deletedCount} tin nhắn.`)],
                flags: MessageFlags.Ephemeral,
            });

            setTimeout(() => { interaction.deleteReply().catch(() => {}); }, 3000);

        } catch (error) {
            console.error(error);
            await InteractionHelper.safeEditReply(interaction, {
                embeds: [errorEmbed("Lỗi", "Không thể xóa tin nhắn. (Có thể do tin quá cũ hoặc lỗi hệ thống).")],
            });
        }
    }
};
