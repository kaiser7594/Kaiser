import { PermissionsBitField } from 'discord.js';
import { getConfig } from './guildConfig.js';

export function hasManageGuild(member) {
  return member?.permissions?.has(PermissionsBitField.Flags.ManageGuild) === true;
}

export function isAdminOrOwner(member) {
  return member?.permissions?.has(PermissionsBitField.Flags.Administrator) === true ||
         member?.guild?.ownerId === member?.id;
}

export async function hasCmdControl(member) {
  if (isAdminOrOwner(member)) return true;
  if (hasManageGuild(member)) return true;
  const cfg = await getConfig(member.guild.id);
  return (cfg.cmdControlRoleIds || []).some((r) => member.roles.cache.has(r));
}

export async function isHighTeam(member) {
  if (!member) return false;
  if (isAdminOrOwner(member)) return true;
  const cfg = await getConfig(member.guild.id);
  return (cfg.highTeamRoleIds || []).some((r) => member.roles.cache.has(r));
}

export async function isLowTeam(member) {
  if (!member) return false;
  const cfg = await getConfig(member.guild.id);
  return (cfg.lowTeamRoleIds || []).some((r) => member.roles.cache.has(r));
}

// Either moderation staff tier (used to gate ban/warn/unban entry)
export async function isAnyStaff(member) {
  if (await isHighTeam(member)) return true;
  if (await isLowTeam(member)) return true;
  return false;
}

// "Vouchable" role check — only people with one of the vouch/staff roles
// (or admins/mods) may use profile + leaderboards.
export async function canViewVouchProfile(member) {
  if (!member) return false;
  if (isAdminOrOwner(member) || hasManageGuild(member)) return true;
  const cfg = await getConfig(member.guild.id);
  const allowed = [
    ...(cfg.mmVouchRoleIds || []),
    ...(cfg.pilotVouchRoleIds || []),
    ...(cfg.staffRoleIds || []),
    ...(cfg.highTeamRoleIds || []),
    ...(cfg.cmdControlRoleIds || []),
  ];
  return allowed.some((r) => member.roles.cache.has(r));
}

export function hasModPerm(member) {
  if (!member) return false;
  return member.permissions.has(PermissionsBitField.Flags.BanMembers) ||
         member.permissions.has(PermissionsBitField.Flags.KickMembers) ||
         member.permissions.has(PermissionsBitField.Flags.ModerateMembers) ||
         isAdminOrOwner(member);
}
