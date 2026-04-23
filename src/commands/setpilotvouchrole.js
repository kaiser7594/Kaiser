import { SlashCommandBuilder } from 'discord.js';
import { extractRoleIds } from '../utils/parse.js';
import { reply } from '../utils/reply.js';
import { hasCmdControl } from '../permissions.js';
import { setConfig } from '../guildConfig.js';

export default {
  name: 'setpilotvouchrole',
  aliases: [],
  description: 'Set role(s) that earn pilot vouches.',
  slash: new SlashCommandBuilder()
    .setName('setpilotvouchrole')
    .setDescription('Set role(s) that earn pilot vouches.')
    .addRoleOption((o) => o.setName('role').setDescription('Role').setRequired(true))
    .addRoleOption((o) => o.setName('role2').setDescription('Optional').setRequired(false))
    .addRoleOption((o) => o.setName('role3').setDescription('Optional').setRequired(false)),
  async run(ctx) {
    const { interaction, member, guild, args } = ctx;
    if (!(await hasCmdControl(member))) return reply(ctx, '❌ You do not have permission to use this command.');
    let ids;
    if (interaction) ids = ['role', 'role2', 'role3'].map((n) => interaction.options.getRole(n)?.id).filter(Boolean);
    else ids = extractRoleIds(args);
    if (!ids.length) return reply(ctx, '❌ Provide one or more valid roles.');
    await setConfig(guild.id, { pilotVouchRoleIds: ids });
    return reply(ctx, `✅ Pilot vouch role(s) set to: ${ids.map((r) => `<@&${r}>`).join(', ')}`);
  },
};
