import { SlashCommandBuilder, ChannelType, EmbedBuilder } from 'discord.js';
import { reply } from '../utils/reply.js';
import { getConfig } from '../guildConfig.js';
import { storage } from '../storage.js';
import { extractUserId } from '../utils/parse.js';

const claimKey = (gid, tid) => `k:guild:${gid}:ticketclaim:${tid}`;
const claimPrefix = (gid) => `k:guild:${gid}:ticketclaim:`;
const THREAD_TYPES = [
  ChannelType.PublicThread,
  ChannelType.PrivateThread,
  ChannelType.AnnouncementThread,
];

const fmtTs = (iso) => {
  const t = Math.floor(new Date(iso).getTime() / 1000);
  return `<t:${t}:f> (<t:${t}:R>)`;
};

export default {
  name: 'ticketinfo',
  aliases: ['ti'],
  description: 'Show who claimed the current ticket, or list a staff member\'s open claimed tickets.',
  slash: new SlashCommandBuilder()
    .setName('ticketinfo')
    .setDescription('Show who claimed the current ticket, or list a staff member\'s open tickets.')
    .addUserOption((o) => o.setName('user').setDescription('Staff member to look up').setRequired(false)),
  async run(ctx) {
    const { message, interaction, guild, args, member } = ctx;
    const channel = message ? message.channel : interaction.channel;

    let target = null;
    if (interaction) {
      target = interaction.options.getUser('user');
    } else if (args[0]) {
      const uid = extractUserId(args[0]);
      if (uid) target = await ctx.client.users.fetch(uid).catch(() => null);
    }

    // Mode 1: in a thread, no user given -> show this thread's claim
    if (!target && channel && THREAD_TYPES.includes(channel.type)) {
      const rec = await storage.get(claimKey(guild.id, channel.id), null);
      if (!rec) return reply(ctx, '⚠️ This ticket is not currently claimed.');
      const embed = new EmbedBuilder()
        .setTitle('🎫 Ticket Info')
        .setDescription([
          `**Thread:** ${channel.toString()}`,
          `**Claimed by:** <@${rec.userId}>`,
          `**Claimed:** ${fmtTs(rec.claimedAt)}`,
          rec.originalName ? `**Original name:** \`${rec.originalName}\`` : '',
        ].filter(Boolean).join('\n'))
        .setColor(0x5865f2);
      return reply(ctx, { embeds: [embed], allowedMentions: { parse: [] } });
    }

    // Mode 2: list open claimed tickets for a user (default = caller)
    const userId = target ? target.id : member.id;
    const cfg = await getConfig(guild.id);
    const keys = await storage.list(claimPrefix(guild.id));
    const mine = [];
    for (const k of keys) {
      const rec = await storage.get(k, null);
      if (!rec || rec.userId !== userId) continue;
      const threadId = k.split(':').pop();
      mine.push({ threadId, claimedAt: rec.claimedAt, originalName: rec.originalName });
    }
    mine.sort((a, b) => new Date(b.claimedAt) - new Date(a.claimedAt));

    if (!mine.length) {
      return reply(ctx, `📭 <@${userId}> has no currently claimed tickets.`);
    }

    const lines = [];
    for (const c of mine.slice(0, 25)) {
      const ch = await guild.channels.fetch(c.threadId).catch(() => null);
      const label = ch ? ch.toString() : `\`${c.originalName || c.threadId}\` (gone)`;
      const t = Math.floor(new Date(c.claimedAt).getTime() / 1000);
      lines.push(`• ${label} — <t:${t}:R>`);
    }

    const embed = new EmbedBuilder()
      .setTitle(`🎫 Open Claimed Tickets — ${mine.length}`)
      .setDescription(lines.join('\n').slice(0, 4000))
      .setColor(0x9b59b6)
      .setFooter({ text: cfg.ticketChannelId ? `Ticket channel: #${(await guild.channels.fetch(cfg.ticketChannelId).catch(() => null))?.name || 'unknown'}` : 'No ticket channel configured' });
    embed.setAuthor({ name: target ? (target.username || target.tag) : member.user.username });

    return reply(ctx, { embeds: [embed], allowedMentions: { parse: [] } });
  },
};
