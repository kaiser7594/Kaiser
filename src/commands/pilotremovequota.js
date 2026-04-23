import { SlashCommandBuilder } from 'discord.js';
import { reply } from '../utils/reply.js';
import { hasCmdControl } from '../permissions.js';
import { setConfig } from '../guildConfig.js';

export default {
  name: 'pilotremovequota',
  aliases: [],
  description: 'Remove the pilot quota.',
  slash: new SlashCommandBuilder().setName('pilotremovequota').setDescription('Remove the pilot quota.'),
  async run(ctx) {
    const { member, guild } = ctx;
    if (!(await hasCmdControl(member))) return reply(ctx, '❌ You do not have permission to use this command.');
    await setConfig(guild.id, { pilotQuota: 0 });
    return reply(ctx, '✅ Pilot quota removed.');
  },
};
