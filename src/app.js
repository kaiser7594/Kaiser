import 'dotenv/config';
import { Client, GatewayIntentBits, Partials } from 'discord.js';
import express from 'express';

import { logger } from './logger.js';
import { storage } from './storage.js';
import { loadCommands, registerSlashCommands } from './commandLoader.js';
import { handleMessage, handleInteraction } from './dispatcher.js';
import { trackVouchPings, handleVouchMessageDelete, handleVouchMessageUpdate } from './vouchTracker.js';
import { startMonthlyScheduler } from './monthlyJob.js';

async function main() {
  if (!process.env.DISCORD_TOKEN || !process.env.CLIENT_ID) {
    logger.error('Missing DISCORD_TOKEN or CLIENT_ID env vars.');
    process.exit(1);
  }

  await storage.init();

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildBans,
    ],
    partials: [Partials.Message, Partials.Channel],
  });

  await loadCommands(client);

  client.once('ready', async () => {
    logger.info(`✅ Logged in as ${client.user.tag} | ${client.commands.size} commands loaded.`);
    await registerSlashCommands(client);
    startMonthlyScheduler(client);
  });

  client.on('messageCreate', async (m) => {
    try { await trackVouchPings(client, m); } catch (e) { logger.error('vouchTracker error:', e); }
    try { await handleMessage(client, m); } catch (e) { logger.error('dispatcher error:', e); }
  });

  client.on('interactionCreate', (i) => handleInteraction(client, i));

  client.on('messageUpdate', async (oldM, newM) => {
    try { await handleVouchMessageUpdate(client, oldM, newM); } catch (e) { logger.error('vouch update error:', e); }
  });

  client.on('messageDelete', async (m) => {
    try { await handleVouchMessageDelete(client, m); } catch (e) { logger.error('vouch delete error:', e); }
  });

  client.on('messageDeleteBulk', async (msgs) => {
    for (const m of msgs.values()) {
      try { await handleVouchMessageDelete(client, m); } catch (e) { logger.error('vouch bulk delete error:', e); }
    }
  });

  // Healthcheck server (Replit web preview)
  const app = express();
  const port = Number(process.env.PORT || 5000);
  app.get('/', (_req, res) => res.json({ status: 'ok', bot: client.user?.tag || null }));
  app.get('/health', (_req, res) => res.json({ ok: true }));
  app.listen(port, '0.0.0.0', () => logger.info(`HTTP server on :${port}`));

  await client.login(process.env.DISCORD_TOKEN);

  const shutdown = async (sig) => {
    logger.info(`Received ${sig}, shutting down…`);
    try { client.destroy(); } catch {}
    try { await storage.close(); } catch {}
    process.exit(0);
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((e) => { logger.error('Fatal startup error:', e); process.exit(1); });
