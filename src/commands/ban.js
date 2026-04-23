import { SlashCommandBuilder } from 'discord.js';
import { extractUserId } from '../utils/parse.js';
import { reply } from '../utils/reply.js';
import { isHighTeam, isLowTeam } from '../permissions.js';
import { getProofAttachment } from '../utils/proof.js';
import { executeBan } from '../moderation.js';
import { createCase } from '../casesService.js';
import { submitForApproval } from '../approvalFlow.js';

export default {
  name: 'ban',
  aliases: [],
  description: 'Ban a user by ID. Proof image required.',
  slash: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a user by ID. Proof image required.')
    .addStringOption((o) => o.setName('user_id').setDescription('User ID to ban').setRequired(true))
    .addStringOption((o) => o.setName('reason').setDescription('Reason').setRequired(true))
    .addAttachmentOption((o) => o.setName('proof').setDescription('Proof image').setRequired(true)),
  async run(ctx) {
    const { interaction, member, guild, args } = ctx;
    const high = await isHighTeam(member);
    const low = await isLowTeam(member);
    if (!high && !low) return reply(ctx, '❌ Only high team or trainee staff can use this.');

    let targetId, reason;
    if (interaction) {
      targetId = extractUserId(interaction.options.getString('user_id'));
      reason = interaction.options.getString('reason');
    } else {
      targetId = extractUserId(args[0]);
      reason = args.slice(1).join(' ');
    }
    if (!targetId) return reply(ctx, '❌ Provide a valid user ID.');
    if (!reason) return reply(ctx, '❌ Provide a reason.');
    if (targetId === ctx.user.id) return reply(ctx, '❌ You cannot ban yourself.');
    if (targetId === ctx.client.user.id) return reply(ctx, '❌ I cannot ban myself.');

    // Pre-check already banned (so we don't waste a proof prompt)
    const existing = await guild.bans.fetch(targetId).catch(() => null);
    if (existing) return reply(ctx, `⚠️ User \`${targetId}\` is already banned.`);

    const att = await getProofAttachment(ctx);
    if (!att) return reply(ctx, '❌ Proof image is required. Action cancelled.');

    if (high) {
      const res = await executeBan(guild, targetId, ctx.user.id, ctx.user.tag, reason);
      if (!res.ok) {
        if (res.reason === 'already_banned') return reply(ctx, `⚠️ User \`${targetId}\` is already banned.`);
        if (res.reason === 'no_permission') return reply(ctx, '❌ I lack permission to ban that user.');
        return reply(ctx, `❌ Could not ban: ${res.error || res.reason}`);
      }
      const c = await createCase(guild.id, {
        type: 'ban', targetId, modId: ctx.user.id, reason, proofUrl: att.url, status: 'executed', channelId: ctx.channel.id,
      });
      return reply(ctx, `🔨 Banned \`${targetId}\` — Case #${c.id}\nReason: ${reason}`);
    }

    // trainee path → submit for approval
    const c = await createCase(guild.id, {
      type: 'ban', targetId, modId: ctx.user.id, reason, proofUrl: att.url, status: 'pending', channelId: ctx.channel.id,
    });
    const sub = await submitForApproval(ctx.client, guild, ctx.user, c);
    if (!sub.ok) return reply(ctx, `❌ Could not submit for approval: ${sub.reason}. Ask an admin to set the trainee channel with \`k!settraineechannel\`.`);
    return reply(ctx, `📨 Ban request submitted for high-team approval — Case #${c.id}.`);
  },
};
