import { SlashCommandBuilder, PermissionsBitField, Colors } from 'discord.js';
import { logger } from '../../utils/logger.js';

export default {
    data: new SlashCommandBuilder()
        .setName('setup-quarantine')
        .setDescription('Create and setup the Quarantine role'),

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: 'You need Administrator permissions!', ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            const botMember = await interaction.guild.members.fetch(interaction.client.user.id);
            const botTopPosition = botMember.roles.highest.position;

            // Create the role without a position first (goes to bottom by default)
            const role = await interaction.guild.roles.create({
                name: 'Quarantine',
                color: Colors.Red,
                reason: 'Automated setup for Quarantine system',
            });

            // Re-fetch bot member to get accurate position after role creation
            // (role creation can shift positions)
            const refreshedBot = await interaction.guild.members.fetch(interaction.client.user.id);
            const currentBotTop = refreshedBot.roles.highest.position;

            // Place quarantine role exactly 1 below the bot's highest role
            await role.setPosition(currentBotTop - 1);

            // Lock all channels from Quarantine role
            const channels = interaction.guild.channels.cache;
            for (const [, channel] of channels) {
                if (channel.permissionOverwrites) {
                    await channel.permissionOverwrites.create(role, {
                        ViewChannel: false
                    }).catch(err => logger.warn(`Failed to update ${channel.name}: ${err.message}`));
                }
            }

            // Verify the final position
            const finalRole = await interaction.guild.roles.fetch(role.id);
            const finalBot  = await interaction.guild.members.fetch(interaction.client.user.id);
            const gap = finalBot.roles.highest.position - finalRole.position;

            await interaction.editReply(
                `✅ Quarantine role created (Red) and channels secured.\n` +
                `**Role ID:** ${role.id}\n` +
                `**Position:** ${finalRole.position} (${gap} below bot's highest role)`
            );
        } catch (error) {
            logger.error('Quarantine setup error:', error);
            await interaction.editReply('An error occurred while setting up the quarantine system.');
        }
    }
};
