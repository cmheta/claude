/**
 * Generic price adapter — tries multiple extraction strategies in order:
 * 1. Open Graph / meta tags (product:price:amount)
 * 2. JSON-LD Product offers
 * 3. £ pattern scanning in visible text
 */
import * as cheerio from 'cheerio';
import { RetailerAdapter, PriceResult } from '../types';
import { fetchHtml } from './fetch';

function parsePennies(raw: string): number | null {
  // Strip currency symbols and commas, parse float
  const cleaned = raw.replace(/[£$€,\s]/g, '');
  const num = parseFloat(cleaned);
  if (isNaN(num) || num <= 0 || num > 10_000) return null;
  return Math.round(num * 100);
}

function extractFromJsonLd($: cheerio.CheerioAPI): number | null {
  const scripts = $('script[type="application/ld+json"]').toArray();
  for (const el of scripts) {
    try {
      const raw = $(el).html() ?? '';
      const data = JSON.parse(raw);
      const candidates: unknown[] = Array.isArray(data) ? data : [data];
      for (const item of candidates) {
        const obj = item as Record<string, unknown>;
        if (obj['@type'] === 'Product' || obj['@type']?.toString().includes('Product')) {
          const offers = obj['offers'] as Record<string, unknown> | undefined;
          if (offers) {
            const price = offers['price'] ?? offers['lowPrice'];
            if (price !== undefined) {
              const pennies = parsePennies(String(price));
              if (pennies !== null) return pennies;
            }
          }
        }
      }
    } catch {
      // malformed JSON-LD, skip
    }
  }
  return null;
}

function extractFromMeta($: cheerio.CheerioAPI): number | null {
  const metaPrice =
    $('meta[property="product:price:amount"]').attr('content') ??
    $('meta[name="twitter:data1"]').attr('value') ??
    $('meta[itemprop="price"]').attr('content');

  if (metaPrice) {
    return parsePennies(metaPrice);
  }
  return null;
}

function extractFromPoundPattern(html: string): number | null {
  // Find patterns like £120, £120.00, £1,200.00
  const matches = [...html.matchAll(/£\s*(\d[\d,]*(?:\.\d{1,2})?)/g)];
  if (matches.length === 0) return null;

  const prices = matches
    .map((m) => parsePennies(m[1]))
    .filter((p): p is number => p !== null)
    // Clothing prices: filter to plausible range £1 – £2000
    .filter((p) => p >= 100 && p <= 200_000)
    .sort((a, b) => a - b);

  if (prices.length === 0) return null;
  // Return the most-common price (mode) or median — naive: pick lowest after filtering outliers
  return prices[Math.floor(prices.length / 2)];
}

export const genericAdapter: RetailerAdapter = {
  canHandle(_url: string): boolean {
    return true; // fallback for everything
  },

  async fetchPrice(url: string): Promise<PriceResult> {
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);

    const title =
      $('meta[property="og:title"]').attr('content') ??
      $('title').text().trim().slice(0, 120) ??
      undefined;

    const pricePennies =
      extractFromJsonLd($) ??
      extractFromMeta($) ??
      extractFromPoundPattern(html);

    if (pricePennies === null) {
      throw new Error('Could not extract price from page');
    }

    return { pricePennies, currency: 'GBP', title: title || undefined };
  },
};
