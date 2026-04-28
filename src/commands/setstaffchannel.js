import { SlashCommandBuilder, ChannelType } from 'discord.js';
import { extractChannelId } from '../utils/parse.js';
import { reply } from '../utils/reply.js';
import { hasCmdControl } from '../permissions.js';
import { setConfig } from '../guildConfig.js';

export default {
  name: 'setstaffchannel',
  aliases: [],
  description: 'Set the staff channel where links posted by staff count as their work.',
  slash: new SlashCommandBuilder()
    .setName('setstaffchannel')
    .setDescription('Set the staff work channel.')
    .addChannelOption((o) => o.setName('channel').setDescription('Channel').setRequired(true).addChannelTypes(ChannelType.GuildText)),
  async run(ctx) {
    const { interaction, member, guild, args } = ctx;
    if (!(await hasCmdControl(member))) return reply(ctx, '❌ You do not have permission to use this command.');
    const id = interaction ? interaction.options.getChannel('channel').id : extractChannelId(args[0]);
    if (!id) return reply(ctx, '❌ Provide a valid channel.');
    await setConfig(guild.id, { staffChannelId: id });
    return reply(ctx, `✅ Staff channel set to <#${id}>. Any link posted there by a staff role member will count as 1 work.`);
  },
};
