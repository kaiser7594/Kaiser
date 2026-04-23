import { readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { Collection, REST, Routes } from 'discord.js';
import { logger } from './logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function loadCommands(client) {
  client.commands = new Collection();
  client.aliases = new Collection();
  const dir = join(__dirname, 'commands');
  const files = (await readdir(dir)).filter((f) => f.endsWith('.js'));
  for (const f of files) {
    const mod = await import(pathToFileURL(join(dir, f)).href);
    const cmd = mod.default;
    if (!cmd?.name || typeof cmd.run !== 'function') {
      logger.warn(`Skipping ${f}: missing name or run`);
      continue;
    }
    client.commands.set(cmd.name, cmd);
    for (const a of cmd.aliases || []) client.aliases.set(a, cmd.name);
    // Also expose by slash name so interaction dispatcher can find it
    if (cmd.slash) {
      const slashName = cmd.slash.name || (cmd.slash.toJSON && cmd.slash.toJSON().name);
      if (slashName && slashName !== cmd.name) client.commands.set(slashName, cmd);
    }
  }
  logger.info(`Loaded ${client.commands.size} commands`);
}

export async function registerSlashCommands(client) {
  const seen = new Set();
  const data = [];
  for (const cmd of client.commands.values()) {
    if (!cmd.slash) continue;
    const json = cmd.slash.toJSON ? cmd.slash.toJSON() : cmd.slash;
    if (seen.has(json.name)) continue;
    seen.add(json.name);
    data.push(json);
  }
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  const guildId = process.env.GUILD_ID;
  try {
    if (guildId) {
      await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, guildId), { body: data });
      logger.info(`Registered ${data.length} guild slash commands to ${guildId}`);
    } else {
      await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: data });
      logger.info(`Registered ${data.length} global slash commands`);
    }
  } catch (e) {
    logger.error('Slash registration failed:', e.message);
  }
}
