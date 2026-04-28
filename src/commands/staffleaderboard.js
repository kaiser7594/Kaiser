import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { reply } from '../utils/reply.js';
import { listLeaderboard } from '../vouchService.js';
import { canViewVouchProfile } from '../permissions.js';

export default {
  name: 'staffleaderboard',
  aliases: ['stafflb', 'slb'],
  description: 'Staff work leaderboard.',
  slash: new SlashCommandBuilder()
    .setName('staffleaderboard')
    .setDescription('Staff work leaderboard.')
    .addStringOption((o) =>
      o.setName('scope').setDescription('Scope').addChoices(
        { name: 'month', value: 'month' },
        { name: 'alltime', value: 'alltime' },
      )
    ),
  async run(ctx) {
    const { interaction, member, guild, args } = ctx;
    if (!(await canViewVouchProfile(member))) {
      return reply(ctx, '❌ Only middleman / pilot / staff role members can view leaderboards.');
    }
    const scope = (interaction ? interaction.options.getString('scope') : args[0]) || 'month';
    const norm = ['month', 'alltime'].includes(scope) ? scope : 'month';
    const rows = await listLeaderboard(guild.id, 'staff', norm, 25);
    const lines = rows.length
      ? rows.map((r, i) => `**${i + 1}.** <@${r.userId}> — \`${r.count}\``).join('\n')
      : '*No work logged yet.*';
    const embed = new EmbedBuilder()
      .setTitle(`🛡️ Staff Work Leaderboard (${norm})`)
      .setDescription(lines)
      .setColor(0x9b59b6);
    return reply(ctx, { embeds: [embed], allowedMentions: { parse: [] } });
  },
};
