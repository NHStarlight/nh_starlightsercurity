export default {
    name: 'help-bug-report',
    async execute(interaction) {
        // Phản hồi ngay lập tức để Discord không báo lỗi
        await interaction.reply({ 
            content: "Bạn có thể liên hệ với Developer tại đây: [Link Liên Hệ Của Bạn]", 
            ephemeral: true 
        }).catch(console.error);
    }
};
