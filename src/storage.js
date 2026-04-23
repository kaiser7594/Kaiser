import pg from 'pg';
import { logger } from './logger.js';

const { Pool } = pg;

class Storage {
  constructor() {
    this.pool = null;
    this.mem = new Map();
    this.usingMemory = false;
  }

  async init() {
    const host = process.env.PGHOST || process.env.POSTGRES_HOST;
    if (!host) {
      this.usingMemory = true;
      logger.warn('No PostgreSQL configured — using in-memory storage.');
      return;
    }
    try {
      this.pool = new Pool({
        host,
        port: Number(process.env.PGPORT || 5432),
        database: process.env.PGDATABASE,
        user: process.env.PGUSER,
        password: process.env.PGPASSWORD,
        ssl: process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : false,
        max: 10,
      });
      await this.pool.query('SELECT 1');
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS kbot_kv (
          k TEXT PRIMARY KEY,
          v JSONB NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      logger.info('PostgreSQL connected (kbot_kv ready).');
    } catch (e) {
      logger.error('PostgreSQL connection failed, falling back to memory:', e.message);
      this.usingMemory = true;
      this.pool = null;
    }
  }

  async get(key, def = null) {
    if (this.usingMemory) {
      return this.mem.has(key) ? this.mem.get(key) : def;
    }
    const r = await this.pool.query('SELECT v FROM kbot_kv WHERE k = $1', [key]);
    return r.rows[0] ? r.rows[0].v : def;
  }

  async set(key, value) {
    if (this.usingMemory) {
      this.mem.set(key, value);
      return true;
    }
    await this.pool.query(
      'INSERT INTO kbot_kv (k, v, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (k) DO UPDATE SET v = $2, updated_at = NOW()',
      [key, value]
    );
    return true;
  }

  async delete(key) {
    if (this.usingMemory) return this.mem.delete(key);
    await this.pool.query('DELETE FROM kbot_kv WHERE k = $1', [key]);
    return true;
  }

  async list(prefix) {
    if (this.usingMemory) {
      return [...this.mem.keys()].filter((k) => k.startsWith(prefix));
    }
    const r = await this.pool.query('SELECT k FROM kbot_kv WHERE k LIKE $1', [prefix + '%']);
    return r.rows.map((row) => row.k);
  }

  async deletePrefix(prefix) {
    if (this.usingMemory) {
      let n = 0;
      for (const k of [...this.mem.keys()]) if (k.startsWith(prefix)) { this.mem.delete(k); n++; }
      return n;
    }
    const r = await this.pool.query('DELETE FROM kbot_kv WHERE k LIKE $1', [prefix + '%']);
    return r.rowCount;
  }

  async close() {
    if (this.pool) await this.pool.end();
  }
}

export const storage = new Storage();
