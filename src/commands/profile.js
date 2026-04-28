import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { extractUserId } from '../utils/parse.js';
import { reply } from '../utils/reply.js';
import { getProfile } from '../vouchService.js';
import { getConfig } from '../guildConfig.js';
import { canViewVouchProfile } from '../permissions.js';

export default {
  name: 'profile',
  aliases: ['p'],
  description: 'Show vouch / work profile.',
  slash: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('Show vouch / work profile.')
    .addStringOption((o) => o.setName('user').setDescription('User mention or ID').setRequired(false)),
  async run(ctx) {
    const { interaction, member, guild, args, user } = ctx;
    if (!(await canViewVouchProfile(member))) {
      return reply(ctx, "❌ You don't have the role to use this.");
    }

    let targetId;
    if (interaction) targetId = extractUserId(interaction.options.getString('user')) || user.id;
    else targetId = extractUserId(args[0]) || user.id;

    let target;
    try { target = await ctx.client.users.fetch(targetId); } catch { target = null; }
    const tMember = await guild.members.fetch(targetId).catch(() => null);

    const profile = await getProfile(guild.id, targetId);
    const cfg = await getConfig(guild.id);

    const sections = [];
    sections.push(`🤝 **Middleman**\nThis month: **${profile.mm.month}** • All time: **${profile.mm.alltime}**` +
      (cfg.mmQuota > 0 ? ` • Quota: **${profile.mm.month}/${cfg.mmQuota}**` : ''));
    sections.push(`✈️ **Pilot**\nThis month: **${profile.pilot.month}** • All time: **${profile.pilot.alltime}**` +
      (cfg.pilotQuota > 0 ? ` • Quota: **${profile.pilot.month}/${cfg.pilotQuota}**` : ''));
    sections.push([
      `🛡️ **Staff**`,
      `🔗 Works — month: **${profile.staff.month}** • all time: **${profile.staff.alltime}**` +
        (cfg.staffQuota > 0 ? ` • Quota: **${profile.staff.month}/${cfg.staffQuota}**` : ''),
      `🎫 Tickets — month: **${profile.ticket.month}** • all time: **${profile.ticket.alltime}**`,
      `💬 Messages — month: **${profile.staffmsg.month}** • all time: **${profile.staffmsg.alltime}**`,
    ].join('\n'));

    const monthName = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
    const displayName = target ? (target.username || target.tag) : `User ${targetId}`;
    const embed = new EmbedBuilder()
      .setAuthor({ name: `${displayName} — Profile`, iconURL: target?.displayAvatarURL?.() || undefined })
      .setDescription(sections.join('\n\n'))
      .setFooter({ text: `Monthly counts reset each month • ${monthName} (UTC)` })
      .setColor(0x5865f2);
    if (target?.displayAvatarURL) embed.setThumbnail(target.displayAvatarURL());

    return reply(ctx, { embeds: [embed], allowedMentions: { parse: [] } });
  },
};
