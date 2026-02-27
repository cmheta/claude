import { Pool } from 'pg';
import { config } from '../config';

export const pool = new Pool({
  connectionString: config.databaseUrl,
  max: 10,
  idleTimeoutMillis: 30_000,
});

pool.on('error', (err) => {
  console.error('[db] Unexpected pool error:', err.message);
});
