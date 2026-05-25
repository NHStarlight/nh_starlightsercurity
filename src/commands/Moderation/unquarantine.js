import { SlashCommandBuilder } from 'discord.js';
import fs from 'fs';

const DB_PATH = './quarantine_data.json';

export default {
    data: new SlashCommandBuilder()
        .setName('unquarantine')
        .setDescription('remove quarantine role and give back previous role')
        .addUserOption(option => option.setName('user').setDescription('quarantine member').setRequired(true)),
    
    async execute(interaction) {
        const target = interaction.options.getMember('user');
        const data = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));

        if (!data[target.id]) {
            return interaction.reply({ content: 'cant find this person previous role.', ephemeral: true });
        }

        const oldRoles = data[target.id];
        await target.roles.set(oldRoles);

        // Xóa dữ liệu sau khi trả role
        delete data[target.id];
        fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));

        await interaction.reply({ content: `unquarantine success ${target.user.tag}.`, ephemeral: true });
    }
};
