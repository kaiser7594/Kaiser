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
      return reply(ctx, "❌ You don't have the role to use this.");
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
    const wq = cfg.staffQuota || 0;
    const tq = cfg.ticketQuota || 0;
    const mq = cfg.messageQuota || 0;
    const anyQuota = wq > 0 || tq > 0 || mq > 0;
    const passes = (r) =>
      (wq === 0 || r.works >= wq) &&
      (tq === 0 || r.tickets >= tq) &&
      (mq === 0 || r.messages >= mq);
    const fmtMetric = (val, quota, emoji) => {
      if (quota === 0) return `${emoji} ${val}`;
      return `${emoji} ${val}/${quota} ${val >= quota ? '✅' : '❌'}`;
    };
    const lines = rows.map((r) => {
      const mark = anyQuota ? (passes(r) ? '✅' : '❌') : '•';
      return `${mark} <@${r.userId}> — ${fmtMetric(r.works, wq, '🔗')} · ${fmtMetric(r.tickets, tq, '🎫')} · ${fmtMetric(r.messages, mq, '💬')}`;
    });
    const embed = new EmbedBuilder()
      .setTitle(`📊 Live Staff Standings — ${monthName(monthTag())}`)
      .setDescription(rows.length ? lines.join('\n').slice(0, 4000) : '_No staff activity yet this month._')
      .setColor(0x9b59b6);
    if (anyQuota && rows.length) {
      const hit = rows.filter(passes).length;
      const parts = [];
      if (wq) parts.push(`works ${wq}`);
      if (tq) parts.push(`tickets ${tq}`);
      if (mq) parts.push(`messages ${mq}`);
      embed.setFooter({ text: `${hit}/${rows.length} staff hitting all quotas (${parts.join(' · ')}).` });
    }
    return reply(ctx, { embeds: [embed], allowedMentions: { parse: [] } });
  },
};
