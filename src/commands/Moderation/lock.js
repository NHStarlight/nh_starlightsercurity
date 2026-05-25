import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { errorEmbed, successEmbed } from '../../utils/embeds.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
    data: new SlashCommandBuilder()
        .setName("lock")
        .setDescription("Lock the channel instantly")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction, config, client) {
        await InteractionHelper.safeDefer(interaction);
        const channel = interaction.channel;
        const guild = interaction.guild;

        try {
            // Lấy danh sách quyền hiện tại và tạo danh sách mới đã chặn SendMessages
            const newOverwrites = channel.permissionOverwrites.cache.map(o => ({
                id: o.id,
                allow: o.allow.remove(PermissionFlagsBits.SendMessages),
                deny: o.deny.add(PermissionFlagsBits.SendMessages)
            }));

            // Đảm bảo @everyone luôn nằm trong danh sách chặn
            if (!newOverwrites.find(o => o.id === guild.roles.everyone.id)) {
                newOverwrites.push({
                    id: guild.roles.everyone.id,
                    deny: [PermissionFlagsBits.SendMessages]
                });
            }

            // Áp dụng tất cả thay đổi trong 1 lần gọi (Cực nhanh)
            await channel.permissionOverwrites.set(newOverwrites);

            // Chỉ gửi 1 thông báo duy nhất (Ephemeral)
            await InteractionHelper.safeEditReply(interaction, {
                embeds: [successEmbed("🔒 Channel locked successfully.")],
                flags: MessageFlags.Ephemeral,
            });

        } catch (error) {
            console.error("Lock error:", error);
            await InteractionHelper.safeEditReply(interaction, {
                embeds: [errorEmbed("Error", "Failed to lock channel.")],
            });
        }
    }
};
