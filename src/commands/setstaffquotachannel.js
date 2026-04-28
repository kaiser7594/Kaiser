import { SlashCommandBuilder, ChannelType } from 'discord.js';
import { extractChannelId } from '../utils/parse.js';
import { reply } from '../utils/reply.js';
import { hasCmdControl } from '../permissions.js';
import { setConfig } from '../guildConfig.js';

export default {
  name: 'setstaffquotachannel',
  aliases: [],
  description: 'Set the channel where monthly staff quota reports are posted.',
  slash: new SlashCommandBuilder()
    .setName('setstaffquotachannel')
    .setDescription('Set the staff quota report channel.')
    .addChannelOption((o) => o.setName('channel').setDescription('Channel').setRequired(true).addChannelTypes(ChannelType.GuildText)),
  async run(ctx) {
    const { interaction, member, guild, args } = ctx;
    if (!(await hasCmdControl(member))) return reply(ctx, '❌ You do not have permission to use this command.');
    const id = interaction ? interaction.options.getChannel('channel').id : extractChannelId(args[0]);
    if (!id) return reply(ctx, '❌ Provide a valid channel.');
    await setConfig(guild.id, { staffQuotaChannelId: id });
    return reply(ctx, `✅ Staff quota report channel set to <#${id}>. The monthly report will auto-post here on the 1st (UTC).`);
  },
};
