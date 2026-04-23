import { SlashCommandBuilder, ChannelType } from 'discord.js';
import { extractChannelId } from '../utils/parse.js';
import { reply } from '../utils/reply.js';
import { hasCmdControl } from '../permissions.js';
import { setConfig } from '../guildConfig.js';

export default {
  name: 'settraineechannel',
  aliases: ['setapprovalchannel', 'setreportchannel'],
  description: 'Set the channel where trainee approval requests are posted.',
  slash: new SlashCommandBuilder()
    .setName('settraineechannel')
    .setDescription('Set trainee approval channel.')
    .addChannelOption((o) => o.setName('channel').setDescription('Channel').setRequired(true).addChannelTypes(ChannelType.GuildText)),
  async run(ctx) {
    const { interaction, member, guild, args } = ctx;
    if (!(await hasCmdControl(member))) return reply(ctx, '❌ You do not have permission to use this command.');
    const id = interaction ? interaction.options.getChannel('channel').id : extractChannelId(args[0]);
    if (!id) return reply(ctx, '❌ Provide a valid channel.');
    await setConfig(guild.id, { traineeChannelId: id });
    return reply(ctx, `✅ Trainee approval channel set to <#${id}>.`);
  },
};
