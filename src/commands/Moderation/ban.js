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

            const targetOption = interaction.options.get("target");
            const targetId = targetOption?.value || interaction.options.getUser("target")?.id;
            logger.debug('Ban target option', {
                hasOption: !!targetOption,
                value: targetOption?.value,
                hasUser: !!targetOption?.user,
                resolvedId: targetId
            });

            let user = interaction.options.getUser("target") || targetOption?.user || null;
            if (!user && targetId) {
                user = await client.users.fetch(String(targetId)).catch((e) => {
                    logger.warn(`Ban: failed to fetch user ${targetId}: ${e.message}`);
                    return null;
                });
            }

            if (!user && targetId) {
                // Fall back to a stub from the existing ban record
                const existingBan = await interaction.guild.bans.fetch(String(targetId)).catch(() => null);
                if (existingBan) {
                    user = existingBan.user;
                }
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



