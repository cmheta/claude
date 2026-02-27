/**
 * Twilio WhatsApp sender.
 * Wraps the Twilio client for outbound messages.
 */
import twilio from 'twilio';
import { config } from '../config';

let _client: ReturnType<typeof twilio> | null = null;

function getClient() {
  if (!_client) {
    _client = twilio(config.twilio.accountSid, config.twilio.authToken);
  }
  return _client;
}

export async function sendWhatsApp(to: string, body: string): Promise<void> {
  // to should already be in whatsapp:+44xxx format
  const toFormatted = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
  await getClient().messages.create({
    from: config.twilio.from,
    to: toFormatted,
    body,
  });
}

// ── Message templates ──────────────────────────────────────────────────────────

export function msgTrackConfirmed(params: {
  target: string;
  url: string;
  title?: string | null;
}): string {
  const titleLine = params.title ? `\n📦 Item: ${params.title}` : '';
  return (
    `✅ Tracking started!${titleLine}\n` +
    `🎯 Target: £${params.target}\n` +
    `🔗 ${params.url}\n\n` +
    `I'll message you when it hits your price. Reply LIST to see tracked items.`
  );
}

export function msgAlert(params: {
  price: string;
  target: string;
  url: string;
  title?: string | null;
}): string {
  const titleLine = params.title ? `\n📦 ${params.title}` : '';
  return (
    `🔥 Price Alert!${titleLine}\n` +
    `It's now £${params.price} (your target: £${params.target}).\n\n` +
    `Buy now: ${params.url}`
  );
}

export function msgList(
  items: Array<{ shortId: string; targetGbp: string; lastGbp: string | null; url: string; title?: string | null }>
): string {
  if (items.length === 0) {
    return "You have no active tracked items. Send me a link + price to get started!";
  }
  const lines = items.map((item, i) => {
    const last = item.lastGbp ? ` | last seen £${item.lastGbp}` : '';
    const title = item.title ? ` - ${item.title.slice(0, 40)}` : '';
    return `${i + 1}) \`${item.shortId}\` £${item.targetGbp}${last}${title}\n   ${item.url}`;
  });
  return (
    `📋 Your tracked items:\n\n` +
    lines.join('\n\n') +
    `\n\nReply STOP <id> to stop tracking an item.`
  );
}

export function msgStopped(shortId: string): string {
  return `🛑 Stopped tracking \`${shortId}\`.`;
}

export function msgStatus(params: {
  shortId: string;
  targetGbp: string;
  lastGbp: string | null;
  lastChecked: Date | null;
  url: string;
  title?: string | null;
}): string {
  const lastPrice = params.lastGbp ? `£${params.lastGbp}` : 'not yet checked';
  const checkedAt = params.lastChecked
    ? params.lastChecked.toUTCString()
    : 'never';
  const titleLine = params.title ? `\n📦 ${params.title}` : '';
  return (
    `📊 Status for \`${params.shortId}\`:${titleLine}\n` +
    `🎯 Target: £${params.targetGbp}\n` +
    `💷 Last price: ${lastPrice}\n` +
    `🕐 Last checked: ${checkedAt}\n` +
    `🔗 ${params.url}`
  );
}

export function msgHelp(): string {
  return (
    `🤖 WhatsApp Price Agent — Commands:\n\n` +
    `*Track a price:*\ntrack £120 https://...\n\n` +
    `*List tracked items:*\nLIST\n\n` +
    `*Check item status:*\nSTATUS <id>\n\n` +
    `*Stop tracking:*\nSTOP <id>\n\n` +
    `*This help:*\nHELP`
  );
}

export function msgParseError(): string {
  return (
    `❓ I couldn't understand that.\n\n` +
    `To track a price, try:\n` +
    `  track 120 https://...\n` +
    `  notify me at £90 https://...\n\n` +
    `Or reply HELP for all commands.`
  );
}

export function msgNotFound(shortId: string): string {
  return `❌ Couldn't find item \`${shortId}\`. Reply LIST to see your items.`;
}

export function penniesToGbp(pennies: number): string {
  return (pennies / 100).toFixed(2);
}
