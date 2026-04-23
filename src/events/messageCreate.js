




import { Events } from 'discord.js';
import { logger } from '../utils/logger.js';
import { getLevelingConfig, getUserLevelData } from '../services/leveling.js';
import { addXp } from '../services/xpSystem.js';
import { checkRateLimit } from '../utils/rateLimiter.js';
import { createInteractionLike } from '../utils/prefixAdapter.js';
import { getGuildConfig } from '../utils/database.js';
import { addVouch, getVouchTypeForChannel, VOUCH_CONFIG } from '../services/vouchService.js';

const MESSAGE_XP_RATE_LIMIT_ATTEMPTS = 12;
const MESSAGE_XP_RATE_LIMIT_WINDOW_MS = 10000;
const PREFIX = 'k!';

export default {
  name: Events.MessageCreate,
  async execute(message, client) {
    try {
      if (message.author.bot || !message.guild) return;

      await handlePrefixCommand(message, client);
      await handleLeveling(message, client);
      await handleVouchPings(message);
    } catch (error) {
      logger.error('Error in messageCreate event:', error);
    }
  }
};

async function handlePrefixCommand(message, client) {
  if (!message.content?.toLowerCase().startsWith(PREFIX)) return;

  const body = message.content.slice(PREFIX.length).trim();
  if (!body) return;

  const tokens = body.match(/"([^"]*)"|'([^']*)'|(\S+)/g)?.map(t => t.replace(/^["']|["']$/g, '')) || [];
  const commandName = tokens.shift()?.toLowerCase();
  if (!commandName) return;

  const command = client.commands?.get(commandName);
  if (!command) return;

  let guildConfig = null;
  try {
    guildConfig = await getGuildConfig(client, message.guild.id);
    if (guildConfig?.disabledCommands?.[commandName]) {
      await message.reply(`The \`${commandName}\` command is disabled in this server.`);
      return;
    }
  } catch (e) {
    logger.warn(`Prefix: failed to load guild config: ${e.message}`);
  }

  const fakeInteraction = createInteractionLike(command, message, client, tokens);
  try {
    await fakeInteraction._resolveOptions();
    logger.info(`Prefix command executed: ${PREFIX}${commandName} by ${message.author.tag}`);
    await command.execute(fakeInteraction, guildConfig, client);
  } catch (error) {
    logger.error(`Prefix command error (${commandName}):`, error);
    const msg = error?.userMessage || error?.message || 'Something went wrong running that command.';
    try { await message.reply(`❌ ${msg}`); } catch {}
  }
}








async function handleLeveling(message, client) {
  try {
    const rateLimitKey = `xp-event:${message.guild.id}:${message.author.id}`;
    const canProcess = await checkRateLimit(rateLimitKey, MESSAGE_XP_RATE_LIMIT_ATTEMPTS, MESSAGE_XP_RATE_LIMIT_WINDOW_MS);
    if (!canProcess) {
      return;
    }

    const levelingConfig = await getLevelingConfig(client, message.guild.id);
    
    if (!levelingConfig?.enabled) {
      return;
    }

    
    if (levelingConfig.ignoredChannels?.includes(message.channel.id)) {
      return;
    }

    
    if (levelingConfig.ignoredRoles?.length > 0) {
      const member = await message.guild.members.fetch(message.author.id).catch(() => {
        return null;
      });
      if (member && member.roles.cache.some(role => levelingConfig.ignoredRoles.includes(role.id))) {
        return;
      }
    }

    
    if (levelingConfig.blacklistedUsers?.includes(message.author.id)) {
      return;
    }

    
    if (!message.content || message.content.trim().length === 0) {
      return;
    }

    const userData = await getUserLevelData(client, message.guild.id, message.author.id);
    
    
    const cooldownTime = levelingConfig.xpCooldown || 60;
    const now = Date.now();
    const timeSinceLastMessage = now - (userData.lastMessage || 0);
    
    
    if (timeSinceLastMessage < cooldownTime * 1000) {
      return;
    }

    
    const minXP = levelingConfig.xpRange?.min || levelingConfig.xpPerMessage?.min || 15;
    const maxXP = levelingConfig.xpRange?.max || levelingConfig.xpPerMessage?.max || 25;

    
    const safeMinXP = Math.max(1, minXP);
    const safeMaxXP = Math.max(safeMinXP, maxXP);

    
    const xpToGive = Math.floor(Math.random() * (safeMaxXP - safeMinXP + 1)) + safeMinXP;

    
    let finalXP = xpToGive;
    if (levelingConfig.xpMultiplier && levelingConfig.xpMultiplier > 1) {
      finalXP = Math.floor(finalXP * levelingConfig.xpMultiplier);
    }

    
    const result = await addXp(client, message.guild, message.member, finalXP);
    
    if (result.success && result.leveledUp) {
      logger.info(
        `${message.author.tag} leveled up to level ${result.level} in ${message.guild.name}`
      );
    }
  } catch (error) {
    logger.error('Error handling leveling for message:', error);
  }
}



async function handleVouchPings(message) {
  try {
    const vouchType = getVouchTypeForChannel(message.channelId);
    if (!vouchType) return;

    const mentionedUsers = message.mentions?.users;
    if (!mentionedUsers || mentionedUsers.size === 0) return;

    const cfg = VOUCH_CONFIG[vouchType];
    const credited = new Set();

    for (const [userId, user] of mentionedUsers) {
      if (user.bot) continue;
      if (userId === message.author.id) continue;
      if (credited.has(userId)) continue;

      const member = await message.guild.members.fetch(userId).catch(() => null);
      if (!member?.roles?.cache?.has(cfg.roleId)) continue;

      const ok = await addVouch({
        guildId: message.guild.id,
        userId,
        vouchType,
        channelId: message.channelId,
        messageId: message.id,
        fromUserId: message.author.id,
      });
      if (ok) {
        credited.add(userId);
        logger.info(`Vouch +1 (${vouchType}) for ${member.user.tag} in ${message.guild.name}`);
      }
    }
  } catch (error) {
    logger.error('Error handling vouch pings:', error);
  }
}
