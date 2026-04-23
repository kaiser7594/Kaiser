import { storage } from './storage.js';

const userKey = (gid, uid) => `k:guild:${gid}:warns:${uid}`;
const counterKey = (gid) => `k:guild:${gid}:warn_counter`;

async function nextId(guildId) {
  const cur = (await storage.get(counterKey(guildId), 0)) || 0;
  const next = cur + 1;
  await storage.set(counterKey(guildId), next);
  return next;
}

export async function addWarning(guildId, userId, modId, reason) {
  const id = await nextId(guildId);
  const list = (await storage.get(userKey(guildId, userId), [])) || [];
  const w = { id, reason: reason || 'No reason provided', modId, time: new Date().toISOString() };
  list.push(w);
  await storage.set(userKey(guildId, userId), list);
  return w;
}

export async function listWarnings(guildId, userId) {
  return (await storage.get(userKey(guildId, userId), [])) || [];
}

export async function removeWarning(guildId, userId, warnId, modId, removeReason) {
  const list = (await storage.get(userKey(guildId, userId), [])) || [];
  const idx = list.findIndex((w) => w.id === Number(warnId));
  if (idx === -1) return null;
  const removed = list.splice(idx, 1)[0];
  await storage.set(userKey(guildId, userId), list);
  // log the removal
  const logKey = `k:guild:${guildId}:warn_removals:${userId}`;
  const log = (await storage.get(logKey, [])) || [];
  log.push({ ...removed, removedBy: modId, removedAt: new Date().toISOString(), removeReason: removeReason || 'No reason provided' });
  await storage.set(logKey, log);
  return removed;
}

export async function findWarningById(guildId, warnId) {
  const keys = await storage.list(`k:guild:${guildId}:warns:`);
  for (const k of keys) {
    const list = (await storage.get(k, [])) || [];
    const w = list.find((x) => x.id === Number(warnId));
    if (w) return { userId: k.split(':').pop(), warning: w };
  }
  return null;
}
