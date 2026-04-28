import { getConfig } from './guildConfig.js';
import { addVouch, removeVouch } from './vouchService.js';
import { storage } from './storage.js';

const MENTION_RE = /<@!?(\d{17,20})>/g;
const LINK_RE = /https?:\/\/[^\s<>'"]+/i;

const msgKey = (gid, mid) => `k:guild:${gid}:vouchmsg:${mid}`;

// Compute (type, recipients) for a message according to the configured channels/roles.
async function computeForMessage(message, cfg) {
  if (message.author?.bot) return null;

  // Staff channel: count once per message containing a link, credited to the author (must have staff role)
  if (cfg.staffChannelId && message.channel.id === cfg.staffChannelId) {
    const roleIds = cfg.staffRoleIds || [];
    if (!roleIds.length) return null;
    const member = message.member || (await message.guild.members.fetch(message.author.id).catch(() => null));
    if (!member || !roleIds.some((r) => member.roles.cache.has(r))) return null;
    if (!LINK_RE.test(message.content || '')) return null;
    return { type: 'staff', recipients: [message.author.id] };
  }

  // Vouch channels: credit any pinged user that has the matching vouch role
  let type = null;
  if (message.channel.id === cfg.mmChannelId) type = 'mm';
  else if (message.channel.id === cfg.pilotChannelId) type = 'pilot';
  if (!type) return null;
  const roleIds = type === 'mm' ? cfg.mmVouchRoleIds : cfg.pilotVouchRoleIds;
  if (!roleIds || !roleIds.length) return null;

  const recipients = [];
  const seen = new Set();
  let m;
  MENTION_RE.lastIndex = 0;
  while ((m = MENTION_RE.exec(message.content || '')) !== null) {
    const uid = m[1];
    if (seen.has(uid)) continue;
    seen.add(uid);
    if (uid === message.author.id) continue;
    let member = message.guild.members.cache.get(uid);
    if (!member) {
      try { member = await message.guild.members.fetch(uid); } catch { continue; }
    }
    if (!roleIds.some((r) => member.roles.cache.has(r))) continue;
    recipients.push(uid);
  }
  return { type, recipients };
}

export async function trackVouchPings(client, message) {
  if (!message.guild || message.author?.bot) return;
  const cfg = await getConfig(message.guild.id);
  const computed = await computeForMessage(message, cfg);
  if (!computed || !computed.recipients.length) return;

  for (const uid of computed.recipients) {
    await addVouch(message.guild.id, uid, computed.type, {
      byUserId: message.author.id,
      channelId: message.channel.id,
      messageUrl: message.url,
      sourceMessageId: message.id,
    });
  }

  await storage.set(msgKey(message.guild.id, message.id), {
    type: computed.type,
    recipients: computed.recipients,
    byUserId: message.author.id,
    channelId: message.channel.id,
    at: new Date().toISOString(),
  });
}

export async function handleVouchMessageUpdate(client, oldMessage, newMessage) {
  const message = newMessage?.partial ? await newMessage.fetch().catch(() => null) : newMessage;
  if (!message || !message.guild || message.author?.bot) return;
  const cfg = await getConfig(message.guild.id);
  const computed = await computeForMessage(message, cfg);

  const prev = await storage.get(msgKey(message.guild.id, message.id), null);
  const prevType = prev?.type;
  const prevRecipients = prev?.recipients || [];
  const currType = computed?.type || null;
  const currRecipients = computed?.recipients || [];

  if (prevType && prevType !== currType) {
    for (const uid of prevRecipients) {
      try { await removeVouch(message.guild.id, uid, prevType, message.id); } catch {}
    }
    for (const uid of currRecipients) {
      try {
        await addVouch(message.guild.id, uid, currType, {
          byUserId: message.author.id, channelId: message.channel.id, messageUrl: message.url, sourceMessageId: message.id,
        });
      } catch {}
    }
  } else {
    const removed = prevRecipients.filter((u) => !currRecipients.includes(u));
    const added = currRecipients.filter((u) => !prevRecipients.includes(u));
    for (const uid of removed) {
      try { await removeVouch(message.guild.id, uid, prevType, message.id); } catch {}
    }
    for (const uid of added) {
      try {
        await addVouch(message.guild.id, uid, currType, {
          byUserId: message.author.id, channelId: message.channel.id, messageUrl: message.url, sourceMessageId: message.id,
        });
      } catch {}
    }
  }

  if (!currRecipients.length) {
    if (prev) await storage.delete(msgKey(message.guild.id, message.id));
  } else {
    await storage.set(msgKey(message.guild.id, message.id), {
      type: currType,
      recipients: currRecipients,
      byUserId: message.author.id,
      channelId: message.channel.id,
      at: prev?.at || new Date().toISOString(),
    });
  }
}

export async function handleVouchMessageDelete(client, message) {
  if (!message.guild) return;
  const rec = await storage.get(msgKey(message.guild.id, message.id), null);
  if (!rec) return;
  for (const uid of rec.recipients || []) {
    try { await removeVouch(message.guild.id, uid, rec.type, message.id); } catch {}
  }
  await storage.delete(msgKey(message.guild.id, message.id));
}
