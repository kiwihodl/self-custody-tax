/**
 * CSV Import Module
 *
 * Handles importing transactions from exchange CSV exports
 */

import { SupabaseClient } from "@supabase/supabase-js";
import type { Wallet } from "@/types";
import type { ParsedTransaction, ImportResult, ExchangeParser, SupportedExchange } from "./types";
import { amberParser } from "./parsers/amber";
import { coinbaseParser } from "./parsers/coinbase";
import { krakenParser } from "./parsers/kraken";
import { geminiParser } from "./parsers/gemini";
import { riverParser } from "./parsers/river";
import { swanParser } from "./parsers/swan";
import { fetchPrice } from "@/lib/prices/client";

// Register all parsers
const PARSERS: ExchangeParser[] = [amberParser, coinbaseParser, krakenParser, geminiParser, riverParser, swanParser];

/**
 * Parse CSV string into rows
 */
function parseCSV(csvContent: string): { headers: string[]; rows: string[][] } {
  const lines = csvContent.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) {
    throw new Error("CSV must have at least a header row and one data row");
  }

  // Parse header
  const headers = parseCSVLine(lines[0]);

  // Parse data rows
  const rows: string[][] = [];
  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]);
    if (row.length > 0) {
      rows.push(row);
    }
  }

  return { headers, rows };
}

/**
 * Parse a single CSV line, handling quoted fields
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

/**
 * Detect which exchange format the CSV is from
 */
export function detectExchange(csvContent: string): SupportedExchange | null {
  try {
    const { headers } = parseCSV(csvContent);

    for (const parser of PARSERS) {
      if (parser.detectFormat(headers)) {
        if (parser.name === "AmberApp") return "amber";
        if (parser.name === "Coinbase") return "coinbase";
        if (parser.name === "Kraken") return "kraken";
        if (parser.name === "Gemini") return "gemini";
        if (parser.name === "River") return "river";
        if (parser.name === "Swan Bitcoin") return "swan";
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Get parser for an exchange
 */
function getParser(exchange: SupportedExchange): ExchangeParser | null {
  switch (exchange) {
    case "amber":
      return amberParser;
    case "coinbase":
      return coinbaseParser;
    case "kraken":
      return krakenParser;
    case "gemini":
      return geminiParser;
    case "river":
      return riverParser;
    case "swan":
      return swanParser;
    default:
      return null;
  }
}

/**
 * Map parsed transaction type to database category
 */
function mapToCategory(type: ParsedTransaction["type"]): string {
  switch (type) {
    case "buy":
    case "receive":
      return "receive";
    case "sell":
    case "send":
      return "send";
    case "transfer":
      return "internal";
    case "fee":
      return "fee";
    default:
      return "receive";
  }
}

/**
 * Generate a unique txid for exchange transactions
 * Format: exchange-date-amount-random
 */
function generateExchangeTxid(exchange: string, tx: ParsedTransaction): string {
  const dateStr = tx.date.toISOString().slice(0, 10).replace(/-/g, "");
  const amountStr = tx.amount.replace(".", "");
  const random = Math.random().toString(36).slice(2, 8);
  return `${exchange}-${dateStr}-${tx.type}-${amountStr}-${random}`;
}

/**
 * Import transactions from CSV content
 */
export async function importCSV(
  supabase: SupabaseClient,
  wallet: Wallet,
  csvContent: string,
  exchange?: SupportedExchange
): Promise<ImportResult> {
  const result: ImportResult = {
    success: false,
    transactionsImported: 0,
    transactionsSkipped: 0,
    taxLotsCreated: 0,
    errors: [],
  };

  try {
    // Parse CSV
    const { headers, rows } = parseCSV(csvContent);

    // Detect or use specified exchange
    const detectedExchange = exchange || detectExchange(csvContent);
    if (!detectedExchange) {
      result.errors.push("Could not detect exchange format. Supported: AmberApp, Coinbase, Kraken, Gemini, River, Swan Bitcoin");
      return result;
    }

    const parser = getParser(detectedExchange);
    if (!parser) {
      result.errors.push(`No parser found for exchange: ${detectedExchange}`);
      return result;
    }

    // Parse transactions
    const parsedTransactions = parser.parse(rows, headers);
    console.log(`[Import] Parsed ${parsedTransactions.length} transactions from ${parser.name}`);

    if (parsedTransactions.length === 0) {
      result.errors.push("No valid transactions found in CSV");
      return result;
    }

    // Filter by asset - only import transactions matching wallet network
    const filteredTransactions = parsedTransactions.filter((tx) => {
      if (wallet.network === "bitcoin") {
        return tx.asset === "BTC";
      } else if (wallet.network === "ethereum") {
        return tx.asset === "USDT" || tx.asset === "USDC" || tx.asset === "ETH";
      }
      return false;
    });

    console.log(`[Import] ${filteredTransactions.length} transactions match wallet network`);

    // Get existing transaction IDs to avoid duplicates
    const { data: existingTxs } = await supabase
      .from("transactions")
      .select("txid")
      .eq("wallet_id", wallet.id);

    const existingTxids = new Set((existingTxs || []).map((t) => t.txid));

    // Process each transaction
    for (const tx of filteredTransactions) {
      try {
        // Generate unique txid for exchange transactions
        const txid = tx.txid || generateExchangeTxid(detectedExchange, tx);

        // Check for duplicates
        if (existingTxids.has(txid)) {
          result.transactionsSkipped++;
          continue;
        }

        const category = mapToCategory(tx.type);
        const blockTimestamp = tx.date.toISOString();

        // Get price at transaction time (use provided price or fetch)
        let priceUsd = tx.priceUsd;
        if (!priceUsd || priceUsd === 0) {
          priceUsd = (await fetchPrice(tx.asset, tx.date)) || 0;
        }

        // Calculate fee in USD
        let feeUsd = 0;
        if (parseFloat(tx.fee) > 0) {
          if (tx.feeAsset === "USD") {
            feeUsd = parseFloat(tx.fee);
          } else {
            // Fee is in crypto, convert to USD
            const feePrice = await fetchPrice(tx.feeAsset as "BTC" | "USDT" | "USDC", tx.date);
            feeUsd = parseFloat(tx.fee) * (feePrice || 0);
          }
        }

        // Insert transaction
        const { data: insertedTx, error: insertError } = await supabase
          .from("transactions")
          .insert({
            user_id: wallet.user_id,
            wallet_id: wallet.id,
            txid,
            network: wallet.network,
            block_height: null, // Exchange transactions don't have block height
            block_timestamp: blockTimestamp,
            amount: tx.amount,
            fee: tx.fee,
            fee_usd: feeUsd,
            category,
            is_internal_transfer: category === "internal",
            notes: tx.notes || `Imported from ${parser.name}`,
            // For Ethereum
            token_contract:
              tx.asset === "USDT"
                ? "0xdac17f958d2ee523a2206206994597c13d831ec7"
                : tx.asset === "USDC"
                ? "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"
                : undefined,
          })
          .select()
          .single();

        if (insertError) {
          console.error(`[Import] Failed to insert transaction:`, insertError.message);
          result.errors.push(`Failed to import transaction from ${tx.date.toISOString()}: ${insertError.message}`);
          continue;
        }

        result.transactionsImported++;
        existingTxids.add(txid);

        // Create tax lot for buy/receive transactions
        if ((category === "receive" || tx.type === "buy") && insertedTx) {
          const amount = parseFloat(tx.amount);
          const costBasisUsd = tx.valueUsd > 0 ? tx.valueUsd : amount * priceUsd;

          const { error: lotError } = await supabase.from("tax_lots").insert({
            user_id: wallet.user_id,
            wallet_id: wallet.id,
            transaction_id: insertedTx.id,
            asset: tx.asset,
            amount: tx.amount,
            txid,
            acquisition_date: blockTimestamp,
            acquisition_price_usd: priceUsd || (costBasisUsd / amount),
            cost_basis_usd: costBasisUsd,
            acquisition_type: "purchase",
            is_disposed: false,
          });

          if (lotError) {
            console.error(`[Import] Failed to create tax lot:`, lotError.message);
          } else {
            result.taxLotsCreated++;
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        result.errors.push(`Error processing transaction: ${message}`);
      }
    }

    result.success = result.transactionsImported > 0 || result.transactionsSkipped > 0;
    console.log(`[Import] Complete: ${result.transactionsImported} imported, ${result.transactionsSkipped} skipped`);

    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    result.errors.push(`Import failed: ${message}`);
    return result;
  }
}

// Export types and parsers
export type { ParsedTransaction, ImportResult, SupportedExchange };
export { amberParser, coinbaseParser, krakenParser, geminiParser, riverParser, swanParser };
