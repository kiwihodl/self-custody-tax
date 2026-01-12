import {
  generateTxfExport,
  validateTxfContent,
  convertLotsToTxfTransactions,
  TxfTransaction,
} from "../txf-generator";

describe("TXF Generator", () => {
  describe("generateTxfExport", () => {
    it("generates valid TXF content for individual transactions", () => {
      const transactions: TxfTransaction[] = [
        {
          description: "0.5 BTC",
          acquisitionDate: new Date("2024-01-15"),
          disposalDate: new Date("2024-06-20"),
          proceeds: 25000,
          costBasis: 20000,
          gainLoss: 5000,
          isLongTerm: false,
        },
        {
          description: "1.0 BTC",
          acquisitionDate: new Date("2023-01-10"),
          disposalDate: new Date("2024-06-25"),
          proceeds: 60000,
          costBasis: 40000,
          gainLoss: 20000,
          isLongTerm: true,
        },
      ];

      const result = generateTxfExport({
        year: 2024,
        method: "FIFO",
        transactions,
      });

      expect(result.content).toContain("V042"); // Version header
      expect(result.content).toContain("ASelf Custody Tax"); // Software name
      expect(result.content).toContain("TD"); // Transaction delimiter
      expect(result.content).toContain("0.5 BTC"); // Description
      expect(result.content).toContain("1.0 BTC"); // Description
      expect(result.filename).toMatch(/crypto-tax-2024-fifo-.*\.txf/);
      expect(result.transactionCount).toBe(2);
      expect(result.isSummary).toBe(false);
      expect(result.warnings).toHaveLength(0);
    });

    it("generates summary TXF when useSummaryMode is true", () => {
      const transactions: TxfTransaction[] = [
        {
          description: "0.1 BTC",
          acquisitionDate: new Date("2024-01-01"),
          disposalDate: new Date("2024-06-01"),
          proceeds: 5000,
          costBasis: 4000,
          gainLoss: 1000,
          isLongTerm: false,
        },
      ];

      const result = generateTxfExport({
        year: 2024,
        method: "LIFO",
        transactions,
        useSummaryMode: true,
      });

      expect(result.isSummary).toBe(true);
      expect(result.content).toContain("VARIOUS"); // Summary uses VARIOUS for dates
      expect(result.content).toContain("1 transactions");
    });

    it("handles empty transactions array", () => {
      const result = generateTxfExport({
        year: 2024,
        method: "FIFO",
        transactions: [],
      });

      expect(result.content).toContain("V042");
      expect(result.transactionCount).toBe(0);
      expect(result.isSummary).toBe(false);
    });

    it("separates short-term and long-term transactions", () => {
      const transactions: TxfTransaction[] = [
        {
          description: "Short-term BTC",
          acquisitionDate: new Date("2024-03-01"),
          disposalDate: new Date("2024-06-01"),
          proceeds: 10000,
          costBasis: 8000,
          gainLoss: 2000,
          isLongTerm: false,
        },
        {
          description: "Long-term BTC",
          acquisitionDate: new Date("2023-01-01"),
          disposalDate: new Date("2024-06-01"),
          proceeds: 20000,
          costBasis: 10000,
          gainLoss: 10000,
          isLongTerm: true,
        },
      ];

      const result = generateTxfExport({
        year: 2024,
        method: "FIFO",
        transactions,
      });

      // Check for both record codes
      expect(result.content).toContain("N711"); // Short-term not covered
      expect(result.content).toContain("N713"); // Long-term not covered
    });
  });

  describe("validateTxfContent", () => {
    it("validates correct TXF content", () => {
      const content = `V042
ASelf Custody Tax
D20240620
^
TD
N711
C1
L1
P0.5 BTC
D20240115
D20240620
$25000.00
$20000.00
^`;

      const result = validateTxfContent(content);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("detects missing version header", () => {
      const content = `ASelf Custody Tax
D20240620
^`;

      const result = validateTxfContent(content);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Missing or invalid TXF version header");
    });

    it("detects missing transactions", () => {
      const content = `V042
ASelf Custody Tax
D20240620
^`;

      const result = validateTxfContent(content);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("No transactions found in TXF content");
    });
  });

  describe("convertLotsToTxfTransactions", () => {
    it("converts tax lots to TXF transactions", () => {
      const lots = [
        {
          amount: "0.50000000",
          asset: "BTC",
          acquisition_date: "2024-01-15",
          disposal_date: "2024-06-20",
          proceeds_usd: 25000,
          cost_basis_usd: 20000,
          gain_loss_usd: 5000,
          is_long_term: false,
          txid: "abc123def456",
        },
      ];

      const transactions = convertLotsToTxfTransactions(lots);

      expect(transactions).toHaveLength(1);
      expect(transactions[0].description).toBe("0.50000000 BTC (abc123de...)");
      expect(transactions[0].proceeds).toBe(25000);
      expect(transactions[0].costBasis).toBe(20000);
      expect(transactions[0].gainLoss).toBe(5000);
      expect(transactions[0].isLongTerm).toBe(false);
    });

    it("handles lots without txid", () => {
      const lots = [
        {
          amount: "1.00000000",
          asset: "BTC",
          acquisition_date: "2023-01-10",
          disposal_date: "2024-06-25",
          proceeds_usd: 60000,
          cost_basis_usd: 40000,
          gain_loss_usd: 20000,
          is_long_term: true,
        },
      ];

      const transactions = convertLotsToTxfTransactions(lots);

      expect(transactions).toHaveLength(1);
      expect(transactions[0].description).toBe("1.00000000 BTC");
      expect(transactions[0].txid).toBeUndefined();
    });

    it("converts dates correctly", () => {
      const lots = [
        {
          amount: "0.10000000",
          asset: "BTC",
          acquisition_date: "2024-03-15T12:00:00Z",
          disposal_date: "2024-12-25T12:00:00Z",
          proceeds_usd: 10000,
          cost_basis_usd: 8000,
          gain_loss_usd: 2000,
          is_long_term: false,
        },
      ];

      const transactions = convertLotsToTxfTransactions(lots);

      // Use UTC methods to avoid timezone issues
      expect(transactions[0].acquisitionDate.getUTCFullYear()).toBe(2024);
      expect(transactions[0].acquisitionDate.getUTCMonth()).toBe(2); // March is 2
      expect(transactions[0].acquisitionDate.getUTCDate()).toBe(15);
      expect(transactions[0].disposalDate.getUTCMonth()).toBe(11); // December is 11
      expect(transactions[0].disposalDate.getUTCDate()).toBe(25);
    });
  });
});
