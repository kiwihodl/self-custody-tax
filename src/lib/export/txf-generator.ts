/**
 * TXF (Tax eXchange Format) Generator for TurboTax Desktop
 *
 * TXF is a standardized format for importing financial data into tax software.
 * This generates Form 8949-compatible capital gains/losses data.
 *
 * Reference: https://ttlc.intuit.com/turbotax-support/en-us/help-article/import-export-data-files/import-txf-file/L47YK56cd_US_en_US
 */

export interface TxfTransaction {
  description: string; // e.g., "0.5 BTC"
  acquisitionDate: Date;
  disposalDate: Date;
  proceeds: number;
  costBasis: number;
  gainLoss: number;
  isLongTerm: boolean;
  txid?: string; // For reference in description
}

export interface TxfExportOptions {
  year: number;
  method: "FIFO" | "LIFO" | "HIFO";
  transactions: TxfTransaction[];
  useSummaryMode?: boolean; // For >4,000 transactions
}

export interface TxfExportResult {
  content: string;
  filename: string;
  transactionCount: number;
  isSummary: boolean;
  warnings: string[];
}

// TXF record codes for Schedule D / Form 8949
const TXF_CODES = {
  HEADER: "V042", // TXF version
  SHORT_TERM_COVERED: "321", // Form 8949 Box A (short-term, basis reported to IRS)
  SHORT_TERM_NOT_COVERED: "711", // Form 8949 Box B (short-term, basis NOT reported)
  LONG_TERM_COVERED: "323", // Form 8949 Box D (long-term, basis reported to IRS)
  LONG_TERM_NOT_COVERED: "713", // Form 8949 Box E (long-term, basis NOT reported)
};

// Maximum transactions before TurboTax requires summary mode
const MAX_INDIVIDUAL_TRANSACTIONS = 4000;

/**
 * Format date as YYYYMMDD for TXF
 */
function formatTxfDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

/**
 * Format currency value for TXF (no currency symbol, 2 decimal places)
 */
function formatTxfAmount(amount: number): string {
  return amount.toFixed(2);
}

/**
 * Generate TXF content for individual transactions
 */
function generateIndividualTxf(transactions: TxfTransaction[]): string {
  const lines: string[] = [];

  // TXF Header
  lines.push("V042"); // TXF version
  lines.push(`ASelf Custody Tax`); // Software name
  lines.push(`D${formatTxfDate(new Date())}`); // Export date
  lines.push("^"); // End of header

  // Group transactions by type (short-term vs long-term, covered vs not covered)
  // Crypto is typically "not covered" as exchanges don't always report basis to IRS
  const shortTerm = transactions.filter((t) => !t.isLongTerm);
  const longTerm = transactions.filter((t) => t.isLongTerm);

  // Short-term transactions (Form 8949 Box B - basis not reported to IRS)
  shortTerm.forEach((tx) => {
    lines.push(`TD`); // Transaction delimiter
    lines.push(`N${TXF_CODES.SHORT_TERM_NOT_COVERED}`); // Record code
    lines.push(`C1`); // Copy number
    lines.push(`L1`); // Line number
    lines.push(`P${tx.description}`); // Description
    lines.push(`D${formatTxfDate(tx.acquisitionDate)}`); // Date acquired
    lines.push(`D${formatTxfDate(tx.disposalDate)}`); // Date sold
    lines.push(`$${formatTxfAmount(tx.proceeds)}`); // Sales proceeds
    lines.push(`$${formatTxfAmount(tx.costBasis)}`); // Cost basis
    lines.push("^"); // End of record
  });

  // Long-term transactions (Form 8949 Box E - basis not reported to IRS)
  longTerm.forEach((tx) => {
    lines.push(`TD`); // Transaction delimiter
    lines.push(`N${TXF_CODES.LONG_TERM_NOT_COVERED}`); // Record code
    lines.push(`C1`); // Copy number
    lines.push(`L1`); // Line number
    lines.push(`P${tx.description}`); // Description
    lines.push(`D${formatTxfDate(tx.acquisitionDate)}`); // Date acquired
    lines.push(`D${formatTxfDate(tx.disposalDate)}`); // Date sold
    lines.push(`$${formatTxfAmount(tx.proceeds)}`); // Sales proceeds
    lines.push(`$${formatTxfAmount(tx.costBasis)}`); // Cost basis
    lines.push("^"); // End of record
  });

  return lines.join("\n");
}

/**
 * Generate summary TXF for >4,000 transactions
 */
function generateSummaryTxf(transactions: TxfTransaction[]): string {
  const lines: string[] = [];

  // TXF Header
  lines.push("V042");
  lines.push(`ASelf Custody Tax`);
  lines.push(`D${formatTxfDate(new Date())}`);
  lines.push("^");

  // Calculate summary totals
  const shortTerm = transactions.filter((t) => !t.isLongTerm);
  const longTerm = transactions.filter((t) => t.isLongTerm);

  const shortTermProceeds = shortTerm.reduce((sum, t) => sum + t.proceeds, 0);
  const shortTermBasis = shortTerm.reduce((sum, t) => sum + t.costBasis, 0);
  const longTermProceeds = longTerm.reduce((sum, t) => sum + t.proceeds, 0);
  const longTermBasis = longTerm.reduce((sum, t) => sum + t.costBasis, 0);

  // Short-term summary
  if (shortTerm.length > 0) {
    lines.push(`TD`);
    lines.push(`N${TXF_CODES.SHORT_TERM_NOT_COVERED}`);
    lines.push(`C1`);
    lines.push(`L1`);
    lines.push(`PBitcoin - Short-term (${shortTerm.length} transactions)`);
    lines.push(`DVARIOUS`); // Multiple dates
    lines.push(`DVARIOUS`);
    lines.push(`$${formatTxfAmount(shortTermProceeds)}`);
    lines.push(`$${formatTxfAmount(shortTermBasis)}`);
    lines.push("^");
  }

  // Long-term summary
  if (longTerm.length > 0) {
    lines.push(`TD`);
    lines.push(`N${TXF_CODES.LONG_TERM_NOT_COVERED}`);
    lines.push(`C1`);
    lines.push(`L1`);
    lines.push(`PBitcoin - Long-term (${longTerm.length} transactions)`);
    lines.push(`DVARIOUS`);
    lines.push(`DVARIOUS`);
    lines.push(`$${formatTxfAmount(longTermProceeds)}`);
    lines.push(`$${formatTxfAmount(longTermBasis)}`);
    lines.push("^");
  }

  return lines.join("\n");
}

/**
 * Generate TXF export for TurboTax Desktop
 */
export function generateTxfExport(options: TxfExportOptions): TxfExportResult {
  const { year, method, transactions, useSummaryMode } = options;
  const warnings: string[] = [];

  // Check if summary mode is needed
  const needsSummary =
    useSummaryMode || transactions.length > MAX_INDIVIDUAL_TRANSACTIONS;

  if (transactions.length > MAX_INDIVIDUAL_TRANSACTIONS && !useSummaryMode) {
    warnings.push(
      `Transaction count (${transactions.length}) exceeds TurboTax limit of ${MAX_INDIVIDUAL_TRANSACTIONS}. Using summary mode.`
    );
  }

  // Generate content
  const content = needsSummary
    ? generateSummaryTxf(transactions)
    : generateIndividualTxf(transactions);

  // Generate filename
  const timestamp = new Date().toISOString().split("T")[0];
  const filename = `crypto-tax-${year}-${method.toLowerCase()}-${timestamp}.txf`;

  return {
    content,
    filename,
    transactionCount: transactions.length,
    isSummary: needsSummary,
    warnings,
  };
}

/**
 * Validate TXF content for common issues
 */
export function validateTxfContent(content: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const lines = content.split("\n");

  // Check header
  if (!lines[0]?.startsWith("V0")) {
    errors.push("Missing or invalid TXF version header");
  }

  // Check for at least one transaction
  const hasTransactions = lines.some((line) => line.startsWith("TD"));
  if (!hasTransactions) {
    errors.push("No transactions found in TXF content");
  }

  // Check record terminators
  const tdCount = lines.filter((line) => line === "TD").length;
  const caretCount = lines.filter((line) => line === "^").length;

  // Each transaction should have a ^ terminator, plus header has one
  if (caretCount < tdCount + 1) {
    errors.push("Missing record terminators (^)");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Parse disposed tax lots into TXF transactions
 */
export function convertLotsToTxfTransactions(
  lots: Array<{
    amount: string;
    asset: string;
    acquisition_date: string;
    disposal_date: string;
    proceeds_usd: number;
    cost_basis_usd: number;
    gain_loss_usd: number;
    is_long_term: boolean;
    txid?: string;
  }>
): TxfTransaction[] {
  return lots.map((lot) => ({
    description: `${parseFloat(lot.amount).toFixed(8)} ${lot.asset}${lot.txid ? ` (${lot.txid.slice(0, 8)}...)` : ""}`,
    acquisitionDate: new Date(lot.acquisition_date),
    disposalDate: new Date(lot.disposal_date),
    proceeds: lot.proceeds_usd,
    costBasis: lot.cost_basis_usd,
    gainLoss: lot.gain_loss_usd,
    isLongTerm: lot.is_long_term,
    txid: lot.txid,
  }));
}
