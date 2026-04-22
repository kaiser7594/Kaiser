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
        .setDescription("Ban a user by ID")
        .addStringOption((option) =>
            option
                .setName("user_id")
                .setDescription("Raw user ID to ban")
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

            const rawId = (
                interaction.options.getString("user_id") ||
                interaction.options.getString("target") ||
                interaction.options.data.find((o) => o.type === 6 || o.type === 3)?.value ||
                ""
            ).toString().trim().replace(/[<@!>]/g, "");

            if (!/^\d{17,20}$/.test(rawId)) {
                throw new Error("Please provide a valid user ID (17-20 digits).");
            }

            let user = await client.users.fetch(rawId).catch(() => null);
            if (!user) {
                const existingBan = await interaction.guild.bans.fetch(rawId).catch(() => null);
                if (existingBan) user = existingBan.user;
            }
            if (!user) {
                throw new Error("Could not resolve that user ID.");
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



