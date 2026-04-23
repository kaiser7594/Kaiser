import { SlashCommandBuilder } from 'discord.js';
import { extractUserId } from '../utils/parse.js';
import { reply } from '../utils/reply.js';
import { hasModPerm } from '../permissions.js';
import { addWarning } from '../warningService.js';

export default {
  name: 'warn',
  aliases: [],
  description: 'Warn a user by ID or mention.',
  slash: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a user by ID or mention.')
    .addStringOption((o) => o.setName('user').setDescription('User mention or ID').setRequired(true))
    .addStringOption((o) => o.setName('reason').setDescription('Reason').setRequired(false)),
  async run(ctx) {
    const { interaction, member, guild, args } = ctx;
    if (!hasModPerm(member)) return reply(ctx, '❌ You need moderation permissions to use this.');

    let targetId, reason;
    if (interaction) {
      targetId = extractUserId(interaction.options.getString('user'));
      reason = interaction.options.getString('reason') || 'No reason provided';
    } else {
      targetId = extractUserId(args[0]);
      reason = args.slice(1).join(' ') || 'No reason provided';
    }
    if (!targetId) return reply(ctx, '❌ Provide a valid user ID or mention.');

    const w = await addWarning(guild.id, targetId, ctx.user.id, reason);
    return reply(ctx, `⚠️ Warned <@${targetId}> — Warning #${w.id}\nReason: ${reason}`);
  },
};
