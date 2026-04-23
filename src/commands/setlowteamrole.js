import { SlashCommandBuilder } from 'discord.js';
import { extractRoleIds } from '../utils/parse.js';
import { reply } from '../utils/reply.js';
import { isAdminOrOwner, hasManageGuild } from '../permissions.js';
import { setConfig } from '../guildConfig.js';

export default {
  name: 'setlowteamrole',
  aliases: ['settraineerole'],
  description: 'Set trainee (low-team) role(s). Their bans/warns/unbans need approval.',
  slash: new SlashCommandBuilder()
    .setName('setlowteamrole')
    .setDescription('Set trainee role(s).')
    .addRoleOption((o) => o.setName('role').setDescription('Role').setRequired(true))
    .addRoleOption((o) => o.setName('role2').setDescription('Optional').setRequired(false))
    .addRoleOption((o) => o.setName('role3').setDescription('Optional').setRequired(false)),
  async run(ctx) {
    const { interaction, member, guild, args } = ctx;
    if (!(isAdminOrOwner(member) || hasManageGuild(member))) return reply(ctx, '❌ Only Admins/Manage Server can change this.');
    let ids;
    if (interaction) ids = ['role', 'role2', 'role3'].map((n) => interaction.options.getRole(n)?.id).filter(Boolean);
    else ids = extractRoleIds(args);
    if (!ids.length) return reply(ctx, '❌ Provide one or more valid roles.');
    await setConfig(guild.id, { lowTeamRoleIds: ids });
    return reply(ctx, `✅ Trainee (low-team) role(s) set to: ${ids.map((r) => `<@&${r}>`).join(', ')}`);
  },
};
