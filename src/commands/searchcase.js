import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { extractUserId } from '../utils/parse.js';
import { reply } from '../utils/reply.js';
import { isAnyStaff } from '../permissions.js';
import { listCasesForUser } from '../casesService.js';

const TYPE_COLOR = { ban: 0xe74c3c, warn: 0xf1c40f, unban: 0x2ecc71 };

export default {
  name: 's-c',
  aliases: ['searchcase', 'searchban'],
  description: 'Look up the latest moderation case for a user (proof + reason + status).',
  slash: new SlashCommandBuilder()
    .setName('searchcase')
    .setDescription('Look up the latest moderation case for a user.')
    .addStringOption((o) => o.setName('user_id').setDescription('User ID').setRequired(true)),
  async run(ctx) {
    const { interaction, member, guild, args } = ctx;
    if (!(await isAnyStaff(member))) return reply(ctx, '❌ Only staff can use this.');

    const targetId = extractUserId(interaction ? interaction.options.getString('user_id') : args[0]);
    if (!targetId) return reply(ctx, '❌ Provide a valid user ID.');

    const cases = await listCasesForUser(guild.id, targetId);
    if (!cases.length) return reply(ctx, `📭 No cases found for \`${targetId}\`.`);

    cases.sort((a, b) => b.id - a.id);
    const c = cases[0];

    let targetTag = `<@${c.targetId}>`;
    try {
      const u = await ctx.client.users.fetch(c.targetId);
      targetTag = `<@${c.targetId}> (${u.tag})`;
    } catch {}

    const ts = Math.floor(new Date(c.createdAt).getTime() / 1000);
    const approver = c.approverId ? `<@${c.approverId}>` : (c.status === 'executed' ? `<@${c.modId}>` : '_pending_');

    const embed = new EmbedBuilder()
      .setTitle(`Latest case for ${c.targetId}`)
      .setColor(TYPE_COLOR[c.type] || 0x7289da)
      .addFields(
        { name: 'Type', value: c.type.toUpperCase(), inline: true },
        { name: 'Status', value: c.status, inline: true },
        { name: 'Date', value: `<t:${ts}:F>`, inline: true },
        { name: 'Target', value: `${targetTag}\n\`${c.targetId}\``, inline: false },
        { name: 'Submitted by', value: `<@${c.modId}>`, inline: true },
        { name: 'Approved/Executed by', value: approver, inline: true },
        { name: 'Reason', value: c.reason || '_none_', inline: false },
      )
      .setFooter({ text: `Case #${c.id} • ${cases.length} total case(s) for this user` });

    if (c.proofUrl) embed.setImage(c.proofUrl);

    return reply(ctx, { embeds: [embed], allowedMentions: { parse: [] } });
  },
};
