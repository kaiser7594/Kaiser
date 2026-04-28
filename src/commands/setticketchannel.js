import { SlashCommandBuilder, ChannelType } from 'discord.js';
import { extractChannelId } from '../utils/parse.js';
import { reply } from '../utils/reply.js';
import { hasCmdControl } from '../permissions.js';
import { setConfig } from '../guildConfig.js';

export default {
  name: 'setticketchannel',
  aliases: [],
  description: 'Set the ticket-log channel where staff post completed-ticket transcripts.',
  slash: new SlashCommandBuilder()
    .setName('setticketchannel')
    .setDescription('Set the ticket-log channel.')
    .addChannelOption((o) => o.setName('channel').setDescription('Channel').setRequired(true).addChannelTypes(ChannelType.GuildText)),
  async run(ctx) {
    const { interaction, member, guild, args } = ctx;
    if (!(await hasCmdControl(member))) return reply(ctx, '❌ You do not have permission to use this command.');
    const id = interaction ? interaction.options.getChannel('channel').id : extractChannelId(args[0]);
    if (!id) return reply(ctx, '❌ Provide a valid channel.');
    await setConfig(guild.id, { ticketChannelId: id });
    return reply(ctx, `✅ Ticket-log channel set to <#${id}>. Any transcript link posted there by a staff member counts as **+1 ticket**.`);
  },
};
