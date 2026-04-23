import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { reply } from '../utils/reply.js';

export default {
  name: 'help',
  aliases: ['h', 'commands'],
  description: 'List all commands.',
  slash: new SlashCommandBuilder().setName('help').setDescription('List all commands.'),
  async run(ctx) {
    const vouches = [
      '`/profile [user/id]` · `k!p [user/id]` — show vouch profile',
      '`/middlemanleaderboard` · `k!mmlb` — middleman leaderboard',
      '`/pilotleaderboard` · `k!pilotlb` — pilot leaderboard',
      '_Vouches reset monthly._',
    ].join('\n');

    const setup = [
      '`/setmmchannel <#ch>` · `k!setmmchannel <#ch>`',
      '`/setpilotchannel <#ch>` · `k!setpilotchannel <#ch>`',
      '`/setmmvouchrole <@role>` · `k!setmmvouchrole <@role>` — only this role earns middleman vouches',
      '`/setpilotvouchrole <@role>` · `k!setpilotvouchrole <@role>` — only this role earns pilot vouches',
      '`/resetvouches <scope> [user]` · `k!resetvouches <month|alltime|all> [user/id]`',
      '`/setmmquota <amount>` · `k!setmmquota <amount>` — monthly middleman quota (0 = off)',
      '`/setpilotquota <amount>` · `k!setpilotquota <amount>` — monthly pilot quota (0 = off)',
      '`/mmremovequota` · `k!mmremovequota`',
      '`/pilotremovequota` · `k!pilotremovequota`',
      '`/setcmdcontrolrole <@role>` · `k!setcmdcontrolrole <@role …>` — multi-role',
      '`/sethighteamrole <@role>` · `k!sethighteamrole <@role …>` — multi-role',
      '`/config` · `k!config` — view current setup',
    ].join('\n');

    const moderation = [
      '`/ban <user_id> [reason]` · `k!ban <user_id> [reason]`',
      '`/unban <user_id>` · `k!unban <user_id>`',
      '`/warn <user/id> [reason]` · `k!warn <user/id> [reason]`',
      '`/warnings <user/id>` · `k!warnings <user/id>`',
      '`/removewarn <warn_id> [reason]` · `k!removewarn <warn_id> [reason]`',
      '`/searchcase <user_id>` · `k!s-c <user_id>` — look up a banned user',
      '`/massunban` · `k!massunban` — unban every banned user',
    ].join('\n');

    const embed = new EmbedBuilder()
      .setTitle('📖 Help')
      .setDescription('Use slash commands or the prefix `k!` for any command.')
      .addFields(
        { name: '🪙 Vouches', value: vouches, inline: false },
        { name: '⚙️ Setup (Manage Server)', value: setup, inline: false },
        { name: '🛡️ Moderation', value: moderation, inline: false },
      )
      .setColor(0x5865f2);
    return reply(ctx, { embeds: [embed], allowedMentions: { parse: [] } });
  },
};
