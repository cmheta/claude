/**
 * Scheduler — polls active tracked items on a configurable interval.
 * Uses node-cron for simplicity. Stagger checks across items to avoid
 * hammering retailers all at once.
 */
import cron from 'node-cron';
import { config } from '../config';
import { getAllActiveItems } from '../db/queries';
import { checkItem } from './priceChecker';

const STAGGER_MS = 5_000; // 5 seconds between each item check

let isRunning = false;

async function runChecks(): Promise<void> {
  if (isRunning) {
    console.log('[scheduler] Previous run still in progress, skipping.');
    return;
  }
  isRunning = true;

  try {
    const items = await getAllActiveItems();
    console.log(`[scheduler] Checking ${items.length} active item(s).`);

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      // Stagger to avoid burst requests
      if (i > 0) {
        await sleep(STAGGER_MS);
      }
      await checkItem(item);
    }

    console.log(`[scheduler] Done checking ${items.length} item(s).`);
  } catch (err) {
    console.error('[scheduler] Unexpected error:', err);
  } finally {
    isRunning = false;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function startScheduler(): void {
  const intervalMinutes = config.checkIntervalMinutes;

  // Build cron expression: every N minutes (simplest approach)
  // node-cron supports */N syntax for minutes
  const cronExpr = intervalMinutes < 60
    ? `*/${intervalMinutes} * * * *`
    : `0 */${Math.floor(intervalMinutes / 60)} * * *`;

  console.log(
    `[scheduler] Starting — checking every ${intervalMinutes} minutes (cron: "${cronExpr}")`
  );

  cron.schedule(cronExpr, () => {
    runChecks().catch((err) =>
      console.error('[scheduler] Unhandled error in runChecks:', err)
    );
  });

  // Also run once on startup after a short delay (let server warm up)
  setTimeout(() => {
    console.log('[scheduler] Running initial check on startup...');
    runChecks().catch((err) =>
      console.error('[scheduler] Startup check error:', err)
    );
  }, 10_000);
}
