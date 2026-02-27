/**
 * ASOS adapter
 * ASOS embeds price data in a __NEXT_DATA__ JSON blob or JSON-LD.
 * We prefer __NEXT_DATA__ as it's the most reliable.
 */
import * as cheerio from 'cheerio';
import { RetailerAdapter, PriceResult } from '../types';
import { fetchHtml } from './fetch';

function parsePennies(val: unknown): number | null {
  const num = parseFloat(String(val));
  if (isNaN(num) || num <= 0) return null;
  return Math.round(num * 100);
}

export const asosAdapter: RetailerAdapter = {
  canHandle(url: string): boolean {
    return url.includes('asos.com');
  },

  async fetchPrice(url: string): Promise<PriceResult> {
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);

    // Strategy 1: __NEXT_DATA__ JSON blob
    const nextDataRaw = $('#__NEXT_DATA__').html();
    if (nextDataRaw) {
      try {
        const nextData = JSON.parse(nextDataRaw) as Record<string, unknown>;
        // Path varies — search recursively for price
        const price = findPriceInNextData(nextData);
        if (price !== null) {
          const title = $('meta[property="og:title"]').attr('content') ?? undefined;
          return { pricePennies: price, currency: 'GBP', title };
        }
      } catch {
        // fall through to other strategies
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
            return {
              pricePennies: pennies,
              currency: 'GBP',
              title: String(data['name'] ?? ''),
            };
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
        return {
          pricePennies: pennies,
          currency: 'GBP',
          title: $('meta[property="og:title"]').attr('content'),
        };
      }
    }

    throw new Error('ASOS: could not extract price');
  },
};

function findPriceInNextData(obj: unknown, depth = 0): number | null {
  if (depth > 10 || obj === null || typeof obj !== 'object') return null;
  const record = obj as Record<string, unknown>;

  // Look for currentPrice or price fields common in ASOS data
  for (const key of ['currentPrice', 'price', 'salePrice', 'wasPrice']) {
    if (typeof record[key] === 'number' && (record[key] as number) > 0) {
      return Math.round((record[key] as number) * 100);
    }
    if (typeof record[key] === 'string') {
      const num = parseFloat((record[key] as string).replace(/[^0-9.]/g, ''));
      if (!isNaN(num) && num > 0) return Math.round(num * 100);
    }
  }

  for (const value of Object.values(record)) {
    if (typeof value === 'object') {
      const found = findPriceInNextData(value, depth + 1);
      if (found !== null) return found;
    }
  }
  return null;
}
