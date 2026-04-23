import { SlashCommandBuilder } from 'discord.js';
import { extractUserId } from '../utils/parse.js';
import { reply } from '../utils/reply.js';
import { isHighTeam, isLowTeam } from '../permissions.js';
import { getProofAttachment } from '../utils/proof.js';
import { executeWarn } from '../moderation.js';
import { createCase } from '../casesService.js';
import { submitForApproval } from '../approvalFlow.js';
import { dmModerationAction } from '../utils/dm.js';

export default {
  name: 'warn',
  aliases: [],
  description: 'Warn a user. Proof image required.',
  slash: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a user. Proof image required.')
    .addStringOption((o) => o.setName('user').setDescription('User mention or ID').setRequired(true))
    .addStringOption((o) => o.setName('reason').setDescription('Reason').setRequired(true))
    .addAttachmentOption((o) => o.setName('proof').setDescription('Proof image').setRequired(true)),
  async run(ctx) {
    const { interaction, member, guild, args } = ctx;
    const high = await isHighTeam(member);
    const low = await isLowTeam(member);
    if (!high && !low) return reply(ctx, '❌ Only high team or trainee staff can use this.');

    let targetId, reason;
    if (interaction) {
      targetId = extractUserId(interaction.options.getString('user'));
      reason = interaction.options.getString('reason');
    } else {
      targetId = extractUserId(args[0]);
      reason = args.slice(1).join(' ');
    }
    if (!targetId) return reply(ctx, '❌ Provide a valid user ID or mention.');
    if (!reason) return reply(ctx, '❌ Provide a reason.');

    const att = await getProofAttachment(ctx);
    if (!att) return reply(ctx, '❌ Proof image is required. Action cancelled.');

    if (high) {
      const res = await executeWarn(guild, targetId, ctx.user.id, reason);
      if (!res.ok) return reply(ctx, `❌ Could not warn: ${res.reason || 'error'}`);
      const c = await createCase(guild.id, {
        type: 'warn', targetId, modId: ctx.user.id, reason, proofUrl: att.url, status: 'executed', channelId: ctx.channel.id, warningId: res.warning.id,
      });
      await dmModerationAction(ctx.client, { type: 'warn', targetId, guildName: guild.name, reason, modTag: ctx.user.tag, proofUrl: att.url, warningId: res.warning.id });
      return reply(ctx, `⚠️ Warned <@${targetId}> — Warning #${res.warning.id} • Case #${c.id}\nReason: ${reason}`);
    }

    const c = await createCase(guild.id, {
      type: 'warn', targetId, modId: ctx.user.id, reason, proofUrl: att.url, status: 'pending', channelId: ctx.channel.id,
    });
    const sub = await submitForApproval(ctx.client, guild, ctx.user, c);
    if (!sub.ok) return reply(ctx, `❌ Could not submit for approval: ${sub.reason}. Ask an admin to set the trainee channel.`);
    return reply(ctx, `📨 Warn request submitted for high-team approval — Case #${c.id}.`);
  },
};
