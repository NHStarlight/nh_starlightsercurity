import { SlashCommandBuilder, PermissionsBitField } from 'discord.js';
import { pool } from '../../config/db.js';

export default {
    data: new SlashCommandBuilder()
        .setName('unquarantine')
        .setDescription('Remove quarantine and restore user roles')
        .addUserOption(option => option.setName('user').setDescription('The user to unquarantine').setRequired(true)),
    
    async execute(interaction) {
        const target = interaction.options.getMember('user');
        
        try {
            // Retrieve roles from PostgreSQL
            const res = await pool.query('SELECT roles FROM user_roles WHERE user_id = $1', [target.id]);

            if (res.rows.length === 0) {
                return interaction.reply({ content: 'No saved roles found for this user.', ephemeral: true });
            }

            const oldRoles = res.rows[0].roles;

            // Restore roles and remove quarantine role
            await target.roles.set(oldRoles);
            await pool.query('DELETE FROM user_roles WHERE user_id = $1', [target.id]);

            await interaction.reply({ content: `Successfully restored roles for ${target.user.tag}.`, ephemeral: true });
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'An error occurred while restoring roles.', ephemeral: true });
        }
    }
};
