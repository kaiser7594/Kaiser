import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { reply } from '../utils/reply.js';
import { canViewVouchProfile } from '../permissions.js';
import { getConfig } from '../guildConfig.js';
import { currentStandings, monthName, monthTag } from '../vouchService.js';

export default {
  name: 'quotastatus',
  aliases: ['qs'],
  description: 'Show the current month standings — who hit quota and who didn\'t.',
  slash: new SlashCommandBuilder().setName('quotastatus').setDescription('Show current month staff standings.'),
  async run(ctx) {
    const { member, guild } = ctx;
    if (!(await canViewVouchProfile(member))) {
      return reply(ctx, '❌ Only middleman / pilot / staff role members can view this.');
    }
    const cfg = await getConfig(guild.id);
    const stats = await currentStandings(guild.id);
    const rows = [];
    for (const [userId, s] of Object.entries(stats)) {
      const works = s.staff || 0;
      const tickets = s.ticket || 0;
      const messages = s.staffmsg || 0;
      if (!works && !tickets && !messages) continue;
      rows.push({ userId, works, tickets, messages });
    }
    rows.sort((a, b) => b.works - a.works || b.tickets - a.tickets || b.messages - a.messages);
    const quota = cfg.staffQuota || 0;
    const lines = rows.map((r) => {
      const mark = quota > 0 ? (r.works >= quota ? '✅' : '❌') : '•';
      const workStr = quota > 0 ? `${r.works}/${quota}` : `${r.works}`;
      return `${mark} <@${r.userId}> — 🔗 ${workStr} · 🎫 ${r.tickets} · 💬 ${r.messages}`;
    });
    const embed = new EmbedBuilder()
      .setTitle(`📊 Live Staff Standings — ${monthName(monthTag())}`)
      .setDescription(rows.length ? lines.join('\n').slice(0, 4000) : '_No staff activity yet this month._')
      .setColor(0x9b59b6);
    if (quota > 0 && rows.length) {
      const hit = rows.filter((r) => r.works >= quota).length;
      embed.setFooter({ text: `${hit}/${rows.length} staff have hit the ${quota}-work quota so far.` });
    }
    return reply(ctx, { embeds: [embed], allowedMentions: { parse: [] } });
  },
};
