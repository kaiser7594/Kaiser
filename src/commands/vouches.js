import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { extractUserId } from '../utils/parse.js';
import { reply } from '../utils/reply.js';
import { listVouchHistory } from '../vouchService.js';

export default {
  name: 'vouches',
  aliases: ['vh', 'vouchhistory'],
  description: 'Show vouch history for a user.',
  slash: new SlashCommandBuilder()
    .setName('vouches')
    .setDescription('Show vouch history for a user.')
    .addStringOption((o) => o.setName('user').setDescription('User mention or ID').setRequired(false)),
  async run(ctx) {
    const { interaction, guild, args, user } = ctx;
    let targetId;
    if (interaction) targetId = extractUserId(interaction.options.getString('user')) || user.id;
    else targetId = extractUserId(args[0]) || user.id;

    const events = await listVouchHistory(guild.id, targetId, 25);
    if (!events.length) return reply(ctx, `📭 No vouches recorded yet for <@${targetId}>.`);

    const TYPE = { mm: '🤝 Middleman', pilot: '✈️ Pilot' };
    const lines = events.map((e) => {
      const ts = Math.floor(new Date(e.at).getTime() / 1000);
      const link = e.messageUrl ? ` • [jump](${e.messageUrl})` : '';
      return `${TYPE[e.type] || e.type} • <t:${ts}:f> • by <@${e.byUserId}>${link}`;
    });

    const embed = new EmbedBuilder()
      .setTitle(`Vouch history for ${targetId}`)
      .setDescription(lines.join('\n'))
      .setColor(0x9b59b6)
      .setFooter({ text: `Showing last ${events.length} vouches` });
    return reply(ctx, { embeds: [embed], allowedMentions: { parse: [] } });
  },
};
