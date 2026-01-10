/**
 * Kraken CSV Parser
 *
 * Parses CSV exports from Kraken exchange
 *
 * Expected format (Kraken Ledger Export):
 * "txid","refid","time","type","subtype","aclass","asset","amount","fee","balance"
 * "ABCD-EFGH","IJKL-MNOP","2024-01-15 10:30:00","trade","","currency","XXBT","0.05","0.0001","1.25"
 *
 * Kraken uses XXBT for Bitcoin and ZUSD/USDT/USDC for stablecoins
 */

import type { ExchangeParser, ParsedTransaction } from "../types";

// Kraken asset code mappings
const KRAKEN_ASSET_MAP: Record<string, "BTC" | "USDT" | "USDC" | "ETH" | null> = {
  XXBT: "BTC",
  XBT: "BTC",
  BTC: "BTC",
  USDT: "USDT",
  USDC: "USDC",
  XETH: "ETH",
  ETH: "ETH",
};

export const krakenParser: ExchangeParser = {
  name: "Kraken",

  detectFormat: (headers: string[]): boolean => {
    const normalizedHeaders = headers.map((h) => h.toLowerCase().replace(/"/g, "").trim());
    // Kraken has specific headers
    const hasRefid = normalizedHeaders.includes("refid");
    const hasAclass = normalizedHeaders.includes("aclass");
    const hasType = normalizedHeaders.includes("type");
    return hasRefid && hasAclass && hasType;
  },

  parse: (rows: string[][], headers: string[]): ParsedTransaction[] => {
    const normalizedHeaders = headers.map((h) => h.toLowerCase().replace(/"/g, "").trim());
    const transactions: ParsedTransaction[] = [];

    // Find column indexes
    const txidIdx = normalizedHeaders.indexOf("txid");
    const timeIdx = normalizedHeaders.indexOf("time");
    const typeIdx = normalizedHeaders.indexOf("type");
    const subtypeIdx = normalizedHeaders.indexOf("subtype");
    const assetIdx = normalizedHeaders.indexOf("asset");
    const amountIdx = normalizedHeaders.indexOf("amount");
    const feeIdx = normalizedHeaders.indexOf("fee");

    for (const row of rows) {
      if (row.length < 6) continue;

      try {
        // Clean values (remove quotes)
        const clean = (val: string) => val?.replace(/"/g, "").trim() || "";

        const txid = clean(row[txidIdx]);
        const timeStr = clean(row[timeIdx]);
        const typeStr = clean(row[typeIdx]).toLowerCase();
        const subtypeStr = clean(row[subtypeIdx]).toLowerCase();
        const assetStr = clean(row[assetIdx]).toUpperCase();
        const amountStr = clean(row[amountIdx]);
        const feeStr = clean(row[feeIdx]);

        // Parse date (Kraken format: "2024-01-15 10:30:00")
        const date = new Date(timeStr);
        if (isNaN(date.getTime())) {
          console.warn(`Skipping row with invalid date: ${timeStr}`);
          continue;
        }

        // Map Kraken asset to our asset
        const asset = KRAKEN_ASSET_MAP[assetStr];
        if (!asset) {
          // Skip unsupported assets
          continue;
        }

        // Parse amount (can be negative for sells/withdrawals)
        const amount = parseFloat(amountStr);
        if (isNaN(amount) || amount === 0) {
          continue;
        }

        // Map Kraken types to our types
        let type: ParsedTransaction["type"];
        switch (typeStr) {
          case "trade":
            // Positive amount = buy, negative = sell
            type = amount > 0 ? "buy" : "sell";
            break;
          case "deposit":
            type = "receive";
            break;
          case "withdrawal":
            type = "send";
            break;
          case "transfer":
            type = "transfer";
            break;
          case "staking":
            // Staking rewards are income
            type = "receive";
            break;
          default:
            // Skip other types (margin, rollover, etc.)
            continue;
        }

        // Parse fee
        const fee = parseFloat(feeStr);

        transactions.push({
          date,
          type,
          asset,
          amount: Math.abs(amount).toString(),
          fee: isNaN(fee) ? "0" : Math.abs(fee).toString(),
          feeAsset: assetStr,
          priceUsd: 0, // Kraken doesn't include price in ledger export
          valueUsd: 0,
          txid: txid || undefined,
          notes: subtypeStr ? `Kraken ${typeStr} (${subtypeStr})` : `Kraken ${typeStr}`,
        });
      } catch (err) {
        console.error("Error parsing Kraken row:", err);
        continue;
      }
    }

    return transactions;
  },
};
