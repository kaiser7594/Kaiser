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

export async function hasHighTeam(member) {
  if (isAdminOrOwner(member)) return true;
  const cfg = await getConfig(member.guild.id);
  return (cfg.highTeamRoleIds || []).some((r) => member.roles.cache.has(r));
}

export function hasModPerm(member) {
  if (!member) return false;
  return member.permissions.has(PermissionsBitField.Flags.BanMembers) ||
         member.permissions.has(PermissionsBitField.Flags.KickMembers) ||
         member.permissions.has(PermissionsBitField.Flags.ModerateMembers) ||
         isAdminOrOwner(member);
}
