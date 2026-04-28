import { SlashCommandBuilder } from 'discord.js';
import { reply } from '../utils/reply.js';
import { hasCmdControl } from '../permissions.js';
import { setConfig } from '../guildConfig.js';

export default {
  name: 'removeticketquota',
  aliases: [],
  description: 'Remove the staff ticket quota.',
  slash: new SlashCommandBuilder().setName('removeticketquota').setDescription('Remove the staff ticket quota.'),
  async run(ctx) {
    const { member, guild } = ctx;
    if (!(await hasCmdControl(member))) return reply(ctx, '❌ You do not have permission to use this command.');
    await setConfig(guild.id, { ticketQuota: 0 });
    return reply(ctx, '✅ Ticket quota removed.');
  },
};
