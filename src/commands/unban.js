import { SlashCommandBuilder } from 'discord.js';
import { extractUserId } from '../utils/parse.js';
import { reply } from '../utils/reply.js';
import { isHighTeam, isLowTeam } from '../permissions.js';
import { getProofAttachment } from '../utils/proof.js';
import { executeUnban } from '../moderation.js';
import { createCase } from '../casesService.js';
import { submitForApproval } from '../approvalFlow.js';
import { dmModerationAction } from '../utils/dm.js';

export default {
  name: 'unban',
  aliases: [],
  description: 'Unban a user by ID. Proof image required.',
  slash: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Unban a user by ID. Proof image required.')
    .addStringOption((o) => o.setName('user_id').setDescription('User ID to unban').setRequired(true))
    .addAttachmentOption((o) => o.setName('proof').setDescription('Proof image').setRequired(true))
    .addStringOption((o) => o.setName('reason').setDescription('Reason').setRequired(false)),
  async run(ctx) {
    const { interaction, member, guild, args } = ctx;
    const high = await isHighTeam(member);
    const low = await isLowTeam(member);
    if (!high && !low) return reply(ctx, '❌ Only high team or trainee staff can use this.');

    let targetId, reason;
    if (interaction) {
      targetId = extractUserId(interaction.options.getString('user_id'));
      reason = interaction.options.getString('reason') || 'No reason provided';
    } else {
      targetId = extractUserId(args[0]);
      reason = args.slice(1).join(' ') || 'No reason provided';
    }
    if (!targetId) return reply(ctx, '❌ Provide a valid user ID.');

    const ban = await guild.bans.fetch(targetId).catch(() => null);
    if (!ban) return reply(ctx, `⚠️ User \`${targetId}\` is not currently banned.`);

    const att = await getProofAttachment(ctx);
    if (!att) return reply(ctx, '❌ Proof image is required. Action cancelled.');

    if (high) {
      const res = await executeUnban(guild, targetId, ctx.user.tag, reason);
      if (!res.ok) return reply(ctx, `❌ Could not unban: ${res.reason}${res.error ? ` (${res.error})` : ''}`);
      const c = await createCase(guild.id, {
        type: 'unban', targetId, modId: ctx.user.id, reason, proofUrl: att.url, status: 'executed', channelId: ctx.channel.id,
      });
      await dmModerationAction(ctx.client, { type: 'unban', targetId, guildName: guild.name, reason, modTag: ctx.user.tag, proofUrl: att.url });
      return reply(ctx, `✅ Unbanned \`${targetId}\` — Case #${c.id}\nReason: ${reason}`);
    }

    const c = await createCase(guild.id, {
      type: 'unban', targetId, modId: ctx.user.id, reason, proofUrl: att.url, status: 'pending', channelId: ctx.channel.id,
    });
    const sub = await submitForApproval(ctx.client, guild, ctx.user, c);
    if (!sub.ok) return reply(ctx, `❌ Could not submit for approval: ${sub.reason}. Ask an admin to set the trainee channel.`);
    return reply(ctx, `📨 Unban request submitted for high-team approval — Case #${c.id}.`);
  },
};
