import { getCategoryEmbedAndPageCount, getAllCommandsEmbedAndPageCount, createHelpPaginationButtons } from '../../utils/helpMenuHelper.js';

export default {
    name: 'help',
    async execute(interaction, client, args) {
        try {
            // args format: [action, page, category]
            const action = args[0]; // 'next' or 'back'
            const currentPage = parseInt(args[1]) || 1;
            const category = args[2] || 'help-all-commands';

            const newPage = action === 'next' ? currentPage + 1 : currentPage - 1;

            let result;
            if (category === 'help-all-commands') {
                result = await getAllCommandsEmbedAndPageCount(newPage, client);
            } else {
                result = await getCategoryEmbedAndPageCount(category, newPage, client);
            }

            const { embed, totalPages } = result;
            const row = createHelpPaginationButtons(newPage, totalPages, category);

            await interaction.editReply({
                embeds: [embed],
                components: [row]
            });
        } catch (error) {
            console.error('Error in help button handler:', error);
            await interaction.editReply({ content: '❌ An error occurred while updating the help menu.' });
        }
    }
};
