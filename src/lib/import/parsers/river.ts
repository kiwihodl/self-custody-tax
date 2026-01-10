/**
 * River CSV Parser
 *
 * Parses CSV exports from River (US Bitcoin exchange)
 * Download from: Taxes & Documents → Download CSV
 *
 * Expected format:
 * Date,Type,Amount,Asset,Price (USD),Value (USD),Fee,Fee Asset,Notes
 * 2024-01-15T10:30:00-05:00,Buy,0.05,BTC,42000.00,2100.00,0.00,USD,
 */

import type { ExchangeParser, ParsedTransaction } from "../types";

export const riverParser: ExchangeParser = {
  name: "River",

  detectFormat: (headers: string[]): boolean => {
    const normalizedHeaders = headers.map((h) => h.toLowerCase().trim());
    // River-specific: has "price (usd)" or "value (usd)" headers
    const hasRiverStyle =
      normalizedHeaders.some((h) => h.includes("price") && h.includes("usd")) ||
      normalizedHeaders.some((h) => h.includes("value") && h.includes("usd"));

    // Also check for basic required columns
    const hasType = normalizedHeaders.includes("type");
    const hasAmount = normalizedHeaders.includes("amount");
    const hasAsset = normalizedHeaders.includes("asset");

    return hasRiverStyle && hasType && hasAmount && hasAsset;
  },

  parse: (rows: string[][], headers: string[]): ParsedTransaction[] => {
    const normalizedHeaders = headers.map((h) => h.toLowerCase().trim());
    const transactions: ParsedTransaction[] = [];

    // Find column indexes - River uses various header formats
    const dateIdx = normalizedHeaders.findIndex((h) => h === "date");
    const typeIdx = normalizedHeaders.findIndex((h) => h === "type");
    const amountIdx = normalizedHeaders.findIndex((h) => h === "amount");
    const assetIdx = normalizedHeaders.findIndex((h) => h === "asset");
    const priceIdx = normalizedHeaders.findIndex((h) => h.includes("price"));
    const valueIdx = normalizedHeaders.findIndex((h) => h.includes("value") && !h.includes("fee"));
    const feeIdx = normalizedHeaders.findIndex((h) => h === "fee");
    const feeAssetIdx = normalizedHeaders.findIndex(
      (h) => (h.includes("fee") && h.includes("asset")) || h === "fee currency"
    );
    const notesIdx = normalizedHeaders.findIndex((h) => h === "notes" || h === "description");

    for (const row of rows) {
      if (row.length < 4) continue;

      try {
        const dateStr = row[dateIdx]?.trim();
        const typeStr = row[typeIdx]?.trim().toLowerCase();
        const amountStr = row[amountIdx]?.trim().replace(/[,$]/g, "");
        const assetStr = row[assetIdx]?.trim().toUpperCase();
        const priceStr = priceIdx >= 0 ? row[priceIdx]?.trim().replace(/[,$]/g, "") : "0";
        const valueStr = valueIdx >= 0 ? row[valueIdx]?.trim().replace(/[,$]/g, "") : "0";
        const feeStr = feeIdx >= 0 ? row[feeIdx]?.trim().replace(/[,$]/g, "") : "0";
        const feeAssetStr = feeAssetIdx >= 0 ? row[feeAssetIdx]?.trim() : "USD";
        const notes = notesIdx >= 0 ? row[notesIdx]?.trim() : undefined;

        // Parse date
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
          console.warn(`[River] Skipping row with invalid date: ${dateStr}`);
          continue;
        }

        // Map River types to our types
        let type: ParsedTransaction["type"];
        if (typeStr.includes("buy") || typeStr.includes("purchase")) {
          type = "buy";
        } else if (typeStr.includes("sell")) {
          type = "sell";
        } else if (typeStr.includes("withdraw") || typeStr.includes("send")) {
          type = "send";
        } else if (typeStr.includes("deposit") || typeStr.includes("receive")) {
          type = "receive";
        } else if (typeStr.includes("transfer")) {
          type = "transfer";
        } else if (typeStr.includes("fee")) {
          type = "fee";
        } else {
          console.warn(`[River] Unknown transaction type: ${typeStr}, defaulting to receive`);
          type = "receive";
        }

        // Validate asset - River is Bitcoin-only
        let asset: ParsedTransaction["asset"];
        if (assetStr === "BTC" || assetStr === "BITCOIN" || assetStr === "SATS") {
          asset = "BTC";
        } else if (assetStr === "USD" || assetStr === "DOLLARS") {
          // Skip USD-only transactions (deposits/withdrawals of fiat)
          continue;
        } else {
          console.warn(`[River] Unsupported asset: ${assetStr}, skipping`);
          continue;
        }

        // Parse numbers
        let amount = parseFloat(amountStr);
        // River sometimes reports in sats
        if (assetStr === "SATS") {
          amount = amount / 100000000;
        }
        const fee = parseFloat(feeStr) || 0;
        const priceUsd = parseFloat(priceStr) || 0;
        const valueUsd = parseFloat(valueStr) || 0;

        if (isNaN(amount) || amount <= 0) {
          console.warn(`[River] Skipping row with invalid amount: ${amountStr}`);
          continue;
        }

        transactions.push({
          date,
          type,
          asset,
          amount: amount.toString(),
          fee: fee.toString(),
          feeAsset: feeAssetStr || "USD",
          priceUsd: isNaN(priceUsd) ? 0 : priceUsd,
          valueUsd: isNaN(valueUsd) ? 0 : valueUsd,
          notes: notes || undefined,
        });
      } catch (err) {
        console.error("[River] Error parsing row:", err);
        continue;
      }
    }

    return transactions;
  },
};
