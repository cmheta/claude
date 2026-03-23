/**
 * Shared HTTP fetch helper for adapters.
 * Uses ScraperAPI if SCRAPER_API_KEY is set, otherwise direct fetch.
 */
import { fetch } from 'undici';

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
];

function randomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function scraperApiUrl(url: string): string {
  const key = process.env['SCRAPER_API_KEY'];
  if (!key) return url;
  return `http://api.scraperapi.com?api_key=${key}&url=${encodeURIComponent(url)}&render=true`;
}

export async function fetchHtml(url: string, timeoutMs = 60_000): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const targetUrl = scraperApiUrl(url);
  const usingProxy = targetUrl !== url;

  try {
    const response = await fetch(targetUrl, {
      signal: controller.signal,
      headers: usingProxy ? {} : {
        'User-Agent': randomUserAgent(),
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-GB,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
        'Upgrade-Insecure-Requests': '1',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText} for ${url}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}
