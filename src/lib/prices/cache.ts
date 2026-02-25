/**
 * Price cache service
 *
 * Caches historical prices in IndexedDB to avoid repeated API calls.
 * Falls back to CoinGecko when cache miss.
 */

import { db } from "@/lib/db";
import { fetchHistoricalPrice, parseStorageDate } from "./coingecko";

const STABLECOINS = new Set(["USDT", "USDC", "DAI", "BUSD", "TUSD", "USDP"]);

export interface CachedPrice {
  asset: string;
  date: string;
  price_usd: number;
  source: string;
}

export function formatDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function getPrice(
  asset: string,
  date: Date | string
): Promise<number | null> {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const dateStr = formatDate(dateObj);
  const assetUpper = asset.toUpperCase();

  if (STABLECOINS.has(assetUpper)) {
    return 1.0;
  }

  // Check cache
  const cached = await db.priceCache
    .where("[asset+date]")
    .equals([assetUpper, dateStr])
    .first();

  if (cached) {
    return cached.price_usd;
  }

  // Fetch from CoinGecko
  const price = await fetchHistoricalPrice(assetUpper, dateObj);
  if (!price) return null;

  // Store in cache
  await db.priceCache.put({
    asset: assetUpper,
    date: dateStr,
    price_usd: price.priceUsd,
    source: "coingecko",
    created_at: new Date().toISOString(),
  });

  return price.priceUsd;
}

export async function getPriceAtTimestamp(
  asset: string,
  timestamp: Date | string
): Promise<number | null> {
  const date = typeof timestamp === "string" ? new Date(timestamp) : timestamp;
  if (isNaN(date.getTime())) return null;
  return getPrice(asset, date);
}

export async function getPrices(
  asset: string,
  dates: Date[]
): Promise<Map<string, number>> {
  const assetUpper = asset.toUpperCase();
  const results = new Map<string, number>();
  const dateStrings = dates.map((d) => formatDate(d));

  if (STABLECOINS.has(assetUpper)) {
    for (const dateStr of dateStrings) results.set(dateStr, 1.0);
    return results;
  }

  // Batch check cache
  const cached = await db.priceCache
    .where("asset")
    .equals(assetUpper)
    .toArray();

  const cacheMap = new Map(cached.map((r) => [r.date, r.price_usd]));
  for (const dateStr of dateStrings) {
    const price = cacheMap.get(dateStr);
    if (price !== undefined) results.set(dateStr, price);
  }

  // Fetch missing
  const missing = dateStrings.filter((d) => !results.has(d));
  for (const dateStr of missing) {
    const date = parseStorageDate(dateStr);
    const price = await getPrice(assetUpper, date);
    if (price !== null) results.set(dateStr, price);
  }

  return results;
}

export async function getLatestCachedPrice(
  asset: string
): Promise<CachedPrice | null> {
  const results = await db.priceCache
    .where("asset")
    .equals(asset.toUpperCase())
    .reverse()
    .sortBy("date");

  return results.length > 0 ? results[0] : null;
}
