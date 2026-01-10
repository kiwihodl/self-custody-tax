/**
 * Client-side price fetching via /api/prices endpoint
 *
 * Use this in browser/React components. It proxies to the server-side
 * price cache which handles CoinGecko API calls.
 */

export interface PriceResult {
  asset: string;
  date: string;
  price_usd: number;
  source: string;
}

/**
 * Format date to YYYY-MM-DD
 */
export function formatDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Fetch historical price via API
 */
export async function fetchPrice(asset: string, date: Date): Promise<number | null> {
  const dateStr = formatDate(date);

  try {
    const response = await fetch(
      `/api/prices?asset=${encodeURIComponent(asset)}&date=${encodeURIComponent(dateStr)}`
    );

    if (!response.ok) {
      console.warn(`[PriceClient] Failed to fetch ${asset} for ${dateStr}: HTTP ${response.status}`);
      return null;
    }

    const data: PriceResult = await response.json();
    return data.price_usd;
  } catch (error) {
    console.error(`[PriceClient] Error fetching ${asset} for ${dateStr}:`, error);
    return null;
  }
}

/**
 * Fetch price at a specific timestamp
 */
export async function fetchPriceAtTimestamp(
  asset: string,
  timestamp: Date | string
): Promise<number | null> {
  const date = typeof timestamp === "string" ? new Date(timestamp) : timestamp;

  if (isNaN(date.getTime())) {
    console.error(`[PriceClient] Invalid timestamp: ${timestamp}`);
    return null;
  }

  return fetchPrice(asset, date);
}

/**
 * Batch fetch prices for multiple dates
 *
 * Makes sequential requests with small delay to avoid rate limiting.
 */
export async function fetchPrices(
  asset: string,
  dates: Date[]
): Promise<Map<string, number>> {
  const results = new Map<string, number>();

  for (const date of dates) {
    const dateStr = formatDate(date);
    const price = await fetchPrice(asset, date);

    if (price !== null) {
      results.set(dateStr, price);
    }

    // Small delay between requests
    if (dates.indexOf(date) < dates.length - 1) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  return results;
}
