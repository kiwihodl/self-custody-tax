/**
 * Coinbase CSV Parser
 *
 * Parses CSV exports from Coinbase
 *
 * Expected format (Coinbase Transaction History):
 * Timestamp,Transaction Type,Asset,Quantity Transacted,Spot Price Currency,Spot Price at Transaction,Subtotal,Total (inclusive of fees and/or spread),Fees and/or Spread,Notes
 * 2024-01-15T10:30:00Z,Buy,BTC,0.05,USD,42000.00,2100.00,2105.00,5.00,Bought 0.05 BTC
 */

import type { ExchangeParser, ParsedTransaction } from "../types";

// Coinbase expected headers (used for documentation)
// timestamp, transaction type, asset, quantity transacted, spot price

export const coinbaseParser: ExchangeParser = {
  name: "Coinbase",

  detectFormat: (headers: string[]): boolean => {
    const normalizedHeaders = headers.map((h) => h.toLowerCase().trim());
    // Check for Coinbase-specific headers
    const hasTimestamp = normalizedHeaders.includes("timestamp");
    const hasTransactionType = normalizedHeaders.includes("transaction type");
    const hasQuantity = normalizedHeaders.some((h) => h.includes("quantity"));
    return hasTimestamp && hasTransactionType && hasQuantity;
  },

  parse: (rows: string[][], headers: string[]): ParsedTransaction[] => {
    const normalizedHeaders = headers.map((h) => h.toLowerCase().trim());
    const transactions: ParsedTransaction[] = [];

    // Find column indexes
    const timestampIdx = normalizedHeaders.indexOf("timestamp");
    const typeIdx = normalizedHeaders.indexOf("transaction type");
    const assetIdx = normalizedHeaders.indexOf("asset");
    const quantityIdx = normalizedHeaders.findIndex((h) => h.includes("quantity"));
    const spotPriceIdx = normalizedHeaders.findIndex((h) => h.includes("spot price at"));
    const totalIdx = normalizedHeaders.findIndex((h) => h.includes("total"));
    const feeIdx = normalizedHeaders.findIndex((h) => h.includes("fee"));
    const notesIdx = normalizedHeaders.indexOf("notes");

    for (const row of rows) {
      if (row.length < 4) continue;

      try {
        const dateStr = row[timestampIdx]?.trim();
        const typeStr = row[typeIdx]?.trim().toLowerCase();
        const assetStr = row[assetIdx]?.trim().toUpperCase();
        const quantityStr = row[quantityIdx]?.trim();
        const spotPriceStr = spotPriceIdx >= 0 ? row[spotPriceIdx]?.trim() : "0";
        const totalStr = totalIdx >= 0 ? row[totalIdx]?.trim() : "0";
        const feeStr = feeIdx >= 0 ? row[feeIdx]?.trim() : "0";
        const notes = notesIdx >= 0 ? row[notesIdx]?.trim() : undefined;

        // Parse date
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
          console.warn(`Skipping row with invalid date: ${dateStr}`);
          continue;
        }

        // Map Coinbase types to our types
        let type: ParsedTransaction["type"];
        switch (typeStr) {
          case "buy":
            type = "buy";
            break;
          case "sell":
            type = "sell";
            break;
          case "send":
            type = "send";
            break;
          case "receive":
            type = "receive";
            break;
          case "convert":
            // Coinbase converts are sell + buy, treat as sell for simplicity
            type = "sell";
            break;
          case "learning reward":
          case "coinbase earn":
          case "rewards income":
            type = "receive";
            break;
          case "staking income":
            type = "receive";
            break;
          default:
            console.warn(`Unknown Coinbase transaction type: ${typeStr}`);
            continue;
        }

        // Validate and map asset
        let asset: ParsedTransaction["asset"];
        if (assetStr === "BTC" || assetStr === "BITCOIN") {
          asset = "BTC";
        } else if (assetStr === "USDT") {
          asset = "USDT";
        } else if (assetStr === "USDC") {
          asset = "USDC";
        } else if (assetStr === "ETH" || assetStr === "ETHEREUM") {
          asset = "ETH";
        } else {
          // Skip unsupported assets (we only track BTC and stablecoins)
          console.warn(`Unsupported asset: ${assetStr}, skipping`);
          continue;
        }

        // Parse numbers - handle possible currency formatting
        const quantity = parseFloat(quantityStr.replace(/[,$]/g, ""));
        const spotPrice = parseFloat(spotPriceStr.replace(/[,$]/g, ""));
        const total = parseFloat(totalStr.replace(/[,$]/g, ""));
        const fee = parseFloat(feeStr.replace(/[,$]/g, ""));

        if (isNaN(quantity) || quantity <= 0) {
          console.warn(`Skipping row with invalid quantity: ${quantityStr}`);
          continue;
        }

        transactions.push({
          date,
          type,
          asset,
          amount: Math.abs(quantity).toString(),
          fee: isNaN(fee) ? "0" : Math.abs(fee).toString(),
          feeAsset: "USD",
          priceUsd: isNaN(spotPrice) ? 0 : spotPrice,
          valueUsd: isNaN(total) ? 0 : Math.abs(total),
          notes,
        });
      } catch (err) {
        console.error("Error parsing Coinbase row:", err);
        continue;
      }
    }

    return transactions;
  },
};
