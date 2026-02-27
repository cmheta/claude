/**
 * Arket (arket.com) adapter
 * Arket is H&M Group, uses similar JSON-LD structure to COS/H&M.
 */
import * as cheerio from 'cheerio';
import { RetailerAdapter, PriceResult } from '../types';
import { fetchHtml } from './fetch';

export const arketAdapter: RetailerAdapter = {
  canHandle(url: string): boolean {
    return url.includes('arket.com');
  },

  async fetchPrice(url: string): Promise<PriceResult> {
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);

    const title =
      $('meta[property="og:title"]').attr('content') ??
      $('h1').first().text().trim();

    // JSON-LD
    const scripts = $('script[type="application/ld+json"]').toArray();
    for (const el of scripts) {
      try {
        const data = JSON.parse($(el).html() ?? '') as Record<string, unknown>;
        const candidates = Array.isArray(data) ? data : [data];
        for (const item of candidates) {
          const obj = item as Record<string, unknown>;
          if (String(obj['@type']).includes('Product')) {
            const offers = obj['offers'] as Record<string, unknown> | undefined;
            const price = offers?.['price'] ?? offers?.['lowPrice'];
            if (price !== undefined) {
              const num = parseFloat(String(price));
              if (!isNaN(num) && num > 0) {
                return { pricePennies: Math.round(num * 100), currency: 'GBP', title };
              }
            }
          }
        }
      } catch {
        // skip
      }
    }

    // Arket sometimes puts price in a data attribute
    const priceAttr = $('[data-price]').attr('data-price');
    if (priceAttr) {
      const num = parseFloat(priceAttr);
      if (!isNaN(num) && num > 0) {
        return { pricePennies: Math.round(num * 100), currency: 'GBP', title };
      }
    }

    // meta og
    const metaAmount = $('meta[property="product:price:amount"]').attr('content');
    if (metaAmount) {
      const num = parseFloat(metaAmount);
      if (!isNaN(num) && num > 0) {
        return { pricePennies: Math.round(num * 100), currency: 'GBP', title };
      }
    }

    throw new Error('Arket: could not extract price');
  },
};
