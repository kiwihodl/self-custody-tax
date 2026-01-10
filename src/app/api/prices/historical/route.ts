/**
 * Server-side historical price fetching (avoids CORS with CoinGecko)
 *
 * POST /api/prices/historical
 * Body: { asset: string, date: string (YYYY-MM-DD) }
 * Returns: { priceUsd: number } or { error: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { fetchHistoricalPrice, parseStorageDate } from "@/lib/prices/coingecko";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { asset, date } = body;

    if (!asset || !date) {
      return NextResponse.json(
        { error: "Missing asset or date" },
        { status: 400 }
      );
    }

    // Parse date string (YYYY-MM-DD)
    const dateObj = parseStorageDate(date);

    const result = await fetchHistoricalPrice(asset, dateObj);

    if (!result) {
      return NextResponse.json(
        { error: "Price not available", priceUsd: null },
        { status: 200 }
      );
    }

    return NextResponse.json({
      priceUsd: result.priceUsd,
      date: result.date,
      source: result.source,
    });
  } catch (error) {
    console.error("[PriceAPI] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch price" },
      { status: 500 }
    );
  }
}
