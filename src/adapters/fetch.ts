/**
 * Shared HTTP fetch helper for adapters.
 * Uses undici for proper Node.js HTTP support.
 * Rotates a realistic browser User-Agent and sets common headers.
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

export async function fetchHtml(url: string, timeoutMs = 15_000): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
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

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('html')) {
      throw new Error(`Unexpected content-type: ${contentType}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}
