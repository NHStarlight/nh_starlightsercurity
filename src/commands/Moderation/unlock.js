import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { errorEmbed, successEmbed } from '../../utils/embeds.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
    data: new SlashCommandBuilder()
        .setName("unlock")
        .setDescription("Unlock the channel for EVERYONE and all specific roles")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction, config, client) {
        await InteractionHelper.safeDefer(interaction);
        const channel = interaction.channel;
        const guild = interaction.guild;

        try {
            const overwrites = channel.permissionOverwrites.cache;

            // Xóa quyền (set null) để trả về trạng thái mặc định cho từng đối tượng
            const tasks = overwrites.map(o => 
                channel.permissionOverwrites.edit(o.id, { SendMessages: null })
            );

            tasks.push(channel.permissionOverwrites.edit(guild.roles.everyone.id, { SendMessages: null }));

            await Promise.all(tasks);

            await InteractionHelper.safeEditReply(interaction, {
                embeds: [successEmbed("🔓 Unlocked: All restrictions removed.")],
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
