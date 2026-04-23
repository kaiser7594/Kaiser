import { EmbedBuilder } from 'discord.js';

const COLORS = { ban: 0xe74c3c, unban: 0x2ecc71, warn: 0xf1c40f, removewarn: 0x3498db };
const TITLES = {
  ban: '🔨 You have been banned',
  unban: '✅ You have been unbanned',
  warn: '⚠️ You have received a warning',
  removewarn: '🧹 A warning was removed from your record',
};

export async function dmModerationAction(client, { type, targetId, guildName, reason, modTag, proofUrl, warningId }) {
  if (!targetId) return false;
  try {
    const user = await client.users.fetch(targetId);
    const embed = new EmbedBuilder()
      .setTitle(TITLES[type] || 'Moderation action')
      .setColor(COLORS[type] || 0x95a5a6)
      .addFields(
        { name: 'Server', value: guildName || 'Unknown', inline: true },
        { name: 'Moderator', value: modTag || 'Staff', inline: true },
      )
      .setTimestamp(new Date());
    if (warningId) embed.addFields({ name: 'Warning ID', value: `#${warningId}`, inline: true });
    if (reason) embed.addFields({ name: 'Reason', value: reason, inline: false });
    if (proofUrl) embed.setImage(proofUrl);
    await user.send({ embeds: [embed] });
    return true;
  } catch {
    return false;
  }
}
