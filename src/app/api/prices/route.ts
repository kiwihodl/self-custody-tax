/**
 * Price API endpoint
 *
 * GET /api/prices?asset=BTC&date=2024-01-15
 *   - Returns historical price for asset on date
 *   - Uses cache, falls back to CoinGecko
 *
 * GET /api/prices?asset=BTC
 *   - Returns most recent cached price (for approximate current value)
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPrice, getLatestCachedPrice } from "@/lib/prices";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const asset = searchParams.get("asset");
  const dateStr = searchParams.get("date");

  // Validate asset
  if (!asset) {
    return NextResponse.json(
      { error: "Missing required parameter: asset" },
      { status: 400 }
    );
  }

  const validAssets = ["BTC", "ETH", "USDT", "USDC"];
  if (!validAssets.includes(asset.toUpperCase())) {
    return NextResponse.json(
      { error: `Invalid asset. Must be one of: ${validAssets.join(", ")}` },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  // If no date provided, return most recent cached price
  if (!dateStr) {
    const cached = await getLatestCachedPrice(supabase, asset);

    if (!cached) {
      return NextResponse.json(
        { error: "No cached price available" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      asset: cached.asset,
      date: cached.date,
      price_usd: cached.price_usd,
      source: cached.source,
      is_current: false,
    });
  }

  // Validate date format (YYYY-MM-DD)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return NextResponse.json(
      { error: "Invalid date format. Use YYYY-MM-DD" },
      { status: 400 }
    );
  }

  const date = new Date(dateStr + "T00:00:00Z");
  if (isNaN(date.getTime())) {
    return NextResponse.json(
      { error: "Invalid date" },
      { status: 400 }
    );
  }

  // Don't allow future dates
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  if (date > today) {
    return NextResponse.json(
      { error: "Cannot fetch price for future date" },
      { status: 400 }
    );
  }

  try {
    const price = await getPrice(supabase, asset, date);

    if (price === null) {
      return NextResponse.json(
        { error: "Price not available for this date" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      asset: asset.toUpperCase(),
      date: dateStr,
      price_usd: price,
      source: "cache", // Could be cache or CoinGecko, but it's in cache now
    });
  } catch (error) {
    console.error("[PriceAPI] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch price" },
      { status: 500 }
    );
  }
}
