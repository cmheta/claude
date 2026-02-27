/**
 * Price checker — fetches current price for a tracked item and:
 * 1. Updates DB with latest price
 * 2. Sends alert if price <= target and alert not yet sent
 * 3. Logs to price_checks table
 */
import { TrackedItem } from '../types';
import { getAdapter } from '../adapters';
import {
  updateItemAfterCheck,
  markItemError,
  markAlertSent,
  insertPriceCheck,
} from '../db/queries';
import {
  sendWhatsApp,
  msgAlert,
  penniesToGbp,
} from './whatsapp';
import { getUserById } from '../db/queries';

export async function checkItem(item: TrackedItem): Promise<void> {
  const adapter = getAdapter(item.url);
  console.log(`[checker] Checking ${item.id} (${item.url})`);

  let pricePennies: number | null = null;

  try {
    const result = await adapter.fetchPrice(item.url);
    pricePennies = result.pricePennies;

    await updateItemAfterCheck({ id: item.id, pricePennies });
    await insertPriceCheck({
      trackedItemId: item.id,
      pricePennies,
      success: true,
    });

    console.log(
      `[checker] ${item.id}: £${penniesToGbp(pricePennies)} (target £${penniesToGbp(item.target_price_gbp_pennies)})`
    );

    // Fire alert if price hit target AND alert not already sent
    if (pricePennies <= item.target_price_gbp_pennies && !item.alert_sent_at) {
      await sendAlert(item, pricePennies);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[checker] Error for ${item.id}: ${msg}`);

    await markItemError(item.id, msg);
    await insertPriceCheck({
      trackedItemId: item.id,
      pricePennies: null,
      success: false,
      rawSnippet: msg,
    });
  }
}

async function sendAlert(item: TrackedItem, pricePennies: number): Promise<void> {
  try {
    const user = await getUserById(item.user_id);
    if (!user) {
      console.error(`[checker] No user found for item ${item.id}`);
      return;
    }

    const message = msgAlert({
      price: penniesToGbp(pricePennies),
      target: penniesToGbp(item.target_price_gbp_pennies),
      url: item.url,
      title: item.title,
    });

    await sendWhatsApp(user.phone_e164, message);
    await markAlertSent(item.id);
    console.log(`[checker] Alert sent for ${item.id} to ${user.phone_e164}`);
  } catch (err) {
    console.error(`[checker] Failed to send alert for ${item.id}:`, err);
  }
}
