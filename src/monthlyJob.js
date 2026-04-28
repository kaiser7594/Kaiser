import { EmbedBuilder } from 'discord.js';
import { logger } from './logger.js';
import { storage } from './storage.js';
import { getConfig } from './guildConfig.js';
import { prevMonthTag, monthName, snapshotMonth } from './vouchService.js';

const lastRunKey = (gid) => `k:guild:${gid}:lastmonthrun`;

async function summarizeForGuild(client, guild, tag) {
  const cfg = await getConfig(guild.id);
  const stats = await snapshotMonth(guild.id, tag);
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
  const period = monthName(tag);

  const passes = (r) =>
    (wq === 0 || r.works >= wq) &&
    (tq === 0 || r.tickets >= tq) &&
    (mq === 0 || r.messages >= mq);

  const fmtMetric = (val, quota, emoji) => {
    if (quota === 0) return `${emoji} ${val}`;
    const ok = val >= quota ? '✅' : '❌';
    return `${emoji} ${val}/${quota} ${ok}`;
  };

  if (cfg.staffQuotaChannelId) {
    const ch = await guild.channels.fetch(cfg.staffQuotaChannelId).catch(() => null);
    if (ch && ch.isTextBased?.()) {
      const lines = rows.map((r) => {
        const mark = anyQuota ? (passes(r) ? '✅' : '❌') : '•';
        return `${mark} <@${r.userId}> — ${fmtMetric(r.works, wq, '🔗')} · ${fmtMetric(r.tickets, tq, '🎫')} · ${fmtMetric(r.messages, mq, '💬')}`;
      });
      const embed = new EmbedBuilder()
        .setTitle(`📊 Monthly Staff Report — ${period}`)
        .setDescription(rows.length ? lines.join('\n').slice(0, 4000) : '_No staff activity recorded this month._')
        .setColor(0x9b59b6);
      if (anyQuota && rows.length) {
        const hit = rows.filter(passes).length;
        const parts = [];
        if (wq) parts.push(`works ${wq}`);
        if (tq) parts.push(`tickets ${tq}`);
        if (mq) parts.push(`messages ${mq}`);
        embed.setFooter({ text: `${hit}/${rows.length} staff hit all quotas (${parts.join(' · ')}).` });
      }
      try { await ch.send({ embeds: [embed], allowedMentions: { parse: [] } }); }
      catch (e) { logger.error('quota channel post failed', e); }
    }
  }

  for (const r of rows) {
    try {
      const u = await client.users.fetch(r.userId);
      const overall = anyQuota ? (passes(r) ? '✅ All quotas hit' : '❌ Quota not met') : '';
      const embed = new EmbedBuilder()
        .setTitle(`Your ${period} report — ${guild.name}`)
        .setDescription([
          `🔗 Works: **${fmtMetric(r.works, wq, '').trim()}**`,
          `🎫 Tickets: **${fmtMetric(r.tickets, tq, '').trim()}**`,
          `💬 Messages: **${fmtMetric(r.messages, mq, '').trim()}**`,
          overall ? `\n${overall}` : '',
        ].join('\n'))
        .setColor(passes(r) || !anyQuota ? 0x2ecc71 : 0xe74c3c);
      await u.send({ embeds: [embed] }).catch(() => {});
    } catch {}
  }
}

export async function runMonthlySummary(client, force = false) {
  const tag = prevMonthTag();
  for (const [, guild] of client.guilds.cache) {
    try {
      const last = await storage.get(lastRunKey(guild.id), null);
      if (!force && last === tag) continue;
      await summarizeForGuild(client, guild, tag);
      await storage.set(lastRunKey(guild.id), tag);
      logger.info(`Monthly summary posted for guild ${guild.id} (${tag})`);
    } catch (e) {
      logger.error(`Monthly summary failed for guild ${guild.id}`, e);
    }
  }
}

export function startMonthlyScheduler(client) {
  const tick = () => runMonthlySummary(client).catch((e) => logger.error('monthly tick error', e));
  // Run shortly after startup (catches up if the bot was offline at month rollover)
  setTimeout(tick, 15_000);
  // Re-check every hour
  setInterval(tick, 60 * 60 * 1000);
}
