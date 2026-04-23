import { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, AttachmentBuilder } from 'discord.js';
import { getConfig } from './guildConfig.js';
import { createCase, getCase, updateCase } from './casesService.js';
import { executeBan, executeUnban, executeWarn } from './moderation.js';
import { logger } from './logger.js';

const TYPE_LABEL = { ban: 'Ban', warn: 'Warn', unban: 'Unban' };
const TYPE_COLOR = { ban: 0xe74c3c, warn: 0xf1c40f, unban: 0x2ecc71 };

function buildCaseEmbed(c, requester) {
  const embed = new EmbedBuilder()
    .setTitle(`${TYPE_LABEL[c.type] || c.type} request — Case #${c.id}`)
    .setColor(TYPE_COLOR[c.type] || 0x7289da)
    .addFields(
      { name: 'Target', value: `<@${c.targetId}> (\`${c.targetId}\`)`, inline: false },
      { name: 'Reason', value: c.reason || '_none_', inline: false },
      { name: 'Requested by', value: `${requester ? `<@${requester.id}>` : `<@${c.modId}>`}`, inline: true },
      { name: 'Status', value: c.status, inline: true },
    )
    .setFooter({ text: `Case ID #${c.id}` })
    .setTimestamp(new Date(c.createdAt));
  if (c.proofUrl) embed.setImage(c.proofUrl);
  return embed;
}

// Submits a request for high-team approval and returns the posted message.
export async function submitForApproval(client, guild, requester, c) {
  const cfg = await getConfig(guild.id);
  if (!cfg.traineeChannelId) {
    return { ok: false, reason: 'no_trainee_channel' };
  }
  const channel = await guild.channels.fetch(cfg.traineeChannelId).catch(() => null);
  if (!channel) return { ok: false, reason: 'channel_not_found' };

  const embed = buildCaseEmbed(c, requester);
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`case_allow:${c.id}`).setLabel('Allow').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`case_deny:${c.id}`).setLabel('Deny').setStyle(ButtonStyle.Danger),
  );

  const ping = (cfg.highTeamRoleIds || []).map((r) => `<@&${r}>`).join(' ');
  const files = [];
  if (c.proofUrl) {
    try { files.push(new AttachmentBuilder(c.proofUrl, { name: 'proof.png' })); } catch {}
  }

  let msg;
  try {
    msg = await channel.send({
      content: `${ping || ''} New **${c.type}** request needs review.`.trim(),
      embeds: [embed],
      components: [row],
      files,
      allowedMentions: { roles: cfg.highTeamRoleIds || [] },
    });
  } catch (e) {
    logger.error('Failed to send approval message:', e);
    return { ok: false, reason: 'send_failed' };
  }

  // Update with persistent CDN URL from re-uploaded attachment if available
  const persistedUrl = msg.attachments.first()?.url || c.proofUrl;
  await updateCase(guild.id, c.id, { proofUrl: persistedUrl, approvalChannelId: channel.id, approvalMessageId: msg.id });
  return { ok: true, message: msg };
}

export async function handleCaseDecision(client, interaction, caseId, allow) {
  const guild = interaction.guild;
  const c = await getCase(guild.id, caseId);
  if (!c) return interaction.reply({ content: '❌ Case not found.', ephemeral: true });
  if (c.status !== 'pending') return interaction.reply({ content: `⚠️ This case is already **${c.status}**.`, ephemeral: true });

  const cfg = await getConfig(guild.id);
  const member = interaction.member;
  const isHigh = member.permissions.has('Administrator') || (cfg.highTeamRoleIds || []).some((r) => member.roles.cache.has(r));
  if (!isHigh) return interaction.reply({ content: '❌ Only high-team members can approve or deny.', ephemeral: true });

  await interaction.deferUpdate();

  let outcomeText;
  if (!allow) {
    await updateCase(guild.id, caseId, { status: 'denied', approverId: interaction.user.id, deniedAt: new Date().toISOString() });
    outcomeText = `❌ **Denied** by <@${interaction.user.id}>`;
    notifyRequester(client, c, false, interaction.user).catch(() => {});
  } else {
    let res;
    if (c.type === 'ban') res = await executeBan(guild, c.targetId, c.modId, `${interaction.user.tag} (approved trainee request)`, c.reason);
    else if (c.type === 'unban') res = await executeUnban(guild, c.targetId, `${interaction.user.tag} (approved trainee request)`, c.reason);
    else if (c.type === 'warn') res = await executeWarn(guild, c.targetId, c.modId, c.reason);

    if (!res?.ok) {
      await updateCase(guild.id, caseId, { status: 'failed', approverId: interaction.user.id, error: res?.reason || 'error' });
      outcomeText = `⚠️ Approved by <@${interaction.user.id}> but execution failed: \`${res?.reason || 'error'}\``;
    } else {
      await updateCase(guild.id, caseId, { status: 'executed', approverId: interaction.user.id, executedAt: new Date().toISOString() });
      outcomeText = `✅ **Approved & executed** by <@${interaction.user.id}>`;
      notifyRequester(client, c, true, interaction.user).catch(() => {});
    }
  }

  // Edit the original message: remove buttons, append outcome
  try {
    const updated = await getCase(guild.id, caseId);
    const requester = await guild.members.fetch(c.modId).catch(() => null);
    const embed = buildCaseEmbed(updated, requester);
    embed.addFields({ name: 'Decision', value: outcomeText, inline: false });
    await interaction.message.edit({ content: outcomeText, embeds: [embed], components: [] });
  } catch (e) {
    logger.warn('Could not edit approval message:', e.message);
  }
}

async function notifyRequester(client, c, approved, decider) {
  try {
    const user = await client.users.fetch(c.modId);
    const verb = approved ? 'approved' : 'denied';
    await user.send(`Your **${c.type}** request for \`${c.targetId}\` (Case #${c.id}) was **${verb}** by ${decider.tag}.\nReason: ${c.reason}`);
  } catch {}
}
