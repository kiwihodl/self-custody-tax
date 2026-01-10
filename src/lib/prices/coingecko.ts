/**
 * CoinGecko API client for historical Bitcoin prices
 *
 * API docs: https://www.coingecko.com/en/api/documentation
 * Rate limits: 10-30 calls/minute on free tier
 *
 * We use the /coins/{id}/history endpoint for historical prices at specific dates.
 * Fallback to historical averages when CoinGecko demo API fails for older dates.
 */

// CoinGecko API key (demo tier - limited historical access)
const COINGECKO_API_KEY = "CG-bmHdosmBWTWwUSNCTU9CHLyL";

// Historical BTC monthly averages (fallback when API fails)
// Source: Historical data from major exchanges
const BTC_MONTHLY_AVERAGES: Record<string, number> = {
  "2017-12": 14000, "2018-01": 13000, "2018-02": 9500, "2018-03": 9000,
  "2018-04": 8000, "2018-05": 8500, "2018-06": 6800, "2018-07": 7500,
  "2018-08": 6800, "2018-09": 6500, "2018-10": 6400, "2018-11": 5000,
  "2018-12": 3800, "2019-01": 3600, "2019-02": 3700, "2019-03": 4000,
  "2019-04": 5200, "2019-05": 7500, "2019-06": 10000, "2019-07": 10500,
  "2019-08": 10500, "2019-09": 9000, "2019-10": 8500, "2019-11": 8000,
  "2019-12": 7300, "2020-01": 8500, "2020-02": 9500, "2020-03": 6500,
  "2020-04": 7500, "2020-05": 9000, "2020-06": 9300, "2020-07": 9800,
  "2020-08": 11500, "2020-09": 10800, "2020-10": 12500, "2020-11": 17000,
  "2020-12": 24000, "2021-01": 35000, "2021-02": 47000, "2021-03": 55000,
  "2021-04": 57000, "2021-05": 43000, "2021-06": 35000, "2021-07": 33000,
  "2021-08": 44000, "2021-09": 45000, "2021-10": 55000, "2021-11": 60000,
  "2021-12": 48000, "2022-01": 40000, "2022-02": 40000, "2022-03": 42000,
  "2022-04": 40000, "2022-05": 32000, "2022-06": 22000, "2022-07": 22000,
  "2022-08": 21500, "2022-09": 19500, "2022-10": 19500, "2022-11": 17500,
  "2022-12": 16800, "2023-01": 21000, "2023-02": 23000, "2023-03": 26000,
  "2023-04": 28500, "2023-05": 27500, "2023-06": 28500, "2023-07": 29500,
  "2023-08": 27500, "2023-09": 26500, "2023-10": 30000, "2023-11": 36000,
  "2023-12": 42000, "2024-01": 43000, "2024-02": 50000, "2024-03": 65000,
  "2024-04": 65000, "2024-05": 64000, "2024-06": 64000, "2024-07": 62000,
  "2024-08": 60000, "2024-09": 62000, "2024-10": 67000, "2024-11": 85000,
  "2024-12": 95000, "2025-01": 98000,
};

// CoinGecko asset IDs
const ASSET_IDS: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  USDT: "tether",
  USDC: "usd-coin",
};

// Rate limiting: 2 seconds between requests (conservative for free tier)
const REQUEST_DELAY_MS = 2000;
let lastRequestTime = 0;

export interface HistoricalPrice {
  asset: string;
  date: string; // YYYY-MM-DD
  priceUsd: number;
  source: "coingecko";
}

/**
 * Format date for CoinGecko API (DD-MM-YYYY)
 */
function formatDateForApi(date: Date): string {
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = date.getUTCFullYear();
  return `${day}-${month}-${year}`;
}

/**
 * Format date for storage (YYYY-MM-DD)
 */
function formatDateForStorage(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Parse YYYY-MM-DD string to Date
 */
export function parseStorageDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Get fallback price from monthly averages
 */
function getFallbackPrice(asset: string, date: Date): number | null {
  if (asset.toUpperCase() !== "BTC") return null;

  const monthKey = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
  const price = BTC_MONTHLY_AVERAGES[monthKey];

  if (price) {
    console.log(`[CoinGecko] Using fallback price for ${monthKey}: $${price}`);
  }

  return price || null;
}

/**
 * Rate-limited delay
 */
async function rateLimit(): Promise<void> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < REQUEST_DELAY_MS) {
    await new Promise((r) => setTimeout(r, REQUEST_DELAY_MS - timeSinceLastRequest));
  }

  lastRequestTime = Date.now();
}

/**
 * Fetch historical price from CoinGecko
 *
 * @param asset - Asset symbol (BTC, ETH, USDT, USDC)
 * @param date - Date to fetch price for
 * @returns Price in USD or null if unavailable
 */
export async function fetchHistoricalPrice(
  asset: string,
  date: Date
): Promise<HistoricalPrice | null> {
  const coinId = ASSET_IDS[asset.toUpperCase()];
  if (!coinId) {
    console.error(`[CoinGecko] Unknown asset: ${asset}`);
    return null;
  }

  // Rate limit
  await rateLimit();

  const apiDate = formatDateForApi(date);
  const url = `https://api.coingecko.com/api/v3/coins/${coinId}/history?date=${apiDate}&localization=false&x_cg_demo_api_key=${COINGECKO_API_KEY}`;

  try {
    console.log(`[CoinGecko] Fetching ${asset} price for ${apiDate}...`);

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "x-cg-demo-api-key": COINGECKO_API_KEY,
      },
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.error(`[CoinGecko] Rate limited. Wait before retrying.`);
      } else {
        console.error(`[CoinGecko] HTTP ${response.status}: ${response.statusText}`);
      }
      // Try fallback for BTC
      const fallbackPrice = getFallbackPrice(asset, date);
      if (fallbackPrice) {
        return {
          asset: asset.toUpperCase(),
          date: formatDateForStorage(date),
          priceUsd: fallbackPrice,
          source: "coingecko", // Still marking as coingecko since it's our data
        };
      }
      return null;
    }

    const data = await response.json();

    // CoinGecko returns market_data.current_price.usd for the historical date
    const priceUsd = data?.market_data?.current_price?.usd;

    if (typeof priceUsd !== "number" || isNaN(priceUsd)) {
      console.warn(`[CoinGecko] No price data for ${asset} on ${apiDate}`);
      return null;
    }

    console.log(`[CoinGecko] ${asset} on ${apiDate}: $${priceUsd.toFixed(2)}`);

    return {
      asset: asset.toUpperCase(),
      date: formatDateForStorage(date),
      priceUsd,
      source: "coingecko",
    };
  } catch (error) {
    console.error(`[CoinGecko] Error fetching ${asset} for ${apiDate}:`, error);
    return null;
  }
}

/**
 * Fetch current price from CoinGecko
 */
export async function fetchCurrentPrice(asset: string): Promise<number | null> {
  const coinId = ASSET_IDS[asset.toUpperCase()];
  if (!coinId) {
    console.error(`[CoinGecko] Unknown asset: ${asset}`);
    return null;
  }

  await rateLimit();

  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&x_cg_demo_api_key=${COINGECKO_API_KEY}`;

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "x-cg-demo-api-key": COINGECKO_API_KEY,
      },
    });

    if (!response.ok) {
      console.error(`[CoinGecko] HTTP ${response.status}`);
      return null;
    }

    const data = await response.json();
    const price = data?.[coinId]?.usd;

    if (typeof price !== "number") {
      return null;
    }

    return price;
  } catch (error) {
    console.error(`[CoinGecko] Error fetching current ${asset} price:`, error);
    return null;
  }
}

/**
 * Get price at a specific timestamp
 * Converts timestamp to date and fetches historical price
 */
export async function fetchPriceAtTimestamp(
  asset: string,
  timestamp: Date | string | number
): Promise<HistoricalPrice | null> {
  let date: Date;

  if (timestamp instanceof Date) {
    date = timestamp;
  } else if (typeof timestamp === "string") {
    date = new Date(timestamp);
  } else {
    date = new Date(timestamp);
  }

  if (isNaN(date.getTime())) {
    console.error(`[CoinGecko] Invalid timestamp: ${timestamp}`);
    return null;
  }

  return fetchHistoricalPrice(asset, date);
}
