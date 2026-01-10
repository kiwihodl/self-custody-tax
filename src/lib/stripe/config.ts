import Stripe from "stripe";

// Re-export client-safe tier configuration
export { SUBSCRIPTION_TIERS, checkLimits } from "./tiers";
export type { SubscriptionTier } from "./tiers";

// Lazy-initialized Stripe client (server-side only)
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY environment variable is not set");
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-12-15.clover",
      typescript: true,
    });
  }
  return _stripe;
}

// Legacy export for compatibility
export const stripe = {
  get customers() { return getStripe().customers; },
  get checkout() { return getStripe().checkout; },
  get billingPortal() { return getStripe().billingPortal; },
  get subscriptions() { return getStripe().subscriptions; },
};

// Price IDs for each tier (server-side only)
export const TIER_PRICE_IDS = {
  free: null,
  holder: process.env.STRIPE_HOLDER_PRICE_ID,
  sovereign: process.env.STRIPE_SOVEREIGN_PRICE_ID,
  advisor: process.env.STRIPE_ADVISOR_PRICE_ID,
} as const;

// Get price ID for a tier
export function getPriceId(tier: keyof typeof TIER_PRICE_IDS): string | null | undefined {
  return TIER_PRICE_IDS[tier];
}
