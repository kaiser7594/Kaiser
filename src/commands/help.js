import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { reply } from '../utils/reply.js';

export default {
  name: 'help',
  aliases: ['h', 'commands'],
  description: 'List all commands.',
  slash: new SlashCommandBuilder().setName('help').setDescription('List all commands.'),
  async run(ctx) {
    const vouches = [
      '`k!p [user/id]` — show vouch / staff profile',
      '`k!mmlb` · `k!pilotlb` · `k!stafflb` — leaderboards',
      '`k!quotastatus` (`k!qs`) — live who-hit-quota board for this month',
      '`k!vouches [user/id]` — vouch history (mm + pilot)',
      '`k!works [user/id]` — staff work + ticket history',
      '_Counts reset monthly. Profile/leaderboards limited to vouch/staff roles._',
    ].join('\n');

    const hierarchy = [
      '`k!setcmdcontrolrole <@role>` — role allowed to use the setup commands below',
      '`k!sethighteamrole <@role>` — high team (can ban/warn directly with proof)',
      '`k!setlowteamrole <@role>` — trainee team (ban/warn requires approval)',
      '`k!settraineechannel <#ch>` — channel where trainee reports go for approval',
    ].join('\n');

    const setup = [
      '`k!setmmchannel <#ch>` · `k!setpilotchannel <#ch>` · `k!setstaffchannel <#ch>` · `k!setticketchannel <#ch>` · `k!setstaffquotachannel <#ch>`',
      '`k!setmmvouchrole <@role>` · `k!setpilotvouchrole <@role>` · `k!setstaffrole <@role>`',
      '`k!claim` / `k!unclaim` — claim a ticket thread (parent = ticket channel)',
      '`k!ticketinfo` (`k!ti`) — show who claimed this thread, or list a user\'s open tickets',
      '`k!setmmquota <n>` · `k!setpilotquota <n>` · `k!setstaffquota <n>` · `k!setticketquota <n>` · `k!setmessagequota <n>` (0 = off)',
      '`k!removemmquota` · `k!removepilotquota` · `k!removestaffquota` · `k!removeticketquota` · `k!removemessagequota`',
      '`k!resetvouches <month|alltime|all> [user/id]`',
      '`k!config` — view current setup',
    ].join('\n');

    const tracking = [
      '🤝 **MM / ✈️ Pilot channels** — pinging a vouch-role member = +1 vouch',
      '💬 **Anywhere** — every message a staff-role member sends = +1 message count',
      '🛡️ **Staff channel** — staff message with a link = +1 work',
      '🎫 **Ticket channel** — staff posting a transcript link = +1 ticket',
      '_Edits / deletes auto-undo work + ticket counts. Message counts are not undone._',
    ].join('\n');

    const moderation = [
      '`k!ban <user_id> <reason>` — ban (proof asked, then high team executes / trainee submits for approval)',
      '`k!warn <user_id> <reason>` — warn (same flow as ban)',
      '`k!unban <user_id> [reason]`',
      '`k!massunban confirm` — unban every user currently banned',
      '`k!warnings <user_id>` · `k!removewarn <warning_id> [reason]`',
      '`k!s-c <user_id>` — view a user\'s moderation cases (proof + reason + status)',
    ].join('\n');

    const embed = new EmbedBuilder()
      .setTitle('Commands')
      .addFields(
        { name: '🪙 Vouches & Works', value: vouches, inline: false },
        { name: '👀 How tracking works', value: tracking, inline: false },
        { name: '👑 Staff Hierarchy (Manage Server)', value: hierarchy, inline: false },
        { name: '⚙️ Setup (requires command-control role)', value: setup, inline: false },
        { name: '🛡️ Moderation (proof image required)', value: moderation, inline: false },
        { name: '\u200b', value: '_All commands also work as slash commands._', inline: false },
      )
      .setColor(0x5865f2);
    return reply(ctx, { embeds: [embed], allowedMentions: { parse: [] } });
  },
};
