export const helpBugReportButton = {
    name: BUG_REPORT_BUTTON_ID,
    async execute(interaction, client) {
        // 1. Tạo nút Link (chỉ dùng để mở link)
        const contactButton = new ButtonBuilder()
            .setLabel('💬 Contact Developer')
            .setStyle(ButtonStyle.Link)
            .setURL('https://discord.com/users/1198136184526864475');

        const bugRow = new ActionRowBuilder().addComponents(contactButton);

        // 2. Tạo Embed thông báo
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

        // 3. Phản hồi an toàn
        // Sử dụng followUp nếu interaction đã được xử lý (acknowledged)
        try {
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({
                    embeds: [bugReportEmbed],
                    components: [bugRow],
                    flags: MessageFlags.Ephemeral
                });
            } else {
                await interaction.reply({
                    embeds: [bugReportEmbed],
                    components: [bugRow],
                    flags: MessageFlags.Ephemeral
                });
            }
        } catch (error) {
            console.error('Interaction error:', error);
        }
    },
};
