/**
 * POST /twilio/whatsapp
 * Receives inbound WhatsApp messages from Twilio webhook.
 * Responds with empty TwiML immediately (to avoid Twilio timeout),
 * then processes the command asynchronously.
 */
import { Router, Request, Response } from 'express';
import { parseCommand } from '../services/parser';
import { upsertUser, createTrackedItem, getActiveItemsForUser, getItemByShortId, stopTrackedItem } from '../db/queries';
import { inferRetailer } from '../adapters';
import { getAdapter } from '../adapters';
import {
  sendWhatsApp,
  msgTrackConfirmed,
  msgList,
  msgStopped,
  msgStatus,
  msgHelp,
  msgParseError,
  msgNotFound,
  penniesToGbp,
} from '../services/whatsapp';

export const whatsappRouter = Router();

whatsappRouter.post('/', async (req: Request, res: Response): Promise<void> => {
  // Respond immediately with empty TwiML to satisfy Twilio's 15s timeout
  res.type('text/xml').status(200).send('<Response></Response>');

  const body: string = (req.body?.Body ?? '').trim();
  const fromRaw: string = (req.body?.From ?? '').trim();

  if (!body || !fromRaw) {
    console.warn('[webhook] Missing Body or From in request');
    return;
  }

  // Twilio sends From as "whatsapp:+447..." — extract E164
  const phoneE164 = fromRaw.startsWith('whatsapp:')
    ? fromRaw.slice('whatsapp:'.length)
    : fromRaw;

  console.log(`[webhook] From: ${phoneE164} | Message: "${body.slice(0, 80)}"`);

  // Process asynchronously (response already sent)
  handleCommand(phoneE164, body).catch((err) => {
    console.error(`[webhook] Error handling message from ${phoneE164}:`, err);
  });
});

async function handleCommand(phone: string, body: string): Promise<void> {
  const user = await upsertUser(phone);
  const command = parseCommand(body);

  switch (command.type) {
    case 'track': {
      await handleTrack(user.id, phone, command.url, command.targetPricePennies);
      break;
    }
    case 'list': {
      await handleList(user.id, phone);
      break;
    }
    case 'stop': {
      await handleStop(user.id, phone, command.shortId);
      break;
    }
    case 'status': {
      await handleStatus(user.id, phone, command.shortId);
      break;
    }
    case 'help': {
      await sendWhatsApp(phone, msgHelp());
      break;
    }
    case 'unknown': {
      await sendWhatsApp(phone, msgParseError());
      break;
    }
  }
}

async function handleTrack(
  userId: string,
  phone: string,
  url: string,
  targetPricePennies: number
): Promise<void> {
  const retailer = inferRetailer(url);

  // Try to fetch current title (best-effort, don't fail on error)
  let title: string | undefined;
  try {
    const adapter = getAdapter(url);
    const result = await adapter.fetchPrice(url);
    title = result.title;
    // Log current price but don't block on it
    console.log(
      `[track] Current price for ${url}: £${penniesToGbp(result.pricePennies)}`
    );
  } catch (err) {
    console.warn(`[track] Could not fetch initial price for ${url}:`, err);
  }

  const item = await createTrackedItem({
    userId,
    url,
    retailer,
    targetPricePennies,
    title,
  });

  await sendWhatsApp(
    phone,
    msgTrackConfirmed({
      target: penniesToGbp(targetPricePennies),
      url,
      title,
    })
  );

  console.log(
    `[track] Created item ${item.id} for ${phone} — target £${penniesToGbp(targetPricePennies)}`
  );
}

async function handleList(userId: string, phone: string): Promise<void> {
  const items = await getActiveItemsForUser(userId);
  const listItems = items.map((item) => ({
    shortId: item.id.slice(0, 8),
    targetGbp: penniesToGbp(item.target_price_gbp_pennies),
    lastGbp: item.last_price_gbp_pennies !== null
      ? penniesToGbp(item.last_price_gbp_pennies)
      : null,
    url: item.url,
    title: item.title,
  }));
  await sendWhatsApp(phone, msgList(listItems));
}

async function handleStop(userId: string, phone: string, shortId: string): Promise<void> {
  const stopped = await stopTrackedItem(shortId, userId);
  if (stopped) {
    await sendWhatsApp(phone, msgStopped(shortId));
  } else {
    await sendWhatsApp(phone, msgNotFound(shortId));
  }
}

async function handleStatus(userId: string, phone: string, shortId: string): Promise<void> {
  const item = await getItemByShortId(userId, shortId);
  if (!item) {
    await sendWhatsApp(phone, msgNotFound(shortId));
    return;
  }
  await sendWhatsApp(
    phone,
    msgStatus({
      shortId: item.id.slice(0, 8),
      targetGbp: penniesToGbp(item.target_price_gbp_pennies),
      lastGbp: item.last_price_gbp_pennies !== null
        ? penniesToGbp(item.last_price_gbp_pennies)
        : null,
      lastChecked: item.last_checked_at,
      url: item.url,
      title: item.title,
    })
  );
}
