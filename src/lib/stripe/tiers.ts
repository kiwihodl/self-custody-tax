// Client-safe subscription tier configuration
// This file can be imported in both client and server components

export const SUBSCRIPTION_TIERS = {
  free: {
    name: "Free",
    price: 0,
    limits: {
      wallets: 1,
      transactions: 50,
    },
    features: [
      "1 wallet",
      "50 transactions",
      "Basic portfolio view",
      "$21 one-time export fee",
    ],
  },
  holder: {
    name: "Holder",
    price: 99,
    limits: {
      wallets: 10,
      transactions: Infinity,
    },
    features: [
      "10 wallets",
      "Unlimited transactions",
      "Tax reports (8949)",
      "FIFO/LIFO/HIFO cost basis",
      "xpub wallet support",
      "Email support",
    ],
  },
  sovereign: {
    name: "Sovereign",
    price: 249,
    limits: {
      wallets: Infinity,
      transactions: Infinity,
    },
    features: [
      "Unlimited wallets",
      "Unlimited transactions",
      "All Holder features",
      "Multisig support",
      "Internal transfer detection",
      "Priority support",
    ],
  },
  advisor: {
    name: "Advisor",
    price: 499,
    limits: {
      wallets: Infinity,
      transactions: Infinity,
    },
    features: [
      "All Sovereign features",
      "Multi-client dashboard",
      "White-label reports",
      "API access",
      "Dedicated support",
    ],
  },
} as const;

export type SubscriptionTier = keyof typeof SUBSCRIPTION_TIERS;

// Check if user has exceeded their tier limits
export function checkLimits(
  tier: SubscriptionTier,
  currentWallets: number,
  currentTransactions: number
): { canAddWallet: boolean; canAddTransaction: boolean; message?: string } {
  const limits = SUBSCRIPTION_TIERS[tier].limits;

  const canAddWallet = currentWallets < limits.wallets;
  const canAddTransaction = currentTransactions < limits.transactions;

  let message: string | undefined;

  if (!canAddWallet) {
    message = `You've reached the ${limits.wallets} wallet limit for the ${SUBSCRIPTION_TIERS[tier].name} tier. Upgrade to add more wallets.`;
  } else if (!canAddTransaction) {
    message = `You've reached the ${limits.transactions} transaction limit for the ${SUBSCRIPTION_TIERS[tier].name} tier. Upgrade for unlimited transactions.`;
  }

  return { canAddWallet, canAddTransaction, message };
}
