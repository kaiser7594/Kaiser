import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { successEmbed } from '../../utils/embeds.js';
import { logModerationAction } from '../../utils/moderation.js';
import { logger } from '../../utils/logger.js';
import { WarningService } from '../../services/warningService.js';
import { handleInteractionError, TitanBotError, ErrorTypes } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
    data: new SlashCommandBuilder()
        .setName("removewarn")
        .setDescription("Remove a warning from a user by ID")
        .addStringOption((o) =>
            o
                .setName("user_id")
                .setRequired(true)
                .setDescription("Raw user ID"),
        )
        .addStringOption((o) =>
            o
                .setName("warning")
                .setRequired(false)
                .setDescription("Warning number from /warnings (omit to remove the most recent)"),
        )
        .addStringOption((o) =>
            o
                .setName("reason")
                .setRequired(false)
                .setDescription("Reason for removing this warning"),
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    category: "moderation",

    async execute(interaction, config, client) {
        const deferSuccess = await InteractionHelper.safeDefer(interaction);
        if (!deferSuccess) return;

        try {
            const rawId = (
                interaction.options.getString("user_id") ||
                interaction.options.data.find((o) => o.type === 6 || o.type === 3)?.value ||
                ""
            ).toString().trim().replace(/[<@!>]/g, "");

            if (!/^\d{17,20}$/.test(rawId)) {
                throw new TitanBotError("Invalid user ID", ErrorTypes.VALIDATION, "Please provide a valid user ID (17-20 digits).");
            }

            const target = await client.users.fetch(rawId).catch(() => null);
            if (!target) {
                throw new TitanBotError("User not found", ErrorTypes.VALIDATION, "Could not resolve that user ID.");
            }

            const warnings = await WarningService.getWarnings(interaction.guildId, rawId);
            if (!warnings.length) {
                throw new TitanBotError("No warnings", ErrorTypes.VALIDATION, `${target.tag} has no warnings to remove.`);
            }

            const warningArg = interaction.options.getString("warning");
            let chosen;
            if (warningArg) {
                const num = parseInt(warningArg, 10);
                if (!Number.isInteger(num) || num < 1 || num > warnings.length) {
                    chosen = warnings.find(w => String(w.id) === String(warningArg));
                    if (!chosen) {
                        throw new TitanBotError(
                            "Warning not found",
                            ErrorTypes.VALIDATION,
                            `Warning #${warningArg} not found. This user has ${warnings.length} warning(s). Use /warnings to view them.`
                        );
                    }
                } else {
                    chosen = warnings[num - 1];
                }
            } else {
                chosen = warnings[warnings.length - 1];
            }

            const removalReason = interaction.options.getString("reason") || "No reason provided";
            const result = await WarningService.removeWarning(interaction.guildId, rawId, chosen.id);
            if (!result?.success) {
                throw new TitanBotError(
                    "Remove failed",
                    ErrorTypes.DATABASE,
                    result?.error || "Failed to remove warning. Please try again."
                );
            }

            await logModerationAction({
                client,
                guild: interaction.guild,
                event: {
                    action: "Warning Removed",
                    target: `${target.tag} (${target.id})`,
                    executor: `${interaction.user.tag} (${interaction.user.id})`,
                    reason: `Removal: ${removalReason} | Original: ${chosen.reason || 'N/A'}`,
                    metadata: {
                        userId: target.id,
                        moderatorId: interaction.user.id,
                        warningId: chosen.id,
                        remaining: warnings.length - 1
                    }
                }
            });

            await InteractionHelper.safeEditReply(interaction, {
                embeds: [
                    successEmbed(
                        `✅ Warning removed from ${target.tag}`,
                        `**Original Reason:** ${chosen.reason || 'N/A'}\n**Removal Reason:** ${removalReason}\n**Remaining Warnings:** ${warnings.length - 1}`
                    )
                ]
            });
        } catch (error) {
            logger.error('Removewarn command error:', error);
            await handleInteractionError(interaction, error, { subtype: 'removewarn_failed' });
        }
    }
};
