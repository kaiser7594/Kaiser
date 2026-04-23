import { SlashCommandBuilder } from 'discord.js';
import { extractUserId } from '../utils/parse.js';
import { reply } from '../utils/reply.js';
import { hasModPerm } from '../permissions.js';
import { clearBan } from '../banLog.js';

export default {
  name: 'unban',
  aliases: [],
  description: 'Unban a user by ID.',
  slash: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Unban a user by ID.')
    .addStringOption((o) => o.setName('user_id').setDescription('User ID to unban').setRequired(true))
    .addStringOption((o) => o.setName('reason').setDescription('Reason').setRequired(false)),
  async run(ctx) {
    const { interaction, member, guild, args } = ctx;
    if (!hasModPerm(member)) return reply(ctx, '❌ You need ban permissions to use this.');

    let targetId, reason;
    if (interaction) {
      targetId = extractUserId(interaction.options.getString('user_id'));
      reason = interaction.options.getString('reason') || 'No reason provided';
    } else {
      targetId = extractUserId(args[0]);
      reason = args.slice(1).join(' ') || 'No reason provided';
    }
    if (!targetId) return reply(ctx, '❌ Provide a valid user ID.');

    // Verify the user is currently banned
    const ban = await guild.bans.fetch(targetId).catch(() => null);
    if (!ban) return reply(ctx, `⚠️ User \`${targetId}\` is not currently banned.`);

    try {
      await guild.bans.remove(targetId, `${reason} | by ${ctx.user.tag}`);
      await clearBan(guild.id, targetId);
      return reply(ctx, `✅ Unbanned \`${targetId}\` — reason: ${reason}`);
    } catch (e) {
      if (e.code === 50013) return reply(ctx, '❌ I lack permission to unban that user.');
      return reply(ctx, `❌ Could not unban: ${e.message}`);
    }
  },
};
