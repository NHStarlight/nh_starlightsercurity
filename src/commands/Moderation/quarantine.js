import { SlashCommandBuilder, PermissionsBitField } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('quarantine')
        .setDescription('Quarantine a member by removing all roles and adding Quarantine role')
        .addUserOption(option => option.setName('user').setDescription('The user to quarantine').setRequired(true)),
    
    async execute(interaction) {
        // Kiểm tra quyền (Check permissions)
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
            return interaction.reply({ content: 'Missing permissions!', ephemeral: true });
        }

        const member = interaction.options.getMember('user');
        const quarantineRole = interaction.guild.roles.cache.find(r => r.name === 'Quarantine');
        
        if (!quarantineRole) {
            return interaction.reply({ content: 'Quarantine role not found! Please run /setup-quarantine first.', ephemeral: true });
        }

        try {
            // 1. Xóa sạch mọi role hiện tại (Remove all existing roles)
            await member.roles.set([]); 
            
            // 2. Thêm role Quarantine (Add Quarantine role)
            await member.roles.add(quarantineRole);
            
            await interaction.reply({ content: `User ${member.user.tag} has been quarantined and all roles removed.`, ephemeral: true });
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'Failed to quarantine the user. Make sure the bot has higher role permissions.', ephemeral: true });
        }
    }
};
