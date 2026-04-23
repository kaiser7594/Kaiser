import { SlashCommandBuilder } from 'discord.js';
import { reply } from '../utils/reply.js';
import { hasCmdControl } from '../permissions.js';
import { setConfig } from '../guildConfig.js';

export default {
  name: 'setmmquota',
  aliases: [],
  description: 'Set monthly middleman quota (0 = off).',
  slash: new SlashCommandBuilder()
    .setName('setmmquota')
    .setDescription('Set monthly middleman quota (0 = off).')
    .addIntegerOption((o) => o.setName('amount').setDescription('Quota amount').setRequired(true).setMinValue(0)),
  async run(ctx) {
    const { interaction, member, guild, args } = ctx;
    if (!(await hasCmdControl(member))) return reply(ctx, '❌ You do not have permission to use this command.');
    const amount = interaction ? interaction.options.getInteger('amount') : Number(args[0]);
    if (!Number.isFinite(amount) || amount < 0) return reply(ctx, '❌ Provide a non-negative number.');
    await setConfig(guild.id, { mmQuota: amount });
    return reply(ctx, amount === 0 ? '✅ Middleman quota disabled.' : `✅ Middleman monthly quota set to **${amount}**.`);
  },
};
