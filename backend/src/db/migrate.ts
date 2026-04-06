import fs from 'fs';
import path from 'path';
import db from './index';

async function migrate() {
  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(migrationsDir).sort();

  // Track applied migrations
  await db.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id         SERIAL PRIMARY KEY,
      filename   TEXT UNIQUE NOT NULL,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  const { rows: applied } = await db.query('SELECT filename FROM _migrations');
  const appliedSet = new Set(applied.map((r: { filename: string }) => r.filename));

  for (const file of files) {
    if (!file.endsWith('.sql') || appliedSet.has(file)) {
      if (appliedSet.has(file)) console.log(`[migrate] Skipping ${file} (already applied)`);
      continue;
    }

    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    console.log(`[migrate] Applying ${file} ...`);

    try {
      await db.query('BEGIN');
      await db.query(sql);
      await db.query('INSERT INTO _migrations (filename) VALUES ($1)', [file]);
      await db.query('COMMIT');
      console.log(`[migrate] Done: ${file}`);
    } catch (err) {
      await db.query('ROLLBACK');
      console.error(`[migrate] FAILED on ${file}:`, err);
      process.exit(1);
    }
  }

  console.log('[migrate] All migrations applied.');
  await db.end();
}

migrate();
