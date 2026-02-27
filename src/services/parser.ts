/**
 * Message parser — extracts URL and target price from WhatsApp messages.
 *
 * Supported formats:
 *   "Track this at £120 https://..."
 *   "track 90 https://..."
 *   "notify me at 75 https://..."
 *   "https://... 120"
 *   "120 https://..."
 */

export interface ParsedTrackRequest {
  url: string;
  targetPricePennies: number;
}

export type ParseResult =
  | { ok: true; data: ParsedTrackRequest }
  | { ok: false; reason: string };

const URL_REGEX = /https?:\/\/[^\s]+/i;

// Matches:
//  £120, £120.00, £1,200.00
//  120, 90.5, 1200
// Preceded or followed by optional keywords
const PRICE_REGEX =
  /(?:£\s*)?(\d[\d,]*(?:\.\d{1,2})?)\s*(?:gbp|pounds?)?/gi;

const TRACK_KEYWORDS = /\b(track|notify|alert|watch|monitor)\b/i;
const AT_KEYWORDS = /\b(at|under|below|<=|for|price)\b/i;

export function parseTrackMessage(body: string): ParseResult {
  const urlMatch = URL_REGEX.exec(body);
  if (!urlMatch) {
    return { ok: false, reason: 'no_url' };
  }
  const url = urlMatch[0].replace(/[.,!?]+$/, ''); // strip trailing punctuation

  // Validate URL is parseable
  try {
    new URL(url);
  } catch {
    return { ok: false, reason: 'invalid_url' };
  }

  // Remove the URL from the text to simplify price extraction
  const textWithoutUrl = body.replace(url, ' ').replace(URL_REGEX, ' ');

  // Collect all price candidates from the text
  const candidates: number[] = [];
  let match: RegExpExecArray | null;
  PRICE_REGEX.lastIndex = 0;

  while ((match = PRICE_REGEX.exec(textWithoutUrl)) !== null) {
    const raw = match[1].replace(',', '');
    const num = parseFloat(raw);
    // Plausible clothing price: £1 to £5000
    if (!isNaN(num) && num >= 1 && num <= 5000) {
      candidates.push(Math.round(num * 100));
    }
  }

  if (candidates.length === 0) {
    return { ok: false, reason: 'no_price' };
  }

  // If multiple candidates, prefer the one closest after "at/under/£" keywords
  // For MVP just take the first plausible one
  const targetPricePennies = candidates[0];

  return { ok: true, data: { url, targetPricePennies } };
}

export type Command =
  | { type: 'track'; url: string; targetPricePennies: number }
  | { type: 'list' }
  | { type: 'stop'; shortId: string }
  | { type: 'status'; shortId: string }
  | { type: 'help' }
  | { type: 'unknown' };

export function parseCommand(body: string): Command {
  const trimmed = body.trim();
  const lower = trimmed.toLowerCase();

  if (lower === 'list' || lower === 'lista' || lower === 'ls') {
    return { type: 'list' };
  }

  if (lower === 'help' || lower === '?' || lower === 'ayuda') {
    return { type: 'help' };
  }

  const stopMatch = trimmed.match(/^stop\s+([a-f0-9-]{6,})/i);
  if (stopMatch) {
    return { type: 'stop', shortId: stopMatch[1] };
  }

  const statusMatch = trimmed.match(/^status\s+([a-f0-9-]{6,})/i);
  if (statusMatch) {
    return { type: 'status', shortId: statusMatch[1] };
  }

  // Check if it looks like a track command (has a URL)
  if (URL_REGEX.test(trimmed)) {
    const parsed = parseTrackMessage(trimmed);
    if (parsed.ok) {
      return {
        type: 'track',
        url: parsed.data.url,
        targetPricePennies: parsed.data.targetPricePennies,
      };
    }
    // Has URL but no price
    return { type: 'unknown' };
  }

  return { type: 'unknown' };
}
