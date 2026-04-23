import { recordBan, clearBan } from './banLog.js';
import { addWarning } from './warningService.js';

export async function executeBan(guild, targetId, modId, modTag, reason) {
  const existing = await guild.bans.fetch(targetId).catch(() => null);
  if (existing) return { ok: false, reason: 'already_banned' };
  try {
    await guild.bans.create(targetId, { reason: `${reason} | by ${modTag}` });
    await recordBan(guild.id, targetId, modId, reason);
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: e.code === 50013 ? 'no_permission' : 'error', error: e.message };
  }
}

export async function executeUnban(guild, targetId, modTag, reason) {
  const ban = await guild.bans.fetch(targetId).catch(() => null);
  if (!ban) return { ok: false, reason: 'not_banned' };
  try {
    await guild.bans.remove(targetId, `${reason} | by ${modTag}`);
    await clearBan(guild.id, targetId);
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: e.code === 50013 ? 'no_permission' : 'error', error: e.message };
  }
}

export async function executeWarn(guild, targetId, modId, reason) {
  const w = await addWarning(guild.id, targetId, modId, reason);
  return { ok: true, warning: w };
}
