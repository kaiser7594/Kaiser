import { SlashCommandBuilder, PermissionFlagsBits, PermissionsBitField, ChannelType } from 'discord.js';
import { createEmbed, errorEmbed, successEmbed, infoEmbed, warningEmbed } from '../../utils/embeds.js';
import { logModerationAction } from '../../utils/moderation.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { ModerationService } from '../../services/moderationService.js';
import { handleInteractionError } from '../../utils/errorHandler.js';
export default {
    data: new SlashCommandBuilder()
        .setName("ban")
        .setDescription("Ban a user from the server")
        .addUserOption((option) =>
            option
                .setName("target")
                .setDescription("The user to ban")
                .setRequired(true),
        )
        .addStringOption((option) =>
            option.setName("reason").setDescription("Reason for the ban"),
        )
.setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    category: "moderation",

    async execute(interaction, config, client) {
        try {
            // Reply publicly so everyone in the channel can see the ban result
            if (!interaction.deferred && !interaction.replied) {
                await interaction.deferReply().catch(() => {});
            }

            // Find the user option regardless of its registered name (target / user / etc.)
            const userOpt =
                interaction.options.data.find((o) => o.type === 6) ||
                interaction.options.get("target") ||
                interaction.options.get("user");
            const targetId = userOpt?.value ? String(userOpt.value) : null;

            let user = userOpt?.user || null;
            if (!user && targetId) {
                user = await client.users.fetch(targetId).catch((e) => {
                    logger.warn(`Ban: failed to fetch user ${targetId}: ${e.message}`);
                    return null;
                });
            }
            if (!user && targetId) {
                const existingBan = await interaction.guild.bans.fetch(targetId).catch(() => null);
                if (existingBan) user = existingBan.user;
            }

            if (!user) {
                throw new Error("Could not resolve that user. Try passing their user ID directly.");
            }

            const reason = interaction.options.getString("reason") || "No reason provided";

            if (user.id === interaction.user.id) {
                throw new Error("You cannot ban yourself.");
            }
            if (user.id === client.user.id) {
                throw new Error("You cannot ban the bot.");
            }

            
            const result = await ModerationService.banUser({
                guild: interaction.guild,
                user,
                moderator: interaction.member,
                reason
            });

            await InteractionHelper.universalReply(interaction, {
                embeds: [
                    successEmbed(
                        `🚫 **Banned** ${user.tag}`,
                        `**Reason:** ${reason}\n**Case ID:** #${result.caseId}`,
                    ),
                ],
            });
        } catch (error) {
            logger.error('Ban command error:', error);
            await handleInteractionError(interaction, error, { subtype: 'ban_failed' });
        }
    },
};



