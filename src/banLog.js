import { storage } from './storage.js';

const banKey = (gid, uid) => `k:guild:${gid}:ban:${uid}`;

export async function recordBan(guildId, userId, modId, reason) {
  const entry = { userId, modId, reason: reason || 'No reason provided', time: new Date().toISOString() };
  await storage.set(banKey(guildId, userId), entry);
  return entry;
}

export async function getBan(guildId, userId) {
  return await storage.get(banKey(guildId, userId), null);
}

export async function clearBan(guildId, userId) {
  return await storage.delete(banKey(guildId, userId));
}
