/**
 * COS (cosstores.com) adapter
 * COS uses JSON-LD and meta og:price tags reliably.
 */
import * as cheerio from 'cheerio';
import { RetailerAdapter, PriceResult } from '../types';
import { fetchHtml } from './fetch';

export const cosAdapter: RetailerAdapter = {
  canHandle(url: string): boolean {
    return url.includes('cosstores.com') || url.includes('cos.com');
  },

  async fetchPrice(url: string): Promise<PriceResult> {
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);

    const title =
      $('meta[property="og:title"]').attr('content') ??
      $('h1').first().text().trim();

    // JSON-LD (COS uses structured product data)
    const scripts = $('script[type="application/ld+json"]').toArray();
    for (const el of scripts) {
      try {
        const data = JSON.parse($(el).html() ?? '') as Record<string, unknown>;
        const items = Array.isArray(data) ? data : [data];
        for (const item of items) {
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

    // Meta price tag
    const metaAmount = $('meta[property="product:price:amount"]').attr('content');
    if (metaAmount) {
      const num = parseFloat(metaAmount);
      if (!isNaN(num) && num > 0) {
        return { pricePennies: Math.round(num * 100), currency: 'GBP', title };
      }
    }

    // CSS selector fallback: COS typically has a price element
    const priceText = $('[class*="price"]:not([class*="was"]):not([class*="original"])').first().text().trim();
    const match = priceText.match(/£\s*(\d[\d,]*(?:\.\d{1,2})?)/);
    if (match) {
      const num = parseFloat(match[1].replace(',', ''));
      if (!isNaN(num) && num > 0) {
        return { pricePennies: Math.round(num * 100), currency: 'GBP', title };
      }
    }

    throw new Error('COS: could not extract price');
  },
};
