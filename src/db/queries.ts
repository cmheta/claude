import { pool } from './client';
import { TrackedItem, User, ItemStatus } from '../types';

// ── Users ─────────────────────────────────────────────────────────────────────

export async function upsertUser(phoneE164: string): Promise<User> {
  const { rows } = await pool.query<User>(
    `INSERT INTO users(phone_e164)
     VALUES($1)
     ON CONFLICT(phone_e164) DO UPDATE SET phone_e164 = EXCLUDED.phone_e164
     RETURNING *`,
    [phoneE164]
  );
  return rows[0];
}

export async function getUserByPhone(phoneE164: string): Promise<User | null> {
  const { rows } = await pool.query<User>(
    'SELECT * FROM users WHERE phone_e164 = $1',
    [phoneE164]
  );
  return rows[0] ?? null;
}

export async function getUserById(id: string): Promise<User | null> {
  const { rows } = await pool.query<User>(
    'SELECT * FROM users WHERE id = $1',
    [id]
  );
  return rows[0] ?? null;
}

// ── Tracked Items ─────────────────────────────────────────────────────────────

export async function createTrackedItem(params: {
  userId: string;
  url: string;
  retailer: string;
  targetPricePennies: number;
  title?: string;
}): Promise<TrackedItem> {
  const { rows } = await pool.query<TrackedItem>(
    `INSERT INTO tracked_items(user_id, url, retailer, target_price_gbp_pennies, title)
     VALUES($1, $2, $3, $4, $5)
     RETURNING *`,
    [params.userId, params.url, params.retailer, params.targetPricePennies, params.title ?? null]
  );
  return rows[0];
}

export async function getActiveItemsForUser(userId: string): Promise<TrackedItem[]> {
  const { rows } = await pool.query<TrackedItem>(
    `SELECT * FROM tracked_items
     WHERE user_id = $1 AND status = 'active'
     ORDER BY created_at DESC`,
    [userId]
  );
  return rows;
}

export async function getItemByShortId(userId: string, shortId: string): Promise<TrackedItem | null> {
  // shortId is first 8 chars of uuid
  const { rows } = await pool.query<TrackedItem>(
    `SELECT * FROM tracked_items
     WHERE user_id = $1 AND id::text LIKE $2
     LIMIT 1`,
    [userId, `${shortId}%`]
  );
  return rows[0] ?? null;
}

export async function getItemById(id: string): Promise<TrackedItem | null> {
  const { rows } = await pool.query<TrackedItem>(
    'SELECT * FROM tracked_items WHERE id = $1',
    [id]
  );
  return rows[0] ?? null;
}

export async function stopTrackedItem(id: string, userId: string): Promise<boolean> {
  const { rowCount } = await pool.query(
    `UPDATE tracked_items SET status = 'stopped'
     WHERE id::text LIKE $1 AND user_id = $2 AND status = 'active'`,
    [`${id}%`, userId]
  );
  return (rowCount ?? 0) > 0;
}

export async function updateItemAfterCheck(params: {
  id: string;
  pricePennies: number;
  status?: ItemStatus;
  errorMessage?: string;
}): Promise<void> {
  await pool.query(
    `UPDATE tracked_items
     SET last_price_gbp_pennies = $2,
         last_checked_at = NOW(),
         status = COALESCE($3::item_status, status),
         error_message = $4
     WHERE id = $1`,
    [
      params.id,
      params.pricePennies,
      params.status ?? null,
      params.errorMessage ?? null,
    ]
  );
}

export async function markItemError(id: string, errorMessage: string): Promise<void> {
  await pool.query(
    `UPDATE tracked_items
     SET status = 'error',
         error_message = $2,
         last_checked_at = NOW()
     WHERE id = $1`,
    [id, errorMessage]
  );
}

export async function markAlertSent(id: string): Promise<void> {
  await pool.query(
    'UPDATE tracked_items SET alert_sent_at = NOW() WHERE id = $1',
    [id]
  );
}

export async function getAllActiveItems(): Promise<TrackedItem[]> {
  const { rows } = await pool.query<TrackedItem>(
    `SELECT * FROM tracked_items WHERE status = 'active' ORDER BY created_at`
  );
  return rows;
}

// ── Price Checks (debug log) ───────────────────────────────────────────────────

export async function insertPriceCheck(params: {
  trackedItemId: string;
  pricePennies: number | null;
  success: boolean;
  rawSnippet?: string;
}): Promise<void> {
  await pool.query(
    `INSERT INTO price_checks(tracked_item_id, price_pennies, success, raw_snippet)
     VALUES($1, $2, $3, $4)`,
    [
      params.trackedItemId,
      params.pricePennies ?? null,
      params.success,
      params.rawSnippet ? params.rawSnippet.slice(0, 500) : null,
    ]
  );
}
