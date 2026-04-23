import { SlashCommandBuilder } from 'discord.js';
import { extractUserId } from '../utils/parse.js';
import { reply } from '../utils/reply.js';
import { hasCmdControl } from '../permissions.js';
import { resetVouches } from '../vouchService.js';

export default {
  name: 'resetvouches',
  aliases: [],
  description: 'Reset vouches. Scope: month | alltime | all. Optional user.',
  slash: new SlashCommandBuilder()
    .setName('resetvouches')
    .setDescription('Reset vouches.')
    .addStringOption((o) =>
      o.setName('scope').setDescription('Scope').setRequired(true).addChoices(
        { name: 'month', value: 'month' },
        { name: 'alltime', value: 'alltime' },
        { name: 'all', value: 'all' },
      )
    )
    .addStringOption((o) => o.setName('user').setDescription('Optional user mention or ID').setRequired(false)),
  async run(ctx) {
    const { interaction, member, guild, args } = ctx;
    if (!(await hasCmdControl(member))) return reply(ctx, '❌ You do not have permission to use this command.');
    const scope = (interaction ? interaction.options.getString('scope') : args[0])?.toLowerCase();
    if (!['month', 'alltime', 'all'].includes(scope)) return reply(ctx, '❌ Scope must be one of: `month`, `alltime`, `all`.');
    const userArg = interaction ? interaction.options.getString('user') : args[1];
    const userId = userArg ? extractUserId(userArg) : null;
    if (userArg && !userId) return reply(ctx, '❌ Invalid user.');
    const n = await resetVouches(guild.id, scope, userId);
    return reply(ctx, userId
      ? `✅ Reset \`${scope}\` vouches for <@${userId}>.`
      : `✅ Reset \`${scope}\` vouches for **${n}** users.`);
  },
};
