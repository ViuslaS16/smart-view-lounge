import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

export const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,                       // max pool connections
  min: 2,                        // keep at least 2 connections warm at all times
  idleTimeoutMillis: 600000,     // 10 min — don't kill idle connections too quickly
  connectionTimeoutMillis: 8000, // 8s to acquire from pool before giving up
  allowExitOnIdle: false,        // keep the pool alive even when idle

  // TCP keepAlive — prevents OS/router from dropping idle TCP connections
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,

  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
});

// Discard broken connections automatically — pool will create a fresh one
db.on('error', (err) => {
  console.error('[DB] Unexpected pool client error (will be discarded):', err.message);
});

// Verify connection on startup
db.query('SELECT NOW()')
  .then(() => console.log('[DB] PostgreSQL connected'))
  .catch((err) => {
    console.error('[DB] Connection failed:', err.message);
    process.exit(1);
  });

// Keep-alive ping every 4 minutes — prevents "connection terminated" errors
// during quiet periods (e.g. overnight between scheduler cron runs)
setInterval(async () => {
  try {
    await db.query('SELECT 1');
  } catch (err: any) {
    console.warn('[DB] Keep-alive ping failed (pool will auto-reconnect):', err.message);
  }
}, 4 * 60 * 1000);

export default db;
