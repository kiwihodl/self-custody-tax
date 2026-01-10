"use client";

import useSWR, { mutate } from "swr";
import { createClient } from "@/lib/supabase/client";

export interface Transaction {
  id: string;
  user_id: string;
  wallet_id: string;
  txid: string;
  network: string;
  block_height: number | null;
  block_timestamp: string | null;
  type: string;
  amount: string;
  fee: string | null;
  fee_usd: number | null;
  price_usd: number | null;
  value_usd: number | null;
  category: string;
  is_internal_transfer: boolean;
  linked_transaction_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  wallets?: {
    name: string;
    network: string;
  };
}

interface TransactionFilters {
  walletId?: string;
  category?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}

async function fetchTransactions(filters: TransactionFilters = {}): Promise<Transaction[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  let query = supabase
    .from("transactions")
    .select(`
      *,
      wallets!inner (
        name,
        network
      )
    `)
    .eq("user_id", user.id)
    .order("block_timestamp", { ascending: false, nullsFirst: false });

  if (filters.walletId) {
    query = query.eq("wallet_id", filters.walletId);
  }

  if (filters.category) {
    query = query.eq("category", filters.category);
  }

  if (filters.startDate) {
    query = query.gte("block_timestamp", filters.startDate);
  }

  if (filters.endDate) {
    query = query.lte("block_timestamp", filters.endDate);
  }

  if (filters.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data || [];
}

export function useTransactions(filters: TransactionFilters = {}) {
  const key = `transactions-${JSON.stringify(filters)}`;

  const { data, error, isLoading, isValidating } = useSWR<Transaction[]>(
    key,
    () => fetchTransactions(filters),
    {
      revalidateOnFocus: false,
      dedupingInterval: 15000, // 15 seconds
    }
  );

  return {
    transactions: data || [],
    isLoading,
    isValidating,
    error,
    refresh: () => mutate(key),
  };
}

export function useRecentTransactions(limit: number = 10) {
  return useTransactions({ limit });
}

export function useWalletTransactions(walletId: string | null) {
  return useTransactions(walletId ? { walletId } : {});
}

export function invalidateTransactions() {
  // Invalidate all transaction queries
  mutate(
    (key) => typeof key === "string" && key.startsWith("transactions-"),
    undefined,
    { revalidate: true }
  );
}
