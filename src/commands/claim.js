import { SlashCommandBuilder, ChannelType } from 'discord.js';
import { reply } from '../utils/reply.js';
import { getConfig } from '../guildConfig.js';
import { addVouch } from '../vouchService.js';
import { storage } from '../storage.js';
import { logger } from '../logger.js';

const claimKey = (gid, tid) => `k:guild:${gid}:ticketclaim:${tid}`;
const THREAD_TYPES = [
  ChannelType.PublicThread,
  ChannelType.PrivateThread,
  ChannelType.AnnouncementThread,
];

export default {
  name: 'claim',
  aliases: [],
  description: 'Claim the current ticket thread (counts toward your ticket quota).',
  slash: new SlashCommandBuilder().setName('claim').setDescription('Claim the current ticket thread.'),
  async run(ctx) {
    const { message, interaction, member, guild } = ctx;
    const channel = message ? message.channel : interaction.channel;

    const cfg = await getConfig(guild.id);
    if (!cfg.ticketChannelId) {
      return reply(ctx, '❌ No ticket channel is configured. Ask an admin to run `k!setticketchannel`.');
    }
    if (!channel || !THREAD_TYPES.includes(channel.type)) {
      return reply(ctx, '❌ This command can only be used inside a ticket thread.');
    }
    if (channel.parentId !== cfg.ticketChannelId) {
      return reply(ctx, '❌ This thread is not in the configured ticket channel.');
    }

    const staffRoleIds = cfg.staffRoleIds || [];
    if (!staffRoleIds.length || !staffRoleIds.some((r) => member.roles.cache.has(r))) {
      return reply(ctx, "❌ You don't have the role to use this.");
    }

    const existing = await storage.get(claimKey(guild.id, channel.id), null);
    if (existing) {
      if (existing.userId === member.id) return reply(ctx, '⚠️ You already claimed this ticket.');
      return reply(ctx, `⚠️ This ticket is already claimed by <@${existing.userId}>.`);
    }

    const displayName = (member.displayName || member.user.username).replace(/[^a-zA-Z0-9-_]/g, '').toLowerCase().slice(0, 50) || 'staff';
    const newName = `support-${displayName}`.slice(0, 100);
    const originalName = channel.name;

    try {
      await channel.setName(newName, `Claimed by ${member.user.tag}`);
    } catch (e) {
      logger.error('claim setName failed', e);
      return reply(ctx, '❌ Failed to rename the thread. Make sure I have **Manage Threads** permission.');
    }

    await storage.set(claimKey(guild.id, channel.id), {
      userId: member.id,
      originalName,
      claimedAt: new Date().toISOString(),
    });

    await addVouch(guild.id, member.id, 'ticket', {
      byUserId: member.id,
      channelId: channel.id,
      messageUrl: null,
      sourceMessageId: channel.id,
    });

    return reply(ctx, `✅ <@${member.id}> claimed this ticket. (+1 ticket)`);
  },
};
