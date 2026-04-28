import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { extractUserId } from '../utils/parse.js';
import { reply } from '../utils/reply.js';
import { listVouchHistory } from '../vouchService.js';
import { canViewVouchProfile } from '../permissions.js';

export default {
  name: 'works',
  aliases: ['wh', 'workhistory'],
  description: 'Show staff work / ticket history for a user.',
  slash: new SlashCommandBuilder()
    .setName('works')
    .setDescription('Show staff work / ticket history for a user.')
    .addStringOption((o) => o.setName('user').setDescription('User mention or ID').setRequired(false)),
  async run(ctx) {
    const { interaction, member, guild, args, user } = ctx;
    if (!(await canViewVouchProfile(member))) {
      return reply(ctx, "❌ You don't have the role to use this.");
    }
    let targetId;
    if (interaction) targetId = extractUserId(interaction.options.getString('user')) || user.id;
    else targetId = extractUserId(args[0]) || user.id;

    const events = await listVouchHistory(guild.id, targetId, 25, ['staff', 'ticket']);
    if (!events.length) return reply(ctx, `📭 No work or tickets recorded yet for <@${targetId}>.`);

    const TYPE = { staff: '🔗 Work', ticket: '🎫 Ticket' };
    const lines = events.map((e) => {
      const ts = Math.floor(new Date(e.at).getTime() / 1000);
      const link = e.messageUrl ? ` • [jump](${e.messageUrl})` : '';
      return `${TYPE[e.type] || e.type} • <t:${ts}:f>${link}`;
    });

    const embed = new EmbedBuilder()
      .setTitle(`Work history for ${targetId}`)
      .setDescription(lines.join('\n'))
      .setColor(0x9b59b6)
      .setFooter({ text: `Showing last ${events.length} entries` });
    return reply(ctx, { embeds: [embed], allowedMentions: { parse: [] } });
  },
};
