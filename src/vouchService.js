import { storage } from './storage.js';

const userKey = (gid, uid) => `k:guild:${gid}:vouch:${uid}`;
const histKey = (gid, uid) => `k:guild:${gid}:vouchhist:${uid}`;
const archiveKey = (gid, uid, tag) => `k:guild:${gid}:archive:${uid}:${tag}`;

export const monthTag = (d = new Date()) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
export function prevMonthTag(d = new Date()) {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  x.setUTCMonth(x.getUTCMonth() - 1);
  return monthTag(x);
}
export function monthName(tag) {
  const [y, m] = tag.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

// Tracked types (have history + delete/edit undo) and counter types (just monthly tallies)
export const TYPES = ['mm', 'pilot', 'staff', 'ticket', 'staffmsg'];

const blankSlot = () => ({ month: 0, alltime: 0, monthTag: monthTag(), lastAt: null });
const blank = () => Object.fromEntries(TYPES.map((t) => [t, blankSlot()]));

// In-memory rollover (used by leaderboards). If guildId+userId provided, also archive previous month.
async function rolloverIfNeeded(obj, guildId = null, userId = null) {
  const tag = monthTag();
  const toArchive = {}; // tag -> { type: value }
  for (const k of TYPES) {
    if (!obj[k]) obj[k] = blankSlot();
    if (obj[k].monthTag !== tag) {
      if (obj[k].month > 0 && guildId && userId) {
        const t = obj[k].monthTag;
        toArchive[t] = toArchive[t] || {};
        toArchive[t][k] = obj[k].month;
      }
      obj[k].month = 0;
      obj[k].monthTag = tag;
    }
  }
  for (const [t, vals] of Object.entries(toArchive)) {
    const k = archiveKey(guildId, userId, t);
    const existing = (await storage.get(k, {})) || {};
    await storage.set(k, { ...existing, ...vals });
  }
  return obj;
}

export async function getProfile(guildId, userId) {
  const raw = await storage.get(userKey(guildId, userId), null);
  return rolloverIfNeeded(raw || blank(), guildId, userId);
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

export async function incrementCounter(guildId, userId, type) {
  const obj = await getProfile(guildId, userId);
  obj[type].month += 1;
  obj[type].alltime += 1;
  obj[type].lastAt = new Date().toISOString();
  await storage.set(userKey(guildId, userId), obj);
  return obj;
}

export async function listVouchHistory(guildId, userId, limit = 25, types = null) {
  const list = (await storage.get(histKey(guildId, userId), [])) || [];
  const filtered = types ? list.filter((e) => types.includes(e.type)) : list;
  return filtered.slice(-limit).reverse();
}

export async function listLeaderboard(guildId, type, scope = 'month', limit = 25) {
  const keys = await storage.list(`k:guild:${guildId}:vouch:`);
  const rows = [];
  for (const k of keys) {
    const data = await rolloverIfNeeded((await storage.get(k, blank())) || blank());
    const userId = k.split(':').pop();
    rows.push({ userId, count: data[type][scope] || 0 });
  }
  return rows.filter((r) => r.count > 0).sort((a, b) => b.count - a.count).slice(0, limit);
}

export async function resetVouches(guildId, scope, userId = null) {
  const reset = (obj) => {
    for (const t of TYPES) {
      if (scope === 'month' || scope === 'all') obj[t].month = 0;
      if (scope === 'alltime' || scope === 'all') obj[t].alltime = 0;
    }
  };
  if (userId) {
    const obj = await getProfile(guildId, userId);
    reset(obj);
    await storage.set(userKey(guildId, userId), obj);
    return 1;
  }
  const keys = await storage.list(`k:guild:${guildId}:vouch:`);
  for (const k of keys) {
    const obj = await rolloverIfNeeded((await storage.get(k, blank())) || blank());
    reset(obj);
    await storage.set(k, obj);
  }
  return keys.length;
}

// Return per-user totals for a given month tag, combining the live profile (when monthTag matches)
// and any archived snapshots already written.
export async function snapshotMonth(guildId, tag) {
  const out = {}; // userId -> { mm, pilot, staff, ticket, staffmsg }
  const aKeys = await storage.list(`k:guild:${guildId}:archive:`);
  for (const k of aKeys) {
    const parts = k.split(':');
    const t = parts.pop();
    const userId = parts.pop();
    if (t !== tag) continue;
    const data = (await storage.get(k, {})) || {};
    out[userId] = out[userId] || {};
    for (const type of TYPES) if (data[type]) out[userId][type] = (out[userId][type] || 0) + data[type];
  }
  const vKeys = await storage.list(`k:guild:${guildId}:vouch:`);
  for (const k of vKeys) {
    const userId = k.split(':').pop();
    const raw = await storage.get(k, null);
    if (!raw) continue;
    for (const type of TYPES) {
      const slot = raw[type];
      if (slot && slot.monthTag === tag && slot.month > 0) {
        out[userId] = out[userId] || {};
        if (!(type in out[userId])) out[userId][type] = slot.month;
      }
    }
  }
  return out;
}

// Live current-month standings (used by quotastatus command)
export async function currentStandings(guildId) {
  const tag = monthTag();
  return snapshotMonth(guildId, tag);
}
