import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { errorEmbed, successEmbed } from '../../utils/embeds.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
    data: new SlashCommandBuilder()
        .setName("lock")
        .setDescription("Lock the channel for ALL roles")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction, config, client) {
        await InteractionHelper.safeDefer(interaction);

        const channel = interaction.channel;
        const guild = interaction.guild;

        try {
            const permissionOverwrites = channel.permissionOverwrites.cache;

            for (const [id, overwrite] of permissionOverwrites) {
                await channel.permissionOverwrites.edit(id, {
                    SendMessages: false
                });
            }

            await channel.permissionOverwrites.edit(guild.roles.everyone, {
                SendMessages: false
            });

            // Gửi thông báo công khai vào kênh
            await channel.send({
                embeds: [successEmbed("🔒 This channel has been locked by a moderator.")]
            });

            await InteractionHelper.safeEditReply(interaction, {
                embeds: [successEmbed("🔒 Channel locked successfully.")],
                flags: MessageFlags.Ephemeral,
            });

        } catch (error) {
            console.error("Lock command error:", error);
            await InteractionHelper.safeEditReply(interaction, {
                embeds: [errorEmbed("Error", `Failed to lock: ${error.message}`)],
            });
        }
    }
};
