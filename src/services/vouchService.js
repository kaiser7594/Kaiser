import { pgDb } from '../utils/postgresDatabase.js';
import { pgConfig } from '../config/postgres.js';
import { logger } from '../utils/logger.js';

export const VOUCH_CONFIG = {
    middleman: {
        roleId: '1234970833408233565',
        channelId: '1234970835236814948',
        label: 'Middleman',
        emoji: '🤝',
    },
    pilot: {
        roleId: '1234970833399709909',
        channelId: '1234970835236814949',
        label: 'Pilot',
        emoji: '✈️',
    },
};

export function getVouchTypeForChannel(channelId) {
    for (const [type, cfg] of Object.entries(VOUCH_CONFIG)) {
        if (cfg.channelId === channelId) return type;
    }
    return null;
}

function startOfMonthIso(date = new Date()) {
    const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
    return d.toISOString();
}

export async function addVouch({ guildId, userId, vouchType, channelId, messageId, fromUserId }) {
    if (!pgDb.isAvailable?.()) return false;
    try {
        await pgDb.pool.query(
            `INSERT INTO ${pgConfig.tables.vouches} (guild_id, user_id, vouch_type, channel_id, message_id, from_user_id)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [guildId, userId, vouchType, channelId, messageId, fromUserId]
        );
        return true;
    } catch (e) {
        logger.error('addVouch error:', e);
        return false;
    }
}

export async function getMonthlyCount(guildId, userId, vouchType) {
    if (!pgDb.isAvailable?.()) return 0;
    try {
        const result = await pgDb.pool.query(
            `SELECT COUNT(*)::int AS count FROM ${pgConfig.tables.vouches}
             WHERE guild_id = $1 AND user_id = $2 AND vouch_type = $3 AND created_at >= $4`,
            [guildId, userId, vouchType, startOfMonthIso()]
        );
        return result.rows[0]?.count || 0;
    } catch (e) {
        logger.error('getMonthlyCount error:', e);
        return 0;
    }
}

export async function getTotalCount(guildId, userId, vouchType) {
    if (!pgDb.isAvailable?.()) return 0;
    try {
        const result = await pgDb.pool.query(
            `SELECT COUNT(*)::int AS count FROM ${pgConfig.tables.vouches}
             WHERE guild_id = $1 AND user_id = $2 AND vouch_type = $3`,
            [guildId, userId, vouchType]
        );
        return result.rows[0]?.count || 0;
    } catch (e) {
        logger.error('getTotalCount error:', e);
        return 0;
    }
}

export async function getLeaderboard(guildId, vouchType, { period = 'monthly', limit = 10 } = {}) {
    if (!pgDb.isAvailable?.()) return [];
    try {
        const params = [guildId, vouchType];
        let where = `WHERE guild_id = $1 AND vouch_type = $2`;
        if (period === 'monthly') {
            params.push(startOfMonthIso());
            where += ` AND created_at >= $3`;
        }
        params.push(limit);
        const limitParam = `$${params.length}`;
        const result = await pgDb.pool.query(
            `SELECT user_id, COUNT(*)::int AS count
             FROM ${pgConfig.tables.vouches}
             ${where}
             GROUP BY user_id
             ORDER BY count DESC, MAX(created_at) ASC
             LIMIT ${limitParam}`,
            params
        );
        return result.rows;
    } catch (e) {
        logger.error('getLeaderboard error:', e);
        return [];
    }
}

export async function getProfile(guildId, userId) {
    const result = {};
    for (const type of Object.keys(VOUCH_CONFIG)) {
        const [monthly, total] = await Promise.all([
            getMonthlyCount(guildId, userId, type),
            getTotalCount(guildId, userId, type),
        ]);
        result[type] = { monthly, total };
    }
    return result;
}
