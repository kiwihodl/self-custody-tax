import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";
import { SUBSCRIPTION_TIERS, SubscriptionTier, checkLimits } from "@/lib/stripe/tiers";

interface SubscriptionData {
  tier: SubscriptionTier;
  tierName: string;
  expiresAt: string | null;
  isActive: boolean;
  walletCount: number;
  transactionCount: number;
  limits: {
    wallets: number;
    transactions: number;
  };
  canAddWallet: boolean;
  canAddTransaction: boolean;
  limitMessage?: string;
}

async function fetchSubscription(): Promise<SubscriptionData> {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  // Get user profile with subscription info
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("subscription_tier, subscription_expires_at")
    .eq("id", user.id)
    .single();

  // Get wallet and transaction counts
  const [walletsResult, transactionsResult] = await Promise.all([
    supabase
      .from("wallets")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_deleted", false),
    supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
  ]);

  const tier = (profile?.subscription_tier as SubscriptionTier) || "free";
  const walletCount = walletsResult.count || 0;
  const transactionCount = transactionsResult.count || 0;

  const { canAddWallet, canAddTransaction, message } = checkLimits(
    tier,
    walletCount,
    transactionCount
  );

  return {
    tier,
    tierName: SUBSCRIPTION_TIERS[tier].name,
    expiresAt: profile?.subscription_expires_at || null,
    isActive: true, // TODO: Check expiration
    walletCount,
    transactionCount,
    limits: SUBSCRIPTION_TIERS[tier].limits,
    canAddWallet,
    canAddTransaction,
    limitMessage: message,
  };
}

export function useSubscription() {
  const { data, error, isLoading, mutate } = useSWR<SubscriptionData>(
    "subscription",
    fetchSubscription,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  return {
    subscription: data,
    isLoading,
    error,
    refresh: mutate,
  };
}
