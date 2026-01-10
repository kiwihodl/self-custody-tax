/**
 * Gemini CSV Parser
 *
 * Parses CSV exports from Gemini exchange
 *
 * Expected format (Gemini Transaction History):
 * Date,Time (UTC),Type,Symbol,Specification,Liquidity Indicator,Trading Fee Rate (bps),USD Amount,Trading Fee (USD),USD Balance,BTC Amount,Trading Fee (BTC),BTC Balance
 * 2024-01-15,10:30:00,Buy,BTCUSD,,$42000.00,25,2100.00,5.25,10000.00,0.05,0.000125,1.25
 */

import type { ExchangeParser, ParsedTransaction } from "../types";

export const geminiParser: ExchangeParser = {
  name: "Gemini",

  detectFormat: (headers: string[]): boolean => {
    const normalizedHeaders = headers.map((h) => h.toLowerCase().trim());
    // Gemini has specific headers
    const hasSymbol = normalizedHeaders.includes("symbol");
    const hasLiquidity = normalizedHeaders.some((h) => h.includes("liquidity"));
    const hasTradingFee = normalizedHeaders.some((h) => h.includes("trading fee"));
    return hasSymbol && (hasLiquidity || hasTradingFee);
  },

  parse: (rows: string[][], headers: string[]): ParsedTransaction[] => {
    const normalizedHeaders = headers.map((h) => h.toLowerCase().trim());
    const transactions: ParsedTransaction[] = [];

    // Find column indexes
    const dateIdx = normalizedHeaders.indexOf("date");
    const timeIdx = normalizedHeaders.findIndex((h) => h.includes("time"));
    const typeIdx = normalizedHeaders.indexOf("type");
    const symbolIdx = normalizedHeaders.indexOf("symbol");
    const usdAmountIdx = normalizedHeaders.findIndex((h) => h === "usd amount");
    const tradingFeeUsdIdx = normalizedHeaders.findIndex((h) => h.includes("trading fee (usd)"));

    // Find crypto amount columns
    const btcAmountIdx = normalizedHeaders.findIndex((h) => h === "btc amount");
    const ethAmountIdx = normalizedHeaders.findIndex((h) => h === "eth amount");

    for (const row of rows) {
      if (row.length < 5) continue;

      try {
        const dateStr = row[dateIdx]?.trim();
        const timeStr = timeIdx >= 0 ? row[timeIdx]?.trim() : "00:00:00";
        const typeStr = row[typeIdx]?.trim().toLowerCase();
        const symbolStr = row[symbolIdx]?.trim().toUpperCase();
        const usdAmountStr = row[usdAmountIdx]?.trim().replace(/[$,]/g, "") || "0";
        const tradingFeeStr = tradingFeeUsdIdx >= 0 ? row[tradingFeeUsdIdx]?.trim().replace(/[$,]/g, "") : "0";

        // Parse date
        const dateTimeStr = `${dateStr} ${timeStr}`;
        const date = new Date(dateTimeStr);
        if (isNaN(date.getTime())) {
          // Try just the date
          const dateOnly = new Date(dateStr);
          if (isNaN(dateOnly.getTime())) {
            console.warn(`Skipping row with invalid date: ${dateStr}`);
            continue;
          }
        }

        // Determine asset from symbol (BTCUSD, ETHUSD, etc.)
        let asset: ParsedTransaction["asset"];
        let cryptoAmount = "0";

        if (symbolStr.includes("BTC")) {
          asset = "BTC";
          if (btcAmountIdx >= 0) {
            cryptoAmount = row[btcAmountIdx]?.trim().replace(/,/g, "") || "0";
          }
        } else if (symbolStr.includes("ETH")) {
          asset = "ETH";
          if (ethAmountIdx >= 0) {
            cryptoAmount = row[ethAmountIdx]?.trim().replace(/,/g, "") || "0";
          }
        } else if (symbolStr.includes("USDT")) {
          asset = "USDT";
          cryptoAmount = usdAmountStr; // For stablecoins, USD amount is the crypto amount
        } else if (symbolStr.includes("USDC")) {
          asset = "USDC";
          cryptoAmount = usdAmountStr;
        } else {
          // Skip unsupported assets
          continue;
        }

        // Map Gemini types
        let type: ParsedTransaction["type"];
        switch (typeStr) {
          case "buy":
            type = "buy";
            break;
          case "sell":
            type = "sell";
            break;
          case "deposit":
          case "credit":
            type = "receive";
            break;
          case "withdrawal":
          case "debit":
            type = "send";
            break;
          case "administrative credit":
          case "earn interest":
            type = "receive";
            break;
          default:
            // Skip other types
            continue;
        }

        const amount = parseFloat(cryptoAmount);
        if (isNaN(amount) || amount === 0) {
          // Try to calculate from USD if crypto amount not available
          const usdAmount = parseFloat(usdAmountStr);
          if (isNaN(usdAmount) || usdAmount === 0) {
            continue;
          }
        }

        const usdValue = parseFloat(usdAmountStr);
        const fee = parseFloat(tradingFeeStr);

        transactions.push({
          date: new Date(dateTimeStr),
          type,
          asset,
          amount: Math.abs(amount).toString(),
          fee: isNaN(fee) ? "0" : Math.abs(fee).toString(),
          feeAsset: "USD",
          priceUsd: amount !== 0 ? Math.abs(usdValue / amount) : 0,
          valueUsd: Math.abs(usdValue),
          notes: `Gemini ${typeStr}`,
        });
      } catch (err) {
        console.error("Error parsing Gemini row:", err);
        continue;
      }
    }

    return transactions;
  },
};
