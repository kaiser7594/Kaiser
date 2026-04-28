import { getConfig } from './guildConfig.js';
import { addVouch, removeVouch, incrementCounter } from './vouchService.js';
import { storage } from './storage.js';

const MENTION_RE = /<@!?(\d{17,20})>/g;
const LINK_RE = /https?:\/\/[^\s<>'"]+/i;

const msgKey = (gid, mid) => `k:guild:${gid}:vouchmsg:${mid}`;

// Returns { tracked: [{type,userId}], counters: [{type,userId}] }
//   tracked  -> has history + delete/edit undo (msgKey)
//   counters -> bumped on create only (e.g. msg activity counter)
async function computeForMessage(message, cfg) {
  if (message.author?.bot) return { tracked: [], counters: [] };

  // ---- Staff channel ----
  if (cfg.staffChannelId && message.channel.id === cfg.staffChannelId) {
    const roleIds = cfg.staffRoleIds || [];
    if (!roleIds.length) return { tracked: [], counters: [] };
    const member = message.member || (await message.guild.members.fetch(message.author.id).catch(() => null));
    if (!member || !roleIds.some((r) => member.roles.cache.has(r))) return { tracked: [], counters: [] };
    const tracked = [];
    if (LINK_RE.test(message.content || '')) tracked.push({ type: 'staff', userId: message.author.id });
    return { tracked, counters: [{ type: 'staffmsg', userId: message.author.id }] };
  }

  // ---- Ticket channel ----
  if (cfg.ticketChannelId && message.channel.id === cfg.ticketChannelId) {
    const roleIds = cfg.staffRoleIds || [];
    if (!roleIds.length) return { tracked: [], counters: [] };
    const member = message.member || (await message.guild.members.fetch(message.author.id).catch(() => null));
    if (!member || !roleIds.some((r) => member.roles.cache.has(r))) return { tracked: [], counters: [] };
    const tracked = [];
    if (LINK_RE.test(message.content || '')) tracked.push({ type: 'ticket', userId: message.author.id });
    return { tracked, counters: [] };
  }

  // ---- MM / Pilot vouch channels ----
  let type = null;
  if (message.channel.id === cfg.mmChannelId) type = 'mm';
  else if (message.channel.id === cfg.pilotChannelId) type = 'pilot';
  if (!type) return { tracked: [], counters: [] };
  const roleIds = type === 'mm' ? cfg.mmVouchRoleIds : cfg.pilotVouchRoleIds;
  if (!roleIds || !roleIds.length) return { tracked: [], counters: [] };

  const tracked = [];
  const seen = new Set();
  let m;
  MENTION_RE.lastIndex = 0;
  while ((m = MENTION_RE.exec(message.content || '')) !== null) {
    const uid = m[1];
    if (seen.has(uid)) continue;
    seen.add(uid);
    if (uid === message.author.id) continue;
    let mem = message.guild.members.cache.get(uid);
    if (!mem) {
      try { mem = await message.guild.members.fetch(uid); } catch { continue; }
    }
    if (!roleIds.some((r) => mem.roles.cache.has(r))) continue;
    tracked.push({ type, userId: uid });
  }
  return { tracked, counters: [] };
}

const credKey = (c) => `${c.type}:${c.userId}`;

export async function trackVouchPings(client, message) {
  if (!message.guild || message.author?.bot) return;
  const cfg = await getConfig(message.guild.id);
  const { tracked, counters } = await computeForMessage(message, cfg);
  if (!tracked.length && !counters.length) return;

  for (const c of tracked) {
    await addVouch(message.guild.id, c.userId, c.type, {
      byUserId: message.author.id,
      channelId: message.channel.id,
      messageUrl: message.url,
      sourceMessageId: message.id,
    });
  }
  for (const c of counters) {
    await incrementCounter(message.guild.id, c.userId, c.type);
  }

  if (tracked.length) {
    await storage.set(msgKey(message.guild.id, message.id), {
      tracked,
      byUserId: message.author.id,
      channelId: message.channel.id,
      at: new Date().toISOString(),
    });
  }
}

export async function handleVouchMessageUpdate(client, oldMessage, newMessage) {
  const message = newMessage?.partial ? await newMessage.fetch().catch(() => null) : newMessage;
  if (!message || !message.guild || message.author?.bot) return;
  const cfg = await getConfig(message.guild.id);
  const { tracked: curr } = await computeForMessage(message, cfg);

  const prev = await storage.get(msgKey(message.guild.id, message.id), null);
  const prevTracked = prev?.tracked || [];

  const prevMap = new Map(prevTracked.map((c) => [credKey(c), c]));
  const currMap = new Map(curr.map((c) => [credKey(c), c]));

  // Remove credits no longer present
  for (const [k, c] of prevMap) {
    if (!currMap.has(k)) {
      try { await removeVouch(message.guild.id, c.userId, c.type, message.id); } catch {}
    }
  }
  // Add new credits
  for (const [k, c] of currMap) {
    if (!prevMap.has(k)) {
      try {
        await addVouch(message.guild.id, c.userId, c.type, {
          byUserId: message.author.id, channelId: message.channel.id, messageUrl: message.url, sourceMessageId: message.id,
        });
      } catch {}
    }
  }

  if (!curr.length) {
    if (prev) await storage.delete(msgKey(message.guild.id, message.id));
  } else {
    await storage.set(msgKey(message.guild.id, message.id), {
      tracked: curr,
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
  for (const c of rec.tracked || []) {
    try { await removeVouch(message.guild.id, c.userId, c.type, message.id); } catch {}
  }
  await storage.delete(msgKey(message.guild.id, message.id));
}
