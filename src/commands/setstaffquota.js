import { SlashCommandBuilder } from 'discord.js';
import { reply } from '../utils/reply.js';
import { hasCmdControl } from '../permissions.js';
import { setConfig } from '../guildConfig.js';

export default {
  name: 'setstaffquota',
  aliases: [],
  description: 'Set the monthly staff work quota (0 = off).',
  slash: new SlashCommandBuilder()
    .setName('setstaffquota')
    .setDescription('Set the monthly staff work quota.')
    .addIntegerOption((o) => o.setName('count').setDescription('Quota (0 = off)').setRequired(true).setMinValue(0)),
  async run(ctx) {
    const { interaction, member, guild, args } = ctx;
    if (!(await hasCmdControl(member))) return reply(ctx, '❌ You do not have permission to use this command.');
    const n = interaction ? interaction.options.getInteger('count') : Number(args[0]);
    if (!Number.isFinite(n) || n < 0) return reply(ctx, '❌ Provide a valid non-negative number.');
    await setConfig(guild.id, { staffQuota: n });
    return reply(ctx, n === 0 ? '✅ Staff quota turned off.' : `✅ Staff quota set to **${n}** per month.`);
  },
};
