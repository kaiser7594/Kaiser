import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { extractUserId } from '../utils/parse.js';
import { reply } from '../utils/reply.js';
import { getProfile } from '../vouchService.js';
import { getConfig } from '../guildConfig.js';

export default {
  name: 'profile',
  aliases: ['p'],
  description: 'Show vouch profile.',
  slash: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('Show vouch profile.')
    .addStringOption((o) => o.setName('user').setDescription('User mention or ID').setRequired(false)),
  async run(ctx) {
    const { interaction, guild, args, user } = ctx;
    let targetId;
    if (interaction) targetId = extractUserId(interaction.options.getString('user')) || user.id;
    else targetId = extractUserId(args[0]) || user.id;

    let target;
    try { target = await ctx.client.users.fetch(targetId); } catch { target = null; }
    const member = await guild.members.fetch(targetId).catch(() => null);

    const profile = await getProfile(guild.id, targetId);
    const cfg = await getConfig(guild.id);

    const mmLine = `🤝 **Middleman**\nThis month: **${profile.mm.month}** • All time: **${profile.mm.alltime}**` +
      (cfg.mmQuota > 0 ? ` • Quota: **${profile.mm.month}/${cfg.mmQuota}**` : '');
    const pilotLine = `✈️ **Pilot**\nThis month: **${profile.pilot.month}** • All time: **${profile.pilot.alltime}**` +
      (cfg.pilotQuota > 0 ? ` • Quota: **${profile.pilot.month}/${cfg.pilotQuota}**` : '');

    const monthName = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });

    const displayName = target ? (target.username || target.tag) : `User ${targetId}`;
    const embed = new EmbedBuilder()
      .setAuthor({ name: `${displayName} — Vouch Profile`, iconURL: target?.displayAvatarURL?.() || undefined })
      .setDescription(`${mmLine}\n\n${pilotLine}`)
      .setFooter({ text: `Monthly count resets each month • ${monthName} (UTC)` })
      .setColor(0x5865f2);
    if (target?.displayAvatarURL) embed.setThumbnail(target.displayAvatarURL());

    return reply(ctx, { embeds: [embed], allowedMentions: { parse: [] } });
  },
};
