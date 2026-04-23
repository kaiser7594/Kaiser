import { storage } from './storage.js';

const counterKey = (gid) => `k:guild:${gid}:case_counter`;
const caseKey = (gid, cid) => `k:guild:${gid}:case:${cid}`;
const userCasesKey = (gid, uid) => `k:guild:${gid}:user_cases:${uid}`;

async function nextCaseId(guildId) {
  const cur = (await storage.get(counterKey(guildId), 0)) || 0;
  const next = cur + 1;
  await storage.set(counterKey(guildId), next);
  return next;
}

/**
 * payload: { type: 'ban'|'warn'|'unban', targetId, modId, reason, proofUrl, status, channelId? }
 */
export async function createCase(guildId, payload) {
  const id = await nextCaseId(guildId);
  const c = { id, ...payload, createdAt: new Date().toISOString() };
  await storage.set(caseKey(guildId, id), c);
  const list = (await storage.get(userCasesKey(guildId, payload.targetId), [])) || [];
  list.push(id);
  await storage.set(userCasesKey(guildId, payload.targetId), list);
  return c;
}

export async function getCase(guildId, caseId) {
  return await storage.get(caseKey(guildId, Number(caseId)), null);
}

export async function updateCase(guildId, caseId, patch) {
  const cur = await getCase(guildId, caseId);
  if (!cur) return null;
  const next = { ...cur, ...patch, updatedAt: new Date().toISOString() };
  await storage.set(caseKey(guildId, Number(caseId)), next);
  return next;
}

export async function listCasesForUser(guildId, userId) {
  const list = (await storage.get(userCasesKey(guildId, userId), [])) || [];
  const cases = [];
  for (const cid of list) {
    const c = await getCase(guildId, cid);
    if (c) cases.push(c);
  }
  return cases;
}
