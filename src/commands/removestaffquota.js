import { SlashCommandBuilder } from 'discord.js';
import { reply } from '../utils/reply.js';
import { hasCmdControl } from '../permissions.js';
import { setConfig } from '../guildConfig.js';

export default {
  name: 'removestaffquota',
  aliases: [],
  description: 'Remove the staff work quota.',
  slash: new SlashCommandBuilder().setName('removestaffquota').setDescription('Remove the staff work quota.'),
  async run(ctx) {
    const { member, guild } = ctx;
    if (!(await hasCmdControl(member))) return reply(ctx, '❌ You do not have permission to use this command.');
    await setConfig(guild.id, { staffQuota: 0 });
    return reply(ctx, '✅ Staff quota removed.');
  },
};
