import { SlashCommandBuilder, ChannelType } from 'discord.js';
import { extractChannelId } from '../utils/parse.js';
import { reply } from '../utils/reply.js';
import { hasCmdControl } from '../permissions.js';
import { setConfig } from '../guildConfig.js';

export default {
  name: 'setticketchannel',
  aliases: [],
  description: 'Set the parent channel where ticket threads are created.',
  slash: new SlashCommandBuilder()
    .setName('setticketchannel')
    .setDescription('Set the parent channel where ticket threads are created.')
    .addChannelOption((o) => o.setName('channel').setDescription('Channel').setRequired(true).addChannelTypes(ChannelType.GuildText)),
  async run(ctx) {
    const { interaction, member, guild, args } = ctx;
    if (!(await hasCmdControl(member))) return reply(ctx, '❌ You do not have permission to use this command.');
    const id = interaction ? interaction.options.getChannel('channel').id : extractChannelId(args[0]);
    if (!id) return reply(ctx, '❌ Provide a valid channel.');
    await setConfig(guild.id, { ticketChannelId: id });
    return reply(ctx, `✅ Ticket channel set to <#${id}>. Staff can run **k!claim** inside any thread there to count it as **+1 ticket** (and **k!unclaim** to undo).`);
  },
};
