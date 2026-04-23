import { SlashCommandBuilder } from 'discord.js';
import { extractUserId } from '../utils/parse.js';
import { reply } from '../utils/reply.js';
import { hasModPerm } from '../permissions.js';
import { recordBan, getBan } from '../banLog.js';

export default {
  name: 'ban',
  aliases: [],
  description: 'Ban a user by ID (works even if not in server).',
  slash: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a user by ID.')
    .addStringOption((o) => o.setName('user_id').setDescription('User ID to ban').setRequired(true))
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
    if (targetId === ctx.user.id) return reply(ctx, '❌ You cannot ban yourself.');
    if (targetId === ctx.client.user.id) return reply(ctx, '❌ I cannot ban myself.');

    // Already-banned check
    try {
      const existing = await guild.bans.fetch(targetId).catch(() => null);
      if (existing) return reply(ctx, `⚠️ User \`${targetId}\` is already banned.`);
    } catch {}

    try {
      await guild.bans.create(targetId, { reason: `${reason} | by ${ctx.user.tag}` });
      await recordBan(guild.id, targetId, ctx.user.id, reason);
      return reply(ctx, `🔨 Banned \`${targetId}\` — reason: ${reason}`);
    } catch (e) {
      if (e.code === 50013) return reply(ctx, '❌ I lack permission to ban that user.');
      return reply(ctx, `❌ Could not ban: ${e.message}`);
    }
  },
};
