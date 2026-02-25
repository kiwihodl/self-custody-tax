/**
 * Integration test: Full flow with real xpub
 * Tests: DB creation, wallet add, price cache, tax lot creation, export
 */

import { describe, test, expect, beforeEach, afterAll } from "vitest";
// Mock IndexedDB for Node.js test environment
import "fake-indexeddb/auto";

import { db, exportAllData, importAllData, clearAllData } from "../db";
import { createTaxLotsForWallet, processAllWallets, getUndisposedLots } from "../tax/lots";
import { getTaxSummary, getDisposedLots, formatAs8949CSV } from "../tax/reporting";
import { detectInternalTransfers } from "../bitcoin/internalTransfers";

// Known test xpub (Trezor test vector - public, no real funds)
const TEST_XPUB = "xpub6CUGRUonZSQ4TWtTMmzXdrXDtypWKiKrhko4egpiMZbpiaQL2jkwSB1icqYh2cfDfVxdx4df189oLKnC5fSwqPfgyP3hooxujYzAu3fDVmz";

describe("SCT Integration Tests", () => {
  beforeEach(async () => {
    await clearAllData();
  });

  afterAll(async () => {
    await clearAllData();
  });

  test("database initializes with correct tables", async () => {
    const walletCount = await db.wallets.count();
    const txCount = await db.transactions.count();
    const lotCount = await db.taxLots.count();
    const priceCount = await db.priceCache.count();
    const settingsCount = await db.settings.count();

    expect(walletCount).toBe(0);
    expect(txCount).toBe(0);
    expect(lotCount).toBe(0);
    expect(priceCount).toBe(0);
    expect(settingsCount).toBe(0);
  });

  test("add wallet with xpub", async () => {
    const now = new Date().toISOString();
    const id = await db.wallets.add({
      name: "Test Wallet",
      type: "single_sig",
      network: "bitcoin",
      xpub: TEST_XPUB,
      balance: null,
      last_synced_at: null,
      sync_status: "idle",
      is_deleted: false,
      created_at: now,
      updated_at: now,
    });

    expect(id).toBeGreaterThan(0);

    const wallet = await db.wallets.get(id);
    expect(wallet).toBeDefined();
    expect(wallet!.name).toBe("Test Wallet");
    expect(wallet!.xpub).toBe(TEST_XPUB);
    expect(wallet!.network).toBe("bitcoin");
  });

  test("add transactions and create tax lots", async () => {
    const now = new Date().toISOString();
    const pastDate = "2023-06-15T12:00:00Z";

    // Add wallet
    const walletId = await db.wallets.add({
      name: "Test Wallet",
      type: "single_sig",
      network: "bitcoin",
      balance: 0.5,
      last_synced_at: now,
      sync_status: "idle",
      is_deleted: false,
      created_at: now,
      updated_at: now,
    });

    // Add receive transaction
    const txId = await db.transactions.add({
      wallet_id: walletId as number,
      txid: "abc123def456abc123def456abc123def456abc123def456abc123def456abcd",
      network: "bitcoin",
      block_height: 800000,
      block_timestamp: pastDate,
      inputs: "[]",
      outputs: "[]",
      amount: "0.5",
      fee: "0.0001",
      fee_usd: 3.0,
      category: "receive",
      is_internal_transfer: false,
      created_at: now,
      updated_at: now,
    });

    expect(txId).toBeGreaterThan(0);

    // Manually add a price cache entry (avoid CoinGecko call in tests)
    await db.priceCache.add({
      asset: "BTC",
      date: "2023-06-15",
      price_usd: 25000,
      source: "test",
      created_at: now,
    });

    // Create tax lots
    const result = await createTaxLotsForWallet(walletId as number);
    expect(result.created).toBe(1);
    expect(result.errors.length).toBe(0);

    // Verify tax lot
    const lots = await getUndisposedLots(walletId as number);
    expect(lots.length).toBe(1);
    expect(lots[0].asset).toBe("BTC");
    expect(lots[0].amount).toBe("0.5");
    expect(lots[0].acquisition_price_usd).toBe(25000);
    expect(lots[0].cost_basis_usd).toBe(12500); // 0.5 * 25000
    expect(lots[0].is_disposed).toBe(false);
  });

  test("process disposals with FIFO", async () => {
    const now = new Date().toISOString();

    // Add wallet
    const walletId = await db.wallets.add({
      name: "FIFO Test",
      type: "single_sig",
      network: "bitcoin",
      balance: 0,
      last_synced_at: now,
      sync_status: "idle",
      is_deleted: false,
      created_at: now,
      updated_at: now,
    });

    // Add two receive transactions at different prices
    await db.transactions.add({
      wallet_id: walletId as number,
      txid: "receive1_" + "a".repeat(54),
      network: "bitcoin",
      block_height: 790000,
      block_timestamp: "2023-01-15T12:00:00Z",
      inputs: "[]",
      outputs: "[]",
      amount: "1.0",
      fee: "0.0001",
      fee_usd: 2.0,
      category: "receive",
      is_internal_transfer: false,
      created_at: now,
      updated_at: now,
    });

    await db.transactions.add({
      wallet_id: walletId as number,
      txid: "receive2_" + "b".repeat(54),
      network: "bitcoin",
      block_height: 800000,
      block_timestamp: "2023-06-15T12:00:00Z",
      inputs: "[]",
      outputs: "[]",
      amount: "0.5",
      fee: "0.0001",
      fee_usd: 3.0,
      category: "receive",
      is_internal_transfer: false,
      created_at: now,
      updated_at: now,
    });

    // Add send transaction
    await db.transactions.add({
      wallet_id: walletId as number,
      txid: "send1_" + "c".repeat(57),
      network: "bitcoin",
      block_height: 810000,
      block_timestamp: "2024-01-16T12:00:00Z", // > 1 year from Jan 15 2023
      inputs: "[]",
      outputs: "[]",
      amount: "0.8",
      fee: "0.0002",
      fee_usd: 8.0,
      category: "send",
      is_internal_transfer: false,
      created_at: now,
      updated_at: now,
    });

    // Add price cache entries
    await db.priceCache.bulkAdd([
      { asset: "BTC", date: "2023-01-15", price_usd: 20000, source: "test", created_at: now },
      { asset: "BTC", date: "2023-06-15", price_usd: 30000, source: "test", created_at: now },
      { asset: "BTC", date: "2024-01-16", price_usd: 45000, source: "test", created_at: now },
    ]);

    // Process all
    const result = await processAllWallets("FIFO");
    expect(result.created).toBe(2); // Two receive lots
    expect(result.processed).toBeGreaterThan(0); // At least one disposal

    // Check disposed lots for 2024
    const disposed = await getDisposedLots(2024);
    expect(disposed.length).toBeGreaterThan(0);

    // Verify at least one disposal used the oldest lot (FIFO)
    expect(disposed.length).toBeGreaterThan(0);
    const firstDisposed = disposed[0];
    expect(firstDisposed.acquisition_price_usd).toBe(20000);
    expect(firstDisposed.is_long_term).toBe(true); // Jan 2023 → Jan 2024 > 1 year
    expect(firstDisposed.is_disposed).toBe(true);
    // Gain should be positive (sold at $45k, bought at $20k)
    expect(firstDisposed.gain_loss_usd!).toBeGreaterThan(0);
  });

  test("Form 8949 CSV export", async () => {
    const now = new Date().toISOString();

    // Add a disposed lot directly
    await db.taxLots.add({
      wallet_id: 1,
      transaction_id: 1,
      asset: "BTC",
      amount: "0.5",
      acquisition_date: "2023-01-15T12:00:00Z",
      acquisition_price_usd: 20000,
      cost_basis_usd: 10000,
      acquisition_type: "purchase",
      is_disposed: true,
      disposal_date: "2024-06-15T12:00:00Z",
      disposal_price_usd: 60000,
      proceeds_usd: 30000,
      gain_loss_usd: 20000,
      is_long_term: true,
      created_at: now,
      updated_at: now,
    });

    const lots = await getDisposedLots(2024);
    const csv = formatAs8949CSV(lots);

    expect(csv).toContain("FORM 8949");
    expect(csv).toContain("Long-Term");
    expect(csv).toContain("0.50000000 BTC");
    expect(csv).toContain("30000.00"); // proceeds
    expect(csv).toContain("10000.00"); // cost basis
    expect(csv).toContain("20000.00"); // gain
  });

  test("tax summary for year", async () => {
    const now = new Date().toISOString();

    // Short-term disposal
    await db.taxLots.add({
      wallet_id: 1, transaction_id: 1, asset: "BTC", amount: "0.1",
      acquisition_date: "2024-03-01T00:00:00Z", acquisition_price_usd: 40000,
      cost_basis_usd: 4000, acquisition_type: "purchase",
      is_disposed: true, disposal_date: "2024-06-01T00:00:00Z",
      disposal_price_usd: 50000, proceeds_usd: 5000,
      gain_loss_usd: 1000, is_long_term: false,
      created_at: now, updated_at: now,
    });

    // Long-term disposal
    await db.taxLots.add({
      wallet_id: 1, transaction_id: 2, asset: "BTC", amount: "0.2",
      acquisition_date: "2022-01-01T00:00:00Z", acquisition_price_usd: 30000,
      cost_basis_usd: 6000, acquisition_type: "purchase",
      is_disposed: true, disposal_date: "2024-09-01T00:00:00Z",
      disposal_price_usd: 55000, proceeds_usd: 11000,
      gain_loss_usd: 5000, is_long_term: true,
      created_at: now, updated_at: now,
    });

    const summary = await getTaxSummary(2024);

    expect(summary.shortTerm.transactionCount).toBe(1);
    expect(summary.shortTerm.gainLoss).toBe(1000);
    expect(summary.shortTerm.proceeds).toBe(5000);

    expect(summary.longTerm.transactionCount).toBe(1);
    expect(summary.longTerm.gainLoss).toBe(5000);
    expect(summary.longTerm.proceeds).toBe(11000);
  });

  test("export and import data roundtrip", async () => {
    const now = new Date().toISOString();

    // Add some data
    await db.wallets.add({
      name: "Export Test",
      type: "single_sig",
      network: "bitcoin",
      balance: 1.5,
      last_synced_at: now,
      sync_status: "idle",
      is_deleted: false,
      created_at: now,
      updated_at: now,
    });

    await db.transactions.add({
      wallet_id: 1,
      txid: "exporttest_" + "x".repeat(52),
      network: "bitcoin",
      block_height: 800000,
      block_timestamp: now,
      inputs: "[]",
      outputs: "[]",
      amount: "1.5",
      fee: "0.0001",
      fee_usd: 5.0,
      category: "receive",
      is_internal_transfer: false,
      created_at: now,
      updated_at: now,
    });

    // Export
    const json = await exportAllData();
    const parsed = JSON.parse(json);
    expect(parsed.version).toBe(1);
    expect(parsed.wallets.length).toBe(1);
    expect(parsed.transactions.length).toBe(1);

    // Clear
    await clearAllData();
    expect(await db.wallets.count()).toBe(0);
    expect(await db.transactions.count()).toBe(0);

    // Import
    const result = await importAllData(json);
    expect(result.wallets).toBe(1);
    expect(result.transactions).toBe(1);

    // Verify data restored
    const wallets = await db.wallets.toArray();
    expect(wallets[0].name).toBe("Export Test");
    expect(wallets[0].balance).toBe(1.5);
  });

  test("internal transfer detection", async () => {
    const now = new Date().toISOString();

    // Two wallets with known addresses
    await db.wallets.add({
      name: "Wallet A",
      type: "single_sig",
      network: "bitcoin",
      address: "bc1qtest_wallet_a_address",
      balance: 1.0,
      last_synced_at: now,
      sync_status: "idle",
      is_deleted: false,
      created_at: now,
      updated_at: now,
    });

    await db.wallets.add({
      name: "Wallet B",
      type: "single_sig",
      network: "bitcoin",
      address: "bc1qtest_wallet_b_address",
      balance: 0.5,
      last_synced_at: now,
      sync_status: "idle",
      is_deleted: false,
      created_at: now,
      updated_at: now,
    });

    // Transaction where all inputs and outputs are from our wallets
    await db.transactions.add({
      wallet_id: 1,
      txid: "internal_" + "i".repeat(54),
      network: "bitcoin",
      block_height: 800000,
      block_timestamp: now,
      inputs: JSON.stringify([{ address: "bc1qtest_wallet_a_address", value: 100000 }]),
      outputs: JSON.stringify([{ address: "bc1qtest_wallet_b_address", value: 99000 }]),
      amount: "0.001",
      fee: "0.00001",
      fee_usd: 0.5,
      category: "send",
      is_internal_transfer: false,
      created_at: now,
      updated_at: now,
    });

    const result = await detectInternalTransfers();
    expect(result.detected).toBe(1);

    // Verify the transaction was marked as internal
    const allTxs = await db.transactions.toArray();
    expect(allTxs.length).toBe(1);
    expect(allTxs[0].is_internal_transfer).toBe(true);
    expect(allTxs[0].category).toBe("internal");
  });
});
