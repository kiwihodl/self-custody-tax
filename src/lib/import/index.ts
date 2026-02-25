/**
 * CSV Import Module — local-first (IndexedDB)
 */

import { db, type DBTransaction, type DBTaxLot } from "@/lib/db";
import type { ParsedTransaction, ImportResult, ExchangeParser, SupportedExchange } from "./types";
import { amberParser } from "./parsers/amber";
import { coinbaseParser } from "./parsers/coinbase";
import { krakenParser } from "./parsers/kraken";
import { geminiParser } from "./parsers/gemini";
import { riverParser } from "./parsers/river";
import { swanParser } from "./parsers/swan";
import { getPrice } from "@/lib/prices/cache";

const PARSERS: ExchangeParser[] = [amberParser, coinbaseParser, krakenParser, geminiParser, riverParser, swanParser];

function parseCSV(csvContent: string): { headers: string[]; rows: string[][] } {
  const lines = csvContent.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) throw new Error("CSV must have at least a header and one data row");
  const headers = parseCSVLine(lines[0]);
  const rows: string[][] = [];
  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]);
    if (row.length > 0) rows.push(row);
  }
  return { headers, rows };
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (c === "," && !inQuotes) { result.push(current.trim()); current = ""; }
    else current += c;
  }
  result.push(current.trim());
  return result;
}

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
  } catch { return null; }
}

function getParser(exchange: SupportedExchange): ExchangeParser | null {
  switch (exchange) {
    case "amber": return amberParser;
    case "coinbase": return coinbaseParser;
    case "kraken": return krakenParser;
    case "gemini": return geminiParser;
    case "river": return riverParser;
    case "swan": return swanParser;
    default: return null;
  }
}

function mapToCategory(type: ParsedTransaction["type"]): string {
  switch (type) {
    case "buy": case "receive": return "receive";
    case "sell": case "send": return "send";
    case "transfer": return "internal";
    case "fee": return "fee";
    default: return "receive";
  }
}

function generateExchangeTxid(exchange: string, tx: ParsedTransaction): string {
  const dateStr = tx.date.toISOString().slice(0, 10).replace(/-/g, "");
  const amountStr = tx.amount.replace(".", "");
  const random = Math.random().toString(36).slice(2, 8);
  return `${exchange}-${dateStr}-${tx.type}-${amountStr}-${random}`;
}

/**
 * Import transactions from CSV into a wallet
 */
export async function importCSV(
  walletId: number,
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
    const { headers, rows } = parseCSV(csvContent);
    const detectedExchange = exchange || detectExchange(csvContent);
    if (!detectedExchange) {
      result.errors.push("Could not detect exchange format. Supported: AmberApp, Coinbase, Kraken, Gemini, River, Swan Bitcoin");
      return result;
    }

    const parser = getParser(detectedExchange);
    if (!parser) { result.errors.push(`No parser for: ${detectedExchange}`); return result; }

    const parsedTransactions = parser.parse(rows, headers);
    if (parsedTransactions.length === 0) { result.errors.push("No valid transactions found"); return result; }

    // Bitcoin only
    const btcTxs = parsedTransactions.filter((tx) => tx.asset === "BTC");

    // Get existing txids
    const existingTxs = await db.transactions.where("wallet_id").equals(walletId).toArray();
    const existingTxids = new Set(existingTxs.map((t) => t.txid));

    const now = new Date().toISOString();

    for (const tx of btcTxs) {
      try {
        const txid = tx.txid || generateExchangeTxid(detectedExchange, tx);
        if (existingTxids.has(txid)) { result.transactionsSkipped++; continue; }

        const category = mapToCategory(tx.type);
        const blockTimestamp = tx.date.toISOString();

        let priceUsd = tx.priceUsd;
        if (!priceUsd || priceUsd === 0) {
          priceUsd = (await getPrice("BTC", tx.date)) || 0;
        }

        const txRecord: DBTransaction = {
          wallet_id: walletId,
          txid,
          network: "bitcoin",
          block_height: null,
          block_timestamp: blockTimestamp,
          inputs: "[]",
          outputs: "[]",
          amount: tx.amount,
          fee: tx.fee,
          fee_usd: 0,
          category,
          is_internal_transfer: category === "internal",
          notes: tx.notes || `Imported from ${parser.name}`,
          created_at: now,
          updated_at: now,
        };

        const insertedId = await db.transactions.add(txRecord);
        result.transactionsImported++;
        existingTxids.add(txid);

        // Create tax lot for buys/receives
        if (category === "receive" || tx.type === "buy") {
          const amount = parseFloat(tx.amount);
          const costBasisUsd = tx.valueUsd > 0 ? tx.valueUsd : amount * priceUsd;

          const lotRecord: DBTaxLot = {
            wallet_id: walletId,
            transaction_id: insertedId as number,
            asset: "BTC",
            amount: tx.amount,
            txid,
            acquisition_date: blockTimestamp,
            acquisition_price_usd: priceUsd || (amount > 0 ? costBasisUsd / amount : 0),
            cost_basis_usd: costBasisUsd,
            acquisition_type: "purchase",
            is_disposed: false,
            created_at: now,
            updated_at: now,
          };

          await db.taxLots.add(lotRecord);
          result.taxLotsCreated++;
        }
      } catch (err) {
        result.errors.push(`Error processing transaction: ${err instanceof Error ? err.message : "Unknown"}`);
      }
    }

    result.success = result.transactionsImported > 0 || result.transactionsSkipped > 0;
    return result;
  } catch (err) {
    result.errors.push(`Import failed: ${err instanceof Error ? err.message : "Unknown"}`);
    return result;
  }
}

export type { ParsedTransaction, ImportResult, SupportedExchange };
export { amberParser, coinbaseParser, krakenParser, geminiParser, riverParser, swanParser };
