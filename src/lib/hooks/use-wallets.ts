"use client";

import useSWR, { mutate } from "swr";
import { createClient } from "@/lib/supabase/client";

export interface Wallet {
  id: string;
  user_id: string;
  name: string;
  type: string;
  network: string;
  address: string | null;
  xpub: string | null;
  derivation_path: string | null;
  balance_sats: string | null;
  balance_usd: number | null;
  last_synced_at: string | null;
  sync_status: string;
  sync_error: string | null;
  created_at: string;
  updated_at: string;
}

async function fetchWallets(): Promise<Wallet[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const { data, error } = await supabase
    .from("wallets")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
}

export function useWallets() {
  const { data, error, isLoading, isValidating } = useSWR<Wallet[]>(
    "wallets",
    fetchWallets,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 10000, // 10 seconds
    }
  );

  return {
    wallets: data || [],
    isLoading,
    isValidating,
    error,
    refresh: () => mutate("wallets"),
  };
}

async function fetchWallet(id: string): Promise<Wallet | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const { data, error } = await supabase
    .from("wallets")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    throw error;
  }

  return data;
}

export function useWallet(id: string | null) {
  const { data, error, isLoading, isValidating } = useSWR<Wallet | null>(
    id ? `wallet-${id}` : null,
    () => fetchWallet(id!),
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    }
  );

  return {
    wallet: data,
    isLoading,
    isValidating,
    error,
    refresh: () => id && mutate(`wallet-${id}`),
  };
}

export function invalidateWallets() {
  mutate("wallets");
}

export function invalidateWallet(id: string) {
  mutate(`wallet-${id}`);
  mutate("wallets");
}
