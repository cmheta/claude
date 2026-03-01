/**
 * Zara adapter
 * Uses Zara's internal REST API to fetch product prices.
 * Tries multiple known API endpoint patterns.
 */
import { fetch } from 'undici';
import { RetailerAdapter, PriceResult } from '../types';

function extractProductId(url: string): string | null {
  // Zara URLs end with -p{productId}.html e.g. p02615136
  const match = url.match(/-p(\d+)\.html/i);
  return match ? match[1] : null;
}

function extractLocale(url: string): { country: string; langId: number; storeId: number } {
  const match = url.match(/zara\.com\/([a-z]{2})\//i);
  const country = match ? match[1].toLowerCase() : 'uk';
  const localeMap: Record<string, { langId: number; storeId: number }> = {
    uk: { langId: 3, storeId: 10701 },
    us: { langId: 1, storeId: 11111 },
    es: { langId: 21, storeId: 10702 },
    fr: { langId: 6, storeId: 10706 },
    de: { langId: 8, storeId: 10709 },
    it: { langId: 10, storeId: 10705 },
  };
  return { country, ...(localeMap[country] ?? localeMap['uk']) };
}

async function tryFetchJson(url: string, referer: string): Promise<Record<string, unknown> | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Accept: 'application/json, text/plain, */*',
        'Accept-Language': 'en-GB,en;q=0.9',
        Referer: referer,
        Origin: 'https://www.zara.com',
      },
    });
    if (!response.ok) return null;
    const ct = response.headers.get('content-type') ?? '';
    if (!ct.includes('json')) return null;
    return await response.json() as Record<string, unknown>;
  } catch {
    return null;
  }
}

export const zaraAdapter: RetailerAdapter = {
  canHandle(url: string): boolean {
    return url.includes('zara.com');
  },

  async fetchPrice(url: string): Promise<PriceResult> {
    const rawId = extractProductId(url);
    if (!rawId) throw new Error('Zara: could not extract product ID from URL');

    const { country, langId, storeId } = extractLocale(url);
    // Try both with and without leading zero
    const idWithZero = rawId;
    const idWithout = rawId.replace(/^0+/, '');

    const endpoints = [
      `https://www.zara.com/itxrest/2/catalog/store/${storeId}/product/${idWithout}/detail?languageId=${langId}&appId=com.inditex.zara`,
      `https://www.zara.com/itxrest/2/catalog/store/${storeId}/product/${idWithZero}/detail?languageId=${langId}&appId=com.inditex.zara`,
      `https://www.zara.com/${country}/en/product/${idWithout}/detail.json`,
      `https://www.zara.com/${country}/en/product/${idWithZero}/detail.json`,
    ];

    let data: Record<string, unknown> | null = null;
    for (const endpoint of endpoints) {
      data = await tryFetchJson(endpoint, url);
      if (data) break;
    }

    if (!data) throw new Error('Zara: all API endpoints returned no data');

    const price = findPrice(data);
    if (price === null) throw new Error('Zara: could not extract price from API response');

    const name = (data['name'] as string | undefined) ?? undefined;
    return { pricePennies: price, currency: 'GBP', title: name };
  },
};

function findPrice(obj: unknown, depth = 0): number | null {
  if (depth > 12 || obj === null || typeof obj !== 'object') return null;
  const record = obj as Record<string, unknown>;

  for (const key of ['price', 'currentPrice', 'salePrice', 'value', 'amount', 'oldPrice']) {
    const val = record[key];
    if (typeof val === 'number' && val > 0) {
      // Zara API may return price in minor units (pence) or major units (pounds)
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
