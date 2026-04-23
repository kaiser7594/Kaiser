import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { extractUserId } from '../utils/parse.js';
import { reply } from '../utils/reply.js';
import { isAnyStaff } from '../permissions.js';
import { listCasesForUser } from '../casesService.js';

export default {
  name: 's-c',
  aliases: ['searchcase', 'searchban'],
  description: 'Look up moderation cases for a user (proof + reason + status).',
  slash: new SlashCommandBuilder()
    .setName('searchcase')
    .setDescription('Look up moderation cases for a user.')
    .addStringOption((o) => o.setName('user_id').setDescription('User ID').setRequired(true)),
  async run(ctx) {
    const { interaction, member, guild, args } = ctx;
    if (!(await isAnyStaff(member))) return reply(ctx, '❌ Only staff can use this.');

    const targetId = extractUserId(interaction ? interaction.options.getString('user_id') : args[0]);
    if (!targetId) return reply(ctx, '❌ Provide a valid user ID.');

    const cases = await listCasesForUser(guild.id, targetId);
    if (!cases.length) return reply(ctx, `📭 No cases found for \`${targetId}\`.`);

    cases.sort((a, b) => b.id - a.id);

    const TYPE_EMOJI = { ban: '🔨', warn: '⚠️', unban: '✅' };
    const STATUS_EMOJI = { executed: '✅', pending: '⏳', denied: '❌', failed: '⚠️' };

    const recent = cases.slice(0, 10);
    const lines = recent.map((c) => {
      const ts = Math.floor(new Date(c.createdAt).getTime() / 1000);
      return `**#${c.id}** ${TYPE_EMOJI[c.type] || ''} ${c.type.toUpperCase()} • ${STATUS_EMOJI[c.status] || ''} ${c.status} • <t:${ts}:d>\n` +
             `Reason: ${c.reason || '_none_'}\nBy: <@${c.modId}>${c.approverId ? ` • Approved by <@${c.approverId}>` : ''}` +
             (c.proofUrl ? `\n[proof](${c.proofUrl})` : '');
    });

    const embed = new EmbedBuilder()
      .setTitle(`🔎 Cases for \`${targetId}\``)
      .setDescription(lines.join('\n\n'))
      .setFooter({ text: `Showing ${recent.length} of ${cases.length} cases` })
      .setColor(0x95a5a6);

    // Show the most recent case's proof image if available
    const latestWithProof = recent.find((c) => c.proofUrl);
    if (latestWithProof) embed.setImage(latestWithProof.proofUrl);

    return reply(ctx, { embeds: [embed], allowedMentions: { parse: [] } });
  },
};
