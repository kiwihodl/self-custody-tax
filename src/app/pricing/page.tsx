"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SUBSCRIPTION_TIERS, SubscriptionTier } from "@/lib/stripe/tiers";
import { Nav } from "@/components/nav";

export default function PricingPage() {
  const [loading, setLoading] = useState<SubscriptionTier | null>(null);
  const [currentTier, setCurrentTier] = useState<SubscriptionTier>("free");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const searchParams = useSearchParams();
  const canceled = searchParams.get("canceled");
  const supabase = createClient();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsLoggedIn(!!user);

      if (user) {
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("subscription_tier")
          .eq("id", user.id)
          .single();

        if (profile?.subscription_tier) {
          setCurrentTier(profile.subscription_tier as SubscriptionTier);
        }
      }
    };

    checkAuth();
  }, [supabase]);

  const handleSubscribe = async (tier: SubscriptionTier) => {
    if (tier === "free") return;

    if (!isLoggedIn) {
      window.location.href = "/auth/signup";
      return;
    }

    setLoading(tier);

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });

      const { url, error } = await response.json();

      if (error) {
        console.error("Checkout error:", error);
        return;
      }

      window.location.href = url;
    } catch (error) {
      console.error("Checkout error:", error);
    } finally {
      setLoading(null);
    }
  };

  const tiers = Object.entries(SUBSCRIPTION_TIERS) as [SubscriptionTier, typeof SUBSCRIPTION_TIERS[SubscriptionTier]][];

  return (
    <div className="min-h-screen bg-bg-base">
      {isLoggedIn && <Nav />}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          {!isLoggedIn && (
            <Link href="/" className="inline-flex flex-col items-center mb-8">
              <Image
                src="/logo-icon.png"
                alt="Self Custody Tax"
                width={48}
                height={48}
                className="mb-2"
              />
              <span
                className="text-xl font-bold"
                style={{
                  background: 'linear-gradient(180deg, #FBDC7B 0%, #D4B85A 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                SELF CUSTODY TAX
              </span>
            </Link>
          )}
          <h1 className="text-4xl font-bold text-text-primary mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-text-secondary max-w-2xl mx-auto">
            Start free, upgrade when you need more wallets or advanced features.
            All plans include a 14-day free trial.
          </p>
          {canceled && (
            <div className="mt-4 bg-warning/10 border border-warning/30 text-warning px-4 py-3 rounded-lg inline-block">
              Checkout was canceled. You can try again when you&apos;re ready.
            </div>
          )}
        </div>

        {/* Pricing Grid */}
        <div className="grid md:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {tiers.map(([key, tier]) => {
            const isPopular = key === "sovereign";
            const isCurrent = key === currentTier;

            return (
              <div
                key={key}
                className={`relative ${isPopular ? "" : ""}`}
              >
                {isPopular && (
                  <div className="absolute -inset-px bg-gradient-to-b from-primary/50 to-primary/10 rounded-xl blur-sm" />
                )}
                <div
                  className={`relative card h-full flex flex-col ${
                    isPopular ? "border-primary/50 bg-bg-elevated" : ""
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-primary text-bg-base text-xs font-semibold px-3 py-1 rounded-full">
                        Most Popular
                      </span>
                    </div>
                  )}

                  <div className="text-center mb-6">
                    <span className={`text-sm uppercase tracking-wider font-semibold ${
                      isPopular ? "text-primary" : "text-text-tertiary"
                    }`}>
                      {tier.name}
                    </span>
                    <p className="text-4xl font-bold text-text-primary mt-2 mb-1">
                      ${tier.price}
                      {tier.price > 0 && (
                        <span className="text-lg font-normal text-text-muted">/yr</span>
                      )}
                    </p>
                    <p className="text-text-muted text-sm">
                      {tier.price === 0 ? "forever" : "billed annually"}
                    </p>
                  </div>

                  <ul className="space-y-3 mb-8 flex-grow">
                    {tier.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-3 text-sm">
                        <svg
                          className="w-5 h-5 text-primary flex-shrink-0 mt-0.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        <span className="text-text-secondary">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {key === "free" ? (
                    isLoggedIn ? (
                      isCurrent ? (
                        <button
                          disabled
                          className="w-full btn-secondary opacity-50 cursor-default"
                        >
                          Current Plan
                        </button>
                      ) : (
                        <span className="text-center text-text-muted text-sm">
                          Downgrade via Settings
                        </span>
                      )
                    ) : (
                      <Link href="/auth/signup" className="w-full btn-secondary text-center">
                        Get Started
                      </Link>
                    )
                  ) : isCurrent ? (
                    <button
                      disabled
                      className="w-full btn-primary opacity-50 cursor-default"
                    >
                      Current Plan
                    </button>
                  ) : (
                    <button
                      onClick={() => handleSubscribe(key)}
                      disabled={loading === key}
                      className={`w-full ${isPopular ? "btn-primary" : "btn-secondary"} disabled:opacity-50 flex items-center justify-center gap-2`}
                    >
                      {loading === key ? (
                        <>
                          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Loading...
                        </>
                      ) : (
                        `Upgrade to ${tier.name}`
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* FAQ */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-text-primary text-center mb-8">
            Frequently Asked Questions
          </h2>
          <div className="space-y-2">
            {[
              {
                question: "Can I change my plan later?",
                answer: "Yes! You can upgrade or downgrade at any time. When you upgrade, you'll be charged the prorated difference. Downgrades take effect at the end of your billing cycle."
              },
              {
                question: "What happens after the 14-day trial?",
                answer: "After your trial ends, you'll be charged for your selected plan. You can cancel anytime during the trial and won't be charged."
              },
              {
                question: "Is my payment information secure?",
                answer: "Absolutely. We use Stripe for payment processing and never store your card details on our servers."
              },
              {
                question: "What's included in the Free plan?",
                answer: "The Free plan includes 1 wallet and up to 50 transactions. You can view and track your portfolio at no cost. To export tax reports, a one-time $21 export fee applies."
              }
            ].map((faq, index) => (
              <div key={index} className="card p-0 overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full px-5 py-4 text-left flex justify-between items-center hover:bg-bg-hover transition-colors"
                >
                  <span className="font-medium text-text-primary pr-4">{faq.question}</span>
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                    openFaq === index ? "bg-primary/10 text-primary rotate-45" : "bg-bg-elevated text-text-muted"
                  }`}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                  </span>
                </button>
                {openFaq === index && (
                  <div className="px-5 pb-4 text-text-secondary text-sm border-t border-border">
                    <p className="pt-4">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Sign in link for logged-out users */}
        {!isLoggedIn && (
          <div className="mt-16 text-center text-text-muted text-sm">
            <Link href="/auth/login" className="text-primary hover:text-primary-glow">
              Already have an account? Sign in
            </Link>
          </div>
        )}
      </main>

      {/* Footer */}
      {!isLoggedIn && (
        <footer className="border-t border-border py-12 bg-bg-raised/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <svg className="w-6 h-6 text-primary" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12.5 3.5c-3.6 0-6.5 2.9-6.5 6.5 0 2.6 1.5 4.8 3.7 5.8v4.7c0 .6.4 1 1 1h3.5c.6 0 1-.4 1-1v-4.7c2.2-1 3.8-3.2 3.8-5.8 0-3.6-2.9-6.5-6.5-6.5zm.5 6.5c0 .6-.4 1-1 1s-1-.4-1-1 .4-1 1-1 1 .4 1 1z"/>
                  </svg>
                </div>
                <span className="text-xl font-semibold text-text-primary">
                  Self Custody Tax
                </span>
              </div>
              <p className="text-text-tertiary text-sm">
                Crypto tax tracking for self-custody users
              </p>
              <div className="flex items-center gap-6 text-text-muted text-sm">
                <Link href="/" className="hover:text-text-primary transition-colors">Home</Link>
                <Link href="/help" className="hover:text-text-primary transition-colors">Help</Link>
                <Link href="/auth/login" className="hover:text-text-primary transition-colors">Sign In</Link>
              </div>
            </div>
            <div className="mt-8 pt-8 border-t border-border text-center text-text-muted text-xs">
              &copy; {new Date().getFullYear()} Self Custody Tax. All rights reserved.
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
