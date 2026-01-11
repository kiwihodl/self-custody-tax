/**
 * Proxy API route for Etherscan to add API key server-side and avoid exposing it to client
 */

import { NextRequest, NextResponse } from "next/server";

const ETHERSCAN_API = "https://api.etherscan.io/api";

// Valid Etherscan modules and actions we allow
const ALLOWED_ACTIONS = [
  { module: "account", action: "tokenbalance" },
  { module: "account", action: "tokentx" },
];

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const apiModule = searchParams.get("module");
  const action = searchParams.get("action");

  if (!apiModule || !action) {
    return NextResponse.json(
      { error: "Missing module or action parameter" },
      { status: 400 }
    );
  }

  // Validate allowed module/action combinations (prevent abuse)
  const isAllowed = ALLOWED_ACTIONS.some(
    (allowed) => allowed.module === apiModule && allowed.action === action
  );
  if (!isAllowed) {
    return NextResponse.json(
      { error: "Action not allowed" },
      { status: 400 }
    );
  }

  // Build the Etherscan URL with all parameters
  const params = new URLSearchParams();
  searchParams.forEach((value, key) => {
    params.set(key, value);
  });

  // Add API key from environment
  const apiKey = process.env.ETHERSCAN_API_KEY;
  if (apiKey) {
    params.set("apikey", apiKey);
  }

  const url = `${ETHERSCAN_API}?${params.toString()}`;

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Etherscan API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Check for Etherscan-specific errors
    if (data.status === "0" && data.message !== "No transactions found") {
      console.error("Etherscan API error:", data.message, data.result);
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Etherscan proxy error:", error);
    return NextResponse.json(
      { error: "Failed to fetch from Etherscan" },
      { status: 500 }
    );
  }
}
