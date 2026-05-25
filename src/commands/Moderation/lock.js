import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { errorEmbed, successEmbed } from '../../utils/embeds.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
    data: new SlashCommandBuilder()
        .setName("lock")
        .setDescription("Lock the channel for all roles")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction, config, client) {
        await InteractionHelper.safeDefer(interaction);
        const channel = interaction.channel;
        const guild = interaction.guild;

        try {
            const overwrites = channel.permissionOverwrites.cache;
            
            // Tạo danh sách các ID cần xử lý
            const roleIds = [...overwrites.keys(), guild.roles.everyone.id];
            
            // Xử lý từng role một, dùng try-catch bên trong để tránh làm chết cả lệnh
            for (const id of roleIds) {
                try {
                    await channel.permissionOverwrites.edit(id, { SendMessages: false });
                } catch (e) {
                    console.log(`Skipping role ${id}:`, e.message);
                }
            }

            await InteractionHelper.safeEditReply(interaction, {
                embeds: [successEmbed("🔒 Channel locked successfully.")],
                flags: MessageFlags.Ephemeral,
            });

        } catch (error) {
            console.error("Critical lock error:", error);
            await InteractionHelper.safeEditReply(interaction, {
                embeds: [errorEmbed("Error", "Failed to process lock command.")],
            });
        }
    }
};
