/**
 * CSV Import Types
 *
 * Common types for exchange CSV import functionality
 */

export interface ParsedTransaction {
  date: Date;
  type: "buy" | "sell" | "send" | "receive" | "transfer" | "fee";
  asset: "BTC" | "USDT" | "USDC" | "ETH";
  amount: string;
  fee: string;
  feeAsset: string;
  priceUsd: number;
  valueUsd: number;
  txid?: string;
  notes?: string;
}

export interface ImportResult {
  success: boolean;
  transactionsImported: number;
  transactionsSkipped: number;
  taxLotsCreated: number;
  errors: string[];
}

export interface ExchangeParser {
  name: string;
  detectFormat: (headers: string[]) => boolean;
  parse: (rows: string[][], headers: string[]) => ParsedTransaction[];
}

export type SupportedExchange = "amber" | "coinbase" | "kraken" | "gemini";
