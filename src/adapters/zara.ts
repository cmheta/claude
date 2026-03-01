/**
 * Zara adapter
 * Uses Zara's internal REST API to fetch product prices.
 * Extracts product ID from the URL and queries the API directly.
 */
import { fetch } from 'undici';
import { RetailerAdapter, PriceResult } from '../types';

function extractProductId(url: string): string | null {
  // Zara URLs end with -p{productId}.html e.g. p02615136
  const match = url.match(/-p(\d+)\.html/i);
  return match ? match[1] : null;
}

function extractCountryStore(url: string): { country: string; storeId: number } {
  // Extract country code from URL e.g. zara.com/uk/en/...
  const match = url.match(/zara\.com\/([a-z]{2})\//i);
  const country = match ? match[1].toUpperCase() : 'GB';
  // Zara store IDs by country (common ones)
  const storeIds: Record<string, number> = {
    GB: 10701,
    US: 11111,
    ES: 10702,
    FR: 10706,
    DE: 10709,
    IT: 10705,
  };
  return { country, storeId: storeIds[country] ?? 10701 };
}

export const zaraAdapter: RetailerAdapter = {
  canHandle(url: string): boolean {
    return url.includes('zara.com');
  },

  async fetchPrice(url: string): Promise<PriceResult> {
    const productId = extractProductId(url);
    if (!productId) {
      throw new Error('Zara: could not extract product ID from URL');
    }

    const { country, storeId } = extractCountryStore(url);

    const apiUrl = `https://www.zara.com/itxrest/2/catalog/store/${storeId}/product/${productId}/detail?languageId=-1&appId=com.inditex.zara`;

    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Accept: 'application/json',
        'Accept-Language': 'en-GB,en;q=0.9',
        Referer: url,
      },
    });

    if (!response.ok) {
      throw new Error(`Zara API: HTTP ${response.status}`);
    }

    const data = await response.json() as Record<string, unknown>;

    // Extract price from API response
    const price = findPrice(data);
    if (price === null) {
      throw new Error('Zara: could not extract price from API response');
    }

    // Extract title
    const name = (data['name'] as string | undefined) ?? undefined;

    return { pricePennies: price, currency: country === 'US' ? 'USD' : 'GBP', title: name };
  },
};

function findPrice(obj: unknown, depth = 0): number | null {
  if (depth > 10 || obj === null || typeof obj !== 'object') return null;
  const record = obj as Record<string, unknown>;

  // Zara API price fields
  for (const key of ['price', 'currentPrice', 'salePrice', 'value', 'oldPrice']) {
    const val = record[key];
    if (typeof val === 'number' && val > 0) {
      // Zara API returns prices in cents already for some regions, or as full price
      // If value > 10000 it's likely in minor units (pennies), otherwise multiply
      return val > 10000 ? val : Math.round(val * 100);
    }
  }

  for (const value of Object.values(record)) {
    if (typeof value === 'object') {
      const found = findPrice(value, depth + 1);
      if (found !== null) return found;
    }
  }
  return null;
}
