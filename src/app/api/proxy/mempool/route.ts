/**
 * Proxy API route for mempool.space to avoid CORS issues in browser
 */

import { NextRequest, NextResponse } from "next/server";

const MEMPOOL_API = "https://mempool.space/api";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const path = searchParams.get("path");

  if (!path) {
    return NextResponse.json({ error: "Missing path parameter" }, { status: 400 });
  }

  // Validate path to prevent SSRF
  const allowedPaths = ["/address/", "/tx/"];
  const isAllowed = allowedPaths.some((allowed) => path.startsWith(allowed));
  if (!isAllowed) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  try {
    const response = await fetch(`${MEMPOOL_API}${path}`, {
      headers: {
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Mempool API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Mempool proxy error:", error);
    return NextResponse.json(
      { error: "Failed to fetch from mempool.space" },
      { status: 500 }
    );
  }
}
