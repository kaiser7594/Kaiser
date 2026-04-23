import { SlashCommandBuilder } from 'discord.js';
import { reply } from '../utils/reply.js';
import { isAdminOrOwner, hasManageGuild, isHighTeam } from '../permissions.js';
import { clearBan } from '../banLog.js';

const PER_REQUEST_DELAY_MS = 1100;

export default {
  name: 'massunban',
  aliases: ['unbanall'],
  description: 'Unban every user currently banned. Use `k!massunban confirm` to actually run.',
  slash: new SlashCommandBuilder()
    .setName('massunban')
    .setDescription('Unban every banned user.')
    .addStringOption((o) => o.setName('confirm').setDescription('Type "confirm" to run').setRequired(true)),
  async run(ctx) {
    const { interaction, member, guild, args, message } = ctx;
    const allowed = isAdminOrOwner(member) || hasManageGuild(member) || (await isHighTeam(member));
    if (!allowed) return reply(ctx, '❌ Only high team / Manage Server can run a mass unban.');

    const arg = (interaction ? interaction.options.getString('confirm') : args[0])?.toLowerCase();
    if (arg !== 'confirm') {
      return reply(ctx, '⚠️ This will unban **every** banned user. Run `k!massunban confirm` (or `/massunban confirm:confirm`) to proceed.');
    }

    let bans;
    try { bans = await guild.bans.fetch(); }
    catch (e) { return reply(ctx, `❌ Could not fetch bans: ${e.message}`); }
    const total = bans.size;
    if (total === 0) return reply(ctx, '📭 There are no banned users in this server.');

    const etaSec = Math.ceil((total * PER_REQUEST_DELAY_MS) / 1000);
    const minutes = Math.floor(etaSec / 60);
    const seconds = etaSec % 60;
    const etaText = minutes ? `~${minutes}m ${seconds}s` : `~${seconds}s`;

    let progress;
    if (interaction) {
      await interaction.reply({ content: `🚧 Starting mass unban: **${total}** users • ETA **${etaText}**` });
      progress = await interaction.fetchReply();
    } else {
      progress = await message.channel.send(`🚧 Starting mass unban: **${total}** users • ETA **${etaText}**`);
    }

    let done = 0, ok = 0, fail = 0;
    const startedAt = Date.now();
    let lastEdit = 0;

    for (const [, ban] of bans) {
      try {
        await guild.bans.remove(ban.user.id, `Mass unban by ${ctx.user.tag}`);
        await clearBan(guild.id, ban.user.id);
        ok++;
      } catch { fail++; }
      done++;

      if (Date.now() - lastEdit > 2500 || done === total) {
        const elapsedSec = Math.round((Date.now() - startedAt) / 1000);
        const remaining = total - done;
        const remainingSec = Math.ceil((remaining * PER_REQUEST_DELAY_MS) / 1000);
        try {
          await progress.edit(
            `🚧 Mass unban progress: **${done}/${total}** (✅ ${ok} • ❌ ${fail})\n⏱ Elapsed: ${elapsedSec}s • Remaining: ~${remainingSec}s`
          );
        } catch {}
        lastEdit = Date.now();
      }
      await new Promise((r) => setTimeout(r, PER_REQUEST_DELAY_MS));
    }

    try {
      await progress.edit(`✅ Mass unban complete: **${ok}** unbanned, **${fail}** failed (out of ${total}).`);
    } catch {}
  },
};
