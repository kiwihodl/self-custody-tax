"use client";

import useSWR, { mutate } from "swr";
import { createClient } from "@/lib/supabase/client";

export interface TaxLot {
  id: string;
  user_id: string;
  wallet_id: string;
  transaction_id: string;
  asset: string;
  amount: string;
  txid: string | null;
  vout: number | null;
  acquisition_date: string;
  acquisition_price_usd: number;
  cost_basis_usd: number;
  acquisition_type: string;
  is_disposed: boolean;
  disposal_date: string | null;
  disposal_price_usd: number | null;
  disposal_transaction_id: string | null;
  proceeds_usd: number | null;
  gain_loss_usd: number | null;
  is_long_term: boolean | null;
  created_at: string;
  updated_at: string;
}

interface TaxLotFilters {
  year?: number;
  asset?: string;
  disposed?: boolean;
}

async function fetchTaxLots(filters: TaxLotFilters = {}): Promise<TaxLot[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  let query = supabase
    .from("tax_lots")
    .select("*")
    .eq("user_id", user.id)
    .order("acquisition_date", { ascending: false });

  if (filters.asset) {
    query = query.eq("asset", filters.asset);
  }

  if (filters.disposed !== undefined) {
    query = query.eq("is_disposed", filters.disposed);
  }

  if (filters.year) {
    const startDate = `${filters.year}-01-01`;
    const endDate = `${filters.year}-12-31`;

    if (filters.disposed) {
      query = query
        .gte("disposal_date", startDate)
        .lte("disposal_date", endDate);
    } else {
      query = query
        .gte("acquisition_date", startDate)
        .lte("acquisition_date", endDate);
    }
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data || [];
}

export function useTaxLots(filters: TaxLotFilters = {}) {
  const key = `tax-lots-${JSON.stringify(filters)}`;

  const { data, error, isLoading, isValidating } = useSWR<TaxLot[]>(
    key,
    () => fetchTaxLots(filters),
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000, // 30 seconds
    }
  );

  return {
    taxLots: data || [],
    isLoading,
    isValidating,
    error,
    refresh: () => mutate(key),
  };
}

export function useDisposedTaxLots(year?: number) {
  return useTaxLots({ disposed: true, year });
}

export function useOpenTaxLots() {
  return useTaxLots({ disposed: false });
}

export function invalidateTaxLots() {
  mutate(
    (key) => typeof key === "string" && key.startsWith("tax-lots-"),
    undefined,
    { revalidate: true }
  );
}
