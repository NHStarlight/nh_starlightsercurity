import { SlashCommandBuilder, PermissionsBitField } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('quarantine')
        .setDescription('Quarantine a member')
        .addUserOption(option => option.setName('user').setDescription('The user to quarantine').setRequired(true)),
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
            return interaction.reply({ content: 'Missing permissions!', ephemeral: true });
        }
        const member = interaction.options.getMember('user');
        await member.roles.set([]); // Cách ly bằng cách xóa sạch role
        await interaction.reply(`User ${member.user.tag} has been quarantined.`);
    }
};
