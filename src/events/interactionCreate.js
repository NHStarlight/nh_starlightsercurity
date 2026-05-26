import { Events, MessageFlags } from 'discord.js';
import { logger } from '../utils/logger.js';
import { getGuildConfig } from '../services/guildConfig.js';
import { handleApplicationModal } from '../commands/Community/apply.js';
import { handleApplicationReviewModal } from '../commands/Community/app-admin.js';
import { handleInteractionError, createError, ErrorTypes } from '../utils/errorHandler.js';
import { MessageTemplates } from '../utils/messageTemplates.js';
import { InteractionHelper } from '../utils/interactionHelper.js';
import { createInteractionTraceContext, runWithTraceContext } from '../utils/traceContext.js';
import { validateChatInputPayloadOrThrow } from '../utils/commandInputValidation.js';
import { enforceAbuseProtection, formatCooldownDuration } from '../utils/abuseProtection.js';

function withTraceContext(context = {}, traceContext = {}) {
  return {
    traceId: traceContext.traceId,
    guildId: context.guildId || traceContext.guildId,
    userId: context.userId || traceContext.userId,
    command: context.commandName || traceContext.command,
    ...context
  };
}

// HÀM TỰ ĐỘNG XÁC NHẬN TƯƠNG TÁC
async function autoAcknowledge(interaction) {
  if (!interaction.deferred && !interaction.replied) {
    if (interaction.isButton() || interaction.isStringSelectMenu()) {
      await interaction.deferUpdate().catch(() => {});
    }
  }
}

export default {
  name: Events.InteractionCreate,
  async execute(interaction, client) {
    const interactionTraceContext = createInteractionTraceContext(interaction);
    interaction.traceContext = interactionTraceContext;
    interaction.traceId = interactionTraceContext.traceId;

    return runWithTraceContext(interactionTraceContext, async () => {
      try {
        InteractionHelper.patchInteractionResponses(interaction);

        // TỰ ĐỘNG XÁC NHẬN NÚT BẤM / MENU NGAY TẠI ĐÂY
        if (interaction.isButton() || interaction.isStringSelectMenu()) {
            await autoAcknowledge(interaction);
        }

        if (interaction.isChatInputCommand()) {
          const command = client.commands.get(interaction.commandName);
          if (!command) {
            logger.warn(`Unknown command: ${interaction.commandName}`);
            return;
          }
          await command.execute(interaction, await getGuildConfig(client, interaction.guildId), client);
        } 
        else if (interaction.isButton()) {
          logger.debug(`Button pressed: ${interaction.customId}`);
          const [customId, ...args] = interaction.customId.split(':');
          
          const button = client.buttons.get(customId);
          
          if (button) await button.execute(interaction, client, args);
          else logger.warn(`No button handler found for: ${customId}`);
        } 
        else if (interaction.isStringSelectMenu()) {
          logger.debug(`Select menu: ${interaction.customId}`);
          const [customId, ...args] = interaction.customId.split(':');
          
          const selectMenu = client.selectMenus.get(customId);
          if (selectMenu) await selectMenu.execute(interaction, client, args);
          else logger.warn(`No select menu handler found for: ${customId}`);
        }
        else if (interaction.isModalSubmit()) {
           // ... (giữ nguyên logic modal cũ) ...
           const [customId, ...args] = interaction.customId.split(':');
           const modal = client.modals.get(customId);
           if (modal) await modal.execute(interaction, client, args);
        }
      } catch (error) {
        await handleInteractionError(interaction, error, withTraceContext({type: 'general'}, interactionTraceContext));
      }
    });
  }
};
