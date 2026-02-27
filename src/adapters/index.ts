/**
 * Adapter registry — resolves the best adapter for a URL.
 * Specific adapters take priority; generic is the fallback.
 */
import { RetailerAdapter } from '../types';
import { asosAdapter } from './asos';
import { cosAdapter } from './cos';
import { arketAdapter } from './arket';
import { mangoAdapter } from './mango';
import { zalandoAdapter } from './zalando';
import { genericAdapter } from './generic';

// Order matters: more specific adapters first, generic last
const adapters: RetailerAdapter[] = [
  asosAdapter,
  cosAdapter,
  arketAdapter,
  mangoAdapter,
  zalandoAdapter,
  genericAdapter,
];

export function getAdapter(url: string): RetailerAdapter {
  for (const adapter of adapters) {
    if (adapter.canHandle(url)) return adapter;
  }
  // Should never reach here since genericAdapter always matches
  return genericAdapter;
}

export function inferRetailer(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace('www.', '');
    // Return up to the second-level domain
    const parts = hostname.split('.');
    return parts.slice(-2).join('.');
  } catch {
    return 'unknown';
  }
}
