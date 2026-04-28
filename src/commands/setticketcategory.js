import { SlashCommandBuilder, ChannelType } from 'discord.js';
import { reply } from '../utils/reply.js';
import { hasCmdControl } from '../permissions.js';
import { setConfig } from '../guildConfig.js';

export default {
  name: 'setticketcategory',
  aliases: [],
  description: 'Set the category whose channels are treated as tickets (for k!claim).',
  slash: new SlashCommandBuilder()
    .setName('setticketcategory')
    .setDescription('Set the category whose channels are treated as tickets.')
    .addChannelOption((o) =>
      o.setName('category').setDescription('Category').setRequired(false).addChannelTypes(ChannelType.GuildCategory)
    ),
  async run(ctx) {
    const { interaction, message, member, guild, args } = ctx;
    if (!(await hasCmdControl(member))) return reply(ctx, '❌ You do not have permission to use this command.');

    let id = null;
    if (interaction) {
      const ch = interaction.options.getChannel('category');
      if (ch) id = ch.id;
      else id = interaction.channel?.parentId || null;
    } else {
      const raw = (args[0] || '').trim();
      if (/^\d{17,20}$/.test(raw)) id = raw;
      else if (!raw) id = message.channel?.parentId || null;
    }

    if (!id) {
      return reply(ctx, '❌ Provide a category ID, or run this inside a channel that is in the target category.');
    }

    const cat = await guild.channels.fetch(id).catch(() => null);
    if (!cat || cat.type !== ChannelType.GuildCategory) {
      return reply(ctx, '❌ That ID is not a category. Right-click the category in Discord and **Copy Category ID**.');
    }

    await setConfig(guild.id, { ticketCategoryId: id });
    return reply(
      ctx,
      `✅ Ticket category set to **${cat.name}**. Staff can now run **k!claim** inside any channel under this category.`
    );
  },
};
