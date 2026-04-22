# TitanBot Custom

Modular Discord community bot (TitanBot v2.0.0) by Touchpoint Support.

## Tech Stack
- **Runtime:** Node.js 18+ (ESM)
- **Framework:** discord.js v14, Express 5 (health/ready HTTP server), node-cron
- **Database:** PostgreSQL (with in-memory degraded fallback) via `pg`
- **Logging:** Winston

## Project Layout
- `src/app.js` — entrypoint (TitanBot class: starts DB, web server, loads commands/handlers, logs into Discord, schedules cron jobs)
- `src/config/` — application, bot, postgres, shop config
- `src/commands/` — slash commands
- `src/events/` — Discord event handlers
- `src/handlers/` — command/interaction loaders
- `src/interactions/` — buttons, menus, modals
- `src/services/` — domain services (birthdays, giveaways, server stats, etc.)
- `src/utils/` — database wrapper, logger, helpers
- `scripts/` — migrate / backup / restore CLI scripts
- `tests/` — failure-path tests

## Replit Environment Setup
- Web server bound to `0.0.0.0:5000` (`PORT=5000`, `WEB_HOST=0.0.0.0`)
- Endpoints: `/`, `/health`, `/ready`
- PostgreSQL configured to read Replit's built-in `PG*` env vars as fallbacks
  (`PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`). SSL disabled by default
  for the Replit local Postgres; set `POSTGRES_SSL=true` for SSL-enabled providers.
- Required secrets: `DISCORD_TOKEN`, `CLIENT_ID` (optional `GUILD_ID`, `OWNER_IDS`)

## Workflow
- `TitanBot` runs `npm start` and waits for port 5000 (webview).

## Deployment
- Target: **VM** (always-on Discord bot), run command: `npm start`.

## Recent Changes
- 2026-04-22: Initial Replit import. Mapped `PG*` env vars into `pgConfig`, made SSL
  opt-in via `POSTGRES_SSL`, set `PORT=5000`, configured TitanBot workflow and VM
  deployment.
