import { storage } from './storage.js';
import { getConfig } from './guildConfig.js';

const userKey = (gid, uid) => `k:guild:${gid}:vouch:${uid}`;
const histKey = (gid, uid) => `k:guild:${gid}:vouchhist:${uid}`;
const monthTag = (d = new Date()) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;

const blank = () => ({
  mm: { month: 0, alltime: 0, monthTag: monthTag(), lastAt: null },
  pilot: { month: 0, alltime: 0, monthTag: monthTag(), lastAt: null },
});

function rolloverIfNeeded(obj) {
  const tag = monthTag();
  for (const k of ['mm', 'pilot']) {
    if (!obj[k]) obj[k] = { month: 0, alltime: 0, monthTag: tag, lastAt: null };
    if (obj[k].monthTag !== tag) {
      obj[k].month = 0;
      obj[k].monthTag = tag;
    }
  }
  return obj;
}

export async function getProfile(guildId, userId) {
  const raw = await storage.get(userKey(guildId, userId), null);
  return rolloverIfNeeded(raw || blank());
}

export async function addVouch(guildId, userId, type, meta = {}) {
  const obj = await getProfile(guildId, userId);
  obj[type].month += 1;
  obj[type].alltime += 1;
  obj[type].lastAt = new Date().toISOString();
  await storage.set(userKey(guildId, userId), obj);

  const list = (await storage.get(histKey(guildId, userId), [])) || [];
  list.push({ type, byUserId: meta.byUserId || null, channelId: meta.channelId || null, messageUrl: meta.messageUrl || null, sourceMessageId: meta.sourceMessageId || null, at: new Date().toISOString() });
  if (list.length > 200) list.splice(0, list.length - 200);
  await storage.set(histKey(guildId, userId), list);

  return obj;
}

export async function removeVouch(guildId, userId, type, sourceMessageId = null) {
  const obj = await getProfile(guildId, userId);
  if (obj[type].month > 0) obj[type].month -= 1;
  if (obj[type].alltime > 0) obj[type].alltime -= 1;
  await storage.set(userKey(guildId, userId), obj);

  const list = (await storage.get(histKey(guildId, userId), [])) || [];
  let idx = -1;
  if (sourceMessageId) {
    idx = list.findIndex((e) => e.type === type && e.sourceMessageId === sourceMessageId);
  }
  if (idx === -1) {
    for (let i = list.length - 1; i >= 0; i--) if (list[i].type === type) { idx = i; break; }
  }
  if (idx !== -1) list.splice(idx, 1);
  await storage.set(histKey(guildId, userId), list);
  return obj;
}

export async function listVouchHistory(guildId, userId, limit = 25) {
  const list = (await storage.get(histKey(guildId, userId), [])) || [];
  return list.slice(-limit).reverse();
}

export async function listLeaderboard(guildId, type, scope = 'month', limit = 25) {
  const keys = await storage.list(`k:guild:${guildId}:vouch:`);
  const rows = [];
  for (const k of keys) {
    const data = rolloverIfNeeded(await storage.get(k, blank()));
    const userId = k.split(':').pop();
    rows.push({ userId, count: data[type][scope] || 0 });
  }
  return rows.filter((r) => r.count > 0).sort((a, b) => b.count - a.count).slice(0, limit);
}

export async function resetVouches(guildId, scope, userId = null) {
  if (userId) {
    const obj = await getProfile(guildId, userId);
    if (scope === 'month' || scope === 'all') { obj.mm.month = 0; obj.pilot.month = 0; }
    if (scope === 'alltime' || scope === 'all') { obj.mm.alltime = 0; obj.pilot.alltime = 0; }
    await storage.set(userKey(guildId, userId), obj);
    return 1;
  }
  const keys = await storage.list(`k:guild:${guildId}:vouch:`);
  for (const k of keys) {
    const obj = rolloverIfNeeded(await storage.get(k, blank()));
    if (scope === 'month' || scope === 'all') { obj.mm.month = 0; obj.pilot.month = 0; }
    if (scope === 'alltime' || scope === 'all') { obj.mm.alltime = 0; obj.pilot.alltime = 0; }
    await storage.set(k, obj);
  }
  return keys.length;
}
