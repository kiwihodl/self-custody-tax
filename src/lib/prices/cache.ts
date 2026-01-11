/**
 * Price cache service
 *
 * Caches historical prices in Supabase to avoid repeated API calls.
 * Falls back to CoinGecko when cache miss.
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { fetchHistoricalPrice, parseStorageDate } from "./coingecko";

// Stablecoins that are pegged to USD - no API lookup needed
const STABLECOINS = new Set(["USDT", "USDC", "DAI", "BUSD", "TUSD", "USDP"]);

export interface CachedPrice {
  asset: string;
  date: string; // YYYY-MM-DD
  price_usd: number;
  source: string;
}

/**
 * Format a Date to YYYY-MM-DD string
 */
export function formatDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Get price from cache or fetch from CoinGecko
 *
 * @param supabase - Supabase client
 * @param asset - Asset symbol (BTC, ETH, etc.)
 * @param date - Date to get price for
 * @returns Price in USD or null
 */
export async function getPrice(
  supabase: SupabaseClient,
  asset: string,
  date: Date | string
): Promise<number | null> {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const dateStr = formatDate(dateObj);
  const assetUpper = asset.toUpperCase();

  // Stablecoins are pegged to USD - return 1.0 without API call
  if (STABLECOINS.has(assetUpper)) {
    console.log(`[PriceCache] Stablecoin ${assetUpper}: $1.00`);
    return 1.0;
  }

  // Check cache first
  const { data: cached, error: cacheError } = await supabase
    .from("price_cache")
    .select("price_usd")
    .eq("asset", assetUpper)
    .eq("date", dateStr)
    .single();

  if (!cacheError && cached) {
    console.log(`[PriceCache] Cache hit: ${assetUpper} on ${dateStr} = $${cached.price_usd}`);
    return cached.price_usd;
  }

  // Cache miss - fetch from CoinGecko
  console.log(`[PriceCache] Cache miss: ${assetUpper} on ${dateStr}, fetching...`);

  const price = await fetchHistoricalPrice(assetUpper, dateObj);

  if (!price) {
    console.warn(`[PriceCache] Failed to fetch ${assetUpper} for ${dateStr}`);
    return null;
  }

  // Store in cache
  const { error: insertError } = await supabase.from("price_cache").upsert(
    {
      asset: assetUpper,
      date: dateStr,
      price_usd: price.priceUsd,
      source: "coingecko",
    },
    { onConflict: "asset,date" }
  );

  if (insertError) {
    console.warn(`[PriceCache] Failed to cache price:`, insertError.message);
  } else {
    console.log(`[PriceCache] Cached: ${assetUpper} on ${dateStr} = $${price.priceUsd}`);
  }

  return price.priceUsd;
}

/**
 * Get price at a specific timestamp (converts to date)
 */
export async function getPriceAtTimestamp(
  supabase: SupabaseClient,
  asset: string,
  timestamp: Date | string
): Promise<number | null> {
  const date = typeof timestamp === "string" ? new Date(timestamp) : timestamp;

  if (isNaN(date.getTime())) {
    console.error(`[PriceCache] Invalid timestamp: ${timestamp}`);
    return null;
  }

  return getPrice(supabase, asset, date);
}

/**
 * Batch fetch multiple prices
 *
 * Checks cache for all dates first, then fetches missing ones.
 * Returns map of date -> price
 */
export async function getPrices(
  supabase: SupabaseClient,
  asset: string,
  dates: Date[]
): Promise<Map<string, number>> {
  const assetUpper = asset.toUpperCase();
  const results = new Map<string, number>();
  const dateStrings = dates.map((d) => formatDate(d));

  // Stablecoins are pegged to USD - return 1.0 for all dates
  if (STABLECOINS.has(assetUpper)) {
    console.log(`[PriceCache] Stablecoin ${assetUpper}: $1.00 for ${dates.length} dates`);
    for (const dateStr of dateStrings) {
      results.set(dateStr, 1.0);
    }
    return results;
  }

  // Fetch all cached prices at once
  const { data: cached, error } = await supabase
    .from("price_cache")
    .select("date, price_usd")
    .eq("asset", assetUpper)
    .in("date", dateStrings);

  if (!error && cached) {
    for (const row of cached) {
      results.set(row.date, row.price_usd);
    }
    console.log(`[PriceCache] Batch cache: ${cached.length}/${dates.length} hits`);
  }

  // Find missing dates
  const missing = dateStrings.filter((d) => !results.has(d));

  if (missing.length === 0) {
    return results;
  }

  console.log(`[PriceCache] Fetching ${missing.length} missing prices...`);

  // Fetch missing prices one by one (rate limited in coingecko.ts)
  for (const dateStr of missing) {
    const date = parseStorageDate(dateStr);
    const price = await getPrice(supabase, assetUpper, date);

    if (price !== null) {
      results.set(dateStr, price);
    }
  }

  return results;
}

/**
 * Pre-populate cache for a date range
 *
 * Useful for backfilling historical data.
 */
export async function populateCacheForRange(
  supabase: SupabaseClient,
  asset: string,
  startDate: Date,
  endDate: Date
): Promise<{ fetched: number; failed: number }> {
  const assetUpper = asset.toUpperCase();
  const dates: Date[] = [];

  // Generate all dates in range
  const current = new Date(startDate);
  while (current <= endDate) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  console.log(`[PriceCache] Populating ${assetUpper} from ${formatDate(startDate)} to ${formatDate(endDate)} (${dates.length} days)`);

  // Check which ones are already cached
  const dateStrings = dates.map((d) => formatDate(d));
  const { data: existing } = await supabase
    .from("price_cache")
    .select("date")
    .eq("asset", assetUpper)
    .in("date", dateStrings);

  const existingDates = new Set((existing || []).map((r) => r.date));
  const missing = dates.filter((d) => !existingDates.has(formatDate(d)));

  console.log(`[PriceCache] ${existingDates.size} already cached, ${missing.length} to fetch`);

  let fetched = 0;
  let failed = 0;

  for (const date of missing) {
    const price = await fetchHistoricalPrice(assetUpper, date);

    if (price) {
      const { error } = await supabase.from("price_cache").upsert(
        {
          asset: assetUpper,
          date: price.date,
          price_usd: price.priceUsd,
          source: "coingecko",
        },
        { onConflict: "asset,date" }
      );

      if (!error) {
        fetched++;
      } else {
        failed++;
      }
    } else {
      failed++;
    }
  }

  console.log(`[PriceCache] Populate complete: ${fetched} fetched, ${failed} failed`);
  return { fetched, failed };
}

/**
 * Get the most recent cached price for an asset
 *
 * Useful for approximate current value when CoinGecko is rate limited.
 */
export async function getLatestCachedPrice(
  supabase: SupabaseClient,
  asset: string
): Promise<CachedPrice | null> {
  const { data, error } = await supabase
    .from("price_cache")
    .select("*")
    .eq("asset", asset.toUpperCase())
    .order("date", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return null;
  }

  return data as CachedPrice;
}
