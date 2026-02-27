/**
 * Zalando (zalando.co.uk) adapter
 * Zalando is heavily JS-rendered. We try JSON-LD and meta tags first.
 * NOTE: Zalando may block scraping and return 403. If that happens,
 * the item is marked with status=error and a helpful message.
 */
import * as cheerio from 'cheerio';
import { RetailerAdapter, PriceResult } from '../types';
import { fetchHtml } from './fetch';

export const zalandoAdapter: RetailerAdapter = {
  canHandle(url: string): boolean {
    return url.includes('zalando.co.uk') || url.includes('zalando.com');
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

    // Zalando often has price in a specific element
    const priceText = $('[class*="sku-price"]').first().text().trim() ||
                      $('[data-testid*="price"]').first().text().trim();

    const match = priceText.match(/£\s*(\d[\d,]*(?:\.\d{1,2})?)/);
    if (match) {
      const num = parseFloat(match[1].replace(',', ''));
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

    throw new Error(
      'Zalando: could not extract price (page may require JavaScript rendering)'
    );
  },
};
