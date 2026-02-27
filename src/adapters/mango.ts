/**
 * Mango (shop.mango.com) adapter
 * Mango exposes price in JSON-LD and a data-price attribute pattern.
 */
import * as cheerio from 'cheerio';
import { RetailerAdapter, PriceResult } from '../types';
import { fetchHtml } from './fetch';

export const mangoAdapter: RetailerAdapter = {
  canHandle(url: string): boolean {
    return url.includes('mango.com') || url.includes('shop.mango.com');
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

    // Mango sometimes uses a specific price CSS selector
    const priceSelectors = [
      '[class*="price-sale"]',
      '[class*="price-unit"]',
      '[itemprop="price"]',
      '.price',
    ];
    for (const selector of priceSelectors) {
      const text = $(selector).first().text().trim();
      const match = text.match(/£\s*(\d[\d,]*(?:\.\d{1,2})?)/);
      if (match) {
        const num = parseFloat(match[1].replace(',', ''));
        if (!isNaN(num) && num > 0) {
          return { pricePennies: Math.round(num * 100), currency: 'GBP', title };
        }
      }
      // Also check content attribute for itemprop="price"
      const content = $(selector).attr('content');
      if (content) {
        const num = parseFloat(content);
        if (!isNaN(num) && num > 0) {
          return { pricePennies: Math.round(num * 100), currency: 'GBP', title };
        }
      }
    }

    throw new Error('Mango: could not extract price');
  },
};
