import { SlashCommandBuilder } from "discord.js";
import { createInitialHelpMenu } from "../../utils/helpMenuHelper.js";

export default {
    data: new SlashCommandBuilder()
        .setName("help")
        .setDescription("Displays the help menu"),
    
    async execute(interaction, guildConfig, client) {
        // Lấy client an toàn
        const activeClient = client || interaction.client;
        
        await interaction.deferReply({ ephemeral: true });
        const { embeds, components } = await createInitialHelpMenu(activeClient);
        await interaction.editReply({ embeds, components });
    },
};
