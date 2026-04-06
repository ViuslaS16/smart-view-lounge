import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

export const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,                  // max pool connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
});

// Verify connection on startup
db.query('SELECT NOW()')
  .then(() => console.log('[DB] PostgreSQL connected'))
  .catch((err) => {
    console.error('[DB] Connection failed:', err.message);
    process.exit(1);
  });

export default db;
