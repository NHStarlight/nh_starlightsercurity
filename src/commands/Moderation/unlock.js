import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { errorEmbed, successEmbed } from '../../utils/embeds.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
    data: new SlashCommandBuilder()
        .setName("unlock")
        .setDescription("Unlock the channel instantly")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction, config, client) {
        await InteractionHelper.safeDefer(interaction);
        const channel = interaction.channel;

        try {
            // 1. Loại bỏ quyền chặn chat (SendMessages = null) cho tất cả role
            const newOverwrites = channel.permissionOverwrites.cache.map(o => ({
                id: o.id,
                allow: o.allow.remove(PermissionFlagsBits.SendMessages),
                deny: o.deny.remove(PermissionFlagsBits.SendMessages)
            }));

            // 2. Cập nhật toàn bộ trong 1 lần duy nhất
            await channel.permissionOverwrites.set(newOverwrites);

            await channel.send({ embeds: [successEmbed("🔓 Channel unlocked instantly.")] });
            await InteractionHelper.safeEditReply(interaction, {
                embeds: [successEmbed("🔓 Channel unlocked successfully.")],
                flags: MessageFlags.Ephemeral,
            });

        } catch (error) {
            console.error("Unlock error:", error);
            await InteractionHelper.safeEditReply(interaction, {
                embeds: [errorEmbed("Error", "Failed to unlock channel.")],
            });
        }
    }
};
