import { SlashCommandBuilder, PermissionsBitField, Colors } from 'discord.js';
// Đường dẫn này lùi 2 cấp từ src/commands/Moderation/ để ra src/ rồi vào utils/
import db from '../../utils/database.js'; 

export default {
    data: new SlashCommandBuilder()
        .setName('quarantine')
        .setDescription('Quarantine a member')
        .addUserOption(option => option.setName('user').setDescription('Member').setRequired(true)),
    
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const member = interaction.options.getMember('user');
        if (!member) return interaction.editReply({ content: 'Member not found.' });

        // Logic check role
        let role = interaction.guild.roles.cache.find(r => r.name === 'Quarantine');
        if (!role) {
            role = await interaction.guild.roles.create({ name: 'Quarantine', color: Colors.Red });
        }

        const rolesToSave = member.roles.cache.filter(r => r.id !== interaction.guild.id && r.id !== role.id).map(r => r.id);
        
        try {
            // DB query
            await db.query(
                'INSERT INTO quarantine_data (user_id, roles) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET roles = $2',
                [member.id, JSON.stringify(rolesToSave)]
            );

            await member.roles.set([role.id]);
            await interaction.editReply({ content: `Successfully quarantined ${member.user.tag}.` });
        } catch (error) {
            console.error('Lỗi Database:', error);
            await interaction.editReply({ content: 'Database error. Check terminal.' });
        }
    }
};
