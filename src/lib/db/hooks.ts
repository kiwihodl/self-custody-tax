import { useLiveQuery } from 'dexie-react-hooks';
import { db, getSetting, type DBWallet, type DBTransaction, type DBTaxLot } from './index';
import type { CostBasisMethod, UserSettings } from '@/types';

// ============================================
// Wallet Hooks
// ============================================

export function useWallets() {
  const wallets = useLiveQuery(() => db.wallets.where('is_deleted').equals(0).toArray()) ?? [];
  return wallets;
}

export function useWallet(id: number | undefined) {
  return useLiveQuery(() => (id ? db.wallets.get(id) : undefined), [id]);
}

export function useWalletTransactions(walletId: number | undefined) {
  return useLiveQuery(
    () => (walletId ? db.transactions.where('wallet_id').equals(walletId).toArray() : []),
    [walletId]
  ) ?? [];
}

// ============================================
// Transaction Hooks
// ============================================

export function useTransactions(walletId?: number) {
  return useLiveQuery(() => {
    if (walletId) return db.transactions.where('wallet_id').equals(walletId).toArray();
    return db.transactions.toArray();
  }, [walletId]) ?? [];
}

export function useTransaction(id: number | undefined) {
  return useLiveQuery(() => (id ? db.transactions.get(id) : undefined), [id]);
}

// ============================================
// Tax Lot Hooks
// ============================================

export function useTaxLots(filters?: { walletId?: number; disposed?: boolean; asset?: string }) {
  return useLiveQuery(() => {
    let query = db.taxLots.toCollection();
    if (filters?.walletId) {
      query = db.taxLots.where('wallet_id').equals(filters.walletId);
    }
    return query.toArray().then((lots) => {
      let result = lots;
      if (filters?.disposed !== undefined) {
        result = result.filter((l) => l.is_disposed === filters.disposed);
      }
      if (filters?.asset) {
        result = result.filter((l) => l.asset === filters.asset);
      }
      return result;
    });
  }, [filters?.walletId, filters?.disposed, filters?.asset]) ?? [];
}

// ============================================
// Settings Hooks
// ============================================

const DEFAULT_SETTINGS: UserSettings = {
  default_currency: 'USD',
  cost_basis_method: 'FIFO',
  tax_year_start: '01-01',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
};

export function useSettings() {
  return useLiveQuery(async () => {
    return getSetting<UserSettings>('userSettings', DEFAULT_SETTINGS);
  }) ?? DEFAULT_SETTINGS;
}

// ============================================
// Stats / Dashboard Hooks
// ============================================

export function useDashboardStats() {
  return useLiveQuery(async () => {
    const wallets = await db.wallets.where('is_deleted').equals(0).toArray();
    const transactions = await db.transactions.count();
    const taxLots = await db.taxLots.toArray();

    const undisposedLots = taxLots.filter((l) => !l.is_disposed);
    const disposedLots = taxLots.filter((l) => l.is_disposed);

    const totalCostBasis = undisposedLots.reduce((sum, l) => sum + l.cost_basis_usd, 0);
    const totalGainLoss = disposedLots.reduce((sum, l) => sum + (l.gain_loss_usd ?? 0), 0);

    return {
      walletCount: wallets.length,
      transactionCount: transactions,
      totalCostBasis,
      totalGainLoss,
      undisposedLotCount: undisposedLots.length,
      disposedLotCount: disposedLots.length,
    };
  });
}
