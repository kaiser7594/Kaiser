import { SlashCommandBuilder } from 'discord.js';
import { reply } from '../utils/reply.js';
import { hasCmdControl } from '../permissions.js';
import { setConfig } from '../guildConfig.js';

export default {
  name: 'setmessagequota',
  aliases: [],
  description: 'Set the monthly message quota for staff (0 = off).',
  slash: new SlashCommandBuilder()
    .setName('setmessagequota')
    .setDescription('Set the monthly message quota for staff.')
    .addIntegerOption((o) => o.setName('count').setDescription('Quota (0 = off)').setRequired(true).setMinValue(0)),
  async run(ctx) {
    const { interaction, member, guild, args } = ctx;
    if (!(await hasCmdControl(member))) return reply(ctx, '❌ You do not have permission to use this command.');
    const n = interaction ? interaction.options.getInteger('count') : Number(args[0]);
    if (!Number.isFinite(n) || n < 0) return reply(ctx, '❌ Provide a valid non-negative number.');
    await setConfig(guild.id, { messageQuota: n });
    return reply(ctx, n === 0 ? '✅ Message quota turned off.' : `✅ Message quota set to **${n}** per month.`);
  },
};
