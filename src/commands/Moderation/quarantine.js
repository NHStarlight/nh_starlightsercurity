import { SlashCommandBuilder, PermissionsBitField, Colors } from 'discord.js';
import db from '../../Utility/src/config/db.js'; // Adjust this path to your db.js

// Function to ensure table exists
async function ensureDatabase() {
    await db.query(`
        CREATE TABLE IF NOT EXISTS quarantine_data (
            user_id VARCHAR(20) PRIMARY KEY,
            roles TEXT NOT NULL
        )
    `);
}

async function ensureQuarantineRole(guild, botMember) {
    let role = guild.roles.cache.find(r => r.name === 'Quarantine');
    if (!role) {
        role = await guild.roles.create({
            name: 'Quarantine',
            color: Colors.Red,
            reason: 'Auto-created Quarantine role'
        });
    }
    const botTopRolePosition = botMember.roles.highest.position;
    if (role.position < botTopRolePosition - 1) {
        await role.setPosition(botTopRolePosition - 1).catch(console.error);
    }
    return role;
}

export default {
    data: new SlashCommandBuilder()
        .setName('quarantine')
        .setDescription('Quarantine a member')
        .addUserOption(option => option.setName('user').setDescription('Member to quarantine').setRequired(true)),
    
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        // Ensure database table exists before proceeding
        try {
            await ensureDatabase();
        } catch (err) {
            console.error('Failed to init database table:', err);
        }

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
            return interaction.editReply({ content: 'You do not have permission.' });
        }

        const member = interaction.options.getMember('user');
        if (!member) return interaction.editReply({ content: 'Member not found.' });

        const botMember = await interaction.guild.members.fetch(interaction.client.user.id);
        const quarantineRole = await ensureQuarantineRole(interaction.guild, botMember);
        
        const rolesToSave = member.roles.cache.filter(r => r.id !== interaction.guild.id && r.id !== quarantineRole.id).map(r => r.id);
        
        try {
            await db.query(
                'INSERT INTO quarantine_data (user_id, roles) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET roles = $2',
                [member.id, JSON.stringify(rolesToSave)]
            );

            await member.roles.set([quarantineRole.id]);
            await interaction.editReply({ content: `Successfully quarantined ${member.user.tag}.` });
        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: 'Failed to apply quarantine. Check role hierarchy.' });
        }
    }
};
