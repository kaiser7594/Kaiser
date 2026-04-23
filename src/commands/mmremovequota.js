import { SlashCommandBuilder } from 'discord.js';
import { reply } from '../utils/reply.js';
import { hasCmdControl } from '../permissions.js';
import { setConfig } from '../guildConfig.js';

export default {
  name: 'mmremovequota',
  aliases: [],
  description: 'Remove the middleman quota.',
  slash: new SlashCommandBuilder().setName('mmremovequota').setDescription('Remove the middleman quota.'),
  async run(ctx) {
    const { member, guild } = ctx;
    if (!(await hasCmdControl(member))) return reply(ctx, '❌ You do not have permission to use this command.');
    await setConfig(guild.id, { mmQuota: 0 });
    return reply(ctx, '✅ Middleman quota removed.');
  },
};
