import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { errorEmbed, successEmbed } from '../../utils/embeds.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { logger } from '../../utils/logger.js';

const MAX_AMOUNT = 1000;
const BATCH_SIZE = 100;  // Discord bulk delete limit
const MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000; // 14 days — Discord hard limit for bulkDelete

export default {
    data: new SlashCommandBuilder()
        .setName("purge")
        .setDescription(`Delete messages in bulk (up to ${MAX_AMOUNT})`)
        .addIntegerOption(option =>
            option.setName("amount")
                .setDescription(`Number of messages to delete (1–${MAX_AMOUNT})`)
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(MAX_AMOUNT)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction, config, client) {
        const isPrefix = interaction._isPrefix === true;

        // Slash: defer ephemerally so the "thinking…" message doesn't count as a channel message
        if (!isPrefix) {
            await InteractionHelper.safeDefer(interaction, { flags: MessageFlags.Ephemeral });
        }

        let amount = interaction.options.getInteger("amount") ?? 10;
        amount = Math.max(1, Math.min(amount, MAX_AMOUNT));

        const channel = interaction.channel;

        try {
            let totalDeleted = 0;
            let remaining = amount;

            while (remaining > 0) {
                const batchLimit = Math.min(remaining, BATCH_SIZE);
                const fetched = await channel.messages.fetch({ limit: batchLimit });

                if (fetched.size === 0) break;

                // bulkDelete only works on messages < 14 days old
                const cutoff = Date.now() - MAX_AGE_MS;
                const deletable = fetched.filter(msg => msg.createdTimestamp > cutoff);

                if (deletable.size === 0) break;

                let deleted = 0;
                if (deletable.size === 1) {
                    await deletable.first().delete();
                    deleted = 1;
                } else {
                    const result = await channel.bulkDelete(deletable, true);
                    deleted = result.size;
                }

                totalDeleted += deleted;
                remaining -= deleted;

                // Fewer messages fetched than requested → no more messages available
                if (fetched.size < batchLimit) break;

                // Small delay between batches to avoid rate-limits on large purges
                if (remaining > 0) await new Promise(r => setTimeout(r, 500));
            }

            if (totalDeleted === 0) {
                const err = errorEmbed("No Messages Deleted", "No eligible messages found (they may be older than 14 days or system messages).");
                return isPrefix
                    ? channel.send({ embeds: [err] })
                    : InteractionHelper.safeEditReply(interaction, { embeds: [err] });
            }

            const success = successEmbed(`🗑️ Deleted **${totalDeleted}** message${totalDeleted !== 1 ? 's' : ''}.`);

            if (isPrefix) {
                const msg = await channel.send({ embeds: [success] });
                setTimeout(() => msg.delete().catch(() => {}), 3000);
            } else {
                await InteractionHelper.safeEditReply(interaction, { embeds: [success] });
                setTimeout(() => interaction.deleteReply().catch(() => {}), 3000);
            }

        } catch (error) {
            logger.error("Purge error:", error);
            const err = errorEmbed("Error", "Failed to delete messages. They may be older than 14 days or be system messages.");
            isPrefix
                ? await channel.send({ embeds: [err] })
                : await InteractionHelper.safeEditReply(interaction, { embeds: [err] });
        }
    }
};
