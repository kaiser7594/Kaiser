import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { reply } from '../utils/reply.js';
import { listLeaderboard } from '../vouchService.js';
import { canViewVouchProfile } from '../permissions.js';

export default {
  name: 'middlemanleaderboard',
  aliases: ['mmlb', 'mmleaderboard'],
  description: 'Middleman leaderboard.',
  slash: new SlashCommandBuilder()
    .setName('middlemanleaderboard')
    .setDescription('Middleman leaderboard.')
    .addStringOption((o) =>
      o.setName('scope').setDescription('Scope').addChoices(
        { name: 'month', value: 'month' },
        { name: 'alltime', value: 'alltime' },
      )
    ),
  async run(ctx) {
    const { interaction, member, guild, args } = ctx;
    if (!(await canViewVouchProfile(member))) {
      return reply(ctx, "❌ You don't have the role to use this.");
    }
    const scope = (interaction ? interaction.options.getString('scope') : args[0]) || 'month';
    const norm = ['month', 'alltime'].includes(scope) ? scope : 'month';
    const rows = await listLeaderboard(guild.id, 'mm', norm, 25);
    const lines = rows.length
      ? rows.map((r, i) => `**${i + 1}.** <@${r.userId}> — \`${r.count}\``).join('\n')
      : '*No vouches yet.*';
    const embed = new EmbedBuilder()
      .setTitle(`🤝 Middleman Leaderboard (${norm})`)
      .setDescription(lines)
      .setColor(0xe67e22);
    return reply(ctx, { embeds: [embed], allowedMentions: { parse: [] } });
  },
};
