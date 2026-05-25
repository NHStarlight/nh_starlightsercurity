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
            // 1. Tạo mảng quyền mới dựa trên các quyền hiện tại
            const newOverwrites = channel.permissionOverwrites.cache.map(o => ({
                id: o.id,
                allow: o.allow.remove(PermissionFlagsBits.SendMessages),
                deny: o.deny.add(PermissionFlagsBits.SendMessages)
            }));

            // 2. Đảm bảo @everyone luôn có trong danh sách chặn
            if (!newOverwrites.find(o => o.id === guild.roles.everyone.id)) {
                newOverwrites.push({
                    id: guild.roles.everyone.id,
                    deny: [PermissionFlagsBits.SendMessages]
                });
            }

            // 3. Cập nhật toàn bộ trong 1 lần gọi duy nhất (Cực nhanh)
            await channel.permissionOverwrites.set(newOverwrites);

            // Gửi thông báo
            await channel.send({ embeds: [successEmbed("🔒 Channel locked instantly.")] });
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
