import { SlashCommandBuilder } from 'discord.js';
import { reply } from '../utils/reply.js';
import { hasCmdControl } from '../permissions.js';
import { setConfig } from '../guildConfig.js';

export default {
  name: 'removemessagequota',
  aliases: [],
  description: 'Remove the staff message quota.',
  slash: new SlashCommandBuilder().setName('removemessagequota').setDescription('Remove the staff message quota.'),
  async run(ctx) {
    const { member, guild } = ctx;
    if (!(await hasCmdControl(member))) return reply(ctx, '❌ You do not have permission to use this command.');
    await setConfig(guild.id, { messageQuota: 0 });
    return reply(ctx, '✅ Message quota removed.');
  },
};
