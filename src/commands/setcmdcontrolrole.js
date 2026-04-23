import { SlashCommandBuilder } from 'discord.js';
import { extractRoleIds } from '../utils/parse.js';
import { reply } from '../utils/reply.js';
import { isAdminOrOwner, hasManageGuild } from '../permissions.js';
import { setConfig } from '../guildConfig.js';

export default {
  name: 'setcmdcontrolrole',
  aliases: ['setcontrolrole'],
  description: 'Set role(s) that can use setup commands. Multiple roles supported.',
  slash: new SlashCommandBuilder()
    .setName('setcmdcontrolrole')
    .setDescription('Set role(s) allowed to use setup commands.')
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
    await setConfig(guild.id, { cmdControlRoleIds: ids });
    return reply(ctx, `✅ Setup-command role(s) set to: ${ids.map((r) => `<@&${r}>`).join(', ')}`);
  },
};
