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
            // 1. Fetch thêm 1 tin nhắn (là chính lệnh /purge)
            // Chúng ta lấy nhiều hơn 1 để trừ hao tin nhắn lệnh
            const fetched = await channel.messages.fetch({ limit: amount + 1 });

            // 2. Lọc bỏ tin nhắn chính là lệnh /purge mà người dùng vừa gõ
            // interaction.id là ID của câu lệnh
            const messagesToDelete = fetched.filter(msg => msg.id !== interaction.id);

            // 3. Cắt lấy đúng số lượng cần xóa (phòng trường hợp dư)
            const finalMessages = Array.from(messagesToDelete.values()).slice(0, amount);

            let deletedCount = 0;

            if (finalMessages.length === 0) {
                return await InteractionHelper.safeEditReply(interaction, {
                    embeds: [errorEmbed("Không tìm thấy", "Không có tin nhắn nào để xóa ngoài lệnh này.")],
                });
            }

            // 4. Thực hiện xóa
            if (finalMessages.length === 1) {
                await finalMessages[0].delete();
                deletedCount = 1;
            } else {
                const deleted = await channel.bulkDelete(finalMessages, true);
                deletedCount = deleted.size;
            }

            await InteractionHelper.safeEditReply(interaction, {
                embeds: [successEmbed(`🗑️ Đã xóa ${deletedCount} tin nhắn.`)],
                flags: MessageFlags.Ephemeral,
            });

            // Tự xóa thông báo sau 3s
            setTimeout(() => { interaction.deleteReply().catch(() => {}); }, 3000);

        } catch (error) {
            console.error(error);
            await InteractionHelper.safeEditReply(interaction, {
                embeds: [errorEmbed("Lỗi", "Không thể xóa tin nhắn. Chúng có thể quá cũ hoặc là tin nhắn hệ thống.")],
            });
        }
    }
};
