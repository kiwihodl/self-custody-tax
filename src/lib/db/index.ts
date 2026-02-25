import Dexie, { type EntityTable } from 'dexie';

// ============================================
// Database Schema Types (IndexedDB-friendly)
// ============================================

export interface DBWallet {
  id?: number;
  name: string;
  type: string; // WalletType
  network: string; // Network
  xpub?: string;
  derivation_path?: string;
  address?: string;
  multisig_config?: string; // JSON-serialized MultisigConfig
  balance: number | null;
  last_synced_at: string | null;
  sync_status: string; // SyncStatus
  sync_error?: string;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface DBTransaction {
  id?: number;
  wallet_id: number;
  txid: string;
  network: string;
  block_height: number | null;
  block_timestamp: string | null;
  inputs: string; // JSON
  outputs: string; // JSON
  from_address?: string;
  to_address?: string;
  amount?: string;
  token_contract?: string;
  fee: string;
  fee_usd: number;
  category: string; // TransactionCategory
  is_internal_transfer: boolean;
  linked_transaction_id?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface DBTaxLot {
  id?: number;
  wallet_id: number;
  transaction_id: number;
  asset: string; // Asset
  amount: string;
  txid?: string;
  vout?: number;
  acquisition_date: string;
  acquisition_price_usd: number;
  cost_basis_usd: number;
  acquisition_type: string; // AcquisitionType
  is_cost_basis_override?: boolean;
  cost_basis_notes?: string;
  original_acquisition_price_usd?: number;
  original_cost_basis_usd?: number;
  is_disposed: boolean;
  disposal_date?: string;
  disposal_price_usd?: number;
  disposal_transaction_id?: number;
  proceeds_usd?: number;
  gain_loss_usd?: number;
  is_long_term?: boolean;
  created_at: string;
  updated_at: string;
}

export interface DBPriceCache {
  id?: number;
  asset: string;
  date: string; // YYYY-MM-DD
  price_usd: number;
  source: string;
  created_at: string;
}

export interface DBSetting {
  key: string;
  value: string; // JSON-serialized
}

// ============================================
// Database Class
// ============================================

export class SCTDatabase extends Dexie {
  wallets!: EntityTable<DBWallet, 'id'>;
  transactions!: EntityTable<DBTransaction, 'id'>;
  taxLots!: EntityTable<DBTaxLot, 'id'>;
  priceCache!: EntityTable<DBPriceCache, 'id'>;
  settings!: EntityTable<DBSetting, 'key'>;

  constructor() {
    super('SelfCustodyTax');

    this.version(1).stores({
      wallets: '++id, name, type, network, is_deleted',
      transactions: '++id, wallet_id, txid, category, block_timestamp, is_internal_transfer',
      taxLots: '++id, wallet_id, transaction_id, asset, is_disposed, acquisition_date, disposal_date',
      priceCache: '++id, [asset+date], asset, date',
      settings: 'key',
    });
  }
}

// Singleton instance
export const db = new SCTDatabase();

// ============================================
// Helper Functions
// ============================================

export async function getSetting<T>(key: string, defaultValue: T): Promise<T> {
  const row = await db.settings.get(key);
  if (!row) return defaultValue;
  try {
    return JSON.parse(row.value) as T;
  } catch {
    return defaultValue;
  }
}

export async function setSetting<T>(key: string, value: T): Promise<void> {
  await db.settings.put({ key, value: JSON.stringify(value) });
}

export async function exportAllData(): Promise<string> {
  const [wallets, transactions, taxLots, priceCache, settings] = await Promise.all([
    db.wallets.toArray(),
    db.transactions.toArray(),
    db.taxLots.toArray(),
    db.priceCache.toArray(),
    db.settings.toArray(),
  ]);
  return JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), wallets, transactions, taxLots, priceCache, settings }, null, 2);
}

export async function importAllData(json: string): Promise<{ wallets: number; transactions: number; taxLots: number }> {
  const data = JSON.parse(json);
  if (!data.version || !data.wallets) throw new Error('Invalid backup file');

  await db.transaction('rw', [db.wallets, db.transactions, db.taxLots, db.priceCache, db.settings], async () => {
    await db.wallets.clear();
    await db.transactions.clear();
    await db.taxLots.clear();
    await db.priceCache.clear();
    await db.settings.clear();

    if (data.wallets?.length) await db.wallets.bulkAdd(data.wallets);
    if (data.transactions?.length) await db.transactions.bulkAdd(data.transactions);
    if (data.taxLots?.length) await db.taxLots.bulkAdd(data.taxLots);
    if (data.priceCache?.length) await db.priceCache.bulkAdd(data.priceCache);
    if (data.settings?.length) await db.settings.bulkAdd(data.settings);
  });

  return {
    wallets: data.wallets?.length ?? 0,
    transactions: data.transactions?.length ?? 0,
    taxLots: data.taxLots?.length ?? 0,
  };
}

export async function clearAllData(): Promise<void> {
  await db.transaction('rw', [db.wallets, db.transactions, db.taxLots, db.priceCache, db.settings], async () => {
    await db.wallets.clear();
    await db.transactions.clear();
    await db.taxLots.clear();
    await db.priceCache.clear();
    await db.settings.clear();
  });
}
