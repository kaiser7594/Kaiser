import { getConfig } from './guildConfig.js';
import { addVouch, removeVouch } from './vouchService.js';
import { storage } from './storage.js';

const MENTION_RE = /<@!?(\d{17,20})>/g;

const msgKey = (gid, mid) => `k:guild:${gid}:vouchmsg:${mid}`;

// When a user is pinged in the configured mm/pilot channel,
// the pinged user (if they have the matching vouch role) gets +1 count.
export async function trackVouchPings(client, message) {
  if (message.author?.bot) return;
  if (!message.guild) return;
  const cfg = await getConfig(message.guild.id);

  let type = null;
  if (message.channel.id === cfg.mmChannelId) type = 'mm';
  else if (message.channel.id === cfg.pilotChannelId) type = 'pilot';
  if (!type) return;

  const roleIds = type === 'mm' ? cfg.mmVouchRoleIds : cfg.pilotVouchRoleIds;
  if (!roleIds || roleIds.length === 0) return;

  const recipients = [];
  const seen = new Set();
  let m;
  MENTION_RE.lastIndex = 0;
  while ((m = MENTION_RE.exec(message.content)) !== null) {
    const uid = m[1];
    if (seen.has(uid)) continue;
    seen.add(uid);
    if (uid === message.author.id) continue;
    let member = message.guild.members.cache.get(uid);
    if (!member) {
      try { member = await message.guild.members.fetch(uid); } catch { continue; }
    }
    const ok = roleIds.some((r) => member.roles.cache.has(r));
    if (!ok) continue;
    await addVouch(message.guild.id, uid, type, {
      byUserId: message.author.id,
      channelId: message.channel.id,
      messageUrl: message.url,
      sourceMessageId: message.id,
    });
    recipients.push(uid);
  }

  if (recipients.length) {
    await storage.set(msgKey(message.guild.id, message.id), {
      type,
      recipients,
      byUserId: message.author.id,
      channelId: message.channel.id,
      at: new Date().toISOString(),
    });
  }
}

// Called when a message is edited — sync vouches to match the new mentions.
export async function handleVouchMessageUpdate(client, oldMessage, newMessage) {
  const message = newMessage?.partial ? await newMessage.fetch().catch(() => null) : newMessage;
  if (!message || !message.guild || message.author?.bot) return;
  const cfg = await getConfig(message.guild.id);

  let type = null;
  if (message.channel.id === cfg.mmChannelId) type = 'mm';
  else if (message.channel.id === cfg.pilotChannelId) type = 'pilot';
  if (!type) return;

  const roleIds = type === 'mm' ? cfg.mmVouchRoleIds : cfg.pilotVouchRoleIds;
  if (!roleIds || roleIds.length === 0) return;

  const prev = await storage.get(msgKey(message.guild.id, message.id), null);
  const prevRecipients = prev?.recipients || [];

  // Recompute current recipients from the edited content
  const current = [];
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
    current.push(uid);
  }

  const removed = prevRecipients.filter((u) => !current.includes(u));
  const added = current.filter((u) => !prevRecipients.includes(u));

  for (const uid of removed) {
    try { await removeVouch(message.guild.id, uid, type, message.id); } catch {}
  }
  for (const uid of added) {
    try {
      await addVouch(message.guild.id, uid, type, {
        byUserId: message.author.id,
        channelId: message.channel.id,
        messageUrl: message.url,
        sourceMessageId: message.id,
      });
    } catch {}
  }

  if (current.length === 0) {
    if (prev) await storage.delete(msgKey(message.guild.id, message.id));
  } else if (removed.length || added.length || !prev) {
    await storage.set(msgKey(message.guild.id, message.id), {
      type,
      recipients: current,
      byUserId: message.author.id,
      channelId: message.channel.id,
      at: prev?.at || new Date().toISOString(),
    });
  }
}

// Called when a message is deleted — undo any vouches that came from it.
export async function handleVouchMessageDelete(client, message) {
  if (!message.guild) return;
  const rec = await storage.get(msgKey(message.guild.id, message.id), null);
  if (!rec) return;
  for (const uid of rec.recipients || []) {
    try { await removeVouch(message.guild.id, uid, rec.type, message.id); } catch {}
  }
  await storage.delete(msgKey(message.guild.id, message.id));
}
