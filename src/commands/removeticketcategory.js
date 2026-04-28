import { SlashCommandBuilder } from 'discord.js';
import { reply } from '../utils/reply.js';
import { hasCmdControl } from '../permissions.js';
import { setConfig } from '../guildConfig.js';

export default {
  name: 'removeticketcategory',
  aliases: [],
  description: 'Remove the ticket category (channel-style tickets).',
  slash: new SlashCommandBuilder()
    .setName('removeticketcategory')
    .setDescription('Remove the ticket category (channel-style tickets).'),
  async run(ctx) {
    const { member, guild } = ctx;
    if (!(await hasCmdControl(member))) return reply(ctx, '❌ You do not have permission to use this command.');
    await setConfig(guild.id, { ticketCategoryId: null });
    return reply(ctx, '✅ Ticket category removed.');
  },
};
