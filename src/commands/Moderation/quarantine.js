import { SlashCommandBuilder, PermissionsBitField } from 'discord.js';
import fs from 'fs';

const DB_PATH = './quarantine_data.json';

// Hàm đọc dữ liệu từ file
const loadData = () => {
    if (!fs.existsSync(DB_PATH)) return {};
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
};

export default {
    data: new SlashCommandBuilder()
        .setName('quarantine')
        .setDescription('Quarantine a member')
        .addUserOption(option => option.setName('user').setDescription('member need to quarantine').setRequired(true)),
    
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) return;

        const member = interaction.options.getMember('user');
        const quarantineRole = interaction.guild.roles.cache.find(r => r.name === 'Quarantine');
        
        // Lưu role cũ vào object
        const data = loadData();
        data[member.id] = member.roles.cache.filter(r => r.id !== interaction.guild.id && r.id !== quarantineRole.id).map(r => r.id);
        
        // Ghi lại vào file json
        fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));

        await member.roles.set([quarantineRole.id]);
        await interaction.reply({ content: `success quarantine ${member.user.tag}.`, ephemeral: true });
    }
};
