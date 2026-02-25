/**
 * Client-side price fetching — wraps cache.ts for convenience
 */

import { getPrice, getPriceAtTimestamp as cacheGetPriceAtTimestamp, formatDate } from "./cache";

export { formatDate };

export async function fetchPrice(asset: string, date: Date): Promise<number | null> {
  return getPrice(asset, date);
}

export async function fetchPriceAtTimestamp(
  asset: string,
  timestamp: Date | string
): Promise<number | null> {
  return cacheGetPriceAtTimestamp(asset, timestamp);
}

export async function fetchPrices(
  asset: string,
  dates: Date[]
): Promise<Map<string, number>> {
  const results = new Map<string, number>();
  for (const date of dates) {
    const price = await getPrice(asset, date);
    if (price !== null) results.set(formatDate(date), price);
  }
  return results;
}
