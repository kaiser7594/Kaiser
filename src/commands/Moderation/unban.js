import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { createEmbed, errorEmbed, successEmbed, infoEmbed, warningEmbed } from '../../utils/embeds.js';
import { logModerationAction } from '../../utils/moderation.js';
import { logger } from '../../utils/logger.js';
import { ModerationService } from '../../services/moderationService.js';
import { handleInteractionError } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
export default {
    data: new SlashCommandBuilder()
        .setName("unban")
        .setDescription("Unban a user by ID")
        .addStringOption(option =>
            option
                .setName("user_id")
                .setDescription("Raw user ID to unban")
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName("reason")
                .setDescription("Reason for the unban")
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    category: "moderation",

    async execute(interaction, config, client) {
        const deferSuccess = await InteractionHelper.safeDefer(interaction);
        if (!deferSuccess) {
            logger.warn(`Unban interaction defer failed`, {
                userId: interaction.user.id,
                guildId: interaction.guildId,
                commandName: 'unban'
            });
            return;
        }

        try {
                const rawId = (
                    interaction.options.getString("user_id") ||
                    interaction.options.getString("target") ||
                    interaction.options.data.find((o) => o.type === 6 || o.type === 3)?.value ||
                    ""
                ).toString().trim().replace(/[<@!>]/g, "");

                if (!/^\d{17,20}$/.test(rawId)) {
                    throw new Error("Please provide a valid user ID (17-20 digits).");
                }

                let targetUser = await client.users.fetch(rawId).catch(() => null);
                if (!targetUser) {
                    const existingBan = await interaction.guild.bans.fetch(rawId).catch(() => null);
                    if (existingBan) targetUser = existingBan.user;
                }
                if (!targetUser) {
                    throw new Error("Could not resolve that user ID.");
                }

                const reason = interaction.options.getString("reason") || "No reason provided";

                const result = await ModerationService.unbanUser({
                    guild: interaction.guild,
                    user: targetUser,
                    moderator: interaction.member,
                    reason
                });

                await InteractionHelper.safeEditReply(interaction, {
                    embeds: [
                        successEmbed(
                            "✅ User Unbanned",
                            `Successfully unbanned **${targetUser.tag}** from the server.\n\n**Reason:** ${reason}\n**Case ID:** #${result.caseId}`
                        )
                    ]
                });
        } catch (error) {
            logger.error('Unban command error:', error);
            await handleInteractionError(interaction, error, { subtype: 'unban_failed' });
        }
    }
};



