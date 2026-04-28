import { storage } from './storage.js';

const KEY = (gid) => `k:guild:${gid}:config`;

export const DEFAULTS = {
  mmChannelId: null,
  pilotChannelId: null,
  mmVouchRoleIds: [],
  pilotVouchRoleIds: [],
  mmQuota: 0,
  pilotQuota: 0,
  cmdControlRoleIds: [],
  highTeamRoleIds: [],
  lowTeamRoleIds: [],
  traineeChannelId: null,
  staffRoleIds: [],
  staffChannelId: null,
  staffQuota: 0,
};

export async function getConfig(guildId) {
  const raw = await storage.get(KEY(guildId), {});
  return { ...DEFAULTS, ...(raw || {}) };
}

export async function setConfig(guildId, patch) {
  const cur = await getConfig(guildId);
  const next = { ...cur, ...patch };
  await storage.set(KEY(guildId), next);
  return next;
}
