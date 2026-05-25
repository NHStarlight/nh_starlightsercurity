import { SlashCommandBuilder, ActionRowBuilder } from "discord.js";
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { createEmbed } from "../../utils/embeds.js";
import { createSelectMenu } from "../../utils/components.js";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CATEGORY_SELECT_ID = "help-category-select";
const ALL_COMMANDS_ID = "help-all-commands";

export async function createInitialHelpMenu(client) {
    const commandsPath = path.join(__dirname, "../../commands");
    const categoryDirs = (await fs.readdir(commandsPath, { withFileTypes: true }))
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name)
        .sort();

    const options = [{ label: "📋 All Commands", description: "View all commands", value: ALL_COMMANDS_ID },
        ...categoryDirs.map((category) => ({
            label: `📁 ${category.charAt(0).toUpperCase() + category.slice(1)}`,
            description: `View ${category} commands`,
            value: category
        }))
    ];

    const embed = createEmbed({ 
        title: `🤖 Starlight Security`,
        description: "Welcome! Use the menu below to navigate through my commands.",
        color: 'primary'
    });

    embed.setFooter({ text: "Starlight Security | Secure & Professional" });
    embed.setTimestamp();

    const selectRow = createSelectMenu(CATEGORY_SELECT_ID, "Select a category to view commands", options);

    return {
        embeds: [embed],
        components: [selectRow], // Chỉ để lại select menu, xóa bỏ buttonRow
    };
}

export default {
    data: new SlashCommandBuilder().setName("help").setDescription("Displays the help menu"),
    async execute(interaction, guildConfig, client) {
        await InteractionHelper.safeDefer(interaction);
        const { embeds, components } = await createInitialHelpMenu(client);
        await InteractionHelper.safeEditReply(interaction, { embeds, components });
    },
};
