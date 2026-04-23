import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { extractUserId } from '../utils/parse.js';
import { reply } from '../utils/reply.js';
import { hasModPerm } from '../permissions.js';
import { getBan } from '../banLog.js';

export default {
  name: 's-c',
  aliases: ['searchcase', 'searchban'],
  description: 'Look up why a user was banned (by user ID).',
  slash: new SlashCommandBuilder()
    .setName('searchcase')
    .setDescription('Look up a banned user by user ID.')
    .addStringOption((o) => o.setName('user_id').setDescription('User ID').setRequired(true)),
  async run(ctx) {
    const { interaction, member, guild, args } = ctx;
    if (!hasModPerm(member)) return reply(ctx, '❌ You need moderation permissions to use this.');
    const targetId = extractUserId(interaction ? interaction.options.getString('user_id') : args[0]);
    if (!targetId) return reply(ctx, '❌ Provide a valid user ID.');

    const ban = await guild.bans.fetch(targetId).catch(() => null);
    if (!ban) return reply(ctx, `📭 User \`${targetId}\` is not currently banned in this server.`);

    const ours = await getBan(guild.id, targetId);
    const embed = new EmbedBuilder()
      .setTitle(`🔎 Ban record for ${ban.user.tag}`)
      .addFields(
        { name: 'User ID', value: `\`${targetId}\``, inline: true },
        { name: 'Discord reason', value: ban.reason || '_none_', inline: false },
        ...(ours ? [
          { name: 'Logged reason', value: ours.reason, inline: false },
          { name: 'Banned by', value: `<@${ours.modId}>`, inline: true },
          { name: 'When', value: `<t:${Math.floor(new Date(ours.time).getTime() / 1000)}:f>`, inline: true },
        ] : []),
      )
      .setColor(0xe74c3c);
    return reply(ctx, { embeds: [embed], allowedMentions: { parse: [] } });
  },
};
