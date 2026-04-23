import { getConfig } from './guildConfig.js';
import { addVouch } from './vouchService.js';

const MENTION_RE = /<@!?(\d{17,20})>/g;

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
    await addVouch(message.guild.id, uid, type);
  }
}
