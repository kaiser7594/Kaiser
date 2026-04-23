# KBot

Vouch + moderation Discord bot. Prefix: `k!` and parallel slash commands.

## Tech Stack
- Node.js 18+ (ESM), discord.js v14
- PostgreSQL (single `kbot_kv` JSONB key/value table) with in-memory fallback
- Express health server (`/`, `/health`)

## Project Layout
- `src/app.js` — entrypoint
- `src/storage.js` — Postgres + in-memory KV
- `src/guildConfig.js` — per-guild config
- `src/permissions.js` — role/perm checks (cmd-control, high-team, mod)
- `src/vouchService.js` — middleman/pilot vouch counts (monthly + alltime)
- `src/vouchTracker.js` — auto-counts pings in mm/pilot channels
- `src/warningService.js` — warnings with global IDs
- `src/banLog.js` — internal ban records
- `src/commandLoader.js` / `src/dispatcher.js` — prefix + slash dispatch
- `src/commands/*.js` — one file per command (prefix + slash unified)

## Commands
**Vouches:** `profile`/`p`, `mmlb`, `pilotlb`
**Setup (Manage Server / control role):** `setmmchannel`, `setpilotchannel`, `setmmvouchrole`, `setpilotvouchrole` (multi-role), `setmmquota`, `setpilotquota`, `mmremovequota`, `pilotremovequota`, `resetvouches`, `setcmdcontrolrole` (multi), `sethighteamrole` (multi), `config`
**Moderation:** `ban`, `unban`, `warn`, `warnings`, `removewarn`, `s-c`/`searchcase`, `massunban`, `help`

## Replit Setup
- Web server on `0.0.0.0:5000`
- Required secrets: `DISCORD_TOKEN`, `CLIENT_ID` (optional `GUILD_ID`)
- Postgres via `PG*` env vars

## Workflow
- `TitanBot` runs `npm start`

## Recent Changes
- 2026-04-23: Full rewrite. Removed all 99 prior commands, replaced with focused prefix+slash framework, vouch tracking, mass unban with live ETA, warnings by global ID.
