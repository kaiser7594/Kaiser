import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { extractUserId } from '../utils/parse.js';
import { reply } from '../utils/reply.js';
import { hasModPerm } from '../permissions.js';
import { listWarnings } from '../warningService.js';

export default {
  name: 'warnings',
  aliases: [],
  description: 'List warnings for a user.',
  slash: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('List warnings for a user.')
    .addStringOption((o) => o.setName('user').setDescription('User mention or ID').setRequired(true)),
  async run(ctx) {
    const { interaction, member, guild, args } = ctx;
    if (!hasModPerm(member)) return reply(ctx, '❌ You need moderation permissions to use this.');

    const input = interaction ? interaction.options.getString('user') : args[0];
    const targetId = extractUserId(input);
    if (!targetId) return reply(ctx, '❌ Provide a valid user ID or mention.');

    const list = await listWarnings(guild.id, targetId);
    if (!list.length) return reply(ctx, `📭 <@${targetId}> has no warnings.`);

    const lines = list
      .slice(-25)
      .map((w) => `**#${w.id}** — ${w.reason} *(by <@${w.modId}> on <t:${Math.floor(new Date(w.time).getTime() / 1000)}:d>)*`);

    const embed = new EmbedBuilder()
      .setTitle(`Warnings for user ${targetId}`)
      .setDescription(lines.join('\n'))
      .setFooter({ text: `Total: ${list.length}` })
      .setColor(0xf1c40f);

    return reply(ctx, { embeds: [embed], allowedMentions: { parse: [] } });
  },
};
