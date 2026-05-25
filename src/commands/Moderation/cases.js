import { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, MessageFlags } from 'discord.js';
import { createEmbed, errorEmbed, successEmbed } from '../../utils/embeds.js';
import { getModerationCases } from '../../utils/moderation.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
    data: new SlashCommandBuilder()
        .setName('cases')
        .setDescription('View moderation cases and audit logs')
        .setDefaultMemberPermissions(PermissionFlagsBits.ViewAuditLog)
        .setDMPermission(false)
        .addStringOption(option =>
            option.setName('filter')
                .setDescription('Filter cases by type or user')
                .addChoices(
                    { name: 'All Cases', value: 'all' },
                    { name: 'Bans', value: 'Member Banned' },
                    { name: 'Kicks', value: 'Member Kicked' },
                    { name: 'Timeouts', value: 'Member Timed Out' },
                    { name: 'Warnings', value: 'User Warned' }
                )
        )
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Filter cases by specific user')
        )
        .addIntegerOption(option =>
            option.setName('limit')
                .setDescription('Number of cases to show (default: 10)')
                .setMinValue(1)
                .setMaxValue(50)
        ),

    async execute(interaction, config, client) {
        const deferSuccess = await InteractionHelper.safeDefer(interaction);
        if (!deferSuccess) {
            logger.warn(`Cases interaction defer failed`, {
                userId: interaction.user.id,
                guildId: interaction.guildId,
                commandName: 'cases'
            });
            return;
        }

        // Đưa targetUser ra ngoài phạm vi try-catch để khối catch bên dưới có thể đọc được dữ liệu nếu lỗi
        let targetUser = null;
        let filterType = 'all';

        try {
            filterType = interaction.options.getString('filter') || 'all';
            targetUser = interaction.options.getUser('user');
            const limit = interaction.options.getInteger('limit') || 10;

            const filters = {
                limit,
                action: filterType === 'all' ? undefined : filterType,
                userId: targetUser?.id
            };

            const cases = await getModerationCases(interaction.guild.id, filters);

            // Xử lý trực tiếp trường hợp mảng rỗng hoặc không tìm thấy dữ liệu vi phạm
            if (!cases || cases.length === 0) {
                const noCaseDesc = targetUser 
                    ? `Không tìm thấy case vi phạm nào của người dùng **${targetUser.tag}** (ID: ${targetUser.id}) trong hệ thống.`
                    : `Không tìm thấy bất kỳ dữ liệu vi phạm nào thuộc loại danh mục "${filterType === 'all' ? 'Tất cả' : filterType}" trong server này.`;

                return InteractionHelper.safeEditReply(interaction, {
                    embeds: [errorEmbed('📋 Kết quả tra cứu', noCaseDesc)],
                    flags: MessageFlags.Ephemeral
                });
            }

            const CASES_PER_PAGE = 5;
            const totalPages = Math.ceil(cases.length / CASES_PER_PAGE);
            let currentPage = 1;

            const createCasesEmbed = (page) => {
                const startIndex = (page - 1) * CASES_PER_PAGE;
                const endIndex = startIndex + CASES_PER_PAGE;
                const pageCases = cases.slice(startIndex, endIndex);

                const embed = createEmbed({
                    title: '📋 Moderation Cases',
                    description: `Showing moderation cases for **${interaction.guild.name}**\n\n**Page ${page} of ${totalPages}**`
                });

                pageCases.forEach(case_ => {
                    const date = new Date(case_.createdAt).toLocaleDateString();
                    const time = new Date(case_.createdAt).toLocaleTimeString();
                    
                    embed.addFields({
                        name: `Case #${case_.caseId} - ${case_.action}`,
                        value: `**Target:** ${case_.target}\n**Moderator:** ${case_.executor}\n**Date:** ${date} at ${time}\n**Reason:** ${case_.reason || 'No reason provided'}`,
                        inline: false
                    });
                });

                embed.setFooter({
                    text: `Total cases: ${cases.length} | Filter: ${filterType}${targetUser ? ` | User: ${targetUser.tag}` : ''}`
                });

                return embed;
            };

            const createNavigationRow = (page) => {
                const row = new ActionRowBuilder();
                
                const prevButton = new ButtonBuilder()
                    .setCustomId('prev_page')
                    .setLabel('⬅️ Previous')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(page === 1);

                const pageInfoButton = new ButtonBuilder()
                    .setCustomId('page_info')
                    .setLabel(`Page ${page}/${totalPages}`)
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(true);

                const nextButton = new ButtonBuilder()
                    .setCustomId('next_page')
                    .setLabel('Next ➡️')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(page === totalPages);

                row.addComponents(prevButton, pageInfoButton, nextButton);
                return row;
            };

            const message = await interaction.editReply({ 
                embeds: [createCasesEmbed(currentPage)], 
                components: [createNavigationRow(currentPage)]
            });

            const collector = message.createMessageComponentCollector({
                componentType: ComponentType.Button,
                time: 120000
            });

            collector.on('collect', async (buttonInteraction) => {
                await buttonInteraction.deferUpdate();

                if (buttonInteraction.user.id !== interaction.user.id) {
                    await buttonInteraction.followUp({
                        content: 'You cannot use these buttons. Run `/cases` to get your own case view.',
                        flags: MessageFlags.Ephemeral
                    });
                    return;
                }

                const { customId } = buttonInteraction;

                if (customId === 'prev_page' && currentPage > 1) {
                    currentPage--;
                } else if (customId === 'next_page' && currentPage < totalPages) {
                    currentPage++;
                }

                await buttonInteraction.editReply({
                    embeds: [createCasesEmbed(currentPage)],
                    components: [createNavigationRow(currentPage)]
                });
            });

            collector.on('end', async () => {
                const disabledRow = createNavigationRow(currentPage);
                disabledRow.components.forEach(button => button.setDisabled(true));
                
                try {
                    await message.edit({
                        components: [disabledRow]
                    });
                } catch (error) {
                    // Tránh lỗi sập bot khi tin nhắn đã bị xóa trước khi bộ đếm kết thúc
                }
            });

        } catch (error) {
            // Tối ưu khối catch: Log chi tiết lỗi ra console của Railway để tiện theo dõi
            logger.error('Error in cases command:', error);

            const errDesc = targetUser 
                ? `Không tìm thấy dữ liệu vi phạm của **${targetUser.tag}** (ID: ${targetUser.id}). Hệ thống phản hồi: ${error.message || error}`
                : `Không tìm thấy lịch sử vi phạm nào trong máy chủ hoặc hệ thống đang gặp sự cố kết nối Database.`;

            return InteractionHelper.safeEditReply(interaction, {
                embeds: [
                    errorEmbed('📋 Thông tin tra cứu', errDesc)
                ],
                flags: MessageFlags.Ephemeral
            });
        }
    }
};
