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

  const quota = cfg.staffQuota || 0;
  const period = monthName(tag);

  if (cfg.staffQuotaChannelId) {
    const ch = await guild.channels.fetch(cfg.staffQuotaChannelId).catch(() => null);
    if (ch && ch.isTextBased?.()) {
      const lines = rows.map((r) => {
        const mark = quota > 0 ? (r.works >= quota ? '✅' : '❌') : '•';
        const workStr = quota > 0 ? `${r.works}/${quota}` : `${r.works}`;
        return `${mark} <@${r.userId}> — 🔗 ${workStr} · 🎫 ${r.tickets} · 💬 ${r.messages}`;
      });
      const embed = new EmbedBuilder()
        .setTitle(`📊 Monthly Staff Report — ${period}`)
        .setDescription(rows.length ? lines.join('\n').slice(0, 4000) : '_No staff activity recorded this month._')
        .setColor(0x9b59b6);
      if (quota > 0 && rows.length) {
        const hit = rows.filter((r) => r.works >= quota).length;
        embed.setFooter({ text: `${hit}/${rows.length} staff hit the ${quota}-work quota.` });
      }
      try { await ch.send({ embeds: [embed], allowedMentions: { parse: [] } }); }
      catch (e) { logger.error('quota channel post failed', e); }
    }
  }

  for (const r of rows) {
    try {
      const u = await client.users.fetch(r.userId);
      const workStr = quota > 0 ? `${r.works}/${quota} ${r.works >= quota ? '✅' : '❌'}` : String(r.works);
      const embed = new EmbedBuilder()
        .setTitle(`Your ${period} report — ${guild.name}`)
        .setDescription(`🔗 Works: **${workStr}**\n🎫 Tickets: **${r.tickets}**\n💬 Messages: **${r.messages}**`)
        .setColor(0x5865f2);
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
