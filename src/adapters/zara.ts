/**
 * Zara adapter
 * Zara uses Next.js — price data is in __NEXT_DATA__ JSON blob.
 * Falls back to JSON-LD and meta tags.
 */
import * as cheerio from 'cheerio';
import { RetailerAdapter, PriceResult } from '../types';
import { fetchHtml } from './fetch';

function parsePennies(val: unknown): number | null {
  const num = parseFloat(String(val));
  if (isNaN(num) || num <= 0) return null;
  return Math.round(num * 100);
}

function findPriceInObject(obj: unknown, depth = 0): number | null {
  if (depth > 12 || obj === null || typeof obj !== 'object') return null;
  const record = obj as Record<string, unknown>;

  // Zara price fields
  for (const key of ['price', 'currentPrice', 'salePrice', 'value', 'amount']) {
    const val = record[key];
    if (typeof val === 'number' && val > 0) {
      return Math.round(val * 100);
    }
    if (typeof val === 'string') {
      const num = parseFloat(val.replace(/[^0-9.]/g, ''));
      if (!isNaN(num) && num > 0 && num < 10000) return Math.round(num * 100);
    }
  }

  for (const value of Object.values(record)) {
    if (typeof value === 'object') {
      const found = findPriceInObject(value, depth + 1);
      if (found !== null) return found;
    }
  }
  return null;
}

export const zaraAdapter: RetailerAdapter = {
  canHandle(url: string): boolean {
    return url.includes('zara.com');
  },

  async fetchPrice(url: string): Promise<PriceResult> {
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);

    const title =
      $('meta[property="og:title"]').attr('content') ??
      $('title').text().trim().slice(0, 120) ??
      undefined;

    // Strategy 1: __NEXT_DATA__ JSON blob
    const nextDataRaw = $('#__NEXT_DATA__').html();
    if (nextDataRaw) {
      try {
        const nextData = JSON.parse(nextDataRaw) as Record<string, unknown>;
        const price = findPriceInObject(nextData);
        if (price !== null) {
          return { pricePennies: price, currency: 'GBP', title };
        }
      } catch {
        // fall through
      }
    }

    // Strategy 2: JSON-LD
    const scripts = $('script[type="application/ld+json"]').toArray();
    for (const el of scripts) {
      try {
        const data = JSON.parse($(el).html() ?? '') as Record<string, unknown>;
        if (data['@type'] === 'Product') {
          const offers = data['offers'] as Record<string, unknown> | undefined;
          const price = offers?.['price'];
          const pennies = parsePennies(price);
          if (pennies !== null) {
            return { pricePennies: pennies, currency: 'GBP', title };
          }
        }
      } catch {
        // skip
      }
    }

    // Strategy 3: meta tags
    const metaPrice = $('meta[property="product:price:amount"]').attr('content');
    if (metaPrice) {
      const pennies = parsePennies(metaPrice);
      if (pennies !== null) {
        return { pricePennies: pennies, currency: 'GBP', title };
      }
    }

    throw new Error('Zara: could not extract price');
  },
};
