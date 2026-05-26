import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { createEmbed } from "../../utils/embeds.js";
import { createSelectMenu } from "../../utils/components.js";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CATEGORY_SELECT_ID = "help-category-select";
const ALL_COMMANDS_ID = "help-all-commands";
const BUG_REPORT_BUTTON_ID = "help-bug-report";

const CATEGORY_ICONS = {
    Core: "ℹ️", Moderation: "🛡️", Fun: "🎮", Leveling: "📊", Utility: "🔧",
    Ticket: "🎫", Welcome: "👋", Giveaway: "🎉", Counter: "🔢", Tools: "🛠️",
    Search: "🔍", Reaction_Roles: "🎭", Community: "👥", Birthday: "🎂", Config: "⚙️",
};

export async function createInitialHelpMenu(client) {
    const commandsPath = path.join(__dirname, "../../commands");
    const categoryDirs = (await fs.readdir(commandsPath, { withFileTypes: true }))
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name)
        .sort();

    const options = [
        { label: "📋 All Commands", description: "View all available commands with pagination", value: ALL_COMMANDS_ID },
        ...categoryDirs.map((category) => {
            const categoryName = category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();
            const icon = CATEGORY_ICONS[categoryName] || "🔍";
            return { label: `${icon} ${categoryName}`, description: `View commands in the ${categoryName} category`, value: category };
        }),
    ];

    const botName = client?.user?.username || "Starlight Security";
    const embed = createEmbed({
        title: `🤖 ${botName} Help Center`,
        description: "Welcome to Starlight Security! Your all-in-one companion for server protection and management.",
        color: 'primary'
    });

    embed.setFooter({ text: "Starlight Security | Secured by Dev" });
    embed.setTimestamp();

    const bugReportButton = new ButtonBuilder()
        .setCustomId(BUG_REPORT_BUTTON_ID)
        .setLabel("Contact Developer")
        .setStyle(ButtonStyle.Primary);

    const selectRow = createSelectMenu(CATEGORY_SELECT_ID, "Select to view the commands", options);
    const buttonRow = new ActionRowBuilder().addComponents([bugReportButton]);

    return { embeds: [embed], components: [buttonRow, selectRow] };
}

export default {
    data: new SlashCommandBuilder()
        .setName("help")
        .setDescription("Displays the help menu with all available commands"),
    
    async execute(interaction, guildConfig, client) {
        await interaction.deferReply({ ephemeral: true }).catch(console.error);
        const { embeds, components } = await createInitialHelpMenu(client);
        await interaction.editReply({ embeds, components }).catch(console.error);
    },
};
