/**
 * AmberApp CSV Parser
 *
 * Parses CSV exports from AmberApp (Australian Bitcoin exchange)
 *
 * Expected format:
 * Date,Type,Asset,Amount,Fee,Fee Asset,Price,Value
 * 2024-01-15T10:30:00Z,buy,BTC,0.05,0.0001,BTC,42000.00,2100.00
 */

import type { ExchangeParser, ParsedTransaction } from "../types";

const AMBER_HEADERS = ["date", "type", "asset", "amount", "fee", "fee asset", "price", "value"];

export const amberParser: ExchangeParser = {
  name: "AmberApp",

  detectFormat: (headers: string[]): boolean => {
    const normalizedHeaders = headers.map((h) => h.toLowerCase().trim());
    // Check if at least 6 of the expected headers are present
    const matchCount = AMBER_HEADERS.filter((h) => normalizedHeaders.includes(h)).length;
    return matchCount >= 6;
  },

  parse: (rows: string[][], headers: string[]): ParsedTransaction[] => {
    const normalizedHeaders = headers.map((h) => h.toLowerCase().trim());
    const transactions: ParsedTransaction[] = [];

    // Find column indexes
    const dateIdx = normalizedHeaders.indexOf("date");
    const typeIdx = normalizedHeaders.indexOf("type");
    const assetIdx = normalizedHeaders.indexOf("asset");
    const amountIdx = normalizedHeaders.indexOf("amount");
    const feeIdx = normalizedHeaders.indexOf("fee");
    const feeAssetIdx = normalizedHeaders.indexOf("fee asset");
    const priceIdx = normalizedHeaders.indexOf("price");
    const valueIdx = normalizedHeaders.indexOf("value");

    for (const row of rows) {
      if (row.length < 6) continue;

      try {
        const dateStr = row[dateIdx]?.trim();
        const typeStr = row[typeIdx]?.trim().toLowerCase();
        const assetStr = row[assetIdx]?.trim().toUpperCase();
        const amountStr = row[amountIdx]?.trim();
        const feeStr = row[feeIdx]?.trim() || "0";
        const feeAssetStr = row[feeAssetIdx]?.trim() || assetStr;
        const priceStr = row[priceIdx]?.trim() || "0";
        const valueStr = row[valueIdx]?.trim() || "0";

        // Parse date
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
          console.warn(`Skipping row with invalid date: ${dateStr}`);
          continue;
        }

        // Map Amber types to our types
        let type: ParsedTransaction["type"];
        switch (typeStr) {
          case "buy":
          case "purchase":
            type = "buy";
            break;
          case "sell":
            type = "sell";
            break;
          case "send":
          case "withdrawal":
            type = "send";
            break;
          case "receive":
          case "deposit":
            type = "receive";
            break;
          case "transfer":
            type = "transfer";
            break;
          case "fee":
            type = "fee";
            break;
          default:
            console.warn(`Unknown transaction type: ${typeStr}, defaulting to receive`);
            type = "receive";
        }

        // Validate asset
        let asset: ParsedTransaction["asset"];
        if (assetStr === "BTC" || assetStr === "BITCOIN") {
          asset = "BTC";
        } else if (assetStr === "USDT" || assetStr === "TETHER") {
          asset = "USDT";
        } else if (assetStr === "USDC") {
          asset = "USDC";
        } else if (assetStr === "ETH" || assetStr === "ETHEREUM") {
          asset = "ETH";
        } else {
          console.warn(`Unsupported asset: ${assetStr}, skipping`);
          continue;
        }

        // Parse numbers
        const amount = parseFloat(amountStr);
        const fee = parseFloat(feeStr);
        const priceUsd = parseFloat(priceStr);
        const valueUsd = parseFloat(valueStr);

        if (isNaN(amount) || amount <= 0) {
          console.warn(`Skipping row with invalid amount: ${amountStr}`);
          continue;
        }

        transactions.push({
          date,
          type,
          asset,
          amount: amount.toString(),
          fee: fee.toString(),
          feeAsset: feeAssetStr,
          priceUsd: isNaN(priceUsd) ? 0 : priceUsd,
          valueUsd: isNaN(valueUsd) ? 0 : valueUsd,
        });
      } catch (err) {
        console.error("Error parsing Amber row:", err);
        continue;
      }
    }

    return transactions;
  },
};
