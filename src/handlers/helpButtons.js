export const helpBugReportButton = {
    name: BUG_REPORT_BUTTON_ID,
    async execute(interaction, client) {
        const contactButton = new ButtonBuilder()
            .setLabel('💬 Contact Developer')
            .setStyle(ButtonStyle.Link)
            .setURL('https://discord.com/users/1198136184526864475'); 

        const bugRow = new ActionRowBuilder().addComponents(contactButton);

        const bugReportEmbed = createEmbed({
            title: '🐞 Report Bug / Contact',
            description: 'Found a bug or have a suggestion? Please contact the developer directly!\n\n' +
                '**When reporting, please include:**\n' +
                '• 📝 Detailed description of the issue\n' +
                '• 📋 Steps to reproduce the problem\n' +
                '• 📸 Screenshots if applicable\n\n' +
                'I will get back to you as soon as possible!',
            color: 'primary'
        });
        
        bugReportEmbed.setFooter({
            text: 'Starlight Security System',
            iconURL: client.user.displayAvatarURL()
        });
        bugReportEmbed.setTimestamp();

        await interaction.reply({
            embeds: [bugReportEmbed],
            components: [bugRow],
            flags: MessageFlags.Ephemeral
        });
    },
};
