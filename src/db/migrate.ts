/**
 * Simple migration runner — reads SQL files from /migrations in order and applies them.
 * Idempotent: tracks applied migrations in a migrations table.
 */
import fs from 'fs';
import path from 'path';
import { pool } from './client';

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        name       TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const dir = path.join(process.cwd(), 'migrations');
    const files = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const { rows } = await client.query(
        'SELECT 1 FROM _migrations WHERE name = $1',
        [file]
      );
      if (rows.length > 0) {
        console.log(`[migrate] Skipping ${file} (already applied)`);
        continue;
      }

      console.log(`[migrate] Applying ${file}...`);
      const sql = fs.readFileSync(path.join(dir, file), 'utf8');
      await client.query(sql);
      await client.query('INSERT INTO _migrations(name) VALUES($1)', [file]);
      console.log(`[migrate] Applied ${file}`);
    }

    console.log('[migrate] All migrations applied.');
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((err) => {
  console.error('[migrate] Error:', err);
  process.exit(1);
});
