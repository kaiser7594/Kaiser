import { SlashCommandBuilder } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { getColor } from '../../config/bot.js';
import { getProfile, VOUCH_CONFIG } from '../../services/vouchService.js';

export default {
    data: new SlashCommandBuilder()
        .setName('p')
        .setDescription('Show a user\'s middleman / pilot vouch profile')
        .addUserOption((o) =>
            o.setName('user').setDescription('User to view (defaults to you)').setRequired(false)
        ),

    async execute(interaction) {
        const target = interaction.options.getUser('user') || interaction.user;
        const member = await interaction.guild.members.fetch(target.id).catch(() => null);

        const profile = await getProfile(interaction.guildId, target.id);

        const lines = [];
        for (const [type, cfg] of Object.entries(VOUCH_CONFIG)) {
            const has = member?.roles?.cache?.has(cfg.roleId);
            const stats = profile[type] || { monthly: 0, total: 0 };
            lines.push(
                `${cfg.emoji} **${cfg.label}** ${has ? '' : '*(no role)*'}\n` +
                `> This month: **${stats.monthly}** • All time: **${stats.total}**`
            );
        }

        const now = new Date();
        const monthName = now.toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });

        const embed = createEmbed({
            title: `${target.tag} — Vouch Profile`,
            description: lines.join('\n\n'),
        })
            .setColor(getColor('info'))
            .setThumbnail(target.displayAvatarURL({ size: 256 }))
            .setFooter({ text: `Monthly count resets each month • ${monthName} (UTC)` });

        await interaction.reply({ embeds: [embed] });
    },
};
