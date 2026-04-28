import { ChannelType } from 'discord.js';

const THREAD_TYPES = [
  ChannelType.PublicThread,
  ChannelType.PrivateThread,
  ChannelType.AnnouncementThread,
];

export function isThreadChannel(channel) {
  return !!channel && THREAD_TYPES.includes(channel.type);
}

export function isEligibleTicketChannel(channel, cfg) {
  if (!channel) return false;
  if (cfg.ticketChannelId && isThreadChannel(channel) && channel.parentId === cfg.ticketChannelId) return true;
  if (cfg.ticketCategoryId && channel.type === ChannelType.GuildText && channel.parentId === cfg.ticketCategoryId) return true;
  return false;
}

export function isAnyTicketChannel(channel) {
  if (!channel) return false;
  return isThreadChannel(channel) || channel.type === ChannelType.GuildText;
}
