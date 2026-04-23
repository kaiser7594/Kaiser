import { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, AttachmentBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { getConfig } from './guildConfig.js';
import { createCase, getCase, updateCase } from './casesService.js';
import { executeBan, executeUnban, executeWarn } from './moderation.js';
import { dmModerationAction } from './utils/dm.js';
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

export async function submitForApproval(client, guild, requester, c) {
  const cfg = await getConfig(guild.id);
  if (!cfg.traineeChannelId) return { ok: false, reason: 'no_trainee_channel' };
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

  const persistedUrl = msg.attachments.first()?.url || c.proofUrl;
  await updateCase(guild.id, c.id, { proofUrl: persistedUrl, approvalChannelId: channel.id, approvalMessageId: msg.id });
  return { ok: true, message: msg };
}

// On Allow click → execute immediately. On Deny click → open modal for reason.
export async function handleCaseDecision(client, interaction, caseId, allow) {
  const guild = interaction.guild;
  const c = await getCase(guild.id, caseId);
  if (!c) return interaction.reply({ content: '❌ Case not found.', ephemeral: true });
  if (c.status !== 'pending') return interaction.reply({ content: `⚠️ This case is already **${c.status}**.`, ephemeral: true });

  const cfg = await getConfig(guild.id);
  const member = interaction.member;
  const isHigh = member.permissions.has('Administrator') || (cfg.highTeamRoleIds || []).some((r) => member.roles.cache.has(r));
  if (!isHigh) return interaction.reply({ content: '❌ Only high-team members can approve or deny.', ephemeral: true });

  if (!allow) {
    const modal = new ModalBuilder()
      .setCustomId(`case_deny_modal:${caseId}`)
      .setTitle(`Deny case #${caseId}`)
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('reason')
            .setLabel('Reason for denial')
            .setStyle(TextInputStyle.Paragraph)
            .setMinLength(1)
            .setMaxLength(500)
            .setRequired(true),
        ),
      );
    return interaction.showModal(modal);
  }

  await interaction.deferUpdate();
  await executeApproval(client, interaction.message, c, interaction.user);
}

export async function handleDenyModal(client, interaction) {
  const caseId = (interaction.customId || '').split(':')[1];
  const c = await getCase(interaction.guild.id, caseId);
  if (!c) return interaction.reply({ content: '❌ Case not found.', ephemeral: true });
  if (c.status !== 'pending') return interaction.reply({ content: `⚠️ This case is already **${c.status}**.`, ephemeral: true });

  const cfg = await getConfig(interaction.guild.id);
  const isHigh = interaction.member.permissions.has('Administrator') || (cfg.highTeamRoleIds || []).some((r) => interaction.member.roles.cache.has(r));
  if (!isHigh) return interaction.reply({ content: '❌ Only high-team members can deny.', ephemeral: true });

  const denyReason = interaction.fields.getTextInputValue('reason');
  await interaction.deferUpdate();

  await updateCase(interaction.guild.id, caseId, {
    status: 'denied', approverId: interaction.user.id, denyReason, deniedAt: new Date().toISOString(),
  });

  const updated = await getCase(interaction.guild.id, caseId);
  const requester = await interaction.guild.members.fetch(c.modId).catch(() => null);
  const embed = buildCaseEmbed(updated, requester);
  embed.addFields(
    { name: 'Decision', value: `❌ **Denied** by <@${interaction.user.id}>`, inline: false },
    { name: 'Denial reason', value: denyReason, inline: false },
  );
  try { await interaction.message.edit({ content: `❌ Denied by <@${interaction.user.id}>`, embeds: [embed], components: [] }); } catch {}

  await notifyTraineeInChannel(client, interaction.guild, c, false, interaction.user, denyReason);
}

async function executeApproval(client, approvalMessage, c, decider) {
  const guild = approvalMessage.guild;
  let res;
  if (c.type === 'ban') res = await executeBan(guild, c.targetId, c.modId, `${decider.tag} (approved trainee request)`, c.reason);
  else if (c.type === 'unban') res = await executeUnban(guild, c.targetId, `${decider.tag} (approved trainee request)`, c.reason);
  else if (c.type === 'warn') res = await executeWarn(guild, c.targetId, c.modId, c.reason);

  let outcomeText;
  if (!res?.ok) {
    await updateCase(guild.id, c.id, { status: 'failed', approverId: decider.id, error: res?.reason || 'error' });
    outcomeText = `⚠️ Approved by <@${decider.id}> but execution failed: \`${res?.reason || 'error'}\``;
  } else {
    const patch = { status: 'executed', approverId: decider.id, executedAt: new Date().toISOString() };
    if (c.type === 'warn' && res.warning) patch.warningId = res.warning.id;
    await updateCase(guild.id, c.id, patch);
    outcomeText = `✅ **Approved & executed** by <@${decider.id}>`;
    // DM target
    await dmModerationAction(client, {
      type: c.type, targetId: c.targetId, guildName: guild.name, reason: c.reason,
      modTag: `${decider.tag} (approved request from <@${c.modId}>)`,
      proofUrl: c.proofUrl, warningId: res.warning?.id,
    });
  }

  const updated = await getCase(guild.id, c.id);
  const requester = await guild.members.fetch(c.modId).catch(() => null);
  const embed = buildCaseEmbed(updated, requester);
  embed.addFields({ name: 'Decision', value: outcomeText, inline: false });
  try { await approvalMessage.edit({ content: outcomeText, embeds: [embed], components: [] }); } catch {}

  await notifyTraineeInChannel(client, guild, c, !!res?.ok, decider, null);
}

async function notifyTraineeInChannel(client, guild, c, approved, decider, denyReason) {
  if (!c.channelId) return;
  const ch = await guild.channels.fetch(c.channelId).catch(() => null);
  if (!ch) return;
  const verb = approved ? 'approved & executed' : 'denied';
  const color = approved ? 0x2ecc71 : 0xe74c3c;
  const embed = new EmbedBuilder()
    .setTitle(`Case #${c.id} — ${verb}`)
    .setColor(color)
    .setDescription(`Your **${c.type}** request for <@${c.targetId}> (\`${c.targetId}\`) was **${verb}** by <@${decider.id}>.`)
    .addFields({ name: 'Original reason', value: c.reason || '_none_', inline: false });
  if (!approved && denyReason) embed.addFields({ name: 'Denial reason', value: denyReason, inline: false });
  try {
    await ch.send({ content: `<@${c.modId}>`, embeds: [embed], allowedMentions: { users: [c.modId] } });
  } catch {}
}
