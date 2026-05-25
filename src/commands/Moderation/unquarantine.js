import { SlashCommandBuilder, PermissionsBitField } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('unquarantine')
        .setDescription('Remove quarantine role from a member')
        .addUserOption(option => option.setName('user').setDescription('The user to unquarantine').setRequired(true)),
    
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
            return interaction.reply({ content: 'Missing permissions!', ephemeral: true });
        }

        const member = interaction.options.getMember('user');
        const quarantineRole = interaction.guild.roles.cache.find(r => r.name === 'Quarantine');
        
        if (!quarantineRole) {
            return interaction.reply({ content: 'Quarantine role not found!', ephemeral: true });
        }

        try {
            // Remove the Quarantine role
            await member.roles.remove(quarantineRole);
            await interaction.reply({ content: `User ${member.user.tag} has been unquarantined.`, ephemeral: true });
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'Failed to unquarantine the user.', ephemeral: true });
        }
    }
};
