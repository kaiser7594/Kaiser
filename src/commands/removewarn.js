import { SlashCommandBuilder } from 'discord.js';
import { reply } from '../utils/reply.js';
import { hasModPerm } from '../permissions.js';
import { findWarningById, removeWarning } from '../warningService.js';

export default {
  name: 'removewarn',
  aliases: ['rmwarn', 'unwarn'],
  description: 'Remove a warning by its ID.',
  slash: new SlashCommandBuilder()
    .setName('removewarn')
    .setDescription('Remove a warning by its ID.')
    .addIntegerOption((o) => o.setName('warn_id').setDescription('Warning ID').setRequired(true))
    .addStringOption((o) => o.setName('reason').setDescription('Reason for removal').setRequired(false)),
  async run(ctx) {
    const { interaction, member, guild, args } = ctx;
    if (!hasModPerm(member)) return reply(ctx, '❌ You need moderation permissions to use this.');

    let warnId, reason;
    if (interaction) {
      warnId = interaction.options.getInteger('warn_id');
      reason = interaction.options.getString('reason') || 'No reason provided';
    } else {
      warnId = Number(args[0]);
      reason = args.slice(1).join(' ') || 'No reason provided';
    }
    if (!Number.isFinite(warnId)) return reply(ctx, '❌ Provide a valid numeric warning ID.');

    const found = await findWarningById(guild.id, warnId);
    if (!found) return reply(ctx, `❌ No warning with ID #${warnId} was found in this server.`);

    const removed = await removeWarning(guild.id, found.userId, warnId, ctx.user.id, reason);
    if (!removed) return reply(ctx, `❌ Could not remove warning #${warnId}.`);

    return reply(ctx, `✅ Removed warning **#${warnId}** from <@${found.userId}>.\nOriginal reason: ${removed.reason}\nRemoval reason: ${reason}`);
  },
};
