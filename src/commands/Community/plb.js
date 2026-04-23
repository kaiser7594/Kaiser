import { SlashCommandBuilder } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { getColor } from '../../config/bot.js';
import { getLeaderboard, VOUCH_CONFIG, memberCanUseVouchCommands } from '../../services/vouchService.js';

export default {
    data: new SlashCommandBuilder()
        .setName('plb')
        .setDescription('Pilot vouch leaderboard')
        .addStringOption((o) =>
            o.setName('period')
                .setDescription('Time period (default: month)')
                .addChoices(
                    { name: 'This month', value: 'monthly' },
                    { name: 'All time', value: 'all' },
                )
                .setRequired(false)
        ),

    async execute(interaction) {
        const invoker = interaction.member || (await interaction.guild.members.fetch(interaction.user.id).catch(() => null));
        if (!memberCanUseVouchCommands(invoker)) {
            return interaction.reply({ content: '❌ You need the Middleman or Pilot role to use this command.', ephemeral: true });
        }

        const period = interaction.options.getString('period') || 'monthly';
        const cfg = VOUCH_CONFIG.pilot;
        const rows = await getLeaderboard(interaction.guildId, 'pilot', { period, limit: 10 });

        const now = new Date();
        const monthName = now.toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
        const periodLabel = period === 'monthly' ? `This Month (${monthName} UTC)` : 'All Time';

        let description;
        if (!rows.length) {
            description = `*No vouches recorded yet for this period.*`;
        } else {
            const medals = ['🥇', '🥈', '🥉'];
            description = rows
                .map((r, i) => `${medals[i] || `\`#${i + 1}\``} <@${r.user_id}> — **${r.count}** vouch${r.count === 1 ? '' : 'es'}`)
                .join('\n');
        }

        const embed = createEmbed({
            title: `${cfg.emoji} Pilot Leaderboard`,
            description: `**${periodLabel}**\n\n${description}`,
        }).setColor(getColor('info'));

        await interaction.reply({ embeds: [embed] });
    },
};
