/**
 * Swan Bitcoin CSV Parser
 *
 * Parses CSV exports from Swan Bitcoin (US Bitcoin exchange)
 * Download from: Dashboard → Download Deposits and Purchases CSV
 * Or: Settings → Account Statement → CSV
 *
 * Expected format (Purchases):
 * Date,Transaction Type,Amount (BTC),Amount (USD),Price,Status
 * 2024-01-15,Purchase,0.05,2100.00,42000.00,Completed
 *
 * Alternative format (Account Statement):
 * Date,Type,BTC Amount,USD Amount,Price (USD/BTC),Status,Notes
 */

import type { ExchangeParser, ParsedTransaction } from "../types";

export const swanParser: ExchangeParser = {
  name: "Swan Bitcoin",

  detectFormat: (headers: string[]): boolean => {
    const normalizedHeaders = headers.map((h) => h.toLowerCase().trim());

    // Swan-specific: has "amount (btc)" or "btc amount" header
    const hasBtcAmount =
      normalizedHeaders.some((h) => h.includes("btc") && h.includes("amount")) ||
      normalizedHeaders.some((h) => h === "btc amount");

    // Also check for transaction type column
    const hasType =
      normalizedHeaders.includes("type") ||
      normalizedHeaders.includes("transaction type");

    // And date column
    const hasDate = normalizedHeaders.includes("date");

    return hasBtcAmount && hasType && hasDate;
  },

  parse: (rows: string[][], headers: string[]): ParsedTransaction[] => {
    const normalizedHeaders = headers.map((h) => h.toLowerCase().trim());
    const transactions: ParsedTransaction[] = [];

    // Find column indexes - Swan uses various header formats
    const dateIdx = normalizedHeaders.findIndex((h) => h === "date");
    const typeIdx = normalizedHeaders.findIndex(
      (h) => h === "type" || h === "transaction type"
    );
    const btcAmountIdx = normalizedHeaders.findIndex(
      (h) => (h.includes("btc") && h.includes("amount")) || h === "btc amount"
    );
    const usdAmountIdx = normalizedHeaders.findIndex(
      (h) => (h.includes("usd") && h.includes("amount")) || h === "usd amount"
    );
    const priceIdx = normalizedHeaders.findIndex((h) => h.includes("price"));
    const statusIdx = normalizedHeaders.findIndex((h) => h === "status");
    const notesIdx = normalizedHeaders.findIndex((h) => h === "notes" || h === "description");

    for (const row of rows) {
      if (row.length < 3) continue;

      try {
        const dateStr = row[dateIdx]?.trim();
        const typeStr = row[typeIdx]?.trim().toLowerCase();
        const btcAmountStr = btcAmountIdx >= 0 ? row[btcAmountIdx]?.trim().replace(/[,$]/g, "") : "0";
        const usdAmountStr = usdAmountIdx >= 0 ? row[usdAmountIdx]?.trim().replace(/[,$]/g, "") : "0";
        const priceStr = priceIdx >= 0 ? row[priceIdx]?.trim().replace(/[,$]/g, "") : "0";
        const status = statusIdx >= 0 ? row[statusIdx]?.trim().toLowerCase() : "completed";
        const notes = notesIdx >= 0 ? row[notesIdx]?.trim() : undefined;

        // Skip incomplete/pending transactions
        if (status && !["completed", "confirmed", "success"].includes(status)) {
          console.warn(`[Swan] Skipping ${status} transaction`);
          continue;
        }

        // Parse date - Swan uses various formats
        let date: Date;
        if (dateStr.includes("T")) {
          date = new Date(dateStr);
        } else if (dateStr.includes("/")) {
          // MM/DD/YYYY format
          const [month, day, year] = dateStr.split("/");
          date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        } else {
          // YYYY-MM-DD format
          date = new Date(dateStr);
        }

        if (isNaN(date.getTime())) {
          console.warn(`[Swan] Skipping row with invalid date: ${dateStr}`);
          continue;
        }

        // Map Swan types to our types
        let type: ParsedTransaction["type"];
        if (typeStr.includes("purchase") || typeStr.includes("buy")) {
          type = "buy";
        } else if (typeStr.includes("sell")) {
          type = "sell";
        } else if (typeStr.includes("withdraw")) {
          type = "send";
        } else if (typeStr.includes("deposit")) {
          type = "receive";
        } else if (typeStr.includes("transfer")) {
          type = "transfer";
        } else if (typeStr.includes("fee")) {
          type = "fee";
        } else if (typeStr.includes("recurring") || typeStr.includes("dca")) {
          // Recurring purchases are buys
          type = "buy";
        } else {
          // Default to buy for Swan (most common transaction type)
          type = "buy";
        }

        // Parse amounts
        const amount = parseFloat(btcAmountStr);
        const valueUsd = parseFloat(usdAmountStr) || 0;
        let priceUsd = parseFloat(priceStr) || 0;

        // Calculate price if not provided but we have value and amount
        if (priceUsd === 0 && valueUsd > 0 && amount > 0) {
          priceUsd = valueUsd / amount;
        }

        if (isNaN(amount) || amount <= 0) {
          console.warn(`[Swan] Skipping row with invalid BTC amount: ${btcAmountStr}`);
          continue;
        }

        transactions.push({
          date,
          type,
          asset: "BTC", // Swan is Bitcoin-only
          amount: amount.toString(),
          fee: "0", // Swan doesn't typically show fees in CSV
          feeAsset: "USD",
          priceUsd: isNaN(priceUsd) ? 0 : priceUsd,
          valueUsd: isNaN(valueUsd) ? 0 : valueUsd,
          notes: notes || undefined,
        });
      } catch (err) {
        console.error("[Swan] Error parsing row:", err);
        continue;
      }
    }

    return transactions;
  },
};
