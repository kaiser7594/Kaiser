import { logger } from './logger.js';

export const PREFIX = 'k!';

function splitArgs(content) {
  // simple shell-like splitter; supports quoted strings
  const out = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < content.length; i++) {
    const c = content[i];
    if (c === '"') { inQ = !inQ; continue; }
    if (!inQ && /\s/.test(c)) {
      if (cur) { out.push(cur); cur = ''; }
    } else cur += c;
  }
  if (cur) out.push(cur);
  return out;
}

export async function handleMessage(client, message) {
  if (message.author.bot || !message.guild) return;
  if (!message.content.startsWith(PREFIX)) return;
  const raw = message.content.slice(PREFIX.length).trim();
  if (!raw) return;
  const parts = splitArgs(raw);
  const name = parts.shift().toLowerCase();
  const cmdName = client.aliases.get(name) || name;
  const cmd = client.commands.get(cmdName);
  if (!cmd) return;
  const ctx = {
    client,
    message,
    interaction: null,
    guild: message.guild,
    member: message.member,
    user: message.author,
    channel: message.channel,
    args: parts,
    rawArgs: raw.slice(name.length).trim(),
  };
  try {
    await cmd.run(ctx);
  } catch (e) {
    logger.error(`Command ${cmdName} (prefix) error:`, e);
    try { await message.reply({ content: `❌ An error occurred running that command.`, allowedMentions: { repliedUser: false } }); } catch {}
  }
}

export async function handleInteraction(client, interaction) {
  if (interaction.isButton && interaction.isButton()) {
    const [action, caseId] = (interaction.customId || '').split(':');
    if (action === 'case_allow' || action === 'case_deny') {
      const { handleCaseDecision } = await import('./approvalFlow.js');
      try { await handleCaseDecision(client, interaction, caseId, action === 'case_allow'); }
      catch (e) { logger.error('case decision error:', e); }
      return;
    }
    return;
  }
  if (interaction.isModalSubmit && interaction.isModalSubmit()) {
    if ((interaction.customId || '').startsWith('case_deny_modal:')) {
      const { handleDenyModal } = await import('./approvalFlow.js');
      try { await handleDenyModal(client, interaction); }
      catch (e) { logger.error('deny modal error:', e); }
    }
    return;
  }
  if (!interaction.isChatInputCommand()) return;
  const cmd = client.commands.get(interaction.commandName);
  if (!cmd) return;
  const ctx = {
    client,
    message: null,
    interaction,
    guild: interaction.guild,
    member: interaction.member,
    user: interaction.user,
    channel: interaction.channel,
    args: [],
    rawArgs: '',
  };
  try {
    await cmd.run(ctx);
  } catch (e) {
    logger.error(`Command ${interaction.commandName} (slash) error:`, e);
    const payload = { content: '❌ An error occurred running that command.', ephemeral: true };
    try {
      if (interaction.deferred || interaction.replied) await interaction.followUp(payload);
      else await interaction.reply(payload);
    } catch {}
  }
}
